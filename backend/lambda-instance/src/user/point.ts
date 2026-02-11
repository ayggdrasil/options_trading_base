import dayjs from "dayjs"
import { initializeRedis } from "../redis"
import BigNumber from "bignumber.js"
import { getReferralInfo } from "./referral"
import { sendMessage } from "../utils/slack"
import { LogLevel } from "../utils/enums"
import { MESSAGE_TYPE } from "../utils/messages"

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

// constants
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

// apply olp deposit point daily 
export const applyOLPDepositPoint = async (timestamp) => {

  const { redis } = await initializeRedis()

  const day = dayjs(timestamp).format("YYYY-MM-DD")

  if (await redis.get(`OLP_DEPOSIT_POINT_APPLIED:${day}`) == "true") {
    console.log('prevented', day)
    return
  }

  // prevent duplicate application

  const olpDeposits = await redis.zrange("OLP_DEPOSITS", 0, -1, "WITHSCORES")

  const pointsToApply = []

  for (let i = 0; i < olpDeposits.length; i += 2) {
    const address = olpDeposits[i]
    const olpAmount = olpDeposits[i + 1]
    pointsToApply.push({ address, olpAmount })
  }

  const results = []

  for await (const { address, olpAmount } of pointsToApply) {
    const point = new BigNumber(olpAmount).multipliedBy(OLP_DEPOSIT_POINT_RATE).toNumber()
    await addPoint(address, point, timestamp)

    results.push({ address, olpAmount, point })
  }

  await redis.set(`OLP_DEPOSIT_POINT_APPLIED:${day}`, "true")

  await sendMessage(
    `\`[Lambda][point.ts]\` ${MESSAGE_TYPE.DAILY_OLP_DEPOSIT_POINTS_APPLIED} ${day}`,
    LogLevel.INFO,
  )
}

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

  const { redis } = await initializeRedis()

  userAddress = userAddress.toLowerCase()

  // check if user is contributor
  if (await redis.sismember("KEY_CONTRIBUTORS", userAddress)) {
    return 4
  }

  // const pipeline = redis.pipeline()

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

  const { redis } = await initializeRedis()

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

// Leaderboard

// @TODO: redis based pagination?

export const getLeaderboard = async () => {

  const { redis } = await initializeRedis()

  const timestamp = Date.now()
  const weekMonday = getWeekStartDay(timestamp)

  const pipeline = redis.pipeline()

  pipeline.zrevrange("POINTS", 0, 49, "WITHSCORES")
  pipeline.zrevrange(`POINTS-WEEKLY:${weekMonday}`, 0, 49, "WITHSCORES")
  pipeline.get(`POINTS-WEEKLY-TOTAL:${weekMonday}`)

  const [
    [, _entireLeaderboard], 
    [, _weeklyLeaderboard],
    [, weeklyTotalPoint]
  ]: any = await pipeline.exec()

  const entireLeaderboard = []
  const weeklyLeaderboard = []

  // weekly ladder reward
  const weeklyRewardPoint = new BigNumber(weeklyTotalPoint)
    .multipliedBy(0.02)
    .toNumber()

  for (let i = 0; i < _entireLeaderboard.length; i += 2) {
    const address = _entireLeaderboard[i]
    const point = _entireLeaderboard[i + 1]
    entireLeaderboard.push({ rank: entireLeaderboard.length + 1, address, point })
  }
  
  for (let i = 0; i < _weeklyLeaderboard.length; i += 2) {
    const address = _weeklyLeaderboard[i]
    const point = _weeklyLeaderboard[i + 1]

    const _rank = weeklyLeaderboard.length + 1

    const reward = getWeeklyRewardPoint(_rank, weeklyRewardPoint)

    weeklyLeaderboard.push({ 
      rank: _rank, 
      address, 
      point,
      reward,
    })
  }

  return {
    entireLeaderboard,
    weeklyLeaderboard
  }
}

