# OLP Epoch Management - Dynamic Configuration

These are Lambda functions for Epoch management in the OLP (Optimized Liquidity Pool) system. **S3-based dynamic configuration** allows changing Epoch cycles without redeployment.

## Overview

### Epoch Definition

**1 Epoch = SUBMISSION + PROCESS Full Cycle**

- **Submission Phase**: Users submit OLP mint/burn requests, which are queued.
- **Process Phase**: Keeper executes queued requests (feedOlppv + executeQueue).

Example: 20 min Submission + 10 min Process = 30 min Epoch

### Key Features

1. **Dynamic Configuration**: Set Epoch lengths via S3 files (no redeployment needed).
2. **Safe Transition**: Protects ongoing Epochs and applies new settings from the next Epoch.
3. **Automatic Management**: A single Lambda automatically triggers start/end based on time.
4. **Frontend Support**: Provides countdown timestamps via API.
5. **Auto-Recovery**: Automatically synchronizes the contract based on S3 config if inconsistencies occur.
6. **Schedule Drift Correction**: Automatically realigns Epoch boundaries if significant time drift is detected.

## Architecture

### Lambda Functions (4)

#### 1. `processSVaultManageEpoch` (Every 1 minute)
- **Purpose**: Automatic Epoch transition management (start/end) + auto-recovery for inconsistencies.
- **Execution Interval**: Every 1 minute (time check).
- **Operation**:
  1. Read epoch config from S3 **(Source of Truth)**.
  2. Read current stage/round from the Contract.
  3. **Schedule Drift Detection**: Rebuild schedule if `now >= nextEpochStartsAt + submissionDuration/2`.
  4. **Expected Stage Calculation**: Identify which window the current time falls into.
  5. **Mismatch Recovery**: Force sync if S3 or Contract stages differ from expected.
     - Update S3 stage → `patchS3Stage()`
     - Update Contract stage → Call `startEpoch()` or `endEpoch()`
  6. Normal transition: Execute `startEpoch` or `endEpoch` at the scheduled time.
  7. Update S3 file.

#### 2. `processSVaultExecuteOlpQueueParallel` (Every 1 minute)
- **Purpose**: Parallel execution of `feedOlppv + executeQueue` during the PROCESS phase.
- **Operation**:
  - Check Epoch stage.
  - If in PROCESS: Execute `feedOlppv` (5s) + `executeQueue` (1s) for 59 seconds.
  - If in SUBMISSION: Skip.

#### 3. `processSVaultFeedOlppvSubmission` (At specific minutes)
- **Purpose**: Execute `feedOlppv` during the SUBMISSION phase.
- **Operation**:
  - Check Epoch stage.
  - If in SUBMISSION: Execute `feedOlppv`.
  - If in PROCESS: Skip (handled by parallel task).

#### 4. `getEpochInfo` (HTTP API)
- **Purpose**: Provide epoch info for frontend countdown.
- **Endpoint**: `GET /getEpochInfo?vaultType=s`
- **Response**:
  ```json
  {
    "vaultType": "s",
    "currentRound": 123,
    "currentStage": "SUBMISSION",
    "submissionStartsAt": 1737014400000,
    "submissionEndsAt": 1737015600000,
    "processStartsAt": 1737015600000,
    "processEndsAt": 1737016200000,
    "nextEpochStartsAt": 1737016200000,
    "appliedConfig": {
      "submissionDurationMinutes": 20,
      "processDurationMinutes": 10
    },
    "nextConfig": {
      "submissionDurationMinutes": 25,
      "processDurationMinutes": 5
    },
    "configChanged": true
  }
  ```

#### 5. `processUpdateEpochConfig` (For Admin, Manual Execution)
- **Purpose**: Update Epoch settings (includes automatic initialization).
- **Execution**: Test event from Lambda Console.
- **Features**: 
  - Automatically initializes with provided config if S3 file is missing.
  - Automatically fetches current round and stage from the contract.
  - Calculates timestamps based on contract state:
    - **PROCESS state**: Sets only the next epoch start time (Current + 2 hours later, on the hour).
    - **SUBMISSION state**: Treats current + 2 hours as the end of submission and back-calculates all timestamps.
