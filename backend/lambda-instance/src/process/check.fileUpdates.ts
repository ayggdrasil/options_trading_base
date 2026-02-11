import { client } from '../utils/aws'
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { sendMessage } from '../utils/slack';
import { LogLevel } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';

const UPDATE_MINUTE_THRESHOLD = 300; // 5 minutes
const UPDATE_HOUR_THRESHOLD = 10800; // 3 hours
const UPDATE_WEEK_THRESHOLD = 691200; // 8 days

const checkAndUpdateFile = async (key, threshold, webhookMessage: MESSAGE_TYPE, isGlobalData) => {
  try {
    const fileDetails = await client.send(new HeadObjectCommand({
      Bucket: isGlobalData ? process.env.APP_GLOBAL_DATA_BUCKET : process.env.APP_DATA_BUCKET,
      Key: key,
    }));

    const currentTime = new Date().getTime();
    const fileTime = new Date(fileDetails.LastModified).getTime();
    const diffInFileTime = Math.floor((currentTime - fileTime) / 1000);

    if (diffInFileTime > threshold) {
      await sendMessage(
        `\`[Lambda][check.fileUpdates.ts]\` ${webhookMessage}`,
        LogLevel.CRITICAL,
        {
          description: diffInFileTime.toString() + "s ago",
        }
      )
    }
  } catch (error) {
    console.log('Error processing file update for', key, ':', error);
    await sendMessage(
      `\`[Lambda][check.fileUpdates.ts]\` ${MESSAGE_TYPE.FILE_UPDATES_ERROR} ${key}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      }
    )
  }
};

export const checkFileUpdates = async () => {
  try {
    // get utc date YYYY-MM-DD
    const currentDate = new Date();
    const date = currentDate.toISOString().split('T')[0];

    await Promise.all([
      checkAndUpdateFile(process.env.APP_GLOBAL_DATA_FUTURES_KEY, UPDATE_MINUTE_THRESHOLD, MESSAGE_TYPE.FUTURES_INDICES_DATA_NOT_UPDATED, true),
      checkAndUpdateFile(process.env.APP_GLOBAL_DATA_SPOT_KEY, UPDATE_MINUTE_THRESHOLD, MESSAGE_TYPE.SPOT_INDICES_DATA_NOT_UPDATED, true),
      checkAndUpdateFile(process.env.APP_GLOBAL_GEO_LITE_COUNTRY_DATA_KEY, UPDATE_WEEK_THRESHOLD, MESSAGE_TYPE.GEO_LITE_COUNTRY_DATA_NOT_UPDATED, true),
      checkAndUpdateFile(process.env.APP_GLOBAL_DATA_RISK_FREE_RATES_KEY, UPDATE_HOUR_THRESHOLD, MESSAGE_TYPE.RISK_FREE_RATES_NOT_UPDATED, true),
    ]);
  } catch (error) {
    console.log('Error processing file updates:', error);
    await sendMessage(
      `\`[Lambda][check.fileUpdates.ts]\` ${MESSAGE_TYPE.ERROR_DURING_CHECKING_FILE_UPDATES}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      }
    )
  }
};