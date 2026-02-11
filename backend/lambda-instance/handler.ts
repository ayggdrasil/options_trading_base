import { executePositionRequestParallel } from './src/process/parallel.executePositionRequest'
import { getMyPositions, getPositions, getOlpApr, hasPosition, getMyTradeData, getMyPositionHistory, getMyAddLiquidity, getUserAddLiquidity, getCopyTradePositionHistory, getOlpStatsDaily, getVolatilityScore, getMyAccountSummary, getMyOlpQueue, getMyOlpPnl } from './src/api'
import { collectTradeDataParallel } from './src/process/parallel.collectTradeData'
import { checkFileUpdates } from './src/process/check.fileUpdates'
import { getReferralInfo } from './src/user/referral'
import { checkFeedUpdates } from './src/process/check.feedUpdates'
import { notifyTradeData } from './src/process/notify.tradeData'
import { collectOlpStats } from './src/process/collect.olpStats'
import { _applyWeeklyRewardPoints, applyOLPDepositPoint, getLeaderboard, getUserPointInfo } from './src/user/point'
import { feedDefillamaData } from './src/etc/feedDefillama'
import { checkKeeperBalances } from './src/process/check.keeperBalances'
import { getRevenueData } from './src/etc/getRevenueData'
import { isRestrictedIp } from './src/etc/isRestrictedIp'
import { feedRiskFreeRates } from './src/process/feed.riskFreeRates'
import { collectMarketDataParallel } from './src/process/parallel.collectMarketData'
import { connectWebSocket } from './src/utils/websocket'
import { getProtocolNetRevenueData, getProtocolNetRevenueDataWithRange } from './src/etc/getProtocolNetRevenue'
import { getTwitterInfoDataBatch } from './src/etc/getTwitterInfo'
import { feedKlineDataParallel } from './src/process/parallel.feedKlineData'
import { getKlinesData } from './src/price/klines'
import { detectPriceVolatility } from './src/process/instrument/detect.priceVolatility'
import { feedInstruments } from './src/process/instrument/feed.instruments'
import { updateOptionsMarket } from './src/process/instrument/update.optionsMarket'
import { distributeFee } from './src/process/fee/distribute.fee'
import { distributeReward } from './src/process/fee/distribute.reward'
import { _connectTwitter } from "./src/twitter/connectTwitter";
import { _twitterCallback } from "./src/twitter/twitterCallback";
import { _removeTwitter } from "./src/twitter/removeTwitter";
import { clearPositions } from './src/process/clear.positions'
import { checkAvailableAmounts } from './src/process/check.availableAmounts'
import { updateDashboardData } from './src/olpPoolDashboard/updateDashboardData'
import { SecretKeyManager } from "./crypto";

import { feedTwapPrice } from './src/process/settle/feed.twapPrice'
import { feedSettlePrice } from './src/process/settle/feed.settlePrice'
import { executeVaultSettlement } from './src/process/settle/execute.vaultSettlement'
import { updateMarketIndexParallel } from './src/feed/parallel.updateMarketIndex'
import { notifyPositions } from './src/process/notify.positions'
import { collectMarketData } from './src/process/collect.marketData'
import { checkMarketChange } from './src/process/check.marketChange'
import { updateOlppvParallel } from './src/feed/parallel.updateOlppv'
import { feedOnchainDataParallel } from './src/feed/parallel.feedOnchainData'
import { updateMarketIndexDaily } from './src/feed/update.marketIndexDaily'
import { updateDaily } from './src/process/update.daily'
import { manageEpoch } from './src/olp/epoch/manage.epoch'
import { executeOlpQueueParallel } from './src/olp/epoch/parallel.processOlpQueue'
import { feedOlppvSubmission } from './src/olp/epoch/feed.olppvSubmission'
import { updateEpochConfig } from './src/olp/epoch/config'
import { getEpochInfo as getEpochInfoHandler } from './src/api/getEpochInfo'

