import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { SupportedChains } from "@callput/shared";
import { EPOCH_INFO_API } from "@/networks/apis";

export interface EpochInfo {
  vaultType: string;
  currentRound: number;
  currentStage: "SUBMISSION" | "PROCESS";
  epochStartedAt: number;
  submissionStartsAt: number;
  submissionEndsAt: number;
  processStartsAt: number;
  processEndsAt: number;
  nextEpochStartsAt: number;
  appliedConfig: {
    submissionDurationMinutes: number;
    processDurationMinutes: number;
  };
  nextConfig: {
    submissionDurationMinutes: number;
    processDurationMinutes: number;
  };
  configChanged: boolean;
  timestamp: number;
  lastUpdated: number;
}

export interface OlpEpochState {
  epochInfo: EpochInfo;
  loading: boolean;
  error: string | null;
}

const initialState: OlpEpochState = {
  epochInfo: {
    vaultType: "",
    currentRound: 0,
    currentStage: "SUBMISSION",
    epochStartedAt: 0,
    submissionStartsAt: 0,
    submissionEndsAt: 0,
    processStartsAt: 0,
    processEndsAt: 0,
    nextEpochStartsAt: 0,
    appliedConfig: {
      submissionDurationMinutes: 0,
      processDurationMinutes: 0,
    },
    nextConfig: {
      submissionDurationMinutes: 0,
      processDurationMinutes: 0,
    },
    configChanged: false,
    timestamp: 0,
    lastUpdated: 0,
  },
  loading: false,
  error: null,
};

export const loadEpochInfo = createAsyncThunk(
  "olpEpoch/loadEpochInfo",
  async ({ chain, vaultType = "s" }: { chain: SupportedChains; vaultType?: string }) => {
    const epochInfo = { ...initialState.epochInfo };

    try {
      const apiUrl = EPOCH_INFO_API[chain];
      if (!apiUrl) {
        throw new Error(`Epoch info API not available for chain: ${chain}`);
      }

      const response = await fetch(`${apiUrl}?vaultType=${vaultType}`);

      if (!response.ok) {
        throw new Error("Failed to fetch epoch info");
      }

      const result = await response.json();

      if (result) {
        return result as EpochInfo;
      }
    } catch (error) {
      console.log(error);
    }

    return epochInfo;
  }
);

const olpEpochSlice = createSlice({
  name: "olpEpoch",
  initialState,
  reducers: {
    resetOlpEpoch: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadEpochInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadEpochInfo.fulfilled, (state, action: PayloadAction<EpochInfo>) => {
        state.epochInfo = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(loadEpochInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load epoch info";
      });
  },
});

export const { resetOlpEpoch } = olpEpochSlice.actions;

export default olpEpochSlice.reducer;

