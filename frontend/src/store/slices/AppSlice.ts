import { IOlpMetrics } from "@/interfaces/interfaces.appSlice";
import { OLP_APR_API } from "@/networks/apis";
import { getOlpMetrics, getEpochStages } from "@/utils/contract";
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import BigNumber from "bignumber.js";
import { SupportedChains } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export interface IEpochStages {
  sOlp: 0 | 1; // 0: REQUEST_SUBMISSION, 1: QUEUE_PROCESSING
  mOlp: 0 | 1;
  lOlp: 0 | 1;
}

const initialState = {
  epochStages: {
    sOlp: 0,
    mOlp: 0,
    lOlp: 0,
  } as IEpochStages,
  olpMetrics: {
    sOlp: {
      targetWeight: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      currentWeight: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      buyUsdgFee: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      sellUsdgFee: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      price: "0",
      totalSupply: "0",
    },
    mOlp: {
      targetWeight: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      currentWeight: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      buyUsdgFee: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      sellUsdgFee: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      price: "0",
      totalSupply: "0",
    },
    lOlp: {
      targetWeight: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      currentWeight: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      buyUsdgFee: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      sellUsdgFee: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      price: "0",
      totalSupply: "0",
    },
  },
  olpApr: {
    sOlp: {
      feeApr: 0,
      riskPremiumApr: 0,
    },
    mOlp: {
      feeApr: 0,
      riskPremiumApr: 0,
    },
    lOlp: {
      feeApr: 0,
      riskPremiumApr: 0,
    },
  },
};

export const loadEpochStages = createAsyncThunk(
  "app/loadEpochStages",
  async (chain: SupportedChains) => {
    return await getEpochStages(chain);
  }
);

export const loadOlpApr = createAsyncThunk(
  "app/loadOlpApr",
  async (chain: SupportedChains) => {
    const apr = {
      sOlp: {
        feeApr: 0,
        riskPremiumApr: 0,
      },
      mOlp: {
        feeApr: 0,
        riskPremiumApr: 0,
      },
      lOlp: {
        feeApr: 0,
        riskPremiumApr: 0,
      },
    };

    try {
      const result = await fetch(OLP_APR_API[chain]);

      if (!result.ok) throw new Error("Failed to fetch OLP APR data");

      const data = await result.json();

      apr.sOlp.feeApr = data["sOlp"]["feeApr"];
      apr.sOlp.riskPremiumApr = data["sOlp"]["riskPremiumApr"];
      apr.mOlp.feeApr = data["mOlp"]["feeApr"];
      apr.mOlp.riskPremiumApr = data["mOlp"]["riskPremiumApr"];
      apr.lOlp.feeApr = data["lOlp"]["feeApr"];
      apr.lOlp.riskPremiumApr = data["lOlp"]["riskPremiumApr"];
    } catch (error) {
      console.log(error);
    }

    return apr;
  }
);

// Contract API
export const loadOlpMetrics = createAsyncThunk(
  "app/loadOlpMetrics",
  async (chain: SupportedChains) => {
    const olpMetrics: IOlpMetrics = {
      sOlp: {
        targetWeight: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        currentWeight: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        buyUsdgFee: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        sellUsdgFee: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        price: "0",
        totalSupply: "0",
      },
      mOlp: {
        targetWeight: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        currentWeight: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        buyUsdgFee: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        sellUsdgFee: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        price: "0",
        totalSupply: "0",
      },
      lOlp: {
        targetWeight: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        currentWeight: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        buyUsdgFee: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        sellUsdgFee: {
          wbtc: "0",
          weth: "0",
          usdc: "0",
        },
        price: "0",
        totalSupply: "0",
      },
    };

    return await getOlpMetrics(olpMetrics, chain);
  }
);

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadEpochStages.fulfilled, (state, action: PayloadAction<IEpochStages>) => {
        if (action.payload) state.epochStages = action.payload;
      })
      .addCase(loadOlpApr.fulfilled, (state, action: PayloadAction<any>) => {
        if (action.payload) state.olpApr = action.payload;
      })
      .addCase(
        loadOlpMetrics.fulfilled,
        (state, action: PayloadAction<any>) => {
          if (action.payload) state.olpMetrics = action.payload;
        }
      );
  },
});

export default appSlice.reducer;
