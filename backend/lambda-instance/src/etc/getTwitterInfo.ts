import { initializeRedis } from "../redis"

export const getTwitterInfoDataBatch = async (addresses: `0x${string}`[]) => {
  try {
    const { redis } = await initializeRedis()
    const pipeline = redis.pipeline()
  
    addresses.forEach(address => {
      pipeline.get(`twitter:id:${address}`)
      pipeline.get(`twitter:username:${address}`)
      pipeline.get(`twitter:profileImageUrl:${address}`)
    })
  
    const results: any = await pipeline.exec()
  
    const twitterData = addresses.map((address, index) => {
      const baseIndex = index * 3
      const [, id] = results[baseIndex]
      const [, username] = results[baseIndex + 1]
      const [, profileImageUrl] = results[baseIndex + 2]
  
      return {
        address,
        id,
        username,
        profileImageUrl,
      }
    })
  
    return {
      statusCode: 200,
      data: twitterData
    }
  } catch (error) {
    console.log('error in getTwitterInfoData:', error)
    return {
      statusCode: 500,
      error: "Internal server error."
    }
  }
}