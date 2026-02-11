export type Asymptotes = {
  L_alpha: number;
  L_beta: number;
  R_alpha: number;
  R_beta: number;
};

export type SVIParams = {
  a: number;
  b: number;
  rho: number;
  m: number;
  sigma: number;
};

export interface SviDataByOption {
  instrument: string;
  iv: number;
  ivSquared: number;
  strikePrice: number;
  logStrikePrice: number;
}

export interface SviDataByExpiry {
  ivs: {
    normal: number[];
    squared: number[];
  };
  strikePrices: {
    normal: number[];
    logarithmic: number[];
  };
  underlyingFutures: number;
  length: number;
}

export interface SviDataSet {
  [key: number]: SviDataByExpiry;
}

interface ExpiryDatesByAsset {
  [key: string]: number[]; // key is underlying asset, value is expiry date in timestamp
}

export interface ExpiryDatesMap {
  data: ExpiryDatesByAsset;
  lastUpdatedAt: number;
}

/*
 * Iv Related Interfaces
 */

export interface IvByOption {
  [key: string]: number; // key is instrument, value is iv
}

export interface IvMap<TAsset extends string> {
  data: Record<TAsset, IvByOption>;
  lastUpdatedAt: number;
}

export interface IvMaps<TAsset extends string> {
  [key: string]: IvMap<TAsset>; // key is exchange, value is IvMap
}

/*
 * Instrument Related Interfaces
 */

export interface UnderlyingAssetInstrumentMap {
  [key: string]: string[]; // key is underlying asset, value is instrument
}

/*
 * Response Iv Related Interfaces
 */

export interface ResponseIvItem {
  instrument: string;
  underlyingAsset: string;
  expiryDate: string;
  strikePrice: number;
  optionType: string;
  iv: number;
}

export interface ResponseIv {
  data: ResponseIvItem[];
  lastUpdatedAt: number;
}

export interface GroupedResponseIv {
  [key: number]: ResponseIvItem[];
}
