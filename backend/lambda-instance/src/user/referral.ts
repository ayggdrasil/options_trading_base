import { initializeRedis } from "../redis"

export const getReferralInfo = async (userAddress) => {

  const { redis } = await initializeRedis()

  userAddress = userAddress.toLowerCase()

  const pipeline = redis.pipeline()

  pipeline.get(`grandparent:${userAddress}`)
  pipeline.get(`parent:${userAddress}`)
  pipeline.scard(`children:${userAddress}`)
  pipeline.scard(`grandchildren:${userAddress}`)

  const [
    [_1, grandparent],
    [_2, parent],
    [_3, childrenCount],
    [_4, grandchildrenCount],
  ] = await pipeline.exec()

  return {
    grandparent,
    parent,
    childrenCount,
    grandchildrenCount,
  }
}