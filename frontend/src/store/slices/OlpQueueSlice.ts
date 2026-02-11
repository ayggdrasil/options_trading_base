import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { SupportedChains } from "@callput/shared";
import { MY_OLP_QUEUE_API, MY_OLP_PNL_API } from "@/networks/apis";

export interface OlpQueueItem {
  queueIndex: string;
  olpQueueAddress: string;
  token: string;
  amount: string;
  receiver: string;
  isNative: boolean;
  blockTime: string;
}

export interface OlpPnl {
  holdings: string;
  investment: string;
  avgEntryPrice: string;
  realizedPnl: string;
  realizedRoi: string;
  realizedInvestment: string;
  lastUpdatedAt: string;
}

export interface OlpQueueState {
  account: string;
  deposits: OlpQueueItem[];
  withdrawals: OlpQueueItem[];
  lastUpdatedAt: number;
  loading: boolean;
  error: string | null;
  pnl: OlpPnl;
}

const initialState: OlpQueueState = {
  account: "",
  deposits: [],
  withdrawals: [],
  lastUpdatedAt: 0,
  loading: false,
  error: null,
  pnl: {
    holdings: "0",
    investment: "0",
    avgEntryPrice: "0",
    realizedPnl: "0",
    realizedRoi: "0",
    realizedInvestment: "0",
    lastUpdatedAt: "0",
  },
};

export const loadMyOlpQueue = createAsyncThunk(
  "olpQueue/loadMyOlpQueue",
  async ({
    chain,
    address,
  }: {
    chain: SupportedChains;
    address: `0x${string}` | undefined;
  }) => {
    const olpQueue = {
      account: initialState.account,
      deposits: initialState.deposits,
      withdrawals: initialState.withdrawals,
      lastUpdatedAt: initialState.lastUpdatedAt,
    };

    if (!address) {
      return olpQueue;
    }

    try {
      const response = await fetch(MY_OLP_QUEUE_API[chain] + address);

      if (!response.ok) {
        throw new Error("Failed to fetch OLP queue");
      }

      const result = await response.json();

      return {
        account: address,
        deposits: result.deposits || [],
        withdrawals: result.withdrawals || [],
        lastUpdatedAt: Date.now(),
      };
    } catch (error) {
      console.log(error);
    }

    return {
      ...olpQueue,
      account: address,
    };
  }
);

export const loadMyOlpPnl = createAsyncThunk(
  "olpQueue/loadMyOlpPnl",
  async ({
    chain,
    address,
  }: {
    chain: SupportedChains;
    address: `0x${string}` | undefined;
  }) => {
    const pnl = {
      holdings: "0",
      investment: "0",
      avgEntryPrice: "0",
      realizedPnl: "0",
      realizedRoi: "0",
      realizedInvestment: "0",
      lastUpdatedAt: "0",
    };

    if (!address) {
      return pnl;
    }

    try {
      const response = await fetch(MY_OLP_PNL_API[chain] + address);

      if (!response.ok) {
        throw new Error("Failed to fetch OLP P&L");
      }

      const result: OlpPnl = await response.json();

      return result;
    } catch (error) {
      console.log(error);
    }

    return pnl;
  }
);

const olpQueueSlice = createSlice({
  name: "olpQueue",
  initialState,
  reducers: {
    resetOlpQueue: (state) => {
      Object.assign(state, initialState);
    },
    updateOlpQueueItem: (
      state,
      action: PayloadAction<{
        queueIndex: string;
        olpQueueAddress: string;
        type: "deposit" | "withdraw";
        status: "add" | "remove";
        item?: OlpQueueItem;
      }>
    ) => {
      const { queueIndex, olpQueueAddress, type, status, item } =
        action.payload;

      if (status === "add" && item) {
        if (type === "deposit") {
          state.deposits.push(item);
        } else {
          state.withdrawals.push(item);
        }
      } else if (status === "remove") {
        if (type === "deposit") {
          state.deposits = state.deposits.filter(
            (d) =>
              !(
                d.queueIndex === queueIndex &&
                d.olpQueueAddress === olpQueueAddress
              )
          );
        } else {
          state.withdrawals = state.withdrawals.filter(
            (w) =>
              !(
                w.queueIndex === queueIndex &&
                w.olpQueueAddress === olpQueueAddress
              )
          );
        }
      }

      state.lastUpdatedAt = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMyOlpQueue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        loadMyOlpQueue.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.account = action.payload.account;
          state.deposits = action.payload.deposits;
          state.withdrawals = action.payload.withdrawals;
          state.lastUpdatedAt = action.payload.lastUpdatedAt;
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(loadMyOlpQueue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load OLP queue";
      })
      .addCase(loadMyOlpPnl.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        loadMyOlpPnl.fulfilled,
        (state, action: PayloadAction<OlpPnl>) => {
          state.pnl = action.payload;
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(loadMyOlpPnl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load OLP P&L";
      });
  },
});

export const { resetOlpQueue, updateOlpQueueItem } = olpQueueSlice.actions;

export default olpQueueSlice.reducer;
