import { fetchDataFromS3, getS3, putS3 } from "../../utils/aws";
import { sendMessage } from '../../utils/slack';
import { LogLevel } from '../../utils/enums';
import { MESSAGE_TYPE } from '../../utils/messages';
import { TimeSeriesData } from "../../feed/interfaces";
import { getDailyRedis } from "../../redis";
import { REDIS_KEYS } from "../../utils/redis-key";
import { getDateISOString, getTimestampFromDateAndTime } from "../../utils/date";

const minInterval = 60

const initialSettlePrices = {}

export const feedTwapPrice = async () => {
  const dateISOString = getDateISOString();
  const fromTime = getTimestampFromDateAndTime(dateISOString, 7, 30, 0);
  const toTime = getTimestampFromDateAndTime(dateISOString, 8, 0, 0);
  const expiry = toTime / 1000;

  const dailyKey = `${REDIS_KEYS.FUTURES.DAILY}:${dateISOString}`;
  
  const dailyResult = await getDailyRedis(dailyKey);
  if (!dailyResult) {
    console.log(`No daily data found for: ${dailyKey}`);
    await sendMessage(
      `\`[Lambda][feed.twapPrice]\` ${MESSAGE_TYPE.ERROR_DURING_FEEDING_TWAP_PRICE}`,
      LogLevel.ERROR,
      {
        description: `No daily data found for: ${dailyKey}`,
      }
    )
    return;
  }
  
  const { data: futuresDaily } = dailyResult;

  const settlePriceData = await fetchDataFromS3({
    Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
    Key: process.env.APP_GLOBAL_DATA_SETTLE_PRICE_KEY,
    initialData: initialSettlePrices
  })

  if (settlePriceData[expiry]) {
    console.log("Twap price has already been feeded.");
    return;
  }

  try {
    const twap = calculateTwap(futuresDaily, fromTime, toTime);

    if (twap.BTC === 0 || twap.ETH === 0) {
      console.log("TWAP Prices are zero. Skipping.");
      throw new Error("TWAP Prices are zero.");
    }
    
    settlePriceData[expiry] = twap;

    await putS3({
      Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
      Key: process.env.APP_GLOBAL_DATA_SETTLE_PRICE_KEY,
      Body: JSON.stringify(settlePriceData),
      CacheControl: 'no-cache',
    })
  } catch (error) {
    console.log("Error in processFeedTwapPrice:", error);
    await sendMessage(
      `\`[Lambda][feed.twapPrice]\` ${MESSAGE_TYPE.ERROR_DURING_FEEDING_TWAP_PRICE}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      }
    )
  }
};

interface TwapResult {
  BTC: number;
  ETH: number;
}

export const calculateTwap = (
  data: TimeSeriesData,
  fromTimestamp: number,
  toTimestamp: number
): TwapResult => {
  let retries = 0;

  while (retries < Number(process.env.MAX_RETRIES)) {
    let btcSum = 0;
    let ethSum = 0;
    let accumulatedTime = 0;

    let previousTimestamp: number | null = null;
    let previousBtcPrice: number | null = null;
    let previousEthPrice: number | null = null;

    const sortedTimestamps = Object.keys(data).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    // Initialize with the first available price before fromTimestamp
    for (const timestamp of sortedTimestamps) {
      const timestampInt = parseInt(timestamp, 10);
      if (timestampInt <= fromTimestamp && timestampInt > (fromTimestamp - minInterval)) {
        previousTimestamp = fromTimestamp;
        previousBtcPrice = data[timestamp].BTC;
        previousEthPrice = data[timestamp].ETH;
      }
    }

    for (const timestamp of sortedTimestamps) {
      const timestampInt = parseInt(timestamp, 10);

      if (timestampInt > fromTimestamp && timestampInt <= toTimestamp) {
        if (previousTimestamp !== null) {
          const deltaTime = timestampInt - previousTimestamp;
          btcSum += (previousBtcPrice as number) * deltaTime;
          ethSum += (previousEthPrice as number) * deltaTime;
          accumulatedTime += deltaTime;
        }

        previousTimestamp = timestampInt;
        previousBtcPrice = data[timestamp].BTC;
        previousEthPrice = data[timestamp].ETH;
      }
    }

    // Assume last value lasts until toTime
    if (previousTimestamp !== null && previousTimestamp < toTimestamp) {
      const deltaTime = toTimestamp - previousTimestamp;
      btcSum += (previousBtcPrice as number) * deltaTime;
      ethSum += (previousEthPrice as number) * deltaTime;
      accumulatedTime += deltaTime;
    }

    console.log("Accumulated Time: ", accumulatedTime);

    if (accumulatedTime === 0 || btcSum === 0 || ethSum === 0) {
      retries++;
      console.log(`Retrying calculation. Attempt: ${retries}`);
      continue; // Retry the calculation
    } else {
      return {
        BTC: btcSum / accumulatedTime,
        ETH: ethSum / accumulatedTime,
      };
    }
  }

  console.log("Max retries reached. Returning zeros.");
  return { BTC: 0, ETH: 0 };
};