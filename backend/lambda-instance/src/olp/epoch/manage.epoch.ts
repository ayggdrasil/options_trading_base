import BigNumber from 'bignumber.js';
import initializeContracts from '../../contract';
import { sendMessage } from '../../utils/slack';
import { LogLevel } from '../../utils/enums';
import { makeTx } from '../../../makeTx';
import { CONTRACT_ADDRESSES } from '../../constants/constants.addresses';
import { getEpochConfig, putEpochConfig, VaultType } from './config';
import { isIgnorableError } from '../../utils/helper';

BigNumber.config({ EXPONENTIAL_AT: 1000, DECIMAL_PLACES: 80 });

type StageName = 'SUBMISSION' | 'PROCESS';

const STAGE_SUBMISSION = 0n; // REQUEST_SUBMISSION
const STAGE_PROCESS = 1n;    // QUEUE_PROCESSING

/**
 * manageEpoch (refactored, simplified mismatch handling)
 *
 * Flow:
 * 1) Load S3 config (durations + currentEpoch schedule cache)
 * 2) Load contract state (stage/round)
 * 3) PRIORITY: if now >= currentEpoch.nextEpochStartsAt -> rebuild schedule using getAlignedEpochStart and upload to S3, reload
 * 4) Compute expectedStage by schedule window; if expectedStage exists:
 *    - Patch S3 stage to expectedStage if needed
 *    - Patch contract stage to expectedStage if needed (tx)
 * 5) If stage matches, perform normal transitions (end when submission ends, start when process ends)
 */
export const manageEpoch = async (vaultType: VaultType) => {
  const chainId = Number(process.env.CHAIN_ID);

  try {
    // 1) Load S3 epoch file
    let epochFile = await getEpochConfig(vaultType);
    let { config, currentEpoch } = epochFile;

    let now = Date.now();

    const submissionDurationMs = config.submissionDurationMinutes * 60 * 1000;
    const processDurationMs = config.processDurationMinutes * 60 * 1000;
    const totalDurationMs = submissionDurationMs + processDurationMs;

    console.log(`====== MANAGE EPOCH (${vaultType.toUpperCase()}) ======`);
    console.log(`Durations: submission=${config.submissionDurationMinutes}m process=${config.processDurationMinutes}m`);
    console.log(`Time(now): ${new Date(now).toISOString()}`);
    console.log(`SubmissionStartsAt: ${new Date(currentEpoch.submissionStartsAt).toISOString()}`);
    console.log(`ProcessStartsAt: ${new Date(currentEpoch.processStartsAt).toISOString()}`);
    console.log(`NextEpochStartsAt: ${new Date(currentEpoch.nextEpochStartsAt).toISOString()}`);

    if (now >= currentEpoch.nextEpochStartsAt) {
      // Check if delay is severe (submission duration / 2)
      const delay = now - currentEpoch.nextEpochStartsAt;
      const rebuildThreshold = Math.floor(submissionDurationMs / 2);

      if (delay < rebuildThreshold) {
        // Simple update: just shift schedule from nextEpochStartsAt
        console.log(`→ Config expired but delay is minor (${Math.round(delay / 1000)}s < ${Math.round(rebuildThreshold / 1000)}s), updating schedule`);
        const epochStartedAt = currentEpoch.nextEpochStartsAt;
        epochFile.currentEpoch = {
          round: currentEpoch.round, // Keep existing (record keeping - will be updated from contract later)
          stage: currentEpoch.stage, // Keep existing (record keeping - will be updated from contract later)
          epochStartedAt: epochStartedAt,
          appliedConfig: { ...config },
          submissionStartsAt: epochStartedAt,
          submissionEndsAt: epochStartedAt + submissionDurationMs,
          processStartsAt: epochStartedAt + submissionDurationMs,
          processEndsAt: epochStartedAt + totalDurationMs,
          nextEpochStartsAt: epochStartedAt + totalDurationMs,
        };
        epochFile.lastUpdated = new Date().toISOString();
        await putEpochConfig(vaultType, epochFile);

        console.log(`✓ Epoch schedule updated`);
        console.log(`  Submission: ${new Date(epochFile.currentEpoch.submissionStartsAt).toISOString()} ~ ${new Date(epochFile.currentEpoch.submissionEndsAt).toISOString()}`);
        console.log(`  Process:    ${new Date(epochFile.currentEpoch.processStartsAt).toISOString()} ~ ${new Date(epochFile.currentEpoch.processEndsAt).toISOString()}`);
      } else {
        // Rebuild: skip epochs to align with current time
        console.log(`→ Severe delay detected (${Math.round(delay / 1000)}s >= ${Math.round(rebuildThreshold / 1000)}s), rebuilding schedule`);
        const alignedStart = getAlignedEpochStart(currentEpoch.nextEpochStartsAt, totalDurationMs, now);

        const rebuilt = buildEpochSchedule({
          round: currentEpoch.round, // Keep existing (record keeping - will be updated from contract later)
          stage: currentEpoch.stage, // Keep existing (record keeping - will be updated from contract later)
          epochStartedAt: alignedStart,
          submissionDurationMs,
          processDurationMs,
        });

        epochFile.currentEpoch = {
          ...rebuilt,
          appliedConfig: { ...config },
        };
        epochFile.lastUpdated = new Date().toISOString();
        await putEpochConfig(vaultType, epochFile);

        console.log(`✓ Epoch schedule rebuilt`);
        console.log(`  Submission: ${new Date(rebuilt.submissionStartsAt).toISOString()} ~ ${new Date(rebuilt.submissionEndsAt).toISOString()}`);
        console.log(`  Process:    ${new Date(rebuilt.processStartsAt).toISOString()} ~ ${new Date(rebuilt.processEndsAt).toISOString()}`);
      }

      // Update local reference to use the updated epoch
      currentEpoch = epochFile.currentEpoch;
    }

    // 2) Contract setup + state
    const { kp_olpProcessor, getRewardRouterV2ContractByVaultAddress } = await initializeContracts();
    const vaultAddress = CONTRACT_ADDRESSES[chainId][`${vaultType.toUpperCase()}_VAULT`];
    const rewardRouter = getRewardRouterV2ContractByVaultAddress(vaultAddress);

    const contractStageBn = await rewardRouter.epochStage();
    const contractStageStr: StageName = contractStageBn === STAGE_SUBMISSION ? 'SUBMISSION' : 'PROCESS';

    // 3) Expected stage by schedule
    const expectedStage = getExpectedStageBySchedule(now, currentEpoch);

    if (!expectedStage) {
      console.log(`⚠ Now is outside submission/process window (may happen right after rebuild)`);
      console.log(`  Current epoch stage: ${currentEpoch.stage}`);
      console.log(`  Contract stage: ${contractStageStr}`);
      return {
        skipped: true,
        vaultType,
        currentStage: contractStageStr, // Use contract stage as source of truth
      };
    }

    console.log(`Expected stage: ${expectedStage}`);
    console.log(`Contract stage: ${contractStageStr}`);

    if (expectedStage === contractStageStr) {
      console.log(`✓ No need to update CONTRACT stage`);
      return {
        skipped: true,
        vaultType,
        currentStage: contractStageStr,
      };
    }

    let txHash: string | null = null;

    if (expectedStage === "SUBMISSION") {
      txHash = await runEpochTx(rewardRouter, kp_olpProcessor, 'SUBMISSION', 'startEpoch');
    } else if (expectedStage === "PROCESS") {
      txHash = await runEpochTx(rewardRouter, kp_olpProcessor, 'PROCESS', 'endEpoch');
    }

    const [afterContractStageBn, afterContractRoundBn] = await Promise.all([
      rewardRouter.epochStage(),
      rewardRouter.epochRound(),
    ]);

    const afterContractStageStr: StageName = afterContractStageBn === STAGE_SUBMISSION ? 'SUBMISSION' : 'PROCESS';
    const afterContractRoundNum = Number(afterContractRoundBn);

    await patchS3Stage(epochFile, vaultType, afterContractStageStr, afterContractRoundNum);

    return {
      success: true,
      vaultType,
      stage: afterContractStageStr,
      round: afterContractRoundNum,
      txHash: txHash,
    };
  } catch (error: any) {
    console.error(`Error in manageEpoch:`, error);

    const ignorable = isIgnorableError(error);

    if (!ignorable) {
      await sendMessage(
        `\`[Lambda][manage.epoch.ts]\` Error managing epoch for ${vaultType.toUpperCase()}_VAULT`,
        LogLevel.ERROR,
        { description: error?.message || String(error) }
      );
    }

    return {
      success: false,
      vaultType,
      error: error?.message || String(error),
      timestamp: new Date().toISOString(),
    };
  }
};

