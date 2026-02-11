import BigNumber from "bignumber.js";
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { MY_POSITION_HISTORY_API } from "@/networks/apis";
import { OptionDirection, OptionStrategy, OrderSide } from "@/utils/types";
import { SupportedChains } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export interface PositionHistory {
  account: string;
  requestIndex: string;
  underlyingAssetIndex: string;
  expiry: string;
  type: string;
  optionTokenId: string;
  size: string;
  quoteToken: string;
  quoteAmount: string;
  collateralToken: string;
  collateralAmount: string;
  executionPrice: string;
  avgExecutionPrice: string;
  settlePrice: string;
  settlePayoff: string;
  spotPrice: string;
  cashFlow: string;
  pnl: string;
  roi: string;
  processBlockTime: string;
}

export interface PositionHistoryWithMetadata extends PositionHistory {
  metadata: {
    type: string;
    uaPrice: number;
    instrument: string;
    optionDirection: OptionDirection;
    optionOrderSide: OrderSide;
    optionStrategy: OptionStrategy;
    pairedOptionStrikePrice: number;
    size: number;
    collateral: number;
    avgPrice: number;
    settlePayoff: number;
    pnl: number;
    roi: number;
    cashflow: number;
    entryPrice: number;
    lastPrice: number;
  };
}

export interface PositionHistoryState {
  account: string;
  BTC: PositionHistory[];
  ETH: PositionHistory[];
  lastUpdatedAt: string;
}

const initialState: PositionHistoryState = {
  account: "",
  BTC: [],
  ETH: [],
  lastUpdatedAt: "0",
};

export const loadMyPositionHistory = createAsyncThunk(
  "positionHistory/loadMyPositionHistory",
  async ({ chain, address, timestamp }: {chain: SupportedChains, address: `0x${string}` | undefined, timestamp?: number}) => {
    if (!address) {
      return initialState;
    }

    timestamp = timestamp || Math.floor(new Date().getTime() / 1000) - 7776000;

    const response = await fetch(
      MY_POSITION_HISTORY_API[chain] + "&address=" + address + "&timestamp=" + timestamp
    );

    if (!response.ok) {
      throw new Error("Failed to fetch my positions");
    }

    const result = await response.json();

    return result;
  }
);

const positionHistorySlice = createSlice({
  name: "positionHistory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadMyPositionHistory.fulfilled, (state, action: PayloadAction<any>) => {
      state.account = action.payload.account;
      state.BTC = action.payload.BTC;
      state.ETH = action.payload.ETH;
      state.lastUpdatedAt = action.payload.lastUpdatedAt;
    });
  },
});

export default positionHistorySlice.reducer;
