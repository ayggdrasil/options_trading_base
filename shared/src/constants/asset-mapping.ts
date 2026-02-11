import {
  QAStringToTickerMap,
  QATickerToNumberMap,
  UAIndexToNumberMap,
  UAIndexToStringMap,
  UAIndexToTickerMap,
  UAStringToTickerMap,
  UATickerToIndexMap,
  UATickerToNumberMap,
} from "../types/asset-mappings";
import { CONTRACT_ADDRESSES } from "./addresses";
import { NetworkQuoteAsset, UnderlyingAsset } from "./assets";
import { SupportedChains } from "./networks";

export const UA_TICKER_TO_INDEX: UATickerToIndexMap = {
  [SupportedChains.Base]: {
    [UnderlyingAsset.BTC]: 1,
    [UnderlyingAsset.ETH]: 2,
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]: 1,
    [UnderlyingAsset.ETH]: 2,
  },
};

export const UA_TICKER_TO_DECIMAL: UATickerToNumberMap = {
  [SupportedChains.Base]: {
    [UnderlyingAsset.BTC]: 8,
    [UnderlyingAsset.ETH]: 18,
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]: 8,
    [UnderlyingAsset.ETH]: 18,
  },
};

export const UA_INDEX_TO_TICKER: UAIndexToTickerMap = {
  [SupportedChains.Base]: {
    [1]: UnderlyingAsset.BTC,
    [2]: UnderlyingAsset.ETH,
  },
  [SupportedChains["Arbitrum One"]]: {
    [1]: UnderlyingAsset.BTC,
    [2]: UnderlyingAsset.ETH,
  },
};

export const UA_INDEX_TO_DECIMAL: UAIndexToNumberMap = {
  [SupportedChains.Base]: {
    [1]: UA_TICKER_TO_DECIMAL["Base"][UnderlyingAsset.BTC],
    [2]: UA_TICKER_TO_DECIMAL["Base"][UnderlyingAsset.ETH],
  },
  [SupportedChains["Arbitrum One"]]: {
    [1]: UA_TICKER_TO_DECIMAL["Arbitrum One"][UnderlyingAsset.BTC],
    [2]: UA_TICKER_TO_DECIMAL["Arbitrum One"][UnderlyingAsset.ETH],
  },
};

export const UA_INDEX_TO_ADDRESS: UAIndexToStringMap = {
  [SupportedChains["Base"]]: {
    [1]: CONTRACT_ADDRESSES["Base"].WBTC,
    [2]: CONTRACT_ADDRESSES["Base"].WETH,
  },
  [SupportedChains["Arbitrum One"]]: {
    [1]: CONTRACT_ADDRESSES["Arbitrum One"].WBTC,
    [2]: CONTRACT_ADDRESSES["Arbitrum One"].WETH,
  },
};

export const UA_ADDRESS_TO_TICKER: UAStringToTickerMap = {
  [SupportedChains["Base"]]: {
    [CONTRACT_ADDRESSES["Base"].WBTC.toLowerCase()]: UnderlyingAsset.BTC,
    [CONTRACT_ADDRESSES["Base"].WETH.toLowerCase()]: UnderlyingAsset.ETH,
  },
  [SupportedChains["Arbitrum One"]]: {
    [CONTRACT_ADDRESSES["Arbitrum One"].WBTC.toLowerCase()]: UnderlyingAsset.BTC,
    [CONTRACT_ADDRESSES["Arbitrum One"].WETH.toLowerCase()]: UnderlyingAsset.ETH,
  },
};

export const QA_TICKER_TO_DECIMAL: QATickerToNumberMap = {
  [SupportedChains["Base"]]: {
    [NetworkQuoteAsset["Base"].ETH]: 18,
    [NetworkQuoteAsset["Base"].WBTC]: 8,
    [NetworkQuoteAsset["Base"].WETH]: 18,
    [NetworkQuoteAsset["Base"].USDC]: 6,
  },
  [SupportedChains["Arbitrum One"]]: {
    [NetworkQuoteAsset["Arbitrum One"].ETH]: 18,
    [NetworkQuoteAsset["Arbitrum One"].WBTC]: 8,
    [NetworkQuoteAsset["Arbitrum One"].WETH]: 18,
    [NetworkQuoteAsset["Arbitrum One"].USDC]: 6,
  },
};

export const QA_ADDRESS_TO_TICKER: QAStringToTickerMap = {
  [SupportedChains["Base"]]: {
    [CONTRACT_ADDRESSES["Base"].WBTC.toLowerCase()]: NetworkQuoteAsset["Base"].WBTC,
    [CONTRACT_ADDRESSES["Base"].WETH.toLowerCase()]: NetworkQuoteAsset["Base"].WETH,
    [CONTRACT_ADDRESSES["Base"].USDC.toLowerCase()]: NetworkQuoteAsset["Base"].USDC,
  },
  [SupportedChains["Arbitrum One"]]: {
    [CONTRACT_ADDRESSES["Arbitrum One"].WBTC.toLowerCase()]: NetworkQuoteAsset["Arbitrum One"].WBTC,
    [CONTRACT_ADDRESSES["Arbitrum One"].WETH.toLowerCase()]: NetworkQuoteAsset["Arbitrum One"].WETH,
    [CONTRACT_ADDRESSES["Arbitrum One"].USDC.toLowerCase()]: NetworkQuoteAsset["Arbitrum One"].USDC,
  },
};
