import BigNumber from "bignumber.js";
import pako from "pako";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getAllowanceForController, getAllowanceForPool, getUserBalance } from "@/utils/contract";
import {
  IControllerAllowance,
  IPoolAllowance,
  ITwitterInfo,
  IUserBalance,
  IUserSlice,
} from "@/interfaces/interfaces.userSlice";
import { SupportedChains } from "@callput/shared";
import { getTwitterInfo } from "@/utils/twitter.ts";
import { TRADE_DATA_API, VOLUME_DATA_API } from "@/networks/apis";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

const initialState: IUserSlice = {
  allowance: {
    controller: {
      quoteToken: {
        // 사용자가 router에 quote token을 approve 했는지 확인
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
    },
    pool: {
      sOlpManager: {
        // 사용자가 olp manager에 quote token을 approve 했는지 확인
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      mOlpManager: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      lOlpManager: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
    },
  },
  balance: {
    quoteAsset: {
      ETH: "0",
      WBTC: "0",
      WETH: "0",
      USDC: "0",
    },
    quoteToken: {
      wbtc: "0",
      weth: "0",
      usdc: "0",
    },
    olpToken: {
      sOlp: "0",
      mOlp: "0",
      lOlp: "0",
    },
    claimableReward: {
      sOlp: "0",
      mOlp: "0",
      lOlp: "0",
    },
    cooldown: {
      sOlp: "0",
      mOlp: "0",
      lOlp: "0",
    },
  },
  volume: {
    totalNotionalVolume: 0,
  },
  tradeData: {
    BTC: {
      tradeCount: 0,
      tradeSize: "0",
      notionalVolume: "0",
    },
    ETH: {
      tradeCount: 0,
      tradeSize: "0",
      notionalVolume: "0",
    },
  },
  twitterInfo: {
    isConnected: false,
    id: "",
    username: "",
    profileImageUrl: "",
  },
};

export const loadAllowanceForController = createAsyncThunk(
  "user/loadAllowanceForController",
  async ({ chain, address }: { chain: SupportedChains; address: `0x${string}` | undefined }) => {
    const controller: IControllerAllowance = {
      quoteToken: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
    };

    if (!address) return controller;

    return await getAllowanceForController(controller, address, chain);
  }
);

export const loadAllowanceForPool = createAsyncThunk(
  "user/loadAllowanceForPool",
  async ({ chain, address }: { chain: SupportedChains; address: `0x${string}` | undefined }) => {
    const pool: IPoolAllowance = {
      sOlpManager: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      mOlpManager: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      lOlpManager: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
    };

    if (!address) return pool;

    return await getAllowanceForPool(pool, address, chain);
  }
);

export const loadBalance = createAsyncThunk(
  "user/loadBalance",
  async ({ chain, address }: { chain: SupportedChains; address: `0x${string}` | undefined }) => {
    const balance: IUserBalance = {
      quoteAsset: {
        ETH: "0",
        WBTC: "0",
        WETH: "0",
        USDC: "0",
      },
      quoteToken: {
        wbtc: "0",
        weth: "0",
        usdc: "0",
      },
      olpToken: {
        sOlp: "0",
        mOlp: "0",
        lOlp: "0",
      },
      claimableReward: {
        sOlp: "0",
        mOlp: "0",
        lOlp: "0",
      },
      cooldown: {
        sOlp: "0",
        mOlp: "0",
        lOlp: "0",
      },
    };

    if (!address) return balance;

    return await getUserBalance(balance, address, chain);
  }
);

export const loadVolumeData = createAsyncThunk("user/loadVolumeData", async (chain: SupportedChains) => {
  const volumeData = {
    totalNotionalVolume: 0,
  };

  try {
    const volumeDataRes = await fetch(VOLUME_DATA_API[chain]);

    if (!volumeDataRes.ok) {
      throw new Error("Failed to fetch volume data");
    }

    const volumeResult = await volumeDataRes.json();

    if (volumeResult) {
      volumeData.totalNotionalVolume = isNaN(volumeResult.result.total_notional_volume)
        ? 0
        : Number(volumeResult.result.total_notional_volume);
    }
  } catch (error) {
    console.log(error);
  }

  return volumeData;
});

export const loadTradeData = createAsyncThunk(
  "user/loadTradeData",
  async ({ chain, address }: { chain: SupportedChains; address: `0x${string}` | undefined }) => {
    const tradeData = {
      BTC: {
        tradeCount: 0,
        tradeSize: "0",
        notionalVolume: "0",
      },
      ETH: {
        tradeCount: 0,
        tradeSize: "0",
        notionalVolume: "0",
      },
    };

    try {
      const tradeDataRes = await fetch(TRADE_DATA_API[chain]);

      if (!tradeDataRes.ok) {
        throw new Error("Failed to fetch trade data");
      }

      const compressedData = await tradeDataRes.arrayBuffer();

      const decompressedArray = pako.inflate(new Uint8Array(compressedData));
      const decompressedString = new TextDecoder().decode(decompressedArray);

      const tradeResult = JSON.parse(decompressedString);

      if (tradeResult && address) {
        const userTradeData = tradeResult.traders && tradeResult.traders[address?.toLocaleLowerCase()];

        if (userTradeData) {
          if (userTradeData.BTC) {
            tradeData.BTC.tradeCount = userTradeData.BTC.tradeCount;
            tradeData.BTC.tradeSize = userTradeData.BTC.tradeSize;
            tradeData.BTC.notionalVolume = userTradeData.BTC.notionalVolume;
          }

          if (userTradeData.ETH) {
            tradeData.ETH.tradeCount = userTradeData.ETH.tradeCount;
            tradeData.ETH.tradeSize = userTradeData.ETH.tradeSize;
            tradeData.ETH.notionalVolume = userTradeData.ETH.notionalVolume;
          }
        }
      }
    } catch (error) {
      console.log(error);
    }

    return tradeData;
  }
);

export const loadTwitterInfo = createAsyncThunk(
  "user/twitterInfo",
  async ({ chain, address }: { chain: SupportedChains; address: `0x${string}` | undefined }) => {
    const defaultTwitterInfo: ITwitterInfo = {
      isConnected: false,
      id: "",
      username: "",
      profileImageUrl: "",
    };
    if (!address) return defaultTwitterInfo;
    const data = await getTwitterInfo(chain, [address]);
    return data[address];
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadAllowanceForController.fulfilled, (state, action) => {
        if (action.payload) state.allowance.controller = action.payload;
      })
      .addCase(loadAllowanceForPool.fulfilled, (state, action) => {
        if (action.payload) state.allowance.pool = action.payload;
      })
      .addCase(loadBalance.fulfilled, (state, action) => {
        if (action.payload) state.balance = action.payload;
      })
      .addCase(loadVolumeData.fulfilled, (state, action) => {
        state.volume = action.payload;
      })
      .addCase(loadTradeData.fulfilled, (state, action) => {
        state.tradeData = action.payload;
      })
      .addCase(loadTwitterInfo.fulfilled, (state, action) => {
        state.twitterInfo = action.payload;
      });
  },
});

export default userSlice.reducer;