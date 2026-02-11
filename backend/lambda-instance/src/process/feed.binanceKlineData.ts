import BigNumber from 'bignumber.js'

import { fetchDataFromS3Gzip, putS3Gzip } from '../utils/aws'
import { sendMessage } from '../utils/slack'
import { getCurrentTimestampAndDate } from '../utils/helper'
import { LogLevel } from '../utils/enums'
import { MESSAGE_TYPE } from '../utils/messages'

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

const initialData = {
  data: [],
  interval: "1m",
  lastEndTime: 0,
  timestamp: 0,
  lastUpdatedAt: 0
}

export const feedBinanceKlineData = async (symbol: string) => {
  try {
    const prevData = await fetchDataFromS3Gzip({
      Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
      Key: `${process.env.APP_GLOBAL_DATA_BINANCE_KLINE_KEY}-${symbol}-1m.json.gz`,
      initialData: initialData
    })

    const currentTime = Date.now()

    const startTime = prevData.data.length > 0 ? prevData.lastEndTime : currentTime - 24 * 60 * 60 * 1000;
    const endTime = currentTime;

    const binanceApiUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&startTime=${startTime}&endTime=${endTime}&limit=1000`;

    const response = await fetch(binanceApiUrl);
    const result = await response.json();

    if (!result || result.length === 0) return;

    const newData = result.map(kline => [
      kline[0], // Kline open time
      kline[1], // Open price
      kline[2], // High price
      kline[3], // Low price
      kline[4], // Close price
      kline[6]  // Kline Close time
    ]);

    const combinedData = [...prevData.data, ...newData];

    const timeData = getCurrentTimestampAndDate();

    await putS3Gzip({
      Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
      Key: `${process.env.APP_GLOBAL_DATA_BINANCE_KLINE_KEY}-${symbol}-1m.json.gz`,
      Data: JSON.stringify({
        data: combinedData,
        interval: "1m",
        lastEndTime: newData[newData.length - 1][5],
        timestamp: timeData.timestamp,
        lastUpdatedAt: timeData.lastUpdatedAt
      }),
      CacheControl: 'no-cache',
    })
  } catch (error) {
    console.log('Error processing binance kline data:', error)
    await sendMessage(
      `\`[Lambda][feed.binanceKlineData.ts]\` ${MESSAGE_TYPE.ERROR_PROCESSING_BINANCE_KLINE_DATA}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      }
    )
  }
}
