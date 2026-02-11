import { NormalizedFuturesAsset, NormalizedSpotAsset } from "../constants/assets";

/*
 * Spot Asset
 */

export type SpotAssetNumberMap = {
  [key in NormalizedSpotAsset]: number;
};

export type SpotAssetIndexMap = SpotAssetNumberMap;

export type SpotAssetIndexMapRes = {
  data: SpotAssetIndexMap;
  lastUpdatedAt: number;
};

/*
 * Futures Asset
 */

export type FuturesAssetNumberMap = {
  [key in NormalizedFuturesAsset]: number;
};

export type FuturesAssetIndexMap = FuturesAssetNumberMap;

export type FuturesAssetIndexMapRes = {
  data: FuturesAssetIndexMap;
  lastUpdatedAt: number;
};

export type FuturesAssetNumberTimeSeries = {
  [timestamp: string]: FuturesAssetNumberMap;
};

export type FuturesAssetIndexTimeSeries = FuturesAssetNumberTimeSeries;

/*
 * Index
 */

export type AssetIndexMap<T extends NormalizedSpotAsset | NormalizedFuturesAsset> =
  T extends NormalizedSpotAsset ? SpotAssetIndexMap : FuturesAssetIndexMap;

export type AssetIndexMapRes<T extends NormalizedSpotAsset | NormalizedFuturesAsset> = {
  data: AssetIndexMap<T>;
  lastUpdatedAt: number;
};

export type MultipleAssetIndexMapRes<T extends NormalizedSpotAsset | NormalizedFuturesAsset> = {
  [key: string]: AssetIndexMapRes<T>;
};
