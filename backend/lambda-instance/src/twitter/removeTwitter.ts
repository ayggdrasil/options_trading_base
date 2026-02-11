import { initializeRedis } from "../redis"
import {TwitterApi} from 'twitter-api-v2';
import {v4 as uuidv4} from 'uuid';


export const _removeTwitter = async (address:`0x${string}`) => {

  const twitterClient = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  });

  const { redis } = await initializeRedis()
  try {
    const pipeline = redis.pipeline()
    pipeline.del(`twitter:id:${address}`);
    pipeline.del(`twitter:username:${address}`);
    await pipeline.exec()
    return {
      statusCode: 302,
      errorMessage: ""
    }
  } catch (error) {
    return {
      statusCode: 302,
      errorMessage: ""
    }
  }
}
