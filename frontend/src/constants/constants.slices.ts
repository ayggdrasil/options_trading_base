import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";

export const initialOptionDetail: IOptionDetail = {         
  instrument: "", 
  optionId: "",
  strikePrice: 0,
  markIv: 0,
  markPrice: 0,
  riskPremiumRateForBuy: 0,
  riskPremiumRateForSell: 0,
  delta: 0,
  gamma: 0,
  vega: 0,
  theta: 0,
  volume: 0,
  isOptionAvailable: false
}