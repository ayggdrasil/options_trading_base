import { UNDERLYING_ASSET_CURRENCIES } from "../../constants"
import { SENSITIVITY_MARKET_UPDATE_RATE } from "../../constants/global"
import { getS3 } from "../../utils/aws"
import { getFuturesS3 } from "../../utils/aws-getter"
import { feedInstruments } from "./feed.instruments"

export const detectPriceVolatility = async () => {
  // 1. get previous and current futures prices
  let { priceAtUpdated: prevFuturesPrices } = await getS3({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: process.env.APP_DATA_INSTRUMENTS_KEY,
  })

  prevFuturesPrices = prevFuturesPrices || { BTC: 0, ETH: 0 }

  const { data: newFutures } = await getFuturesS3();

  // 2. diff check
  const { maxDiffRate, maxDiffRateCurrency } = UNDERLYING_ASSET_CURRENCIES.reduce((acc: any, currency: string) => {
    const diffRate = Math.abs(1 - (newFutures[currency] / prevFuturesPrices[currency]))
    acc.maxDiffRateCurrency = diffRate > acc.maxDiffRate ? currency : acc.maxDiffRateCurrency
    acc.maxDiffRate = Math.max(acc.maxDiffRate, diffRate)

    return acc
  }, { maxDiffRate: -Infinity, maxDiffRateCurrency: '' })

  const shouldUpdate = maxDiffRate > SENSITIVITY_MARKET_UPDATE_RATE
  console.log("shouldUpdate", shouldUpdate)

  // 3. process feed instruments
  if (shouldUpdate) {
    await feedInstruments()
  }
}