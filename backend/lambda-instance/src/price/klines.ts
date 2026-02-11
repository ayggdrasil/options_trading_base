import { getCurrentTimestampAndDate } from "../utils/helper";

export const getKlinesData = async (
  { symbol, interval, startTime, endTime, limit }: { symbol: string, interval: string, startTime: number, endTime: number, limit: number }
) => {
  let binanceKlineApi = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  if (startTime) binanceKlineApi += `&startTime=${startTime}`
  if (endTime) binanceKlineApi += `&endTime=${endTime}`

  const response = await fetch(binanceKlineApi)
  const result = await response.json()

  if (!result || result.length === 0) return []

  const timeData = getCurrentTimestampAndDate();

  let startTimestamp = timeData.timestamp;
  let endTimestamp = 0;

  const processedData = result.map((kline: any) => {
    const openTime = parseInt(kline[0]);
    const closeTime = parseInt(kline[6]);

    if (openTime < startTimestamp) startTimestamp = openTime;
    if (closeTime > endTimestamp) endTimestamp = closeTime;
    
    return [
      parseInt(kline[0]), // Kline open time
      parseFloat(kline[1]), // Open price
      parseFloat(kline[2]), // High price
      parseFloat(kline[3]), // Low price
      parseFloat(kline[4]), // Close price
      parseInt(kline[6]) // Kline Close time
    ]
  })

  return {
    data: processedData,
    interval: interval,
    startTime: startTimestamp,
    endTime: endTimestamp,
    timestamp: timeData.timestamp,
    lastUpdatedAt: timeData.lastUpdatedAt
  }
}