import BigNumber from "bignumber.js";
import { fetchDataFromS3Gzip, getS3Stream } from "../utils/aws";
import { sendFile, sendMessage } from "../utils/slack";
import { advancedFormatNumber } from "../utils/format";
import { LogLevel, SlackTag } from "../utils/enums";
import { getDateISOString } from "../utils/date";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

const initialData = {
  keyIndexToStart: 0, // key가 담긴 배열의 인덱스
  accumulatedNotionalVolume: 0, // 전체 Notional Volume
  accumulatedExecutionPrice: 0, // 전체 Execution Price
  totalNumberOfTraders: 0, // 전체 Trader 수
  totalTradeCount: 0, // 전체 Trade 수
  totalBtcSize: 0,
  totalEthSize: 0,
  vaults: {}, // Vault's Trade Info
  traders: {}, // Trader's Trade Info
  lastUpdatedAt: ""
}

export const notifyTradeData = async () => {
  const tradeData = await fetchDataFromS3Gzip({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: process.env.APP_DATA_TRADE_DATA_KEY + '.gz',
    initialData
  })

  if (!tradeData) {
    console.log("notify.tradeData.ts: unavailable trade data.")
    return;
  }

  const dateISOString = getDateISOString();

  const totalNotionalVolume = tradeData.accumulatedNotionalVolume;
  const totalExecutionPrice = tradeData.accumulatedExecutionPrice;
  const totalNumberOfTraders = tradeData.totalNumberOfTraders;
  const totalNumberOfTransactions = tradeData.keyIndexToStart;

  await sendMessage(
    "*" + "[" + dateISOString + "] " + "App Metrics " + "*" + "\n" + 
    "- Total Notional Volume: `" + advancedFormatNumber(totalNotionalVolume, 2, "$") + "`\n" + 
    "- Total Execution Price: `" + advancedFormatNumber(totalExecutionPrice, 2, "$") + "`\n" + 
    "- Total Number of Traders: `" + advancedFormatNumber(totalNumberOfTraders, 0, "") + "명`\n" + 
    "- Total Number of Transactions: `" + advancedFormatNumber(totalNumberOfTransactions, 0, "") + "건`\n",
    LogLevel.INFO,
    {
      tags: [SlackTag.ALL],
    }
  )

  const fileStream = await getS3Stream({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: process.env.APP_DATA_TRADE_DATA_KEY + '.gz',
  });

  if (!fileStream) {
    console.log("Unable to retrieve file stream from S3.");
    return;
  }

  // Uploading the stream to Slack
  await sendFile(fileStream, 'tradeData.json', process.env.SLACK_NOTIFICATION_CHANNEL_ID, process.env.SLACK_BOT_TOKEN);
}