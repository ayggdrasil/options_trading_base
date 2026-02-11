import { ChainId } from './networks';
import { CONTRACT_ADDRESSES as CONTRACT_ADDRESSES_SHARED, SupportedChains } from '@callput/shared';

export const CONTRACT_ADDRESSES = {
  [ChainId.BASE]: {
    ...CONTRACT_ADDRESSES_SHARED[SupportedChains['Base']],
  },
  [ChainId.ARBITRUM_ONE]: {
    ...CONTRACT_ADDRESSES_SHARED[SupportedChains['Arbitrum One']],
  },
};

export const ASSET_TOKEN_ADDRESSES = {
  [ChainId.BASE]: [
    CONTRACT_ADDRESSES[ChainId.BASE].WBTC.toLowerCase(),
    CONTRACT_ADDRESSES[ChainId.BASE].WETH.toLowerCase(),
    CONTRACT_ADDRESSES[ChainId.BASE].USDC.toLowerCase(),
  ],
  [ChainId.ARBITRUM_ONE]: [
    CONTRACT_ADDRESSES[ChainId.ARBITRUM_ONE].WBTC.toLowerCase(),
    CONTRACT_ADDRESSES[ChainId.ARBITRUM_ONE].WETH.toLowerCase(),
    CONTRACT_ADDRESSES[ChainId.ARBITRUM_ONE].USDC.toLowerCase(),
  ],
};
