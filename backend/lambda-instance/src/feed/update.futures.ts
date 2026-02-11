import BigNumber from 'bignumber.js';
import { fetchDataFromS3, putS3 } from '../utils/aws';
import { sendMessage } from '../utils/slack';
import { initializeRedis, setDailyRedis } from '../redis';
import { LogLevel } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';
import {
  REDIS_ALERT_THRESHOLD_FUTURES_IN_MS,
  SENSITIVITY_FUTURES_RATE,
  UPDATE_THRESHOLD_FUTURES_IN_MS,
} from '../constants/global';
import { REDIS_KEYS } from '../utils/redis-key';
import { shouldUpdateMarketIndex } from './helpers';
import { FuturesAssetIndexMapRes } from '@callput/shared';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

const initialFutures: FuturesAssetIndexMapRes = {
  data: {
    BTC: 0,
    ETH: 0,
    btc: 0,
    eth: 0,
  },
  lastUpdatedAt: 0,
};

export const updateFutures = async () => {
  const { redis } = await initializeRedis();

  const assets = ['BTC', 'ETH'];

  try {
    const prevFutures = await fetchDataFromS3({
      Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
      Key: process.env.APP_GLOBAL_DATA_FUTURES_KEY,
      initialData: initialFutures,
    });

    const currFutures = JSON.parse(await redis.get(REDIS_KEYS.FUTURES.MAIN)) as FuturesAssetIndexMapRes;

    const shouldUpdate = shouldUpdateMarketIndex(
      assets,
      prevFutures,
      currFutures,
      SENSITIVITY_FUTURES_RATE,
      UPDATE_THRESHOLD_FUTURES_IN_MS,
    );

    console.log('feed.futures.ts: prevFutures ', prevFutures);
    console.log('feed.futures.ts: currFutures ', currFutures);
    console.log('feed.futures.ts: shouldUpdate ', shouldUpdate);

    if (shouldUpdate) {
      await Promise.all([
        putS3({
          Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
          Key: process.env.APP_GLOBAL_DATA_FUTURES_KEY,
          Body: JSON.stringify(currFutures),
          CacheControl: 'no-cache',
        }),
        setDailyRedis(REDIS_KEYS.FUTURES.DAILY, currFutures, REDIS_ALERT_THRESHOLD_FUTURES_IN_MS),
      ]);

      console.log('futures indices has been feeded successfully.');
    }
  } catch (error) {
    console.log('Error processing futures:', error);
    await sendMessage(
      `\`[Lambda][feed.futures.ts]\` ${MESSAGE_TYPE.ERROR_DURING_FEEDING_FUTURES_INDICES}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      },
    );
  }
};
