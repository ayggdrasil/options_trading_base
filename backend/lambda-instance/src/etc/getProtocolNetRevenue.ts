import dayjs from "dayjs"
import BigNumber from "bignumber.js"

import { initializeRedis } from "../redis"

// end_time : timestamp
export const getProtocolNetRevenueData = async (end_time) => {
  const { redis } = await initializeRedis()
  const endDay = dayjs(end_time).format('YYYY-MM-DD')

  const pipeline = redis.pipeline()

  pipeline.get(`feeUsd:${endDay}`)
  pipeline.get(`feeUsd:acc`)
  pipeline.get(`positionFeeUsd:${endDay}`)
  pipeline.get(`positionFeeUsd:acc`)
  pipeline.get(`riskPremiumUsd:${endDay}`)
  pipeline.get(`riskPremiumUsd:acc`)

  let [
    [, feeUsd],
    [, feeUsdAcc],
    [, positionFeeUsd],
    [, positionFeeUsdAcc],
    [, riskPremiumUsd],
    [, riskPremiumUsdAcc],
  ]: any = await pipeline.exec()

  const dayCount = dayjs(dayjs()).diff(end_time, 'day')

  // calculate daily volume to decrement
  for (let i = 0; i < dayCount; i++) {
    const day = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
    
    const feeUsd = Number(await redis.get(`feeUsd:${day}`) || 0)
    const positionFeeUsd = Number(await redis.get(`positionFeeUsd:${day}`) || 0)
    const riskPremiumUsd = Number(await redis.get(`riskPremiumUsd:${day}`) || 0)

    feeUsdAcc = new BigNumber(feeUsdAcc).minus(feeUsd).toString()
    positionFeeUsdAcc = new BigNumber(positionFeeUsdAcc).minus(positionFeeUsd).toString()
    riskPremiumUsdAcc = new BigNumber(riskPremiumUsdAcc).minus(riskPremiumUsd).toString()
  }

  return {
    result: {
      daily_fee_usd: new BigNumber(positionFeeUsd).toFixed(2),
      total_fee_usd: new BigNumber(positionFeeUsdAcc).plus(7438).toFixed(2),
      daily_risk_premium_usd: new BigNumber(riskPremiumUsd || 0).toFixed(2),
      total_risk_premium_usd: new BigNumber(riskPremiumUsdAcc || 0).toFixed(2),
    }
  }
}

export const getProtocolNetRevenueDataWithRange = async (from_time) => {
  const { redis } = await initializeRedis()

  const dayCount = dayjs(dayjs()).diff(from_time, 'day')

  if (isNaN(dayCount) || dayCount > 100) {
    return {
      error: { code: 400, message: "Invalid range" }
    }
  }

  let feeUsdAcc = "0"
  let positionFeeUsdAcc = "0"
  let riskPremiumUsdAcc = "0"

  for (let i = 0; i < dayCount; i++) {
    const day = dayjs().subtract(i, 'day').format('YYYY-MM-DD')

    const feeUsd = Number(await redis.get(`feeUsd:${day}`) || 0)
    const positionFeeUsd = Number(await redis.get(`positionFeeUsd:${day}`) || 0)
    const riskPremiumUsd = Number(await redis.get(`riskPremiumUsd:${day}`) || 0)

    feeUsdAcc = new BigNumber(feeUsdAcc).plus(feeUsd).toString()
    positionFeeUsdAcc = new BigNumber(positionFeeUsdAcc).plus(positionFeeUsd).toString()
    riskPremiumUsdAcc = new BigNumber(riskPremiumUsdAcc).plus(riskPremiumUsd).toString()
  }

  return {
    result: {
      day_count: dayCount,
      total_fee_usd: new BigNumber(positionFeeUsdAcc).toFixed(2),
      total_risk_premium_usd: new BigNumber(riskPremiumUsdAcc || 0).toFixed(2),
    }
  }
}