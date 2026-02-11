import { initializeRedis } from "../redis"
import {TwitterApi} from 'twitter-api-v2';
import {v4 as uuidv4} from 'uuid';


export const _connectTwitter = async (address:`0x${string}`) => {

  const twitterClient = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  });
  const { redis } = await initializeRedis()
  const sessionId = uuidv4();
  const pipeline = redis.pipeline()

  try {
    const {
      url,
      codeVerifier,
      state
    } = twitterClient.generateOAuth2AuthLink(
        process.env.APP_EXECUTE_API_BASE_URL + "/twitterCallback", // aws serverless
        {
          scope: [
            'tweet.read',
            'users.read',
            'offline.access'
          ]
        }
    );

    pipeline.set(`twitter:address:${sessionId}`, address);
    pipeline.set(`twitter:state:${sessionId}`, state);
    pipeline.set(`twitter:codeVerifier:${sessionId}`, codeVerifier);
    pipeline.expire(`twitter:address:${sessionId}`, 600);
    pipeline.expire(`twitter:state:${sessionId}`, 600);
    pipeline.expire(`twitter:codeVerifier:${sessionId}`, 600);
    await pipeline.exec()

    return {
      statusCode: 302,
      url: url,
      sessionId: sessionId,
      errorMessage: ""
    }
  } catch (error) {
    console.log("error in _connectTwitter : ")
    console.log(error)
    return {
      statusCode: 302,
      url: "",
      errorMessage: ""
    }
  }
}
