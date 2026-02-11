import dayjs from "dayjs"
import { redis } from "../redis"
import BigNumber from "bignumber.js"
import { UNDERLYING_ASSET_INDEX_TO_DECIMALS } from "./constants"
import { parseOptionTokenId } from "./format"

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

// constants
const NOTIONAL_VOLUME_POINT_RATE = 0.0001
const TRADE_FEE_POINT_RATE = 30
const EXECUTION_VOLUME_POINT_RATE = 0.25
const OLP_DEPOSIT_POINT_RATE = 0.02

const TIER_2_POINT_THRESHOLD = 10000
const TIER_3_POINT_THRESHOLD = 30000

const REBATE_POINT_RATE_TO_TIER_1_PARENT = 0.1
const REBATE_POINT_RATE_TO_TIER_2_PARENT = 0.15
const REBATE_POINT_RATE_TO_TIER_3_PARENT = 0.2
const REBATE_POINT_RATE_TO_TIER_4_PARENT = 0.3 // contributor

const REBATE_POINT_RATE_TO_TIER_1_SELF = 0
const REBATE_POINT_RATE_TO_TIER_2_SELF = 0.1
const REBATE_POINT_RATE_TO_TIER_3_SELF = 0.15
const REBATE_POINT_RATE_TO_TIER_4_SELF = 0.2 // contributor

const REBATE_POINT_RATE_TO_GRANDPARENT = 0.05

const REFERRAL_REGISTER_POINT_TO_PARENT = 100
const REFERRAL_REGISTER_POINT_TO_GRANDPARENT = 20

// return week start day (monday)
export const getWeekStartDay = (timestamp) => {
  const weekMonday = dayjs(timestamp).startOf("week").add(1, "day").format("YYYY-MM-DD")
  return weekMonday
}

const getPreviousWeekStartDay = (timestamp) => {
  const weekMonday = dayjs(timestamp).startOf("week").add(1, "day").subtract(7, "day").format("YYYY-MM-DD")
  return weekMonday
}

// tier
// 1, 2, 3, 4(contributor)
const getWeeklyTier = async (userAddress, timestamp) => {
  userAddress = userAddress.toLowerCase()

  // check if user is contributor
  if (await redis.sismember("KEY_CONTRIBUTORS", userAddress)) {
    return 4
  }

  // get previous week score
  const previousWeekMonday = getPreviousWeekStartDay(timestamp)
  
  const weeklyPoints: any = await redis.zscore(`POINTS-WEEKLY:${previousWeekMonday}`, userAddress) || 0

  // get tier
  switch (true) {
    case Number(weeklyPoints) < TIER_2_POINT_THRESHOLD:
      return 1 // tier 1
    case Number(weeklyPoints) < TIER_3_POINT_THRESHOLD:
      return 2 // tier 2
    default:
      return 3 // tier 3
  }
}

const getParentRebatePoint = (point, tier) => {
  switch (tier) {
    case 1:
      return new BigNumber(point).multipliedBy(REBATE_POINT_RATE_TO_TIER_1_PARENT).toNumber()
    case 2:
      return new BigNumber(point).multipliedBy(REBATE_POINT_RATE_TO_TIER_2_PARENT).toNumber()
    case 3:
      return new BigNumber(point).multipliedBy(REBATE_POINT_RATE_TO_TIER_3_PARENT).toNumber()
    case 4:
      return new BigNumber(point).multipliedBy(REBATE_POINT_RATE_TO_TIER_4_PARENT).toNumber()
    default:
      return 0
  }
}

const getSelfRebatePoint = (point, tier) => {
  switch (tier) {
    case 1:
      return new BigNumber(point).multipliedBy(REBATE_POINT_RATE_TO_TIER_1_SELF).toNumber()
    case 2:
      return new BigNumber(point).multipliedBy(REBATE_POINT_RATE_TO_TIER_2_SELF).toNumber()
    case 3:
      return new BigNumber(point).multipliedBy(REBATE_POINT_RATE_TO_TIER_3_SELF).toNumber()
    case 4:
      return new BigNumber(point).multipliedBy(REBATE_POINT_RATE_TO_TIER_4_SELF).toNumber()
    default:
      return 0
  }
}

