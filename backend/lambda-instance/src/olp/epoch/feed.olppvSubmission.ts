import { feedOlppv } from '../../feed/feed.olppv';
import initializeContracts from '../../contract';
import { CONTRACT_ADDRESSES } from '../../constants/constants.addresses';
import { VaultType } from './config';

/**
 * Feed OLPPV during SUBMISSION phase
 * This runs at 2,5,8,11,14,17,20,23,26,29,32,35,38,41,44,47,50,53,56,59 minutes and only feeds OLPPV if in SUBMISSION stage
 * During PROCESS stage, processSVaultExecuteOlpQueueParallel handles feeding
 * 
 * @param vaultType - Vault type to check ('s', 'm', or 'l')
 */
export const feedOlppvSubmission = async (vaultType: VaultType) => {
  const chainId = Number(process.env.CHAIN_ID);

  try {
    const { getRewardRouterV2ContractByVaultAddress } = await initializeContracts();

    // Get vault address and RewardRouterV2 contract
    const vaultAddress = CONTRACT_ADDRESSES[chainId][`${vaultType.toUpperCase()}_VAULT`];
    const rewardRouter = getRewardRouterV2ContractByVaultAddress(vaultAddress);

    // Check current epoch stage
    const epochStage = await rewardRouter.epochStage();
    
    console.log('====== FEED OLPPV (SUBMISSION) ======');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Vault type: ${vaultType.toUpperCase()}`);
    console.log(`Epoch stage: ${epochStage} (0: SUBMISSION, 1: PROCESS)`);

    // Early return if in PROCESS stage
    if (epochStage === 1n) {
      console.log('❌ In PROCESS stage, skipping (handled by parallel executor)');
      return {
        vaultType,
        epochStage: Number(epochStage),
        executed: false,
        reason: 'In PROCESS stage - already handled by parallel executor',
      };
    }

    console.log('✓ In SUBMISSION stage, feeding OLPPV...');

    // Feed OLPPV
    await feedOlppv();
    console.log('✓ feedOlppv completed');

    return {
      vaultType,
      epochStage: Number(epochStage),
      executed: true,
      timestamp: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error('Error in feedOlppvSubmission:', error);
    return {
      vaultType,
      executed: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

