import { SupportedChains } from "./networks";

export const MainStableAsset = {
  USDC: "USDC",
} as const;

export const UnderlyingAsset = {
  BTC: "BTC",
  ETH: "ETH",
} as const;

export const UnderlyingAssetWithAll = {
  ALL: "ALL",
  ...UnderlyingAsset,
} as const;

export const BaseQuoteAsset = {
  WBTC: "WBTC",
  WETH: "WETH",
  USDC: "USDC",
} as const;

export const NetworkQuoteAsset = {
  [SupportedChains.Base]: {
    ...BaseQuoteAsset,
    ETH: "ETH",
  },
  [SupportedChains["Arbitrum One"]]: {
    ...BaseQuoteAsset,
    ETH: "ETH",
  },
} as const;

export type MainStableAsset = keyof typeof MainStableAsset;
export type UnderlyingAsset = keyof typeof UnderlyingAsset;
export type UnderlyingAssetWithAll = keyof typeof UnderlyingAssetWithAll;
export type BaseQuoteAsset = keyof typeof BaseQuoteAsset;
export type NetworkQuoteAsset<T extends SupportedChains> =
  | BaseQuoteAsset
  | (T extends "Base" ? "ETH" : never)
  | (T extends "Arbitrum One" ? "ETH" : never);

export const NormalizedAssetType = {
  SPOT: "SPOT",
  FUTURES: "FUTURES",
} as const;

export const NormalizedSpotAsset = {
  BTC: "BTC",
  ETH: "ETH",
  USDC: "USDC",
  btc: "btc",
  eth: "eth",
  usdc: "usdc",
} as const;

export const NormalizedFuturesAsset = {
  BTC: "BTC",
  ETH: "ETH",
  btc: "btc",
  eth: "eth",
} as const;

export type NormalizedAssetType = keyof typeof NormalizedAssetType;
export type NormalizedSpotAsset = keyof typeof NormalizedSpotAsset;
export type NormalizedFuturesAsset = keyof typeof NormalizedFuturesAsset;
