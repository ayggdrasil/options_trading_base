import { NetworkQuoteAsset, UnderlyingAsset } from "../constants/assets";
import { SupportedChains } from "../constants/networks";
import { AllNetworkQuoteAsset, UnderlyingAssetIndex } from "./assets";

export type UATickerToNumberMap = {
  [K in SupportedChains]: {
    [A in UnderlyingAsset]: number;
  };
};

export type UATickerToIndexMap = {
  [K in SupportedChains]: {
    [A in UnderlyingAsset]: UnderlyingAssetIndex;
  };
};

export type UAIndexToNumberMap = {
  [K in SupportedChains]: {
    [A in UnderlyingAssetIndex]: number;
  };
};

export type UAIndexToStringMap = {
  [K in SupportedChains]: {
    [A in UnderlyingAssetIndex]: string;
  };
};

export type UAIndexToTickerMap = {
  [K in SupportedChains]: {
    [A in UnderlyingAssetIndex]: UnderlyingAsset;
  };
};

export type UAStringToTickerMap = {
  [K in SupportedChains]: {
    [A in string]: UnderlyingAsset;
  };
};

export type QATickerToNumberMap = {
  [K in SupportedChains]: {
    [A in keyof (typeof NetworkQuoteAsset)[K]]: number;
  };
};

export type QAStringToTickerMap = {
  [K in SupportedChains]: {
    [A in string]: AllNetworkQuoteAsset;
  };
};

export type UnderlyingAssetExpiryMap = {
  [key in string]: number[];
};

export type UnderlyingAssetExpiryMapRes = {
  data: UnderlyingAssetExpiryMap;
  lastUpdatedAt: number;
};