/** now가 어떤 window에 있는지로 expected stage 계산 */
function getExpectedStageBySchedule(now: number, e: any): StageName | null {
  if (now >= e.submissionStartsAt && now < e.submissionEndsAt) return 'SUBMISSION';
  if (now >= e.processStartsAt && now < e.processEndsAt) return 'PROCESS';
  return null;
}

async function patchS3Stage(epochFile: any, vaultType: VaultType, stage: StageName, round: number) {
  console.log(`→ Updating S3 stage to ${stage} and round to ${round}`);
  epochFile.currentEpoch.stage = stage;
  epochFile.currentEpoch.round = round;
  epochFile.lastUpdated = new Date().toISOString();
  await putEpochConfig(vaultType, epochFile);
  console.log(`✓ S3 stage and round updated to ${stage} and ${round}`);
}

async function runEpochTx(rewardRouter: any, keeper: any, stage: StageName, methodName: 'startEpoch' | 'endEpoch') {
  console.log(`→ Updating CONTRACT stage to ${stage} by calling ${methodName}`);
  const result = await makeTx(rewardRouter, keeper, methodName, [], true);
  if (!result?.isSuccess) throw new Error(`Transaction failed: ${result?.txHash}`);
  console.log(`✓ Contract stage updated to ${stage}: ${result.txHash}`);
  return result.txHash;
}

function buildEpochSchedule(params: {
  round: number;
  stage: StageName;
  epochStartedAt: number;
  submissionDurationMs: number;
  processDurationMs: number;
}) {
  const { round, stage, epochStartedAt, submissionDurationMs, processDurationMs } = params;

  return {
    round,
    stage,
    epochStartedAt,
    submissionStartsAt: epochStartedAt,
    submissionEndsAt: epochStartedAt + submissionDurationMs,
    processStartsAt: epochStartedAt + submissionDurationMs,
    processEndsAt: epochStartedAt + submissionDurationMs + processDurationMs,
    nextEpochStartsAt: epochStartedAt + submissionDurationMs + processDurationMs,
  };
}
// current time이 nextEpochStartsAt보다 많이 앞서있으면 totalDuration 단위로 "점프"
function getAlignedEpochStart(prevNextEpochStartedAt: number, totalDuration: number, now: number = Date.now()): number {
  if (prevNextEpochStartedAt > now) return prevNextEpochStartedAt;

  const lag = now - prevNextEpochStartedAt;
  const epochsToSkip = Math.ceil(lag / totalDuration);

  return prevNextEpochStartedAt + (epochsToSkip * totalDuration);
}

