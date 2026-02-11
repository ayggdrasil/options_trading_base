import { Ticker } from "./enums";

export type OptionType = 'Call' | 'Put';
export type TradeType = "Buy" | "Sell";

export type FuturesData = {
  ticker: Ticker | null;
  price: number;
  timestamp: number;
  diff?: number;
}

export type OptionData = {
  ticker: Ticker | null;
  price: number;
  iv: number;
  date: DateObject;
  strikePrice: number;
  type: OptionType | null;
  timestamp: number;
  diff?: number;
}

export type DateObject = {
  year: number,
  month: number,
  day: number,
  hour: number
}

// Black Scholes Related
export type BlackScholesInput = {
  assetPrice: number;
  strikePrice: number;
  volatility: number;
  timeToExpiration: number;
  isCall: boolean;
  orderPrice?: number;
  qty?: number;
}

export type MarkPriceInputData = {
  underlyingFutures: number;
  strikePrice: number;
  iv: number;
  fromTime: number
  expiry: number;
  isCall: boolean;
  r?: number;
}

export type MarkPriceProfitInputData = {
  markPriceInputData: MarkPriceInputData;
  orderPrice: number;
  size: number;
}

export type GreeksInputData = {
  size: number; // 옵션 개수 (Long이면 1, Short이면 -1)
  underlyingFutures: number; // 기초 자산의 선물 가격 (ex. 29815)
  strikePrice: number; // Strike Price (ex. 30000)
  iv: number; // 현재 IV (ex. 0.2)
  expiry: number;
  isCall: boolean; // Call, Put 여부 (ex. true)
  isBuy: boolean;
  r?: number;
}

export type Greeks = {
  delta: number;
  gamma: number;
  vega: number; 
  theta: number;
}

export type GreeksWithMarkPrice = {
  greeks: Greeks;
  markPrice: number;
}

export type GreeksData = {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  markPrice: number;
}

export type GreeksInput = {
  P: number;
  F: number;
  K: number;
  IV: number;
  T: number;
  isCall: boolean;
  isLong: boolean;
  r?: number;
}

export type OlpAsset = {
  totalPoolUsd: number;
  totalPendingMpUsd: number;
  totalPendingRpUsd: number;
  totalReservedUsd: number;
  totalUtilizedUsd: number;
  totalAvailableUsd: number;
  totalDepositedUsd: number;
}

// Options Market Related
export type OptionDetail = {
  id: number;
  strikePrice: number;
  markIv?: number;
  markPrice?: number;
};

export type MarketDetail = {
  id: number;
  isLive: boolean;
  options: OptionDetail[];
}

export type AssetMarket = {
  indexAssetAddress: string;
  expiries: number[];
  markets: Record<number, MarketDetail>;
}

export type MarketData = {
  [key: string]: AssetMarket;
}