import BigNumber from "bignumber.js";
import { IMarketSlice, ILeadTraders, ITradingTitle } from "@/interfaces/interfaces.marketSlice";
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {getTwitterInfo} from "@/utils/twitter.ts";
import { COPY_TRADE_EXPOSE_PERIOD, COPY_TRADE_THRESHOLD_1ST, COPY_TRADE_THRESHOLD_2ND } from "@/utils/constants";
import { COPY_TRADE_POSITION_HISTORY_API, MARKET_DATA_API } from "@/networks/apis";
import { SETTLE_PRICE_DATA_API } from "@/utils/apis";
import { getUnderlyingAssetDecimalByTicker } from "@/networks/helpers";
import { getMainOptionStrikePrice, getInstrumentOptionDataFromMarket, parseOptionTokenId, UnderlyingAsset, FuturesAssetIndexMapRes } from "@callput/shared";
import { SupportedChains } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

const initialState: IMarketSlice = {
  underlyingAssets: [
    UnderlyingAsset.BTC,
    UnderlyingAsset.ETH,
  ],
  market: {
    BTC: {
      expiries: [],
      options: {},
    },
    ETH: {
      expiries: [],
      options: {},
    },
  },
  futuresAssetIndexMap: {
    BTC: 0,
    btc: 0,
    ETH: 0,
    eth: 0
  },
  spotAssetIndexMap: {
    BTC: 0,
    btc: 0,
    ETH: 0,
    eth: 0,
    usdc: 0,
    USDC: 0,
  },
  riskFreeRateCollection: {
    BTC: {},
    btc: {},
    ETH: {},
    eth: {},
  },
  olpStats: {
    sOlp: {
      greeks: {
        BTC: {
          delta: 0,
          gamma: 0,
          vega: 0,
          theta: 0
        },
        ETH: {
          delta: 0,
          gamma: 0,
          vega: 0,
          theta: 0
        }
      },
      assetAmounts: {
        wbtc: {
          utilizedAmount: 0,
          availableAmount: 0,
          depositedAmount: 0
        },
        weth: {
          utilizedAmount: 0,
          availableAmount: 0,
          depositedAmount: 0
        },
        usdc: {
          utilizedAmount: 0,
          availableAmount: 0,
          depositedAmount: 0
        },
        
      },
      utilityRatio: {
        utilizedUsd: 0,
        depositedUsd: 0,  
      }
    },
    mOlp: {
      greeks: {
        BTC: {
          delta: 0,
          gamma: 0,
          vega: 0,
          theta: 0
        },
        ETH: {
          delta: 0,
          gamma: 0,
          vega: 0,
          theta: 0
        }
      },
      assetAmounts: {
        wbtc: {
          utilizedAmount: 0,
          availableAmount: 0,
          depositedAmount: 0
        },
        weth: {
          utilizedAmount: 0,
          availableAmount: 0,
          depositedAmount: 0
        },
        usdc: {
          utilizedAmount: 0,
          availableAmount: 0,
          depositedAmount: 0
        },
      },
      utilityRatio: {
        utilizedUsd: 0,
        depositedUsd: 0,  
      }
    },
    lOlp: {
      greeks: {
        BTC: {
          delta: 0,
          gamma: 0,
          vega: 0,
          theta: 0
        },
        ETH: {
          delta: 0,
          gamma: 0,
          vega: 0,
          theta: 0
        }
      },
      assetAmounts: {
        wbtc: {
          utilizedAmount: 0,
          availableAmount: 0,
          depositedAmount: 0
        },
        weth: {
          utilizedAmount: 0,
          availableAmount: 0,
          depositedAmount: 0
        },
        usdc: {
          utilizedAmount: 0,
          availableAmount: 0,
          depositedAmount: 0
        },
      },
      utilityRatio: {
        utilizedUsd: 0,
        depositedUsd: 0,  
      }
    }
  },
  volatilityScore: {
    BTC: 0,
    btc: 0,
    ETH: 0,
    eth: 0
  },
  optionsInfo: {},
  settlePrices: {},
  leadTraders: {
    BTC: [],
    ETH: []
  },
  tradingTitle: null
}

export const loadMarketData = createAsyncThunk(
  "market/loadMarketData",
  async (chain: SupportedChains) => {
    try {
      const response = await fetch(MARKET_DATA_API[chain]);

      if (!response.ok) throw new Error('Failed to fetch market data');

      const marketData = await response.json();
      return marketData;
    } catch (error) {
      console.log(error)
    }
  }
);

export const loadSettlePrices = createAsyncThunk(
  "market/loadSettlePrices",
  async () => {
    try {
      const response = await fetch(SETTLE_PRICE_DATA_API);
      
      if (!response.ok) throw new Error('Failed to fetch settle price');

      const result = await response.json();
      return result;
    } catch (error) {
      console.log(error);
    }
  }
);

