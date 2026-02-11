import { getEpochConfig, VaultType } from '../olp/epoch/config';

/**
 * Get current epoch information for frontend
 * Returns timestamps for countdown and config info
 */
export const getEpochInfo = async (vaultType: VaultType) => {
  const epochFile = await getEpochConfig(vaultType);
  const { currentEpoch, config } = epochFile;

  const configChanged = JSON.stringify(currentEpoch.appliedConfig) !== JSON.stringify(config);

  return {
    vaultType,
    currentRound: currentEpoch.round,
    currentStage: currentEpoch.stage,
    
    // Timestamps for frontend countdown
    epochStartedAt: currentEpoch.epochStartedAt,
    submissionStartsAt: currentEpoch.submissionStartsAt,
    submissionEndsAt: currentEpoch.submissionEndsAt,
    processStartsAt: currentEpoch.processStartsAt,
    processEndsAt: currentEpoch.processEndsAt,
    nextEpochStartsAt: currentEpoch.nextEpochStartsAt,
    
    // Config info
    appliedConfig: currentEpoch.appliedConfig,
    nextConfig: config,
    configChanged,
    
    // Helper info
    timestamp: Date.now(),
    lastUpdated: epochFile.lastUpdated
  };
};

