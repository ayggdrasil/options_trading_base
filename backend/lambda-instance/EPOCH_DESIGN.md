# OLP Epoch Management - Design Document

## 📋 Requirements Analysis

### Business Requirements
- OLP uses the **Epoch** concept to batch process liquidity provision requests.
- An Epoch consists of two phases:
  1. **Submission Phase**: Collecting user requests.
  2. **Process Phase**: Executing requests (feedOlppv + executeQueue).
- The cycle is variable (e.g., 30 minutes, 1 hour, etc.).

### Technical Requirements
- Implemented as Lambda functions.
- Scheduled using EventBridge.
- In the Process phase, `feedOlppv` must run continuously.
- Maintain existing code patterns.

## 🏗️ Design Decisions

### Option 1: Two Separate Lambda Functions (Adopted)

**Structure:**
1. **Epoch Manager**: Manages epoch start/end (short execution).
2. **Process Worker**: Runs `feedOlppv + executeQueue` in parallel during the process phase (long execution).

**Advantages:**
- Clear separation of responsibilities.
- Consistent with existing parallel patterns.
- Simple EventBridge scheduling.
- Independent scaling capability.

**Disadvantages:**
- Requires more than two functions (actually three: start, end, process).

### Option 2: Single Integrated Lambda Function

**Structure:**
- **Epoch Orchestrator**: Handles all tasks.

**Advantages:**
- Fewer functions.
- Centralized state management.

**Disadvantages:**
- Violates Single Responsibility Principle.
- Increased complexity.
- Different timeout requirements for short tasks (start/end) and long tasks (process).

### Final Choice: Option 1
- Consistent with the existing codebase patterns.
- Better maintainability.
- Best practice for Serverless architecture.

## 📁 File Structure

```
backend/lambda-instance/
├── src/
│   └── olp/
│       └── epoch/
│           ├── manage.epoch.ts           # Epoch Start/End Management
│           ├── execute.queue.ts          # OLP Queue Execution
│           ├── parallel.processOlpQueue.ts  # Parallel Processing (feedOlppv + executeQueue)
│           ├── test-epoch.ts             # Test Scripts
│           └── README.md                 # Usage Documentation
├── handler.ts                            # Lambda Handler Registration
├── serverless.olp-epoch.example.yml      # Serverless Configuration Example
└── EPOCH_DESIGN.md                       # This file
```

## 🔄 Data Flow

### Example: 30-Minute Cycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Timeline (30-Minute Cycle)                  │
└─────────────────────────────────────────────────────────────────────┘

00:00  ┌─────────────────────────────────────────────────┐
       │ processStartEpoch (Lambda)                      │
       │ └─ RewardRouterV2.startEpoch()                  │
       │    → Epoch Stage: SUBMISSION (0)                │
       └─────────────────────────────────────────────────┘
       
       ┌─────────────────────────────────────────────────┐
       │ Submission Phase (20 minutes)                   │
       │ - Users submit mint/burn requests               │
       │ - Requests queued in OlpQueue                   │
       └─────────────────────────────────────────────────┘

00:20  ┌─────────────────────────────────────────────────┐
       │ processEndEpoch (Lambda)                        │
       │ └─ RewardRouterV2.endEpoch()                    │
       │    → Epoch Stage: PROCESS (1)                   │
       └─────────────────────────────────────────────────┘
       
       ┌─────────────────────────────────────────────────┐
       │ processExecuteOlpQueueParallel (Lambda, 10 min) │
       │                                                  │
       │ ┌─ feedOlppv() ────────────────────────┐        │
       │ │  - Interval: 5 seconds                │        │
       │ │  - 120 executions (over 10 min)       │        │
       │ │  - Calls PositionValueFeed.feedPV()   │        │
       │ └────────────────────────────────────────┘       │
       │                                                  │
       │ ┌─ executeQueue() ──────────────────────┐       │
       │ │  - Interval: 10 seconds               │       │
       │ │  - 60 executions (over 10 min)        │       │
       │ │  - OlpQueue.executeQueue(maxItems)     │       │
       │ └────────────────────────────────────────┘       │
       └─────────────────────────────────────────────────┘

