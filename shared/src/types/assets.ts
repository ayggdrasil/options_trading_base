import { NetworkQuoteAsset } from "../constants/assets";
import { SupportedChains } from "../constants/networks";

export type UnderlyingAssetIndex = 1 | 2;

export type VaultIndex = 0 | 1 | 2;

export type NetworkQuoteAssetKey<T extends SupportedChains> = keyof (typeof NetworkQuoteAsset)[T];

export type AllNetworkQuoteAsset =
  | keyof (typeof NetworkQuoteAsset)["Base"]
  | keyof (typeof NetworkQuoteAsset)["Arbitrum One"];
