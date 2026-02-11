import initializeContracts from "../contract";
import BigNumber from "bignumber.js";
import { getS3 } from "../utils/aws";
import { sendMessage } from "../utils/slack";
import { getOlpGreeksV2, getOlpGreeksV3 } from "./collect.marketData";
import { LogLevel } from "../utils/enums";
import { MESSAGE_TYPE } from "../utils/messages";
import { getFuturesS3, getRiskFreeRatesS3 } from "../utils/aws-getter";
import { setDailyRedis } from "../redis";
import { REDIS_KEYS } from "../utils/redis-key";
import { REDIS_ALERT_THRESHOLD_OLP_STATS_IN_MS } from "../constants/global";
import { getInstrumentMarkDataFromApp } from "../iv/apis/app";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export const collectOlpStats = async () => {
  try {
    const { sOLPManager, ViewAggregator } = await initializeContracts();

    const result = await Promise.all([
      ViewAggregator.getOlpStats(),
      sOLPManager.getTotalOlpAssetUsd(true),
    ])

    const sOlpData = result[0][0];
    const isNegativeData = result[0][3];
    const sOlpAssetUsdData = result[1]; 

    const [{ data: futures }, riskFreeRates] = await Promise.all([
      getFuturesS3(),
      getRiskFreeRatesS3(),
    ])

    if (!futures || !riskFreeRates) {
      throw new Error('need to initialize futures prices and risk free rates first.')
    }

    const instrumentMarkData = await getInstrumentMarkDataFromApp();

    let olpGreeks = {
      sOlp: {
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
      mOlp: {
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
      lOlp: {
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
      }
    }
  
    try {
      olpGreeks = await getOlpGreeksV2(futures, riskFreeRates, instrumentMarkData)
    } catch (error) {
      try {
        olpGreeks = await getOlpGreeksV3(futures, riskFreeRates, instrumentMarkData)
      } catch (error) {
        console.log('Error getting olp greeks:', error)
        await sendMessage(
          `\`[Lambda][collect.olpStats.ts]\` ${MESSAGE_TYPE.ERROR_DURING_GETTING_OLP_GREEKS}`,
          LogLevel.ERROR,
          {
            description: error?.message || error,
          }
        )
      }
    }

    const status = {
      sOlp: {
        price: new BigNumber(sOlpData[0]).dividedBy(10 ** 30).toNumber(),
        totalSupply: new BigNumber(sOlpData[1]).dividedBy(10 ** 18).toNumber(),
        positionValue: isNegativeData[0] ? new BigNumber(sOlpData[2]).multipliedBy(-1).dividedBy(10 ** 30).toNumber() : new BigNumber(sOlpData[2]).dividedBy(10 ** 30).toNumber(),
        assets: {
          poolUsd: new BigNumber(sOlpAssetUsdData[0]).dividedBy(10 ** 30).toNumber(),
          pendingMpUsd: new BigNumber(sOlpAssetUsdData[1]).dividedBy(10 ** 30).toNumber(),
          pendingRpUsd: new BigNumber(sOlpAssetUsdData[2]).dividedBy(10 ** 30).toNumber(),
          reservedUsd: new BigNumber(sOlpAssetUsdData[3]).dividedBy(10 ** 30).toNumber(),
          utilizedUsd: new BigNumber(sOlpAssetUsdData[4]).dividedBy(10 ** 30).toNumber(),
          availableUsd: new BigNumber(sOlpAssetUsdData[5]).dividedBy(10 ** 30).toNumber(),
          depositedUsd: new BigNumber(sOlpAssetUsdData[6]).dividedBy(10 ** 30).toNumber()
        },
        greeksByEvent: olpGreeks.sOlp
      }
    }

    const currDaily = {
      data: status,
      lastUpdatedAt: Date.now()
    }

    await setDailyRedis(REDIS_KEYS.OLP.STATS.DAILY, currDaily, REDIS_ALERT_THRESHOLD_OLP_STATS_IN_MS)
  } catch (error) {
    console.log('Error processing collect olp stats:', error)
    await sendMessage(
      `\`[Lambda][collect.olpStats.ts]\` ${MESSAGE_TYPE.ERROR_DURING_COLLECTING_OLP_STATS_DATA}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      }
    )
  }
};