- **Required Input**:
  ```json
  {
    "vaultType": "s",
    "submissionDurationMinutes": 25,
    "processDurationMinutes": 5
  }
  ```
  
**Initialization Behavior**:
- If S3 file exists: Updates only the `config` section.
- If S3 file is missing: Initializes with provided values (e.g., 25/5).

## S3 Config File Structure

**File Name**: `epoch-config-s.json` (S3: `APP_DATA_BUCKET`)

```json
{
  "config": {
    "submissionDurationMinutes": 20,
    "processDurationMinutes": 10
  },
  "currentEpoch": {
    "round": 123,
    "stage": "SUBMISSION",
    "epochStartedAt": 1737014400000,
    
    "appliedConfig": {
      "submissionDurationMinutes": 20,
      "processDurationMinutes": 10
    },
    
    "submissionStartsAt": 1737014400000,
    "submissionEndsAt": 1737015600000,
    "processStartsAt": 1737015600000,
    "processEndsAt": 1737016200000,
    "nextEpochStartsAt": 1737016200000
  },
  "lastUpdated": "2026-01-16T10:00:00Z"
}
```

**Description**:
- `config`: Settings to apply to the next Epoch (Admin can change).
- `currentEpoch.appliedConfig`: Settings applied to the current Epoch (fixed).
- `currentEpoch.*At`: Pre-calculated times for the current Epoch.

## Configuration Change Flow

### 1. Initial Setup (20 min / 10 min)

```
10:00 - processSVaultManageEpoch
        → S3 config: 20min/10min
        → Executes startEpoch()
        → appliedConfig saved as 20/10
        → submissionEndsAt: 10:20
        → processEndsAt: 10:30
```

### 2. Admin Updates Config (25 min / 5 min)

```
10:10 - processUpdateEpochConfig execution
        → Updates only S3.config: 25/5
        → currentEpoch remains (20/10 maintained)
```

### 3. Current Epoch Completion

```
10:20 - processSVaultManageEpoch
        → Executes endEpoch()
        → Still uses appliedConfig (20/10)
        → processEndsAt: 10:30 (no change)

10:30 - processSVaultManageEpoch
        → Executes startEpoch()
        → Latest config applied: 25/5 ← New Settings!
        → appliedConfig saved as 25/5
        → submissionEndsAt: 10:55
        → processEndsAt: 11:00
```

## Timeline Example (30-Minute Cycle)

```
10:00 - Manage: startEpoch → Start SUBMISSION (20min)
        │
        ├─ 10:01 ~ 10:19 - Manage: skip (not time yet)
        ├─ 10:02, 10:05, 10:08, 10:11, 10:14, 10:17... - FeedOlppv: ✅ feed (SUBMISSION)
        ├─ 10:01 ~ 10:19 - ExecuteQueue: ❌ skip (SUBMISSION)
        │
10:20 - Manage: endEpoch → Start PROCESS (10min)
        │
        ├─ 10:21 ~ 10:29 - Manage: skip (not time yet)
        ├─ 10:23, 10:26, 10:29 - FeedOlppv: ❌ skip (PROCESS)
        ├─ 10:21 ~ 10:29 - ExecuteQueue: ✅ parallel (PROCESS)
        │                    ├─ feedOlppv (every 5s)
        │                    └─ executeQueue (every 1s)
        │
10:30 - Manage: startEpoch → Start next SUBMISSION
```

## Initial Setup

### ⚠️ Required: First Initialization (Mandatory)

**Following Lambda deployment, you must run `processUpdateEpochConfig` first.**

If the S3 file is missing, automatic initialization will not occur and **an error will be raised**.

#### 1. Deploy Lambda

```bash
npm run deploy
```

