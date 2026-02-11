import { putS3Gzip } from './aws';
import { getDailyRedis, initializeRedis } from '../redis';

export interface DailyInfo {
  redisKey: string;
  s3Bucket: string;
  s3Key: string;
}

export const saveDailyToS3 = async (info: DailyInfo, dateISOString: string) => {
  const { redis } = await initializeRedis();

  const dailyKey = `${info.redisKey}:${dateISOString}`;
  const dailyS3SavedKey = `${dailyKey}:s3-saved`;

  const isDailySaved = JSON.parse(await redis.get(dailyS3SavedKey));

  if (isDailySaved) {
    console.log(`Already saved to S3: ${dailyKey}`);
    return;
  }

  const daily = await getDailyRedis(dailyKey);

  console.log("daily ", daily);

  if (!daily) {
    console.log(`No data found for: ${dailyKey}`);
    return;
  }

  await putS3Gzip({
    Bucket: info.s3Bucket,
    Key: `${info.s3Key}-${dateISOString}.json.gz`,
    Data: JSON.stringify(daily),
    CacheControl: 'no-cache',
  });

  await redis.set(dailyS3SavedKey, 'true', 'EX', 60 * 60 * 24 * 7);
};