// Schedule
// 1s interval (fast task)
// executePosition

// 1m interval (normal task)
// feedInstruments, settleOption, clearing, feeDistribution, updateOptionMarket

const isServerDisabled = false;

const loadEnv = async () => {
    const secretKeyManager = new SecretKeyManager({ region: 'ap-southeast-1', DEFAULT_PATH: process.env.SECRET_PATH })

    // load from secret manager
    const [keeperSigners, appRequirements] = await Promise.all([
      secretKeyManager.decrypt({ keyName: 'keeper_signers' }),
      secretKeyManager.decrypt({ keyName: 'app_lambda_requirements' })
    ])
    
    const keeperData = JSON.parse(keeperSigners)
    const appData = JSON.parse(appRequirements)

    // Expected keeper signers keys
    const keeperKeys = [
      'KP_OPTIONS_MARKET',
      'KP_POSITION_PROCESSOR',
      'KP_SETTLE_OPERATOR',
      'KP_PV_FEEDER',
      'KP_SPOT_FEEDER',
      'KP_FEE_DISTRIBUTOR',
      'KP_CLEARING_HOUSE',
      'KP_OLP_PROCESSOR'
    ] as const

    // Expected app requirements keys
    const appKeys = [
      'APP_REDIS_HOST',
      'APP_REDIS_PASSWORD',
      'APP_REDIS_GLOBAL_HOST',
      'APP_REDIS_GLOBAL_PASSWORD',
      'TWITTER_CLIENT_ID',
      'TWITTER_CLIENT_SECRET',
      'TWITTER_BEARER_TOKEN',
      'GOOGLE_SPREADSHEET_ID',
      'SLACK_BOT_TOKEN',
      'SLACK_NOTIFICATION_CHANNEL_ID',
      'SLACK_ALERT_CHANNEL_ID',
      'SLACK_TRADE_CHANNEL_ID',
      'MAX_POSITION_PROCESS_ITEMS',
      'MAX_SETTLE_POSITION_PROCESS_ITEMS',
      'MAX_OLP_QUEUE_EXECUTE_ITEMS',
      'DEADLINE_SECONDS',
      'TX_SERVICE_URL',
      'IV_CURVE_BATCH_URL',
      'APP_EXECUTE_API_BASE_URL',
      'APP_URL',
      'APP_CLOUDFRONT_DISTRIBUTION_ID',
      'DUNE_API_KEY',
      'DUNE_QUERY_ID_FEES_AND_RP',
      'DUNE_QUERY_ID_NOTIONAL_VOLUME',
      'DUNE_QUERY_ID_PNL',
      'DUNE_QUERY_ID_DISTRIBUTED_ETH_REWARD',
      'DUNE_QUERY_ID_OLP_INFO',
    ] as const

    // Assign with validation (optional)
    keeperKeys.forEach(key => {
      if (keeperData[key]) {
        process.env[key] = keeperData[key]
      }
    })

    appKeys.forEach(key => {
      if (appData[key]) {
        process.env[key] = appData[key]
      }
    })
}

//////////////////////////////
//  global process          //
//////////////////////////////

export const processUpdateMarketIndexParallel = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await updateMarketIndexParallel(event, process.env.MAX_RUNNING_TIME_FOR_PARALLEL_TASK)
}

export const processUpdateMarketIndexDaily = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await updateMarketIndexDaily();
}

export const processFeedKlineDataParallel = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await feedKlineDataParallel(event, process.env.MAX_RUNNING_TIME_FOR_PARALLEL_TASK)
}

export const processFeedRiskFreeRates = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await feedRiskFreeRates();
}

export const processFeedTwapPrice = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await feedTwapPrice();
}

//////////////////////////////
//  process parallel        //
//////////////////////////////

export const processExecutePositionRequestParallel = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await executePositionRequestParallel(event, process.env.MAX_RUNNING_TIME_FOR_PARALLEL_TASK)
}