#### 2. Initial Config Setup (Mandatory)

```bash
# Execute processUpdateEpochConfig in Lambda Console
# Or local test:
npx serverless invoke local --function processUpdateEpochConfig --data '{
  "vaultType": "s",
  "submissionDurationMinutes": 20,
  "processDurationMinutes": 10
}'
```

**Behavior**:
- Missing S3 file → **Initializes with provided values (20/10)**.
- Automatically fetches current round/stage from the contract.
- Reference time calculation: **Current time + 2 hours later, on the hour**.
- Set timestamps based on contract stage:
  - **PROCESS**: Reference time = Next epoch start time.
  - **SUBMISSION**: Reference time = Current submission end time, back-calculate others.
- Save to S3.

**Example 1: Contract is in PROCESS state**
- Initialization at 16:32 → Next Epoch starts at 18:00.

**Example 2: Contract is in SUBMISSION state (20/10)**
- Initialization at 16:32 → 18:00 is submission end time.
- Submission: 17:40 ~ 18:00
- Process: 18:00 ~ 18:10
- Next epoch: 18:10

#### 3. Start Automatic Epoch Management

After initialization, `processSVaultManageEpoch` runs every 1 minute to manage Epochs automatically.

Alternatively, manually create the `epoch-config-s.json` file in S3 (not recommended):

```json
{
  "config": {
    "submissionDurationMinutes": 20,
    "processDurationMinutes": 10
  },
  "currentEpoch": {
    "round": 0,
    "stage": "PROCESS",
    "epochStartedAt": 0,
    "appliedConfig": {
      "submissionDurationMinutes": 20,
      "processDurationMinutes": 10
    },
    "submissionStartsAt": 0,
    "submissionEndsAt": 0,
    "processStartsAt": 0,
    "processEndsAt": 0,
    "nextEpochStartsAt": 1737014400000
  },
  "lastUpdated": "2026-01-16T00:00:00Z"
}
```

## How to Change Config

### Via Lambda Console

1. Select `processUpdateEpochConfig` in AWS Lambda Console.
2. Create an event in the Test tab:
   ```json
   {
     "vaultType": "s",
     "submissionDurationMinutes": 25,
     "processDurationMinutes": 5
   }
   ```
3. Run Test.
4. New settings will be applied from the next Epoch.

### Response Example

```json
{
  "success": true,
  "message": "Config updated successfully. Will apply from next epoch.",
  "currentRound": 123,
  "willApplyFromRound": 124
}
```

## Frontend Usage

```typescript
// Fetch Epoch Info
const response = await fetch('https://api.callput.io/getEpochInfo?vaultType=s');
const data = await response.json();

// Calculate Countdown
const now = Date.now();
if (data.currentStage === 'SUBMISSION') {
  const remaining = data.submissionEndsAt - now;
  console.log(`Submission ends in ${Math.floor(remaining / 1000)}s`);
} else {
  const remaining = data.processEndsAt - now;
  console.log(`Process ends in ${Math.floor(remaining / 1000)}s`);
}

// Config Change Notification
if (data.configChanged) {
  console.log('Next epoch will use new config:', data.nextConfig);
}
```

## Environment Variables

```yaml
environment:
  APP_DATA_BUCKET: "app-data-base"
  CHAIN_ID: 8453
  MAX_RUNNING_TIME_FOR_PARALLEL_TASK: 59
  MAX_OLP_QUEUE_EXECUTE_ITEMS: 10
```

## Core Concept: Source of Truth

### S3 Config is the Source of Truth

**The schedule (timestamp) in the S3 config is the absolute reference.** The Contract must follow this schedule.

```
S3 Config (Source of Truth)
    │
    ├── config.submissionDurationMinutes  → Settings to apply to next epoch
    ├── config.processDurationMinutes
    │
    └── currentEpoch
        ├── stage                         → Stage that should currently be active
        ├── submissionStartsAt ~ submissionEndsAt  → SUBMISSION window
        └── processStartsAt ~ processEndsAt        → PROCESS window

Contract (Follower)
    │
    ├── epochStage   → Synchronized based on S3 schedule
    └── epochRound   → Matched with S3
```