export const loadLeadTraders = createAsyncThunk(
  "market/leadTraders",
  async (chain: SupportedChains) => {
    try {
      const now = Math.floor(new Date().getTime() / 1000);
      const response = await fetch(COPY_TRADE_POSITION_HISTORY_API[chain] + (now - COPY_TRADE_EXPOSE_PERIOD));
      if (!response.ok) throw new Error('Failed to fetch data');

      const result = await response.json();

      // Extract account addresses from the response
      const btcAccounts = result.BTC
        .filter((entry: any) => {
          const executionPrice = BigNumber(entry.executionPrice).dividedBy(BigNumber(10).pow(30));
          return executionPrice.isGreaterThan(COPY_TRADE_THRESHOLD_1ST);
        })
        .map((entry: any) => entry.account);
      const ethAccounts = result.ETH
        .filter((entry: any) => {
          const executionPrice = BigNumber(entry.executionPrice).dividedBy(BigNumber(10).pow(30));
          return executionPrice.isGreaterThan(COPY_TRADE_THRESHOLD_1ST);
        })
        .map((entry: any) => entry.account);
      const allAccounts = [...new Set([...btcAccounts, ...ethAccounts])] as `0x${string}`[];

      // Retrieve Twitter information for each account
      const twitterInfos = await getTwitterInfo(chain, allAccounts);

      // Map Twitter info to accounts
      const accountTwitterInfoMap = new Map(
        Object.entries(twitterInfos)
      );
      // Format the result

      const leadTraders: ILeadTraders = {
        BTC: result.BTC.filter((entry: any) => {
          const executionPrice = BigNumber(entry.executionPrice).dividedBy(BigNumber(10).pow(30));
          return executionPrice.isGreaterThan(COPY_TRADE_THRESHOLD_2ND);
        }).map((entry: any, i: number) => {
          return (
          {
          id: i,
          address: entry.account,
          optionTokenId: entry.optionTokenId,
          executionPrice: entry.executionPrice,
          processBlockTime: entry.processBlockTime,
          expiry: entry.expiry,
          copyTraders: entry.copyTraders,
          copyTradesVolume: entry.copyTradesVolume,
          rebatesFromCopyTrades: entry.rebatesFromCopyTrades,
          strikePrice: [getMainOptionStrikePrice((BigInt(entry.optionTokenId)))],
          strategy: parseOptionTokenId(BigInt(entry.optionTokenId)).strategy,
          socialTradingGrade: BigNumber(entry.executionPrice)
          .dividedBy(BigNumber(10).pow(30))
          .multipliedBy(entry.size)
          .dividedBy(BigNumber(10).pow(getUnderlyingAssetDecimalByTicker(chain, UnderlyingAsset.BTC)))
          .isGreaterThan(COPY_TRADE_THRESHOLD_1ST) ? 1 : 2,
          size: entry.size,
          twitterInfo: accountTwitterInfoMap.get(entry.account) || { username: '', profileUrl: '' },
        })}),
        ETH: result.ETH.filter((entry: any) => {
          const executionPrice = BigNumber(entry.executionPrice).dividedBy(BigNumber(10).pow(30));
          return executionPrice.isGreaterThan(COPY_TRADE_THRESHOLD_2ND);
        }).map((entry: any, i: number) => ({
          id: i,
          address: entry.account,
          optionTokenId: entry.optionTokenId,
          executionPrice: entry.executionPrice,
          processBlockTime: entry.processBlockTime,
          expiry: entry.expiry,
          copyTraders: entry.copyTraders,
          copyTradesVolume: entry.copyTradesVolume,
          rebatesFromCopyTrades: entry.rebatesFromCopyTrades,
          strikePrice: [getMainOptionStrikePrice((BigInt(entry.optionTokenId)))],
          strategy: parseOptionTokenId(BigInt(entry.optionTokenId)).strategy,
          socialTradingGrade: BigNumber(entry.executionPrice)
          .dividedBy(BigNumber(10).pow(30))
          .multipliedBy(entry.size)
          .dividedBy(BigNumber(10).pow(getUnderlyingAssetDecimalByTicker(chain, UnderlyingAsset.ETH)))
          .isGreaterThan(COPY_TRADE_THRESHOLD_1ST) ? 1 : 2,
          size: entry.size,
          twitterInfo: accountTwitterInfoMap.get(entry.account) || { username: '', profileUrl: '' }
        })),
      };

      return leadTraders;
    } catch (error) {
      console.error(error);
      return { BTC: [], ETH: [] }; // Return empty arrays in case of an error
    }
  }
);

const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    updateFuturesAssetIndexMap: (state, action: PayloadAction<FuturesAssetIndexMapRes>) => {
      state.futuresAssetIndexMap = action.payload.data;
    },
    setTradingTitle: (state, action: PayloadAction<ITradingTitle | null>) => {
      state.tradingTitle = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMarketData.fulfilled, (state, action: PayloadAction<any>) => {
        const { market, spotIndices, riskFreeRates, olpStats, volatilityScore } = action.payload.data;

        for (const underlyingAsset in market) {
          market[underlyingAsset].expiries.sort((a: string, b: string) => Number(a) - Number(b));
        }

        if (market) {
          const optionsInfo = getInstrumentOptionDataFromMarket(market);
          
          state.market = market
          state.optionsInfo = optionsInfo
        };
        if (spotIndices) {
          state.spotAssetIndexMap = spotIndices;
        };
        if (riskFreeRates) state.riskFreeRateCollection = riskFreeRates;
        if (olpStats) {
          const safeOlpStats = {
            sOlp: {
              ...olpStats.sOlp,
              assetAmounts: {
                ...olpStats.sOlp.assetAmounts,
              }
            },
            mOlp: {
              ...olpStats.mOlp,
              assetAmounts: {
                ...olpStats.mOlp.assetAmounts,
              }
            },
            lOlp: {
              ...olpStats.lOlp,
              assetAmounts: {
                ...olpStats.lOlp.assetAmounts,
              }
            }
          };
          state.olpStats = safeOlpStats;
        }
        if (volatilityScore) {
          state.volatilityScore = volatilityScore;
        }
      })
        .addCase(loadSettlePrices.fulfilled, (state, action: PayloadAction<any>) => {
          if (action.payload) state.settlePrices = action.payload;
        })
        .addCase(loadLeadTraders.fulfilled, (state, action: PayloadAction<any>) => {
          if (action.payload) state.leadTraders = action.payload;
        })
  },
});

export const { updateFuturesAssetIndexMap, setTradingTitle } = marketSlice.actions;
export default marketSlice.reducer;