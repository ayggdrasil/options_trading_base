import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import BigNumber from "bignumber.js";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface KlinesData {
  interval: string,
  data: any[],
  timestamp: number
}

interface State {
  klines: {
    BTCUSDC: KlinesData,
    ETHUSDC: KlinesData
  }
}

const initialState: State = {
  klines: {
    BTCUSDC: {
      interval: "",
      data: [],
      timestamp: 0
    },
    ETHUSDC: {
      interval: "",
      data: [],
      timestamp: 0
    }
  }
}

const webSocketSlice = createSlice({
  name: 'webSocket',
  initialState,
  reducers: {
    updateKlinesBTC: (state, action: PayloadAction<KlinesData>) => {
      state.klines.BTCUSDC = action.payload;
    },
    updateKlinesETH: (state, action: PayloadAction<KlinesData>) => {
      state.klines.ETHUSDC = action.payload;
    }
  }
});

export const { updateKlinesBTC, updateKlinesETH } = webSocketSlice.actions;
export default webSocketSlice.reducer;