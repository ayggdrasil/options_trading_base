import { formatEther } from 'ethers';
import initializeContracts from '../contract';

import { sendMessage } from '../utils/slack';
import { LogLevel, SlackTag } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';

export const checkKeeperBalances = async () => {
  const BALANCE_THRESHOLD = 0.001;

  try {
    const {
      provider,
      keeper_optionsMarket,
      keeper_positionProcessor,
      keeper_settleOperator,
      keeper_positionValueFeeder,
      keeper_spotPriceFeeder,
      keeper_feeDistributor,
      keeper_clearingHouse
    } = await initializeContracts();

    const addresses = {
      optionsMarket: keeper_optionsMarket.address,
      positionProcessor: keeper_positionProcessor.address,
      settleOperator: keeper_settleOperator.address,
      positionValueFeeder: keeper_positionValueFeeder.address,
      spotPriceFeeder: keeper_spotPriceFeeder.address,
      feeDistributor: keeper_feeDistributor.address,
      clearingHouse: keeper_clearingHouse.address,
    }
    
    const [
      optionsMarketBalance,
      positionProcessorBalance,
      settleOperatorBalance,
      positionValueFeederBalance,
      spotPriceFeederBalance,
      feeDistributorBalance,
      clearingHouseBalance
    ] = await Promise.all([ 
      provider.getBalance(keeper_optionsMarket.address),
      provider.getBalance(keeper_positionProcessor.address),
      provider.getBalance(keeper_settleOperator.address),
      provider.getBalance(keeper_positionValueFeeder.address),
      provider.getBalance(keeper_spotPriceFeeder.address), 
      provider.getBalance(keeper_feeDistributor.address),
      provider.getBalance(keeper_clearingHouse.address),
    ]);

    const balances = {
      optionsMarket: optionsMarketBalance,
      positionProcessor: positionProcessorBalance,
      settleOperator: settleOperatorBalance,
      positionValueFeeder: positionValueFeederBalance,
      spotPriceFeeder: spotPriceFeederBalance,
      feeDistributor: feeDistributorBalance,
      clearingHouse: clearingHouseBalance,
    }

    let shouldAlert = false;
    let description = "";

    for (const [key, balance] of Object.entries(balances)) {
      if (Number(formatEther(balance)) < BALANCE_THRESHOLD) shouldAlert = true;
      description += `- ${key}(${addresses[key]}): ` + "`" + `${Number(formatEther(balance)).toFixed(4)}ETH` + "` \n";
    }

    console.log("shouldAlert: ", shouldAlert);

    // Now send a single Slack message with all the details
    if (shouldAlert) {
      await sendMessage(
        `${MESSAGE_TYPE.BALANCE_LOWER_THAN_0_1ETH}`,
        LogLevel.WARN,
        {
          description,
          tags: [SlackTag.ALL],
        }
      )
    }
  } catch (error) {
    console.log('Error processing checkKeeperBalances:', error)
    await sendMessage(
      `\`[Lambda][check.keeperBalances.ts]\` ${MESSAGE_TYPE.ERROR_DURING_CHECKING_KEEPER_BALANCES}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      }
    )
  }
}