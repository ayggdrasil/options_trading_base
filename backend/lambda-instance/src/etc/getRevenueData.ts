import dayjs from "dayjs"
import BigNumber from "bignumber.js"

import { initializeRedis } from "../redis"

// end_time : timestamp
export const getRevenueData = async (end_time) => {
  const { redis } = await initializeRedis()
  const endDay = dayjs(end_time).format('YYYY-MM-DD')


  const pipeline = redis.pipeline()

  pipeline.get(`executionPrice:${endDay}`)
  pipeline.get(`positionFeeUsd:${endDay}`)
  pipeline.get(`executionPrice:acc`)
  pipeline.get(`positionFeeUsd:acc`)

  let [
    [, executionPrice],
    [, positionFeeUsd],
    [, executionPriceAcc],
    [, positionFeeUsdAcc],
  ]: any = await pipeline.exec()

  const dayCount = dayjs(dayjs()).diff(end_time, 'day')

  // calculate daily volume to decrement
  for (let i = 0; i < dayCount; i++) {
    const day = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
    const executionPrice = Number(await redis.get(`executionPrice:${day}`) || 0)
    const positionFeeUsd = Number(await redis.get(`positionFeeUsd:${day}`) || 0)

    executionPriceAcc = new BigNumber(executionPriceAcc).minus(executionPrice).toString()
    positionFeeUsdAcc = new BigNumber(positionFeeUsdAcc).minus(positionFeeUsd).toString()
  }

  return {
    result: {
      daily_premium_volume: new BigNumber(executionPrice).toFixed(2),
      daily_fee_volume: new BigNumber(positionFeeUsd).toFixed(2),
      total_premium_volume: new BigNumber(executionPriceAcc).toFixed(2),
      total_fee_volume: new BigNumber(positionFeeUsdAcc).plus(7438).toFixed(2),
    }
  }
}