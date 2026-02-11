import { sendMessage } from '../utils/slack';
import { LogLevel } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';
import { REDIS_KEYS } from '../utils/redis-key';
import { DailyInfo, saveDailyToS3 } from '../utils/daily-storage';
import { getDateISOString } from '../utils/date';

const DAILY_INFO: DailyInfo[] = [
  {
    redisKey: REDIS_KEYS.OLP.STATS.DAILY,
    s3Bucket: process.env.APP_DATA_BUCKET,
    s3Key: process.env.APP_DATA_OLP_STATS_DAILY_KEY,
  },
  {
    redisKey: REDIS_KEYS.IV_CURVE.DAILY,
    s3Bucket: process.env.APP_DATA_BUCKET,
    s3Key: process.env.APP_DATA_IV_CURVE_DAILY_KEY,
  },
];

export const updateDaily = async () => {
  const dateISOString = getDateISOString(-1);

  for (const info of DAILY_INFO) {
    try {
      await saveDailyToS3(info, dateISOString);
      console.log(`${info.redisKey} for ${dateISOString} has been saved successfully.`);
    } catch (error) {
      console.log('Error processing updating daily data:', error);
      await sendMessage(
        `\`[Lambda][update.daily.ts]\` ${MESSAGE_TYPE.ERROR_DURING_UPDATING_DAILY_DATA}`,
        LogLevel.ERROR,
        {
          description: error?.message || error,
        },
      );
    }
  }

  console.log('updateDaily done');
};