00:30  ┌─────────────────────────────────────────────────┐
       │ processStartEpoch (Lambda)                      │
       │ └─ Start Next Epoch                             │
       └─────────────────────────────────────────────────┘
       
       processExecuteOlpQueueParallel finishes (timeout)
```

## 🔌 Lambda Function Details

### 1. processStartEpoch

**Responsibility:**
- Starts an Epoch and transitions it to the Submission phase.

**Input:**
```typescript
{
  vaultTypes: ['s', 'm', 'l']  // Vault types to process
}
```

**Processing:**
1. Initialize RewardRouterV2 contract.
2. Check current epoch stage.
3. Skip if already in SUBMISSION stage.
4. Execute `startEpoch()` transaction.
5. Save state to Redis.

**Output:**
```typescript
{
  action: 'start',
  timestamp: '2024-01-01T00:00:00.000Z',
  results: [
    {
      vaultType: 's',
      action: 'start',
      success: true,
      txHash: '0x...'
    }
  ]
}
```

### 2. processEndEpoch

**Responsibility:**
- Ends an Epoch and transitions it to the Process phase.

**Input/Output:**
- Same as processStartEpoch (action is 'end').

### 3. processExecuteOlpQueueParallel

**Responsibility:**
- Continuously runs `feedOlppv` and `executeQueue` in parallel during the Process phase.

**Input:**
```typescript
{
  vaultTypes: ['s', 'm', 'l'],
  feedOlppvInterval: 5000,      // ms
  executeQueueInterval: 10000,  // ms
  maxExecuteItems: 10
}
```

**Processing:**
1. Parallel execution using RxJS.
2. feedOlppv: Executes every 5 seconds.
3. executeQueue: Executes every 10 seconds.
4. Continues execution until `maxRunningTime`.
5. Each task prevents overlapping execution (isRunning flag).

**Output:**
```typescript
true  // Successfully completed
```

## 🗄️ Data Storage

### Redis Keys

```typescript
// Epoch status tracking
`lambda:olp:epoch:${vaultType}:last_start`
`lambda:olp:epoch:${vaultType}:last_end`

// Value Structure
{
  timestamp: number,      // Unix timestamp (ms)
  txHash: string,         // Transaction hash
  epochStage: 0 | 1      // 0: SUBMISSION, 1: PROCESS
}
```

## ⚙️ Configuration Management

### Environment Variables

```yaml
# serverless.base.yml
provider:
  environment:
    # Keeper (Loaded from AWS Secrets Manager)
    KP_OLP_PROCESSOR: ${ssm:/keeper/olp-processor}
    
    # Configuration Values
    MAX_RUNNING_TIME_FOR_PARALLEL_TASK: 59  # seconds
    MAX_OLP_QUEUE_EXECUTE_ITEMS: 10         # optional
```

### EventBridge Cron

```yaml
# 30-Minute Cycle Setup
processStartEpoch:
  events:
    - schedule:
        rate: cron(0,30 * * * ? *)  # 00, 30 min

processEndEpoch:
  events:
    - schedule:
        rate: cron(20,50 * * * ? *)  # 20, 50 min

processExecuteOlpQueueParallel:
  timeout: 600  # 10 min
  events:
    - schedule:
        rate: cron(20,50 * * * ? *)  # Starts simultaneously with endEpoch
```

## 🔐 Security Considerations

1. **Keeper Account Management**
   - Private key is stored in AWS Secrets Manager.
   - Automatically loaded upon Lambda execution.
   - Maintain sufficient gas balance.

2. **Duplicate Execution Prevention**
   - Epoch stage check prevents duplicate start/end.
   - `isRunning` flag prevents overlapping parallel tasks.
   - EventBridge fundamentally avoids duplicate executions.

3. **Error Handling**
   - Filter ignorable errors (e.g., nonce-related).
   - Notify critical errors via Slack.
   - Record all logs in CloudWatch Logs.

## 📊 Monitoring and Alerts

### CloudWatch Metrics
- Lambda invocations
- Errors
- Duration
- Throttles

### CloudWatch Logs
```
/aws/lambda/app-lambda-base-prod-processStartEpoch
/aws/lambda/app-lambda-base-prod-processEndEpoch
/aws/lambda/app-lambda-base-prod-processExecuteOlpQueueParallel
```

### Slack Alerts
- Epoch transition failure
- Queue execution failure
- Unexpected errors

## 🧪 Testing Strategy

### 1. Local Testing
```bash
# Individual function testing
TEST_SCENARIO=start npm run ts-node src/olp/epoch/test-epoch.ts
TEST_SCENARIO=end npm run ts-node src/olp/epoch/test-epoch.ts

