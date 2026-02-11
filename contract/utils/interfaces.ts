import { Ticker } from "./enums"

/*
 * inteface for market data
 */

interface FuturesIndices {
  BTC: number,
  btc: number,
  ETH: number,
  eth: number
}

export interface IFuturesIndicesData {
  data: FuturesIndices,
  timestamp: number
}

interface ISpotIndicesData {
  BTC: number,
  btc: number,
  ETH: number,
  eth: number,
  usdc: number,
  USDC: number,
  WBTC: number,
  wbtc: number,
  WETH: number,
  weth: number
}

interface IRiskFreeRates {
  BTC: {
    [key: string]: number  
  },
  btc: {
    [key: string]: number
  },
  ETH: {
    [key: string]: number
  },
  eth: {
    [key: string]: number
  },
}

interface IOptionDetail {
  instrument?: string,
  optionId: string,
  strikePrice: number,
  markIv: number,
  markPrice: number,
  riskPremiumRateForBuy: number,
  riskPremiumRateForSell: number,
  delta: number,
  gamma: number,
  vega: number,
  theta: number,
  volume: number,
  isOptionAvailable: boolean
}

interface IOptionType {
  call: IOptionDetail[],
  put: IOptionDetail[]
}

interface IOptions {
  [key: string]: IOptionType
}

interface IMarketItem {
  expiries: number[],
  options: IOptions
}

export interface IMarket {
  BTC: IMarketItem,
  ETH: IMarketItem
}

interface IOlpGreeks {
  BTC: {
    delta: number,
    gamma: number,
    vega: number,
    theta: number
  },
  ETH: {
    delta: number,
    gamma: number,
    vega: number,
    theta: number
  }
}

interface IOlpAssetAmounts {
  wbtc: {
    utilizedAmount: number,
    availableAmount: number,
    depositedAmount: number
  },
  weth: {
    utilizedAmount: number,
    availableAmount: number,
    depositedAmount: number
  },
  usdc: {
    utilizedAmount: number,
    availableAmount: number,
    depositedAmount: number
  }
}

interface IOlpUtilityRatio {
  utilizedUsd: number,
  availableUsd: number
}

interface IOlpStatsItem {
  greeks: IOlpGreeks,
  assetAmounts: IOlpAssetAmounts,
  utilityRatio:IOlpUtilityRatio
}

interface IOlpStats {
  sOlp: IOlpStatsItem,
  mOlp: IOlpStatsItem,
  lOlp: IOlpStatsItem
}

export interface IOptionsInfo {
  [key: string]: IOptionDetail
}

export interface IMarketData {
  underlyingAssets: Ticker.UnderlyingAsset[],
  market: IMarket,
  futuresIndices: IFuturesIndicesData,
  spotIndices: ISpotIndicesData,
  riskFreeRates: IRiskFreeRates,
  olpStats: IOlpStats
}





/*
 * inteface option data in string
 */

export interface OptionDataStr {
  length: number;
  isBuys: string;
  strikePrices: string;
  isCalls: string;
  optionNames: string;
}