export const getUserPointInfo = async (userAddress) => {

  const { redis } = await initializeRedis()

  userAddress = userAddress.toLowerCase()

  const pipeline = redis.pipeline()
  const timestamp = new Date().getTime()
  const weekMonday = getWeekStartDay(timestamp)

  // get user point info
  pipeline.zscore("POINTS", userAddress)
  pipeline.zscore(`POINTS-WEEKLY:${weekMonday}`, userAddress)
  pipeline.get(`POINT_FROM_CHILDREN:${userAddress}`)
  pipeline.get(`POINT_FROM_GRANDCHILDREN:${userAddress}`)
  pipeline.zrevrank("POINTS", userAddress)
  pipeline.zrevrank(`POINTS-WEEKLY:${weekMonday}`, userAddress)
  pipeline.get(`POINTS-WEEKLY-TOTAL:${weekMonday}`)

  // get user fee rebate info
  pipeline.zscore("FEE-REBATES-RECEIVED", userAddress)
  pipeline.zscore(`FEE-REBATES-RECEIVED-WEEKLY:${weekMonday}`, userAddress)
  pipeline.zscore("FEE-REBATES-RECEIVED-VOLUME", userAddress)
  pipeline.scard(`FEE-REBATES-RECEIVED-CHILDREN:${userAddress}`)


  const [
    [, point_entire],
    [, point_weekly],
    [, point_from_children],
    [, point_from_grandchildren],
    [, user_entire_rank],
    [, user_weekly_rank],
    [, point_weekly_total],
    [, fee_rebates_received_total],
    [, fee_rebates_received_weekly],
    [, fee_rebates_received_volume_total],
    [, fee_rebates_received_children_count],
  ]: any = await pipeline.exec()

  const referralInfo = await getReferralInfo(userAddress)
  const tier = await getWeeklyTier(userAddress, timestamp)

  const weeklyRewardPoint = new BigNumber(point_weekly_total || 0)
    .multipliedBy(0.02)
    .toNumber()

  return {
    tier,
    point_weekly_total,
    point_weekly,
    point_entire,
    point_from_children,
    point_from_grandchildren,
    count_children: referralInfo.childrenCount,
    count_grandchildren: referralInfo.grandchildrenCount,
    parent: referralInfo.parent,
    grandparent: referralInfo.grandparent,
    user_entire_rank: user_entire_rank == null ? '-' : Number(user_entire_rank) + 1,
    user_weekly_rank: user_weekly_rank == null ? '-' : Number(user_weekly_rank) + 1,
    weekly_reward: getWeeklyRewardPoint(user_weekly_rank == null 
        ? -1
        : Number(user_weekly_rank) + 1, weeklyRewardPoint),
    fee_rebates_received_total,
    fee_rebates_received_weekly,
    fee_rebates_received_volume_total,
    fee_rebates_received_children_count
  }
}

const getWeeklyRewardPoint = (rank, weeklyRewardPoint) => {
  if (rank == 1) {
    return new BigNumber(weeklyRewardPoint).multipliedBy(0.25).toNumber()
  }

  if (rank == 2) {
    return new BigNumber(weeklyRewardPoint).multipliedBy(0.15).toNumber()
  }

  if (rank == 3) {
    return new BigNumber(weeklyRewardPoint).multipliedBy(0.1).toNumber()
  }

  if (rank >= 4 && rank <= 10) {
    return new BigNumber(weeklyRewardPoint).multipliedBy(0.0714).toNumber()
  }

  return 0
}

export const _applyWeeklyRewardPoints = async (timestamp) => {

  const { redis } = await initializeRedis()

  const previousWeekMonday = getPreviousWeekStartDay(timestamp)

  const pipeline = redis.pipeline()

  pipeline.get(`POINTS-WEEKLY-TOTAL:${previousWeekMonday}`)
  pipeline.zrevrange(`POINTS-WEEKLY:${previousWeekMonday}`, 0, 9)
  
  const [
    [, previousWeekTotalPoint],
    [, top10Users]
  ]: any = await pipeline.exec()

  console.log(previousWeekTotalPoint, 'previousWeekTotalPoint')
  console.log(top10Users, 'top10Users')

  const weeklyRewardPoint = new BigNumber(previousWeekTotalPoint)
    .multipliedBy(0.02)
    .toNumber()

  console.log(weeklyRewardPoint, 'weeklyRewardPoint')

  const results = []

  for await (let [index, userAddress] of top10Users.entries()) {
    userAddress = userAddress.toLowerCase()

    const rank = index + 1

    const point = getWeeklyRewardPoint(rank, weeklyRewardPoint)

    await addPoint(userAddress, point, timestamp)

    results.push({ userAddress, point })
  }

  await sendMessage(
    `\`[Lambda][point.ts]\` ${MESSAGE_TYPE.WEEKLY_REWARD_POINTS_APPLIED} ${previousWeekMonday}`,
    LogLevel.INFO,
  )
}