import { UnderlyingAsset } from "@callput/shared";

// Options Related
export type OptionDirection = 'Call' | 'Put';
export type OrderSide = "Buy" | "Sell";
export type OptionStrategy = "Vanilla" | "Spread";
export type PriceUnit = UnderlyingAsset | "USD";
export type TradeDataMenuType = 'My Positions' | 'History';
export type HistoryFilterType = 'All Types' | 'Open' | 'Close' | 'Settle' | 'Transfer';
export type HistoryRangeType = "1 Day" | "1 Week" | "1 Month" | "3 Months" | "6 Months" | "All";
export type PositionManagementMenu = "Open Positions" | "History";

export type StrategyType = 'BuyCall' | 'SellCall' | 'BuyPut' | 'SellPut' | 'BuyCallSpread' | 'SellCallSpread' | 'BuyPutSpread' | 'SellPutSpread';

export type OptionData = {
  strike: number;
  modelPrice: number;
  rp: number;
};

// Position
export type Position = {
  underlyingAsset: string;
  strikePrice: string;
  isCall: boolean;
  isBuy: boolean;
  
  qty: string;
  orderPrice: string;
  currentIv: number;
  
  markIV?: number;
  markPrice?: number;
  delta?: number;
  gamma?: number;
  vega?: number;
  theta?: number;
  riskPremium?: number;
}

export type GroupedPosition = {
  expiry: number;
  positions: Position[];
}

// Chart
export type ChartDataPoint = [number, number] // [x, y] => [assetPrice, profit]

export type ChartData = {
  list: ChartDataPoint[]
  dataMinX: number
  dataMaxX: number
  dataMinY: number
  dataMaxY: number
  tickInterval: number
  bepPoints: number[]
}

export type GenerateChartDataArg = {
  strikePrice: string
  fromTime: number
  expiry: number
  volatility: number
  isCall: boolean
  
  qty: string
  orderPrice: string

  assetPriceMin: number
  assetPriceMax: number
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

export type Option = {
  optionName?: string;
  modelPrice: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rpLong: number;
  rpShort: number;
  notionalVolume: number;
};