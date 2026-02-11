import { client } from '../utils/aws'
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { sendMessage } from '../utils/slack';
import { CONFIG } from '../constants/constants.config';
import { LogLevel } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';
import { initializeRedis } from '../redis';
import { REDIS_KEYS } from '../utils/redis-key';
import Redis from 'ioredis';

// 6 times of period
const ONE_HOUR = 60 * 60 * 1000;

const CHECK_HEALTH_INTERVAL = {
  [REDIS_KEYS.LAST_CLEARED_TIME]: 24 * ONE_HOUR, // 24 hours
  [REDIS_KEYS.LAST_OPTIONS_MARKET_UPDATED_TIME]: 24 * ONE_HOUR, // 24 hours
}

const MESSAGE = {
  [REDIS_KEYS.LAST_CLEARED_TIME]: "clearing of positions",
  [REDIS_KEYS.LAST_OPTIONS_MARKET_UPDATED_TIME]: "update of options market",
}

export const checkHealth = async () => {
  try {
    const { redis } = await initializeRedis();
    const currentTime = Date.now();

    const pipeline = redis.pipeline();
    pipeline.get(REDIS_KEYS.LAST_CLEARED_TIME);
    pipeline.get(REDIS_KEYS.LAST_OPTIONS_MARKET_UPDATED_TIME);
    const results = await pipeline.exec();
    if (!results) {
      throw new Error("Pipeline execution failed");
    }
    const [lastClearedTime, lastOptionsMarketUpdatedTime] = results.map(([err, result]) => {
      if (err) throw err;
      return result ? parseInt(result.toString()) : 0;
    });
    let title = "";
    title += getMessage(REDIS_KEYS.LAST_CLEARED_TIME, lastClearedTime, currentTime);
    title += getMessage(REDIS_KEYS.LAST_OPTIONS_MARKET_UPDATED_TIME, lastOptionsMarketUpdatedTime, currentTime);

    if (title) {
      await sendMessage(
        title,
        LogLevel.WARN,
      )
    } else {
      await sendMessage(
        MESSAGE_TYPE.ALL_PROCESSES_RUNNING_NORMAL,
        LogLevel.INFO,
      )
    }

  } catch (error) {
    console.log('Error checking health:', error);
    await sendMessage(
      `\`[Lambda][check.health.ts]\` ${MESSAGE_TYPE.ERROR_DURING_CHECKING_HEALTH}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      }
    )
  }
};

const getMessage = (key: string, lastUpdatedTime: number, currentTime: number) => {
  const diffInSeconds = (currentTime - lastUpdatedTime) / 1000;
  if (diffInSeconds > CHECK_HEALTH_INTERVAL[key]) {
    return `${MESSAGE[key]} has not been detected for ${diffInSeconds} seconds\n`;
  } else {
    return "";
  }
}