# Full cycle testing
TEST_SCENARIO=full npm run ts-node src/olp/epoch/test-epoch.ts
```

### 2. Lambda Local Test
```bash
npx serverless invoke local --function processStartEpoch \
  --data '{"vaultTypes":["s"]}'
```

### 3. Post-Deployment Test
```bash
# Real Lambda invocation
npx serverless invoke --function processStartEpoch \
  --data '{"vaultTypes":["s"]}' \
  --log
```

## 🚀 Deployment Guide

### 1. Initial Setup
```bash
# 1. Register Keeper Account (AWS Secrets Manager)
aws secretsmanager create-secret \
  --name /keeper/olp-processor \
  --secret-string "0x..."

# 2. Add functions to serverless.base.yml
cat serverless.olp-epoch.example.yml >> serverless.base.yml
```

### 2. Deployment
```bash
# Full deployment
npm run deploy

# Per-function deployment
npm run deploy function -- --function processStartEpoch
npm run deploy function -- --function processEndEpoch
npm run deploy function -- --function processExecuteOlpQueueParallel
```

### 3. Verification
```bash
# Check CloudWatch Logs
aws logs tail /aws/lambda/app-lambda-base-prod-processStartEpoch --follow

# Check Redis status
redis-cli get lambda:olp:epoch:s:last_start
```

## 🔄 How to Change Cycle

### Example: Change from 30 minutes to 1 hour

1. **Change Cron Expression**
```yaml
# Before: 30-minute cycle
processStartEpoch:
  rate: cron(0,30 * * * ? *)  # 00, 30 min

# After: 1-hour cycle
processStartEpoch:
  rate: cron(0 * * * ? *)     # Only 00 min
```

2. **Change Process Phase Duration**
```yaml
# Before: 10-minute Process
processExecuteOlpQueueParallel:
  timeout: 600  # 10 min
  rate: cron(20,50 * * * ? *)

# After: 15-minute Process
processExecuteOlpQueueParallel:
  timeout: 900  # 15 min
  rate: cron(45 * * * ? *)  # 45 min of every hour
```

3. **Redeploy**
```bash
npm run deploy
```

## 🐛 Troubleshooting

### Issue: Epoch transition not occurring
**Cause:**
- Insufficient Keeper gas balance.
- Contract permission issues.
- Already in the target stage.

**Resolution:**
1. Check CloudWatch Logs.
2. Check Keeper balance.
3. Check current epoch stage of the contract.

### Issue: Queue not executing
**Cause:**
- Not in the Process phase.
- No pending queue items.

**Resolution:**
1. Verify Epoch stage.
2. Check `hasPendingQueue()`.
3. Check Lambda timeout.

### Issue: feedOlppv failing
**Cause:**
- Missing S3 data.
- Transaction failure.

**Resolution:**
1. Verify existence of `olppv.json` in S3.
2. Review transaction logs.
3. Verify Keeper permissions.

## 📈 Future Improvements

1. **Dynamic Cycle Adjustment**
   - Automatically adjust cycle based on market conditions.
   - Utilize Parameter Store.

2. **Performance Optimization**
   - Dynamically adjust `feedOlppv` interval.
   - Optimize `executeQueue` batch size.

3. **Enhanced Monitoring**
   - Custom CloudWatch Metrics.
   - Dashboard configuration.
   - Success rate tracking.

4. **Auto-Recovery**
   - Retry logic for failures.
   - Implement Circuit Breaker pattern.

## 📝 Change History

- 2024-01-15: Initial design and implementation.
  - Structure with 3 Lambda functions.
  - Support for 30-minute/1-hour cycles.
  - Redis state persistence.
  - Slack alert integration.
