import { ChainId } from './constants.networks';
import { CONTRACT_ADDRESSES as CONTRACT_ADDRESSES_SHARED, SupportedChains } from '@callput/shared';

// MULTICALL3 addresses (not in JSON files)
const MULTICALL3_ADDRESSES = {
  [ChainId.BASE]: '0xcA11bde05977b3631167028862bE2a173976CA11', // Canonical Multicall3 address for Base
  [ChainId.ARBITRUM_ONE]: '0xcA11bde05977b3631167028862bE2a173976CA11', // Canonical Multicall3 address for Arbitrum
} as const;

export const CONTRACT_ADDRESSES = {
  [ChainId.BASE]: {
    ...CONTRACT_ADDRESSES_SHARED[SupportedChains['Base']],
    MULTICALL3: MULTICALL3_ADDRESSES[SupportedChains['Base']],
  },
  [ChainId.ARBITRUM_ONE]: {
    ...CONTRACT_ADDRESSES_SHARED[SupportedChains['Arbitrum One']],
    MULTICALL3: MULTICALL3_ADDRESSES[SupportedChains['Arbitrum One']],
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
