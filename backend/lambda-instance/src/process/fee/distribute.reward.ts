import BigNumber from 'bignumber.js';

import initializeContracts from '../../contract';
import { sendMessage } from '../../utils/slack';
import { CONTRACT_ADDRESSES } from '../../constants/constants.addresses';
import { makeTx } from '../../../makeTx';
import { LogLevel } from '../../utils/enums';
import { MESSAGE_TYPE } from '../../utils/messages';

export const distributeReward = async () => {
  const chainId = Number(process.env.CHAIN_ID);
  const { FeeDistributor, sRewardTracker, mRewardTracker, lRewardTracker, keeper_feeDistributor } =
    await initializeContracts();

  /*
   * Distribute pending reward in fee distributor to reward distributor
   */

  const distributionPeriod = Number(await FeeDistributor.distributionPeriod());
  const lastOlpRewardsDistribution = Number(await FeeDistributor.lastOlpRewardsDistribution());
  const currentTime = Math.floor(Date.now() / 1000);

  const timeElapsed = currentTime - lastOlpRewardsDistribution;

  if (timeElapsed < distributionPeriod) {
    console.log('Not enough time elapsed since last distribution:', timeElapsed, '/', distributionPeriod);
    return false;
  }

  const solpPendingRewards = await FeeDistributor.pendingOLPRewards(
    CONTRACT_ADDRESSES[chainId].S_REWARD_DISTRIBUTOR,
  );
  const molpPendingRewards = await FeeDistributor.pendingOLPRewards(
    CONTRACT_ADDRESSES[chainId].M_REWARD_DISTRIBUTOR,
  );
  const lolpPendingRewards = await FeeDistributor.pendingOLPRewards(
    CONTRACT_ADDRESSES[chainId].L_REWARD_DISTRIBUTOR,
  );

  try {
    await makeTx(FeeDistributor, keeper_feeDistributor, 'distributeOLPRewards', []);

    console.log('OLP rewards distributed');

    const lastOlpRewardsDistribution = Number(await FeeDistributor.lastOlpRewardsDistribution());
    const newSOlpTokensPerInterval = new BigNumber(await sRewardTracker.tokensPerInterval())
      .div(10 ** 18)
      .toString();
    const newMOlpTokensPerInterval = new BigNumber(await mRewardTracker.tokensPerInterval())
      .div(10 ** 18)
      .toString();
    const newLOlpTokensPerInterval = new BigNumber(await lRewardTracker.tokensPerInterval())
      .div(10 ** 18)
      .toString();

    await sendMessage(
      `\`[Lambda][distribute.reward.ts]\` ${MESSAGE_TYPE.OLP_REWARDS_DISTRIBUTED}`,

      LogLevel.INFO,
      {
        description: `
      at ${lastOlpRewardsDistribution}
      - sOlpPendingRewards: ${new BigNumber(solpPendingRewards).div(10 ** 18).toFixed(6)} WETH
      - mOlpPendingRewards: ${new BigNumber(molpPendingRewards).div(10 ** 18).toFixed(6)} WETH
      - lOlpPendingRewards: ${new BigNumber(lolpPendingRewards).div(10 ** 18).toFixed(6)} WETH
      - sOlpTokensPerInterval: ${newSOlpTokensPerInterval} WETH
      - mOlpTokensPerInterval: ${newMOlpTokensPerInterval} WETH
      - lOlpTokensPerInterval: ${newLOlpTokensPerInterval} WETH
      `,
      },
    );

    return true;
  } catch (error) {
    console.log('Error withdrawing fees:', error);
    await sendMessage(
      `\`[Lambda][distribute.reward.ts]\` ${MESSAGE_TYPE.ERROR_DURING_DISTRIBUTING_OLP_REWARDS}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      },
    );

    return false;
  }
};