export const addPoint = async (userAddress, point, timestamp) => {
  userAddress = userAddress.toLowerCase()

  const pipeline = redis.pipeline()

  const weekMonday = getWeekStartDay(timestamp)

  const userTier = await getWeeklyTier(userAddress, timestamp)

  const selfRebatePoint = getSelfRebatePoint(point, userTier)

  // user point
  pipeline.zincrby("POINTS", new BigNumber(point).plus(selfRebatePoint).toNumber(), userAddress)
  pipeline.zincrby(`POINTS-WEEKLY:${weekMonday}`, new BigNumber(point).plus(selfRebatePoint).toNumber(), userAddress)
  pipeline.incrbyfloat(`POINTS-WEEKLY-TOTAL:${weekMonday}`, new BigNumber(point).plus(selfRebatePoint).toNumber())

  // parent point rebate
  const parent = String(await redis.get(`parent:${userAddress}`) || "").toLowerCase()

  if (parent) {
    const parentTier = await getWeeklyTier(parent, timestamp)

    const pointToParent = getParentRebatePoint(point, parentTier)

    pipeline.zincrby("POINTS", pointToParent, parent)
    pipeline.zincrby(`POINTS-WEEKLY:${weekMonday}`, pointToParent, parent)
    pipeline.incrbyfloat(`POINTS-WEEKLY-TOTAL:${weekMonday}`, pointToParent)
    pipeline.incrbyfloat(`POINT_FROM_CHILDREN:${parent}`, pointToParent)
  }

  // grandparent point rebate
  const grandparent = String(await redis.get(`parent:${parent}`) || "").toLowerCase()

  if (grandparent) {

    const pointToGrandparent = new BigNumber(point).multipliedBy(REBATE_POINT_RATE_TO_GRANDPARENT).toNumber()

    pipeline.zincrby("POINTS", pointToGrandparent, grandparent)
    pipeline.zincrby(`POINTS-WEEKLY:${weekMonday}`, pointToGrandparent, grandparent)
    pipeline.incrbyfloat(`POINTS-WEEKLY-TOTAL:${weekMonday}`, pointToGrandparent)
    pipeline.incrbyfloat(`POINT_FROM_GRANDCHILDREN:${grandparent}`, pointToGrandparent)
  }

  await pipeline.exec()
}

// Trade

export const applyTradePoint = async (log: any, userAddress) => {
  userAddress = userAddress.toLowerCase()

  const { length } = parseOptionTokenId(BigInt(log.args.optionTokenId))

  const notionalVolume = new BigNumber(log.args.size)
    .div(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex])
    .multipliedBy(log.args.spotPrice)
    .div(10 ** 30)
    .multipliedBy(length)
    .toNumber()

  const executionVolume = new BigNumber(log.args.size)
    .div(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex])
    .multipliedBy(log.args.executionPrice)
    .div(10 ** 30)
    .toNumber()

  const point = new BigNumber(notionalVolume)
    .multipliedBy(NOTIONAL_VOLUME_POINT_RATE)
    .plus(
      new BigNumber(executionVolume)
        .multipliedBy(EXECUTION_VOLUME_POINT_RATE)
      )
    .toNumber()

  const timestamp = log.block.timestamp * 1000

  await addPoint(userAddress, point, timestamp)
}

export const applyFeePoint = async (log: any, userAddress) => {
  const parsedFeeUsd = new BigNumber(log.args.feeUsd)
    .div(10 ** 30)
    .toNumber()

  const timestamp = log.block.timestamp * 1000

  await applyTradeFeePoint(userAddress, parsedFeeUsd, timestamp)
}

const applyTradeFeePoint = async (userAddress, tradeFeeUSD, timestamp) => {
  userAddress = userAddress.toLowerCase()

  await addPoint(userAddress, new BigNumber(tradeFeeUSD).multipliedBy(TRADE_FEE_POINT_RATE).toNumber(), timestamp)
}

// OLP deposit
export const registerOLPDeposit = async (userAddress, olpAmount, timestamp) => {
  userAddress = userAddress.toLowerCase()

  // apply immediate point
  await addPoint(userAddress, new BigNumber(olpAmount).multipliedBy(OLP_DEPOSIT_POINT_RATE).toNumber(), timestamp)

  // OLP_DEPOSITS will be used for daily point application
  await redis.zincrby("OLP_DEPOSITS", olpAmount, userAddress.toLowerCase())
}

// OLP withdraw
export const deregisterOLPDeposit = async (userAddress, olpAmount) => {
  userAddress = userAddress.toLowerCase()

  await redis.zincrby("OLP_DEPOSITS", -1 * olpAmount, userAddress)
}

// Referral
export const registerParent = async (user, parent, timestamp) => {

  user = user.toLowerCase()
  parent = parent.toLowerCase()

  const pipeline = redis.pipeline()

  const weekMonday = getWeekStartDay(timestamp)

  // points to parent
  pipeline.zincrby("POINTS", REFERRAL_REGISTER_POINT_TO_PARENT, parent)
  pipeline.zincrby(`POINTS-WEEKLY:${weekMonday}`, REFERRAL_REGISTER_POINT_TO_PARENT, parent)
  pipeline.incrbyfloat(`POINTS-WEEKLY-TOTAL:${weekMonday}`, REFERRAL_REGISTER_POINT_TO_PARENT)
  pipeline.incrbyfloat(`POINT_FROM_CHILDREN:${parent}`, REFERRAL_REGISTER_POINT_TO_PARENT)

  const grandparent = String(await redis.get(`parent:${parent}`) || "").toLowerCase()

  // points to grandparent
  if (grandparent) {
    pipeline.zincrby("POINTS", REFERRAL_REGISTER_POINT_TO_GRANDPARENT, grandparent)
    pipeline.zincrby(`POINTS-WEEKLY:${weekMonday}`, REFERRAL_REGISTER_POINT_TO_GRANDPARENT, grandparent)
    pipeline.incrbyfloat(`POINTS-WEEKLY-TOTAL:${weekMonday}`, REFERRAL_REGISTER_POINT_TO_GRANDPARENT)
    pipeline.incrbyfloat(`POINT_FROM_GRANDCHILDREN:${grandparent}`, REFERRAL_REGISTER_POINT_TO_GRANDPARENT)
  }

  await pipeline.exec()
}