export const processCollectMarketDataParallel = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await collectMarketDataParallel(event, process.env.MAX_RUNNING_TIME_FOR_PARALLEL_TASK)
}

export const processCollectTradeDataParallel = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await collectTradeDataParallel(event, process.env.MAX_RUNNING_TIME_FOR_PARALLEL_TASK)
}

export const processUpdateOlppvParallel = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await updateOlppvParallel(event, process.env.MAX_RUNNING_TIME_FOR_PARALLEL_TASK)
}

export const processFeedOnchainDataParallel = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  const spotAssets = ["BTC", "ETH", "USDC"];
  return await feedOnchainDataParallel(
    {
      ...event,
      spotAssets
    },
    process.env.MAX_RUNNING_TIME_FOR_PARALLEL_TASK
  )
}

//////////////////////////////
//  OLP Epoch Management    //
//////////////////////////////

export const processSVaultManageEpoch = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await manageEpoch('s');
}

export const processSVaultExecuteOlpQueueParallel = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await executeOlpQueueParallel(
    {
      vaultType: 's',
    },
    process.env.MAX_RUNNING_TIME_FOR_PARALLEL_TASK
  )
}

export const processSVaultFeedOlppvSubmission = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await feedOlppvSubmission('s');
}

// example:
// npx serverless invoke --function processUpdateEpochConfig --config serverless.base.yml --data '{
//   "vaultType": "s",
//   "submissionDurationMinutes": 20,
//   "processDurationMinutes": 10
// }'
export const processUpdateEpochConfig = async (event) => {
  if (isServerDisabled) return;
  await loadEnv();
  
  const { vaultType, submissionDurationMinutes, processDurationMinutes } = event;
  
  // Validate required parameters
  if (!vaultType) {
    throw new Error('vaultType is required');
  }
  if (submissionDurationMinutes === undefined || submissionDurationMinutes === null) {
    throw new Error('submissionDurationMinutes is required');
  }
  if (processDurationMinutes === undefined || processDurationMinutes === null) {
    throw new Error('processDurationMinutes is required');
  }
  
  return await updateEpochConfig(vaultType, {
    submissionDurationMinutes,
    processDurationMinutes
  });
}

export const getEpochInfo = async (event) => {
  if (isServerDisabled) return;
  await loadEnv();
  
  const vaultType = event.queryStringParameters?.vaultType || 's';
  
  try {
    const response = await getEpochInfoHandler(vaultType);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message || 'Failed to get epoch info' 
      })
    };
  }
}

//////////////////////////////
//  process single          //
//////////////////////////////

export const processUpdateDaily = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await updateDaily();
}

export const processNotifyTradeData = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await notifyTradeData();
}

export const processNotifyPositions = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await notifyPositions();
}

export const processCheckAvailableAmounts = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await checkAvailableAmounts();
}

export const processCheckMarketChange = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await checkMarketChange();
}

export const processCheckKeeperBalances = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await checkKeeperBalances();
}

export const processCheckFeedUpdates = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await checkFeedUpdates()
}

export const processCheckFileUpdates = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await checkFileUpdates()
}

export const processCollectOlpStats = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await collectOlpStats()
}

export const processCollectMarketDaily = async (event) => {
  if (isServerDisabled) return;
  await loadEnv();
  return await collectMarketData(0, false);
};

export const processDetectPriceVolatility = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await detectPriceVolatility();
}

export const processFeedInstruments = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await feedInstruments();
}

export const processUpdateOptionsMarket = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await updateOptionsMarket("");
}

export const processDistributeFee = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await distributeFee();
}

// export const processDistributeReward = async (event) => {
//   if (isServerDisabled) return;
//   await loadEnv()
//   return await distributeReward();
// }

export const processClearPositions = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await clearPositions();
}

export const processFeedSettlePrice = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await feedSettlePrice()
}

export const processExecuteVaultSettlement = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await executeVaultSettlement()
}

