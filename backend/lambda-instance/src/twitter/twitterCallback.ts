import { initializeRedis } from "../redis"
import {TwitterApi} from 'twitter-api-v2';

export const _twitterCallback = async (sessionId:string, state: string, code:string) => {
  const twitterClient = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET
  });
  const { redis } = await initializeRedis()

  const pipeline = redis.pipeline()
  pipeline.get(`twitter:address:${sessionId}`);
  pipeline.get(`twitter:state:${sessionId}`);
  pipeline.get(`twitter:codeVerifier:${sessionId}`);
  let [
    [, address],
    [, stateSaved],
    [, codeVerifier],
  ]: any = await pipeline.exec()

  if (!codeVerifier || !state || !stateSaved || !code) {
    console.log("codeVerifier or state or stateSaved or code is not found.")
    console.log({ codeVerifier, state, stateSaved, code })
    return {
      statusCode: 302, // Status code for redirection
      redirectUri: process.env.APP_URL
    };
  }

  if (state !== stateSaved) {
    console.log("state, stateSaved not match.")
    console.log({ state, stateSaved })
    return {
      statusCode: 302, // Status code for redirection
      redirectUri: process.env.APP_URL
    };
  }

  let client: TwitterApi
  try {
    const {client: loggedClient} = await twitterClient.loginWithOAuth2(
        {
          code,
          codeVerifier,
          redirectUri: process.env.APP_EXECUTE_API_BASE_URL + "/twitterCallback",
        },
    )
    client = loggedClient
  } catch (err) {
    console.log("error with loginWithOAuth2 : ", err)
    return {
      statusCode: 302, // Status code for redirection
      redirectUri: process.env.APP_URL
    };
  }

  let dataGet: {
    id: string,
    username: string,
    profileImageUrl: string
  }
  try {
    const {data} = await client.currentUserV2()
    dataGet = {
      id: data.id,
      username: data.username,
      profileImageUrl: "",
    }
  } catch (err) {
    console.log("error fetching currentUserV2 : ", err)
    return {
      statusCode: 302, // Status code for redirection
      redirectUri: process.env.APP_URL
    };
  }

  try {
    if (!dataGet.profileImageUrl) { // always pass
      const profileImageUrl = await fetchTwitterUserProfile(dataGet.id);
      console.log("profileImageUrl : ", profileImageUrl)
      if (!profileImageUrl) {
        console.log("fetchTwitterUserProfile failed.")
        return {
          statusCode: 302, // Status code for redirection
          redirectUri: process.env.APP_URL
        };
      }
      dataGet.profileImageUrl = profileImageUrl;
    }
  } catch (err) {
    console.log("error with fetchTwitterUserProfile : ", err)
    return {
      statusCode: 302, // Status code for redirection
      redirectUri: process.env.APP_URL
    };
  }


  try {
    const newPipeline = redis.pipeline()
    newPipeline.set(`twitter:id:${address}`, dataGet.id);
    newPipeline.set(`twitter:username:${address}`, dataGet.username);
    newPipeline.set(`twitter:profileImageUrl:${address}`, dataGet.profileImageUrl);
    await newPipeline.exec()
  } catch (err) {
    console.log("error with set twitter data to redis")
    console.log(err)
    return {
      statusCode: 302, // Status code for redirection
      redirectUri: process.env.APP_URL
    };
  }

  const expirationDate = new Date();
  expirationDate.setTime(expirationDate.getTime() + 3600 * 1000); // cookie 1 hour

  // Redirect to frontend application
  return {
    statusCode: 302, // Status code for redirection
    redirectUri: process.env.APP_URL
  };
}


export const fetchTwitterUserProfile = async (userId) => {
  const url = `https://api.twitter.com/2/users/${userId}?user.fields=profile_image_url`;
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log("fetchTwitterUserProfile response error")
      console.log(response)
      throw new Error(`fetchTwitterUserProfile response error`);
    }

    const { data } = await response.json();
    return data.profile_image_url
  } catch (err) {
    console.log("fetchTwitterUserProfile error")
    console.log(err)
    throw new Error(`error fetching twitter user profile: ${err}`)
  }
};
