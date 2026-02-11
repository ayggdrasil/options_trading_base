import initializeContracts from '../contract';

import { sendMessage } from '../utils/slack';
import { CONTRACT_ADDRESSES } from '../constants/constants.addresses';
import { ASSET_TICKER_TO_DECIMALS } from '../constants';
import BigNumber from 'bignumber.js';
import { LogLevel, SlackTag } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';
import { ChainId } from '../constants/constants.networks';
import { isTimeInRange } from '../utils/misc';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface IAssetsItem {
  name: string;
  contractName: string;
  index: number;
  threshold: number;
}

const ASSETS: {
  [key: number]: IAssetsItem[]
} = {
  [ChainId.BASE]: [
    // { name: 'BTC', contractName: 'WBTC', index: 1, threshold: 0.02 },
    // { name: 'ETH', contractName: 'WETH', index: 4, threshold: 0.1 },
    { name: 'USDC', contractName: 'USDC', index: 7, threshold: 100 },
  ],
  [ChainId.ARBITRUM_ONE]: [
    // { name: 'BTC', contractName: 'WBTC', index: 1, threshold: 0.02 },
    // { name: 'ETH', contractName: 'WETH', index: 4, threshold: 0.1 },
    { name: 'USDC', contractName: 'USDC', index: 7, threshold: 100 },
  ],
}

const formatAvailableAmount = (amount, decimals) => 
  new BigNumber(amount).dividedBy(10 ** decimals).toNumber();

const checkAssetAmount = (assetAmounts, asset) => {
  const chainId = Number(process.env.CHAIN_ID);

  const availableAmount = formatAvailableAmount(
    assetAmounts[asset.index], 
    ASSET_TICKER_TO_DECIMALS[chainId][asset.name]
  );
  
  return {
    message: `- ${asset.name} Available Amount: \`${availableAmount}${asset.contractName}\`\n`,
    isLowAvailable: availableAmount < asset.threshold
  }
};

export const checkAvailableAmounts = async () => {
  try {
    const chainId = Number(process.env.CHAIN_ID);
    const targetAssets = ASSETS[chainId];

    const { ViewAggregator } = await initializeContracts();
    const contractAddresses = targetAssets.map(asset => CONTRACT_ADDRESSES[chainId][asset.contractName]);
    const [sOlpAssetAmounts] = await ViewAggregator.getOlpAssetAmounts(contractAddresses);

    let description = "";
    let isLowAvailable = false;

    targetAssets.forEach(asset => {
      const {message: _partialMessage, isLowAvailable: _isLowAvailable} = checkAssetAmount(sOlpAssetAmounts, asset);
      description += _partialMessage;
      if (_isLowAvailable) {
        isLowAvailable = true;
      }
    });
    const near9AM = isTimeInRange(8, 30, 9, 30);
    console.log("isLowAvailable, near9AM: ", isLowAvailable, near9AM);
    const title = isLowAvailable ? `${MESSAGE_TYPE.LOW_AVAILABLE_AMOUNTS}` : `${MESSAGE_TYPE.AVAILABLE_AMOUNTS}`;
    const tags = near9AM ? [SlackTag.ALL] : [];

    await sendMessage(title, LogLevel.INFO, {
      description,
      tags,
    });
  } catch (error) {
    console.log('Error processing checkAvailableAmounts:', error);
    await sendMessage(
      `[lambda][check.availableAmounts.ts] ${MESSAGE_TYPE.ERROR_DURING_CHECKING_AVAILABLE_AMOUNTS}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      }
    );
  }
};