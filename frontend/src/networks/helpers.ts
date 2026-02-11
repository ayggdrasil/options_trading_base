import { OlpKey } from "@/utils/enums";
import { SupportedChains } from "@callput/shared";
import { UnderlyingAsset } from "@callput/shared";
import { CONTRACT_ADDRESSES } from "./addresses";
import { DEV_NETWORK, OLP_TERM, PROD_NETWORK } from "./configs";
import { UA_INDEX_TO_TICKER, UA_TICKER_TO_DECIMAL, UA_TICKER_TO_INDEX } from "./assets";
import { getDaysToExpiration } from "@/utils/helper";

export function getNetworkConfigs(): any {
  const mode = import.meta.env.MODE;

  switch (mode) {
    case "prod":
      return PROD_NETWORK;
    case "dev":
      return DEV_NETWORK;
    default:
      return DEV_NETWORK;
  }
}

export function getChainIdFromNetworkConfigs(chain: SupportedChains): number {
  const networkConfigs = getNetworkConfigs();
  const config = networkConfigs[chain];
  if (!config) {
    throw new Error(`Network configuration for ${chain} is missing`);
  }
  return config.CHAIN_ID;
}

export function getRpcUrlFromNetworkConfigs(chain: SupportedChains): string {
  const networkConfigs = getNetworkConfigs();
  const config = networkConfigs[chain];
  if (!config) {
    throw new Error(`Network configuration for ${chain} is missing`);
  }
  return config.RPC_URL;
}

export const isSupportedChain = (chain: SupportedChains) => {
  const networkConfigs = getNetworkConfigs();
  return Object.keys(networkConfigs).includes(chain);
};

export const getUnderlyingAssetIndexByTicker = (
  chain: SupportedChains,
  ticker: UnderlyingAsset
): number => {
  return UA_TICKER_TO_INDEX[chain][ticker];
};

export const getUnderlyingAssetTickerByIndex = (chain: SupportedChains, index: number): UnderlyingAsset => {
  return UA_INDEX_TO_TICKER[chain][index];
};

export const getUnderlyingAssetDecimalByTicker = (
  chain: SupportedChains,
  ticker: UnderlyingAsset
): number => {
  return UA_TICKER_TO_DECIMAL[chain][ticker];
};

export const getOlpManagerAddress = (chain: SupportedChains, olpKey: OlpKey) => {
  if (olpKey === OlpKey.sOlp) return CONTRACT_ADDRESSES[chain].S_OLP_MANAGER;
  if (olpKey === OlpKey.mOlp) return CONTRACT_ADDRESSES[chain].M_OLP_MANAGER;
  if (olpKey === OlpKey.lOlp) return CONTRACT_ADDRESSES[chain].L_OLP_MANAGER;
};

export function getOlpKeyByExpiry(chain: SupportedChains, expiry: number) {
  const daysToExpiration = getDaysToExpiration(expiry);
  if (daysToExpiration <= OLP_TERM[chain].SHORT) return OlpKey.sOlp;
  if (daysToExpiration <= OLP_TERM[chain].MID) return OlpKey.mOlp;
  return OlpKey.lOlp;
}