export const query = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  const allowedOrigins = ['https://galxe.com'];
  const origin = event.headers.origin;
  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Preflight request handling
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400", // 24 hours
      },
      body: null,
    };
  }

  // Handle actual request
  if (!event.queryStringParameters) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "*",
      },
      body: "No query string parameters provided",
    };
  }

  // get query string
  const { method } = event.queryStringParameters
  if (!method) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "*",
      },
      body: "Method not provided in query string parameters",
    };
  }

  let response

  switch (method) {
    case 'getPositions':
      response = await getPositions(event)
      break
    case 'getMyPositions':
      response = await getMyPositions(event)
      break
    case 'getOlpApr':
      response = await getOlpApr(event)
      break
    case 'hasPosition':
      response = await hasPosition(event)
      break
    case 'getMyTradeData':
      response = await getMyTradeData(event)
      break
    case 'getMyPositionHistory':
      response = await getMyPositionHistory(event);
      break;
    case 'getUserAddLiquidity':
      response = await getUserAddLiquidity(event);
      break;
    case 'getMyAddLiquidity':
      response = await getMyAddLiquidity(event);
      break;
    case 'getReferralInfo':
      response = await getReferralInfo(event.queryStringParameters?.address);
      break
    case 'getUserPointInfo':
      response = await getUserPointInfo(event.queryStringParameters?.address);
      break;
    case 'getLeaderboard':
      response = await getLeaderboard()
      break;
    case 'getCopyTradePositionHistory':
      response = await getCopyTradePositionHistory(event)
      break;
    case 'getOlpStatsDaily':
      response = await getOlpStatsDaily(event)
      break;
    case 'getMyAccountSummary':
      response = await getMyAccountSummary(event)
      break;
    case 'getVolatilityScore':
      response = await getVolatilityScore(event)
      break;
    case 'getMyOlpQueue':
      response = await getMyOlpQueue(event)
      break;
    case 'getMyOlpPnl':
      response = await getMyOlpPnl(event)
      break;
    default:
      response = { error: 'Invalid method' };
      break;
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "*",
      "Access-Control-Allow-Methods": isAllowedOrigin ? 'GET, POST' : "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(response)
  };
  
  // @dev
  // const response = await getVolatilityScore(event)
  // console.log(response, "response")
}

export const getKlines = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  const symbol = event.queryStringParameters.symbol;
  const interval = event.queryStringParameters.interval;
  const startTime = event.queryStringParameters?.startTime;
  const endTime = event.queryStringParameters?.endTime;
  const limit = event.queryStringParameters?.limit || 1000;

  if (!symbol || !interval) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: 'Invalid query string parameters' }),
    }
  }

  try {
    const data = await getKlinesData({ symbol, interval, startTime, endTime, limit })

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    }
  } catch (error) {
    console.log('Error fetching kline data:', error)
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: 'Error fetching kline data' }),
    }
  }
}

export const applyOLPDepositPoints = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()

  const timestamp = new Date().getTime()

  await applyOLPDepositPoint(timestamp)

  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({ result: true }),
  }

  return response
}

export const applyWeeklyRewardPoints = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  const timestamp = new Date().getTime()
  await _applyWeeklyRewardPoints(timestamp)
}

// end_time : timestamp
export const getVolumeData = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  
  const endTime = Number(event.queryStringParameters?.end_time || new Date().getTime())
  const timeDiff = Math.abs(new Date().getTime() - endTime)

  if (timeDiff > 86400 * 1000 * 365) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ error: 'Invalid end time' }),
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(await feedDefillamaData(endTime)),
  }
}

// end_time : timestamp
export const getRevenue = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  const endTime = Number(event.queryStringParameters?.end_time || new Date().getTime())

  const timeDiff = Math.abs(new Date().getTime() - endTime)

  if (timeDiff > 86400 * 1000 * 365) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ error: 'Invalid end time' }),
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(await getRevenueData(endTime)),
  }
}

