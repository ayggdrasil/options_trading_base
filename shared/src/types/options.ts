import { MarkIvAndPrice } from "./mark-iv-price";

export type OptionRiskPremiumInputData = MarkIvAndPrice & {
  strikePrice: number;
};

export type OptionData = OptionRiskPremiumInputData & {
  instrument?: string;
  optionId: string;
  riskPremiumRateForBuy: number;
  riskPremiumRateForSell: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  volume: number;
  isOptionAvailable: boolean;
  expiry?: number;
};

export type InstrumentOptionData = {
  [key: string]: OptionData;
}

export type OrderSide = "Buy" | "Sell";

export type OptionDirection = "Call" | "Put";

export type OptionTokenData = {
  length: number;
  isBuys: string;
  strikePrices: string;
  isCalls: string;
  optionNames: string;
};

export type Greeks = {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
};

export type GreeksInputData = {
  size: number; // quantity of options (buy: 1, sell: -1)
  underlyingFutures: number; // futures price of underlying asset
  strikePrice: number; // strike price
  iv: number; // current iv
  expiry: number; // expiration date
  isCall: boolean; // true: call, false: put
  isBuy: boolean; // true: buy, false: sell
  r?: number;
};

export type MarkPriceInputData = {
  underlyingFutures: number;
  strikePrice: number;
  iv: number;
  fromTime: number;
  expiry: number;
  isCall: boolean;
  r?: number;
};

export type MarkPriceProfitInputData = {
  markPriceInputData: MarkPriceInputData;
  orderPrice: number;
  size: number;
};
