import { OptionData } from "./options";

export type MarkIvAndPrice = {
  markIv: number;
  markPrice: number;
} 

export type InstrumentMarkData = {
  [key: string]: MarkIvAndPrice;
}

export type InstrumentMarkDataRes = {
  data: InstrumentMarkData;
  lastUpdatedAt: number;
}

export type CallPutData = {
  call: OptionData[];
  put: OptionData[];
}

export type ExpiryCallPutData = {
  [key: string]: CallPutData
}

export type OptionsMarketItem = {
  expiries: number[];
  options: ExpiryCallPutData;
}

export type OptionsMarketData = {
  BTC: OptionsMarketItem;
  ETH: OptionsMarketItem;
}