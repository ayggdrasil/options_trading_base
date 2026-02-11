import dayjs from "dayjs"
import { initializeRedis } from "../redis"
import BigNumber from "bignumber.js"

// end_time : timestamp
export const feedDefillamaData = async (end_time) => {

  const { redis } = await initializeRedis()

  const endDay = dayjs(end_time).format('YYYY-MM-DD')

  const pipeline = redis.pipeline()

  pipeline.get(`volume:${endDay}`)
  pipeline.get(`executionPrice:${endDay}`)
  pipeline.get(`volume:acc`)
  pipeline.get(`executionPrice:acc`)

  let [
    [, volume],
    [, executionPrice],
    [, volumeAcc],
    [, executionPriceAcc],
  ]: any = await pipeline.exec()

  const dayCount = dayjs(dayjs()).diff(end_time, 'day')

  // calculate daily volume to decrement
  for (let i = 0; i < dayCount; i++) {

    const day = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
    const volume = Number(await redis.get(`volume:${day}`) || 0)
    const executionPrice = Number(await redis.get(`executionPrice:${day}`) || 0)

    volumeAcc = new BigNumber(volumeAcc).minus(volume).toString()
    executionPriceAcc = new BigNumber(executionPriceAcc).minus(executionPrice).toString()
  }

  return {
    result: {
      daily_notional_volume: new BigNumber(volume).toFixed(2),
      daily_premium_volume: new BigNumber(executionPrice).toFixed(2),
      total_notional_volume: new BigNumber(volumeAcc).toFixed(2),
      total_premium_volume: new BigNumber(executionPriceAcc).toFixed(2),
    }
  }
}