import { UA_INDEX_TO_TICKER } from "../constants/asset-mapping";
import { NormalizedSpotAsset, UnderlyingAsset } from "../constants/assets";
import { SupportedChains } from "../constants/networks";
import { UnderlyingAssetIndex, AllNetworkQuoteAsset } from "../types/assets";

export const getUnderlyingAssetByIndex = (
  chain: SupportedChains,
  index: UnderlyingAssetIndex
): UnderlyingAsset => {
  return UA_INDEX_TO_TICKER[chain][index];
};

export function convertQuoteAssetToNormalizedSpotAsset(
  quoteAsset: AllNetworkQuoteAsset,
  shouldThrowError: true
): NormalizedSpotAsset;
export function convertQuoteAssetToNormalizedSpotAsset(
  quoteAsset: AllNetworkQuoteAsset,
  shouldThrowError: false
): NormalizedSpotAsset | null;
export function convertQuoteAssetToNormalizedSpotAsset(quoteAsset: AllNetworkQuoteAsset): NormalizedSpotAsset;

export function convertQuoteAssetToNormalizedSpotAsset(
  quoteAsset: AllNetworkQuoteAsset,
  shouldThrowError: boolean = true
): NormalizedSpotAsset | null {
  switch (quoteAsset) {
    case "ETH":
      return "ETH";
    case "WBTC":
      return "BTC";
    case "WETH":
      return "ETH";
    case "USDC":
      return "USDC";
    default: {
      if (shouldThrowError) {
        throw new Error(`Invalid quote asset: ${quoteAsset}`);
      }
      return null;
    }
  }
}
