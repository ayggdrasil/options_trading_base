import { getS3, putS3 } from '../../utils/aws';
import initializeContracts from '../../contract';
import { CONTRACT_ADDRESSES } from '../../constants/constants.addresses';

export type VaultType = 's' | 'm' | 'l';

export interface EpochConfig {
  submissionDurationMinutes: number;
  processDurationMinutes: number;
}

export interface CurrentEpoch {
  round: number;
  stage: 'SUBMISSION' | 'PROCESS';
  epochStartedAt: number; // epochStartedAt is the same as nextEpochStartsAt
  appliedConfig: EpochConfig;
  submissionStartsAt: number;
  submissionEndsAt: number; // submissionEndsAt is the same as processStartsAt
  processStartsAt: number;
  processEndsAt: number; // processEndsAt is the same as nextEpochStartsAt
  nextEpochStartsAt: number;
}

export interface EpochConfigFile {
  config: EpochConfig;
  currentEpoch: CurrentEpoch;
  lastUpdated: string;
}

const EPOCH_CONFIG_KEY_PREFIX = 'epoch-config';

/**
 * Get epoch config file key for S3
 */
function getEpochConfigKey(vaultType: VaultType): string {
  return `${EPOCH_CONFIG_KEY_PREFIX}-${vaultType}.json`;
}

/**
 * Load epoch config from S3
 * If file doesn't exist or is empty, automatically initialize with default config
 * @param vaultType - Vault type ('s', 'm', 'l')
 * @param configForInit - Optional config to use when initializing (if not provided, uses default 20/10)
 */
export async function getEpochConfig(
  vaultType: VaultType, 
  configForInit?: EpochConfig
): Promise<EpochConfigFile> {
  const key = getEpochConfigKey(vaultType);
  
  try {
    const data = await getS3({
      Bucket: process.env.APP_DATA_BUCKET,
      Key: key
    });
    
    // If file exists and has content, return it
    if (data && Object.keys(data).length > 0) {
      return data as EpochConfigFile;
    }
    
    // File exists but is empty - initialize and return the created file
    console.log(`Epoch config file is empty for ${vaultType} vault, initializing...`);
    if (!configForInit) {
      throw new Error(`Config is required for initialization. Please provide submissionDurationMinutes and processDurationMinutes for ${vaultType} vault.`);
    }
    return await initializeEpochConfig(vaultType, configForInit);
    
  } catch (error: any) {
    // File doesn't exist - initialize and return the created file
    if (error.name === 'NoSuchKey' || error.message?.includes('not found')) {
      console.log(`Epoch config not found for ${vaultType} vault, initializing...`);
      if (!configForInit) {
        throw new Error(`Config is required for initialization. Please provide submissionDurationMinutes and processDurationMinutes for ${vaultType} vault.`);
      }
      return await initializeEpochConfig(vaultType, configForInit);
    }
    
    // Other errors - throw
    throw error;
  }
}

/**
 * Save epoch config to S3
 */
export async function putEpochConfig(vaultType: VaultType, data: EpochConfigFile): Promise<void> {
  const key = getEpochConfigKey(vaultType);
  await putS3({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: key,
    Body: JSON.stringify(data, null, 2)
  });
}

/**
 * Update config only (does not touch currentEpoch)
 */
export async function updateEpochConfig(
  vaultType: VaultType,
  newConfig: EpochConfig
): Promise<{ success: boolean; message: string; currentRound: number; willApplyFromRound: number }> {
  // Load existing config (if not exists, initialize with newConfig)
  const epochFile = await getEpochConfig(vaultType, newConfig);
  
  // Update config only (do not touch currentEpoch!)
  epochFile.config = newConfig;
  epochFile.lastUpdated = new Date().toISOString();
  
  // Save to S3
  await putEpochConfig(vaultType, epochFile);
  
  console.log(`✓ Epoch config updated for ${vaultType.toUpperCase()} vault`);
  console.log(`  New config: ${newConfig.submissionDurationMinutes}min submission / ${newConfig.processDurationMinutes}min process`);
  console.log(`  Current epoch round: ${epochFile.currentEpoch.round}`);
  console.log(`  Will apply from round: ${epochFile.currentEpoch.round + 1}`);
  
  return {
    success: true,
    message: 'Config updated successfully. Will apply from next epoch.',
    currentRound: epochFile.currentEpoch.round,
    willApplyFromRound: epochFile.currentEpoch.round + 1
  };
}