### Expected Stage Calculation

```typescript
// Determine expected stage based on which window current time falls into
if (now >= submissionStartsAt && now < submissionEndsAt) → 'SUBMISSION'
if (now >= processStartsAt && now < processEndsAt)       → 'PROCESS'
```

### Mismatch Recovery Flow

```
1. Read S3 config (schedule)
2. Read Contract state (stage/round)
3. expectedStage = getExpectedStageBySchedule(now)
4. if (S3.stage !== expectedStage) → Correct S3
5. if (Contract.stage !== expectedStage) → Execute Contract TX
```

## Precautions

1. **Epoch Protection**: Ongoing Epochs are never modified (Safety).
2. **S3 as Reference**: If the Contract falls behind, it is forced to sync based on the S3 schedule.
3. **reservedConcurrency**: Each function is restricted to 1 concurrent execution (Prevents overlapping).
4. **Schedule Drift**: If time drift is significant, it jumps to the next aligned epoch boundary via `getAlignedEpochStart()`.

## Monitoring

### CloudWatch Logs

- `/aws/lambda/app-lambda-base-prod-processSVaultManageEpoch`
- `/aws/lambda/app-lambda-base-prod-processSVaultExecuteOlpQueueParallel`
- `/aws/lambda/app-lambda-base-prod-processSVaultFeedOlppvSubmission`

### Slack Alerts

- On Epoch transition failure.
- On S3/Contract mismatch recovery (Alert after auto-fix).
- On Schedule drift recovery.
- Excludes ignorable errors (e.g., nonce-related).

## Troubleshooting

### Epoch not transitioning

1. Verify S3 file:
   ```bash
   aws s3 cp s3://app-data-base/epoch-config-s.json -
   ```

2. Check `nextEpochStartsAt` time.

3. Verify "Not time yet" message in CloudWatch Logs.

### Config change not applied

- Current Epoch must complete for settings to take effect.
- Check `currentRound` and `willApplyFromRound`.

### S3 and Contract Inconsistency

**Automatically Fixed** - on next `manageEpoch` execution:

1. Calculate `expectedStage` based on S3 schedule.
2. Automatically fix S3 stage if different.
3. Force sync Contract stage via TX if different.

Verification in logs:
```
⚠️ Fixing S3 stage to PROCESS
✓ S3 stage updated
→ Fixing CONTRACT by calling endEpoch
✓ Contract updated via endEpoch: 0x...
```

### Schedule Drift (Significant time drift)

**Automatically Fixed** - If `now >= nextEpochStartsAt + submissionDuration/2`:

1. Calculate next aligned epoch boundary via `getAlignedEpochStart()`.
2. Rebuild schedule and update S3.
3. Resume normal flow.

Verification in logs:
```
✓ S3 schedule drift fixed (rebuilt currentEpoch)
  Submission: 2026-01-19T14:00:00.000Z ~ 2026-01-19T14:08:00.000Z
  Process:    2026-01-19T14:08:00.000Z ~ 2026-01-19T14:10:00.000Z
```

### Manual Recovery Required

In extreme cases (e.g., corrupted S3 file), re-run `processUpdateEpochConfig`:

```bash
npx serverless invoke local --function processUpdateEpochConfig --data '{
  "vaultType": "s",
  "submissionDurationMinutes": 8,
  "processDurationMinutes": 2
}'
```

## Local Testing

```bash
# Epoch Management Test
npx serverless invoke local --function processSVaultManageEpoch

# Config Update Test
npx serverless invoke local --function processUpdateEpochConfig --data '{
  "vaultType": "s",
  "submissionDurationMinutes": 25,
  "processDurationMinutes": 5
}'

# Epoch Info Query Test
curl "http://localhost:3000/getEpochInfo?vaultType=s"
```
