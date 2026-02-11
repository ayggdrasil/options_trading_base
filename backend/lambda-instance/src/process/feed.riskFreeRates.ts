import BigNumber from "bignumber.js";

import { putS3 } from "../utils/aws";
import { sendMessage } from '../utils/slack'
import { initializeRedis } from "../redis";
import { REDIS_KEYS } from "../utils/redis-key";
import { LogLevel } from '../utils/enums'
import { MESSAGE_TYPE } from "../utils/messages";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export const feedRiskFreeRates = async () => {
  const { redis } = await initializeRedis();

  try {
    const riskFreeRateMap = JSON.parse(await redis.get(REDIS_KEYS.RF_RATE.MAIN));

    const data = ["BTC", "ETH"].reduce((acc, currency) => {
      const convertedRates = Object.entries(riskFreeRateMap.data[currency] || {}).reduce(
        (rateAcc, [timestamp, rate]) => {
          const secondTimestamp = Math.floor(parseInt(timestamp) / 1000).toString();
          rateAcc[secondTimestamp] = rate;
          return rateAcc;
        },
        {}
      );

      acc[currency] = convertedRates;
      acc[currency.toLowerCase()] = convertedRates;
      return acc;
    }, {});

    console.log(data, "data");

    return await putS3({
      Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
      Key: process.env.APP_GLOBAL_DATA_RISK_FREE_RATES_KEY,
      Body: JSON.stringify(data),
      CacheControl: "no-cache",
    });
  } catch (error) {
    console.log('Error processing risk free rates:', error)
    await sendMessage(
      `\`[Lambda][feed.riskFreeRates.ts]\` ${MESSAGE_TYPE.ERROR_DURING_FEEDING_RISK_FREE_RATES}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      }
    )
  }
}
