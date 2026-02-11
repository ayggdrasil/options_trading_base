import { UnderlyingAsset } from "@callput/shared";
import { Strategy } from "@callput/shared";
import { OptionDirection, OptionStrategy, OrderSide } from "@/utils/types";

export interface Position {
  underlyingAsset: string;
  optionTokenId: string;
  length: string;
  markPrice: number;
  markIv: number;
  mainOptionStrikePrice: number;
  pairedOptionStrikePrice: number;
  isBuys: string;
  strikePrices: string;
  isCalls: string;
  optionNames: string;
  size: string;
  sizeOpened: string;
  sizeClosing: string;
  sizeClosed: string;
  sizeSettled: string;
  isBuy: boolean;
  executionPrice: string;
  openedToken: string;
  openedAmount: string;
  openedCollateralToken: string;
  openedCollateralAmount: string;
  openedAvgExecutionPrice: string;
  openedAvgSpotPrice: string;
  closedToken: string;
  closedAmount: string;
  closedCollateralToken: string;
  closedCollateralAmount: string;
  closedAvgExecutionPrice: string;
  closedAvgSpotPrice: string;
  settledToken: string;
  settledAmount: string;
  settledCollateralToken: string;
  settledCollateralAmount: string;
  settledPrice: string;
  isSettled: boolean;
  lastProcessBlockTime: string;
}

export interface GroupedPosition {
  expiry: number;
  settlePrice: string;
  positions: Position[];
}

export interface FlattenedPosition extends Position {
  metadata: {
    expiry: number;
    isExpired: boolean;
    settlePrice: number;
    instrument: string;
    optionDirection: OptionDirection;
    optionOrderSide: OrderSide;
    optionStrategy: OptionStrategy;
    size: number;
    lastPrice: number;
    avgPrice: number;
    payoff: number;
    pnl: number;
    roi: number;
    cashflow: number;
    greeks: {
      delta: number;
      gamma: number;
      vega: number;
      theta: number;
    };
  };
}

export interface NewPosition {
  isOpen: boolean;
  underlyingAsset: UnderlyingAsset;
  underlyingAssetAddress: string;
  expiry: number;
  optionTokenId: string;
  length: string;
  mainOptionStrikePrice: number;
  pairedOptionStrikePrice: number;
  isBuys: string;
  strikePrices: string;
  isCalls: string;
  optionNames: string;
  size: string;
  executionPrice: string;
  openedToken?: string;  
  openedAmount?: string;
  openedCollateralToken?: string;
  openedCollateralAmount?: string;
  closedCollateralToken?: string;
  closedCollateralAmount?: string;
  lastProcessBlockTime: string;
}

export interface SettlePosition {
  underlyingAssetTicker: UnderlyingAsset;
  expiry: number;
  optionTokenId: string;
  strategy: Strategy;
  mainOptionName: string;
  pairedOptionName: string;
  mainOptionStrikePrice: string;
  pairedOptionStrikePrice: string;
  isBuy: boolean;
  size: string;
  settlePrice: string;
  processBlockTime: string;
}
