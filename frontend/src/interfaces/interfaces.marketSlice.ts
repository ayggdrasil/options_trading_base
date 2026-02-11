import { ITwitterInfo } from "@/interfaces/interfaces.userSlice.ts";
import { FuturesAssetIndexMap, OptionsMarketData, RiskFreeRateCollection, SpotAssetIndexMap, UnderlyingAsset, VolatilityScore } from "@callput/shared";

export interface IOptionDetail {
  instrument?: string;
  optionId: string;
  strikePrice: number;
  markIv: number;
  markPrice: number;
  riskPremiumRateForBuy: number;
  riskPremiumRateForSell: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  volume: number;
  isOptionAvailable: boolean;
}

interface IOlpGreeks {
  BTC: {
    delta: number;
    gamma: number;
    vega: number;
    theta: number;
  };
  ETH: {
    delta: number;
    gamma: number;
    vega: number;
    theta: number;
  };
}

interface IOlpAssetAmounts {
  wbtc: {
    utilizedAmount: number;
    availableAmount: number;
    depositedAmount: number;
  };
  weth: {
    utilizedAmount: number;
    availableAmount: number;
    depositedAmount: number;
  };
  usdc: {
    utilizedAmount: number;
    availableAmount: number;
    depositedAmount: number;
  };
}

interface IOlpUtilityRatio {
  utilizedUsd: number;
  depositedUsd: number;
}

interface IOlpStatsItem {
  greeks: IOlpGreeks;
  assetAmounts: IOlpAssetAmounts;
  utilityRatio: IOlpUtilityRatio;
}

export interface IOlpStats {
  sOlp: IOlpStatsItem;
  mOlp: IOlpStatsItem;
  lOlp: IOlpStatsItem;
}

export interface IOptionsInfo {
  [key: string]: IOptionDetail;
}

interface ISettlePrices {
  [key: string]: {
    BTC: number;
    ETH: number;
  };
}

export interface ILeadTrader {
  id: number;
  address: `0x${string}`;
  optionTokenId: string;
  executionPrice: string;
  processBlockTime: string;
  expiry: number;
  copyTraders: number;
  copyTradesVolume: number;
  rebatesFromCopyTrades: number;
  strikePrice: number;
  strategy: "BuyCallSpread" | "BuyPutSpread";
  socialTradingGrade: number;
  size: string;
  twitterInfo: ITwitterInfo;
}

export interface ILeadTraders {
  [key: string]: ILeadTrader[];
}

export interface ITradingTitle {
  underlyingAsset: string;
  underlyingFutures: number;
}

export interface IMarketSlice {
  underlyingAssets: UnderlyingAsset[];
  market: OptionsMarketData;
  futuresAssetIndexMap: FuturesAssetIndexMap;
  spotAssetIndexMap: SpotAssetIndexMap;
  riskFreeRateCollection: RiskFreeRateCollection;
  olpStats: IOlpStats;
  volatilityScore: VolatilityScore; 
  optionsInfo?: IOptionsInfo;
  settlePrices?: ISettlePrices;
  leadTraders?: ILeadTraders;
  tradingTitle?: ITradingTitle | null;
}