export const getTwitterInfo = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': true,
  }
  try {
    let addresses: `0x${string}`[] = []
    
    if (event.httpMethod === 'POST' && event.body) {
      const body = JSON.parse(event.body)
      addresses = body.addresses || []
    }
    else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No addresses provided' }),
      }
    }

    const MAX_ADDRESS_LENGTH = 1000
    if (addresses.length > MAX_ADDRESS_LENGTH) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `at most ${MAX_ADDRESS_LENGTH} addresses.` }),
      }
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(await getTwitterInfoDataBatch(addresses)),
    }
  } catch (error) {
    console.log('Error fetching twitter info:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error fetching twitter info' }),
    }
  }
}

export const connectTwitter = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  const allowedOrigins = [process.env.APP_URL];
  const origin = event.headers.origin;
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const address = event.queryStringParameters?.address
  const _result = await _connectTwitter(address)
  const sessionId = _result.sessionId
  return {
    statusCode: _result.statusCode,
    headers: {
      "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "*",
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': true,
      'Set-Cookie': `sessionid=${sessionId}; Path=/; HttpOnly; SameSite=Lax`, // TODO: set Secure;
      'Location': _result.url
    },
    body: ""
  }
}

export const twitterCallback = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  const cookiesHeader = event.headers?.Cookie || event.headers?.cookie; // Header key can be 'Cookie' or 'cookie'
  let sessionId = null;
  if (cookiesHeader) {
    const cookies = cookiesHeader.split(';');
    const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('sessionid='));

    if (sessionCookie) {
      sessionId = sessionCookie.split('=')[1].trim();
    }
  }
  if (!sessionId) {
    console.log("sessionId not found.")
  }
  const state = event.queryStringParameters?.state
  const code = event.queryStringParameters?.code
  const _result = await _twitterCallback(
    sessionId,
    state,
    code
  )
  return {
    statusCode: _result.statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': true,
      'Location': process.env.APP_URL
    },
    body: ""
  }
}

export const removeTwitter = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  const allowedOrigins = [process.env.APP_URL];
  const origin = event.headers.origin;
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const address = event.queryStringParameters?.address
  const _result = await _removeTwitter(address)
  return {
    statusCode: _result.statusCode,
    headers: {
      "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "*",
      'Access-Control-Allow-Credentials': true,
      'Location': process.env.APP_URL
    },
    body: ""
  }
}

// end_time : timestamp
export const getProtocolNetRevenue = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  
  const endTime = Number(event.queryStringParameters?.end_time || new Date().getTime())
  const fromTime =  Number(event.queryStringParameters?.from_time)

  if (fromTime) {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(await getProtocolNetRevenueDataWithRange(fromTime)),
    }
  }

  const timeDiff = Math.abs(new Date().getTime() - endTime)

  if (timeDiff > 86400 * 1000 * 365) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ error: 'Invalid end time' }),
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(await getProtocolNetRevenueData(endTime)),
  }
}

export const isRestrictedCountry = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()

  const xForwardedFor = event.headers['X-Forwarded-For'] || event.headers['x-forwarded-for'];
  const sourceIp = event.requestContext.identity.sourceIp;
  const ip = xForwardedFor ? xForwardedFor.split(',')[0].trim() : sourceIp;

  if (!ip) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        ip: null,
        countryName: null,
        countryIsoCode: null,
        shouldRestrict: false
      }),
    }
  }

  const result = await isRestrictedIp(ip);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      ip,
      ...result
    }),
  }
}

export const processConnectWebSocket = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  return await connectWebSocket(event)
}

export const demo = async () => {
  await loadEnv()
}

/////////////////////
// OLP Pool Dashboard
/////////////////////

export const updateOlpPoolDashboardData = async (event) => {
  if (isServerDisabled) return;
  await loadEnv()
  const result = await updateDashboardData()
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(result),
  }
}