/**
 * Initialize epoch config with default values and contract state
 * Automatically calculates next epoch start time aligned to the nearest round hour
 * @param vaultType - Vault type ('s', 'm', 'l')
 * @param config - Config to use (required)
 * @returns The created EpochConfigFile
 */
export async function initializeEpochConfig(
  vaultType: VaultType, 
  config: EpochConfig
): Promise<EpochConfigFile> {
  const chainId = Number(process.env.CHAIN_ID);
  const { getRewardRouterV2ContractByVaultAddress } = await initializeContracts();
  
  // Get vault address and contract
  const vaultAddress = CONTRACT_ADDRESSES[chainId][`${vaultType.toUpperCase()}_VAULT`];
  const rewardRouter = getRewardRouterV2ContractByVaultAddress(vaultAddress);
  
  // Get current state from contract
  const [contractStage, contractRound] = await Promise.all([
    rewardRouter.epochStage(),
    rewardRouter.epochRound()
  ]);

  // Contract stage: 0 = REQUEST_SUBMISSION, 1 = QUEUE_PROCESSING
  const stage = contractStage === 0n ? 'SUBMISSION' : 'PROCESS';
  
  // Calculate next aligned time: current hour + 2 hours, at :00:00
  const now = Date.now();
  const nextAlignedTime = calculateNextAlignedStart(now);
  
  let currentEpoch: CurrentEpoch;
  
  if (stage === 'SUBMISSION') {
    const submissionDurationMs = config.submissionDurationMinutes * 60 * 1000;
    const processDurationMs = config.processDurationMinutes * 60 * 1000;

    // Contract is in SUBMISSION: nextAlignedTime is when next epoch starts
    const epochStartedAt = nextAlignedTime - processDurationMs - submissionDurationMs;
    const submissionStartsAt = nextAlignedTime - processDurationMs - submissionDurationMs;
    const submissionEndsAt = nextAlignedTime - processDurationMs;
    const processStartsAt = nextAlignedTime - processDurationMs;
    const processEndsAt = nextAlignedTime;
    const nextEpochStartsAt = nextAlignedTime;
    
    currentEpoch = {
      round: Number(contractRound),
      stage,
      epochStartedAt,
      appliedConfig: config,
      submissionStartsAt,
      submissionEndsAt,
      processStartsAt,
      processEndsAt,
      nextEpochStartsAt
    };
  } else {
    // Contract is in PROCESS: nextAlignedTime is when next epoch starts
    currentEpoch = {
      round: Number(contractRound),
      stage,
      epochStartedAt: 0,
      appliedConfig: config,
      submissionStartsAt: 0,
      submissionEndsAt: 0,
      processStartsAt: 0,
      processEndsAt: 0,
      nextEpochStartsAt: nextAlignedTime
    };
  }
  
  const epochFile: EpochConfigFile = {
    config,
    currentEpoch,
    lastUpdated: new Date().toISOString()
  };
  
  await putEpochConfig(vaultType, epochFile);
  console.log(`✓ Initialized epoch config for ${vaultType.toUpperCase()} vault`);
  console.log(`  Config: ${config.submissionDurationMinutes}min submission / ${config.processDurationMinutes}min process`);
  console.log(`  Contract state: Round ${contractRound}, Stage ${stage}`);
  
  if (stage === 'SUBMISSION') {
    console.log(`  Current epoch (calculated from nextAlignedTime):`);
    console.log(`    Submission: ${new Date(currentEpoch.submissionStartsAt).toISOString()} → ${new Date(currentEpoch.submissionEndsAt).toISOString()}`);
    console.log(`    Process: ${new Date(currentEpoch.processStartsAt).toISOString()} → ${new Date(currentEpoch.processEndsAt).toISOString()}`);
    console.log(`    Next epoch starts at: ${new Date(currentEpoch.nextEpochStartsAt).toISOString()}`);
  } else {
    console.log(`  Next epoch will start at: ${new Date(currentEpoch.nextEpochStartsAt).toISOString()}`);
  }
  
  return epochFile;
}

/**
 * Calculate next aligned start time: current hour + 2 hours, at :00:00
 * Examples:
 *   - 9:00 ~ 9:59 → 11:00:00
 *   - 10:01 → 12:00:00
 *   - 16:32 → 18:00:00
 */
function calculateNextAlignedStart(now: number): number {
  const date = new Date(now);
  
  // Get current hour and add 2 hours
  const nextHour = date.getHours() + 2;
  
  // Create new date with +2 hours, set minutes and seconds to 0
  const nextStart = new Date(date);
  nextStart.setHours(nextHour, 0, 0, 0);
  
  return nextStart.getTime();
}

