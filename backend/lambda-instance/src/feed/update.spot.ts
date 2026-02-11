import BigNumber from 'bignumber.js';
import { fetchDataFromS3, putS3 } from '../utils/aws';
import { sendMessage } from '../utils/slack';
import { LogLevel } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';
import { initializeRedis, setDailyRedis } from '../redis';
import {
  REDIS_ALERT_THRESHOLD_SPOT_IN_MS,
  SENSITIVITY_SPOT_RATE,
  UPDATE_THRESHOLD_SPOT_IN_MS,
} from '../constants/global';
import { REDIS_KEYS } from '../utils/redis-key';
import { shouldUpdateMarketIndex } from './helpers';
import { SpotAssetIndexMapRes } from '@callput/shared';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

const initialSpot: SpotAssetIndexMapRes = {
  data: {
    BTC: 0,
    ETH: 0,
    USDC: 0,
    btc: 0,
    eth: 0,
    usdc: 0,
  },
  lastUpdatedAt: 0,
};

export const updateSpot = async () => {
  const { redis } = await initializeRedis();

  const assets = ['BTC', 'ETH', 'USDC'];

  try {
    const prevSpot = await fetchDataFromS3({
      Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
      Key: process.env.APP_GLOBAL_DATA_SPOT_KEY,
      initialData: initialSpot,
    });

    const currSpot = JSON.parse(await redis.get(REDIS_KEYS.SPOT.MAIN)) as SpotAssetIndexMapRes;

    const shouldUpdate = shouldUpdateMarketIndex(
      assets,
      prevSpot,
      currSpot,
      SENSITIVITY_SPOT_RATE,
      UPDATE_THRESHOLD_SPOT_IN_MS,
    );

    console.log('feed.spot.ts: prevSpot ', prevSpot);
    console.log('feed.spot.ts: currSpot ', currSpot);
    console.log('feed.spot.ts: shouldUpdate ', shouldUpdate);

    if (shouldUpdate) {
      await Promise.all([
        putS3({
          Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
          Key: process.env.APP_GLOBAL_DATA_SPOT_KEY,
          Body: JSON.stringify(currSpot),
          CacheControl: 'no-cache',
        }),
        setDailyRedis(REDIS_KEYS.SPOT.DAILY, currSpot, REDIS_ALERT_THRESHOLD_SPOT_IN_MS),
      ]);

      console.log('spot indices has been feeded successfully.');
    }
  } catch (error) {
    console.log('Error processing spot:', error);
    await sendMessage(
      `\`[Lambda][feed.spot.ts]\` ${MESSAGE_TYPE.ERROR_DURING_FEEDING_SPOT_INDICES}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      },
    );
  }
};
