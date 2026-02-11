import {
  PositionState,
  SettleState,
  getAddLiquidityWithFilter,
  getCopyTradePositionHistoryWithFilter,
  getPositionHistoryWithFilter,
  getPositionQueryFilter,
  getPositionsWithFilter,
  getVaultQueueItemsWithFilter,
  hasVaultQueueItemsWithFilter,
  getOlpQueueItemsWithFilter,
} from './utils/queries';
import { fetchDataFromS3, getS3 } from './utils/aws';
import { ASSET_ADDRESS_TO_TICKER, ASSET_TICKER_TO_DECIMALS, OLP_NAME_TO_ADDRESS } from './constants';
import BigNumber from 'bignumber.js';
import initializeContracts from './contract';
import request, { gql } from 'graphql-request';
import { generateCexCommonInstrument } from './utils/format';
import { CONFIG } from './constants/constants.config';
import { getDailyRedis, initializeRedis } from './redis';
import { CONTRACT_ADDRESSES } from './constants/constants.addresses';
import { getMarketDataS3, getSpotS3 } from './utils/aws-getter';
import { REDIS_KEYS } from './utils/redis-key';
import { getDateISOString } from './utils/date';
import dayjs from 'dayjs';
import { formatUnits } from 'ethers';
import { calculateVolatilityScore } from './utils/volatility-score';
import { calculateUnderlyingFutures, ChainNames, getInstrumentMarkDataFromMarket, getMainOptionStrikePrice, getMarkIvAndPriceByOptionTokenId, getPairedOptionStrikePrice, parseOptionTokenId, UA_ADDRESS_TO_TICKER, UA_INDEX_TO_ADDRESS, UA_INDEX_TO_TICKER, UA_TICKER_TO_DECIMAL, UnderlyingAssetIndex } from '@callput/shared';
import { VolatilityScoreRes } from './feed/interfaces';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export const hasPosition = async (event) => {
  const chainId = Number(process.env.CHAIN_ID);

  const {
    underlyingAssetIndex,
    address,
    positionState = PositionState.ALL,
    settleState = SettleState.ALL,
  } = event.queryStringParameters;

  if (!address) return null;

  let document = gql`
    query ($first: Int, $filter: PositionFilter) {
      positions(first: $first, filter: $filter) {
        nodes {
          id
          account
          underlyingAssetIndex
        }
      }
    }
  `;
  const positionQueryFilter = getPositionQueryFilter(
    address,
    positionState,
    settleState,
    underlyingAssetIndex,
  );

  const response: any = await request(
    CONFIG[chainId].SUBQL_URL,
    document,
    {
      first: 1,
      filter: positionQueryFilter,
    }
  )

  return response.positions.nodes.length > 0;
};

export const getPositions = async (event) => {
  const {
    address,
    underlyingAssetIndex,
    positionState = PositionState.ALL,
    settleState = SettleState.ALL,
  } = event.queryStringParameters;

  if (!address) return null;

  const positionQueryFilter = getPositionQueryFilter(
    address,
    positionState,
    settleState,
    underlyingAssetIndex,
  );

  return await getPositionsWithFilter(positionQueryFilter);
};

export const getMyPositions = async (event): Promise<any> => {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  const {
    address,
    positionState = PositionState.ALL,
    settleState = SettleState.ALL,
  } = event.queryStringParameters;
  if (!address) return null;

  const { data } = await getS3({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: process.env.APP_DATA_MARKET_DATA_KEY,
  });

  const { market, futuresIndices, riskFreeRates } = data;

  const positionQueryFilter = getPositionQueryFilter(address, positionState, settleState, null);

  const { nodes } = await getPositionsWithFilter(positionQueryFilter);

  let result: any = {};

  // initialize data object
  for (const underlyingAssetAddress in UA_ADDRESS_TO_TICKER[chainName]) {
    result[UA_ADDRESS_TO_TICKER[chainName][underlyingAssetAddress.toLowerCase()]] = {};
  }

  let lastUpdatedAt = 0;

  nodes.forEach((node) => {
    const {
      underlyingAssetIndex,
      expiry,
      optionTokenId,
      length,
      isBuys,
      strikePrices,
      isCalls,
      optionNames,
      size,
      sizeOpened,
      sizeClosing,
      sizeClosed,
      sizeSettled,
      isBuy,
      executionPrice,
      openedToken,
      openedAmount,
      openedCollateralToken,
      openedCollateralAmount,
      openedAvgExecutionPrice,
      openedAvgSpotPrice,
      closedToken,
      closedAmount,
      closedCollateralToken,
      closedCollateralAmount,
      closedAvgExecutionPrice,
      closedAvgSpotPrice,
      settledToken,
      settledAmount,
      settledCollateralToken,
      settledCollateralAmount,
      settledPrice,
      isSettled,
      lastProcessBlockTime,
    } = node;

    if (lastUpdatedAt < Number(lastProcessBlockTime)) lastUpdatedAt = Number(lastProcessBlockTime);

    const underlyingAsset = UA_INDEX_TO_ADDRESS[chainName][underlyingAssetIndex as UnderlyingAssetIndex];
    const underlyingAssetTicker = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];

    const instrumentMarkData = getInstrumentMarkDataFromMarket(market);

    const underlyingFutures = calculateUnderlyingFutures(underlyingAssetTicker, expiry, futuresIndices, riskFreeRates);
    const { markIv, markPrice } = getMarkIvAndPriceByOptionTokenId(chainName, BigInt(optionTokenId), instrumentMarkData, underlyingFutures);

    const mainOptionStrikePrice = getMainOptionStrikePrice(BigInt(optionTokenId));
    const pairedOptionStrikePrice = getPairedOptionStrikePrice(BigInt(optionTokenId));

    const dataObj = {
      underlyingAsset,
      optionTokenId,
      length,
      markPrice,
      markIv,
      mainOptionStrikePrice,
      pairedOptionStrikePrice,
      isBuys,
      strikePrices,
      isCalls,
      optionNames,
      size,
      sizeOpened,
      sizeClosing,
      sizeClosed,
      sizeSettled,
      isBuy,
      executionPrice,
      openedToken,
      openedAmount,
      openedCollateralToken,
      openedCollateralAmount,
      openedAvgExecutionPrice,
      openedAvgSpotPrice,
      closedToken,
      closedAmount,
      closedCollateralToken,
      closedCollateralAmount,
      closedAvgExecutionPrice,
      closedAvgSpotPrice,
      settledToken,
      settledAmount,
      settledCollateralToken,
      settledCollateralAmount,
      settledPrice,
      isSettled,
      lastProcessBlockTime,
    };

    if (!result[underlyingAssetTicker][expiry]) {
      result[underlyingAssetTicker][expiry] = [dataObj];
    } else {
      result[underlyingAssetTicker][expiry].push(dataObj);
    }
  });

  const settlePrices = await fetchDataFromS3({
    Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
    Key: process.env.APP_GLOBAL_DATA_SETTLE_PRICE_KEY,
    initialData: {},
  });

  const sortedData = Object.keys(result).map((token) => {
    return {
      [token]: Object.keys(result[token])
        .sort()
        .map((expiry) => {
          const settlePrice = (settlePrices[expiry] && settlePrices[expiry][token]) || 0;

          return {
            expiry,
            settlePrice: new BigNumber(settlePrice).toString(),
            positions: result[token][expiry].sort(
              (a, b) => a.mainOptionStrikePrice - b.mainOptionStrikePrice,
            ),
          };
        }),
    };
  });

  const reducedSortedData = sortedData.reduce((acc, tokenData) => {
    return { ...acc, ...tokenData };
  }, {});

  return {
    account: address,
    ...reducedSortedData,
    lastUpdatedAt: lastUpdatedAt.toString(),
  };
};

export const getMyAccountSummary = async (event): Promise<any> => {
  const [
    { BTC: btcData, ETH: ethData, lastUpdatedAt },
    marketData,
    availableBalance
  ] = await Promise.all([
    getMyPositions(event),
    getMarketDataS3(),
    getAvailableBalance(event.queryStringParameters.address),
  ])

  const allPositions = [
    ...btcData.flatMap((data: { positions: any; }) => data.positions),
    ...ethData.flatMap((data: { positions: any; }) => data.positions)
  ];
  const availableValue = getAvailableValue(availableBalance, marketData);
  const summarized = summarizePositions(allPositions, marketData);

  return {
    totalCollateralValue: summarized.totalCollateralValue,
    totalPositionValue: summarized.totalPositionValue,
    availableValue,
    availableBalance,
    positions: summarized.positions,
    lastUpdatedAt,
  }
}

const getAvailableBalance = async (address: string) => {
  const { USDCToken, BTCToken, WETHToken } = await initializeContracts();
  const results = await Promise.all([
    USDCToken.balanceOf(address),
    BTCToken.balanceOf(address),
    WETHToken.balanceOf(address),
  ])

  return {
    usdc: formatUnits(results[0], 6),
    btc: formatUnits(results[1], 8),
    eth: formatUnits(results[2], 18),
  }
}

const getAvailableValue = (availableBalance: any, marketData: any) => {
  const { spotIndices } = marketData;

  return Object.keys(availableBalance).reduce((acc, key) => {
    return acc + new BigNumber(availableBalance[key]).multipliedBy(spotIndices[key]).toNumber();
  }, 0);
}

const summarizePositions = (allPositions: any[], marketData: any) => {
  const { spotIndices } = marketData;
  const now = Date.now();

  const positions = allPositions.map((position) => {
    const chainId = Number(process.env.CHAIN_ID);
    const chainName = ChainNames[chainId];

    const { expiry } = parseOptionTokenId(BigInt(position.optionTokenId));
    const cexCommonInstrumentData = generateCexCommonInstrument(BigInt(position.optionTokenId));

    const collateralAmountBigInt = BigNumber(position.openedCollateralAmount)
      .minus(position.closedCollateralAmount)
      .minus(position.settledCollateralAmount)

    const collateralToken = position.openedCollateralToken;
    const collateralDecimals = ASSET_TICKER_TO_DECIMALS[chainId][ASSET_ADDRESS_TO_TICKER[chainId][collateralToken.toLowerCase()]] || 0;

    const collateralAmount = collateralAmountBigInt
      .dividedBy(10 ** collateralDecimals)
      .toNumber();

    const collateralValue = collateralToken
      ? collateralAmountBigInt
        .multipliedBy(spotIndices[ASSET_ADDRESS_TO_TICKER[chainId][collateralToken.toLowerCase()]])
        .dividedBy(10 ** collateralDecimals)
        .toNumber()
      : 0;

    const underlyingAsset = UA_ADDRESS_TO_TICKER[chainName][position.underlyingAsset.toLowerCase()];
    const decimals = UA_TICKER_TO_DECIMAL[chainName][underlyingAsset];

    const positionValue = new BigNumber(position.markPrice)
      .multipliedBy(position.size)
      .multipliedBy(position.isBuy ? 1 : -1)
      .dividedBy(10 ** decimals)
      .toNumber();
    const isExpired = expiry * 1000 < now;

    return {
      ...cexCommonInstrumentData,
      collateralValue,
      positionValue,
      collateralToken,
      collateralAmount: collateralAmount,
      isExpired,
    }
  }).filter(position => position.collateralValue !== 0 || position.positionValue !== 0);

  const { totalCollateralValue, totalPositionValue } = positions.reduce(
    (acc, position) => ({
      totalCollateralValue: acc.totalCollateralValue + position.collateralValue,
      totalPositionValue: acc.totalPositionValue + position.positionValue
    }),
    { totalCollateralValue: 0, totalPositionValue: 0 }
  );

  return {
    positions,
    totalCollateralValue,
    totalPositionValue,
  }
}


export const getMyTradeData = async (event) => {
  const { address } = event.queryStringParameters;
  if (!address) return null;

  const data =
    (await getS3({
      Bucket: process.env.APP_DATA_BUCKET,
      Key: process.env.APP_DATA_TRADE_DATA_KEY as string,
    })) || {};

  return data.traders[address] || null;
};

export const getOlpApr = async (event) => {
  const { ViewAggregator } = await initializeContracts();

  const { data: spot } = await getSpotS3();

  const [
    s_tokensPerInterval,
    s_totalRpReleaseUsd,
    s_olptv,
    m_tokensPerInterval,
    m_totalRpReleaseUsd,
    m_olptv,
    l_tokensPerInterval,
    l_totalRpReleaseUsd,
    l_olptv,
  ] = await ViewAggregator.getOlpAPRIngredients();

  const s_tokensPerYear = new BigNumber(s_tokensPerInterval)
    .multipliedBy(60 * 60 * 24 * 365)
    .div(10 ** 18)
    .toNumber();
  const s_tokensPerYearUsd = s_tokensPerYear * spot.ETH;
  const s_pendingRpUsdPerInterval = new BigNumber(s_totalRpReleaseUsd).div(10 ** 30).toNumber();
  const s_pendingRpUsdPerYear = new BigNumber(s_pendingRpUsdPerInterval)
    .multipliedBy(60 * 60 * 24 * 365)
    .toNumber();

  const m_tokensPerYear = new BigNumber(m_tokensPerInterval)
    .multipliedBy(60 * 60 * 24 * 365)
    .div(10 ** 18)
    .toNumber();
  const m_tokensPerYearUsd = m_tokensPerYear * spot.ETH;
  const m_pendingRpUsdPerInterval = new BigNumber(m_totalRpReleaseUsd).div(10 ** 30).toNumber();
  const m_pendingRpUsdPerYear = new BigNumber(m_pendingRpUsdPerInterval)
    .multipliedBy(60 * 60 * 24 * 365)
    .toNumber();

  const l_tokensPerYear = new BigNumber(l_tokensPerInterval)
    .multipliedBy(60 * 60 * 24 * 365)
    .div(10 ** 18)
    .toNumber();
  const l_tokensPerYearUsd = l_tokensPerYear * spot.ETH;
  const l_pendingRpUsdPerInterval = new BigNumber(l_totalRpReleaseUsd).div(10 ** 30).toNumber();
  const l_pendingRpUsdPerYear = new BigNumber(l_pendingRpUsdPerInterval)
    .multipliedBy(60 * 60 * 24 * 365)
    .toNumber();

  return {
    sOlp: {
      feeApr:
        Number(s_olptv) === 0
          ? 0
          : new BigNumber(s_tokensPerYearUsd).div(new BigNumber(s_olptv).div(10 ** 30)).toNumber(),
      riskPremiumApr:
        Number(s_olptv) === 0
          ? 0
          : new BigNumber(s_pendingRpUsdPerYear).div(new BigNumber(s_olptv).div(10 ** 30)).toNumber(),
    },
    mOlp: {
      feeApr:
        Number(m_olptv) === 0
          ? 0
          : new BigNumber(m_tokensPerYearUsd).div(new BigNumber(m_olptv).div(10 ** 30)).toNumber(),
      riskPremiumApr:
        Number(m_olptv) === 0
          ? 0
          : new BigNumber(m_pendingRpUsdPerYear).div(new BigNumber(m_olptv).div(10 ** 30)).toNumber(),
    },
    lOlp: {
      feeApr:
        Number(l_olptv) === 0
          ? 0
          : new BigNumber(l_tokensPerYearUsd).div(new BigNumber(l_olptv).div(10 ** 30)).toNumber(),
      riskPremiumApr:
        Number(l_olptv) === 0
          ? 0
          : new BigNumber(l_pendingRpUsdPerYear).div(new BigNumber(l_olptv).div(10 ** 30)).toNumber(),
    },
  };
};

export const getUserAddLiquidity = async (event): Promise<any> => {
  const chainId = Number(process.env.CHAIN_ID);
  const { address, olpName, timestamp } = event.queryStringParameters;
  if (!address) return null;

  let filter;

  if (!olpName) {
    filter = {
      account: { equalToInsensitive: address },
      processBlockTime: { greaterThanOrEqualTo: timestamp },
    };
  } else {
    filter = {
      account: { equalToInsensitive: address },
      olp: { equalToInsensitive: OLP_NAME_TO_ADDRESS[chainId][olpName] },
      processBlockTime: { greaterThanOrEqualTo: timestamp },
    };
  }

  const { nodes } = await getAddLiquidityWithFilter(filter);

  let accumulatedUsdg = 0;

  nodes.forEach((node) => {
    const {
      id,
      account,
      olp,
      token,
      amount,
      aumInUsdg,
      olpSupply,
      usdgAmount,
      mintAmount,
      processBlockTime,
    } = node;

    accumulatedUsdg += new BigNumber(usdgAmount).dividedBy(10 ** 18).toNumber();
  });

  return accumulatedUsdg;
};

export const getMyAddLiquidity = async (event): Promise<any> => {
  const { address, timestamp } = event.queryStringParameters;
  if (!address) return null;

  const filter = {
    account: { equalToInsensitive: address },
    processBlockTime: { greaterThanOrEqualTo: timestamp },
  };

  const { nodes } = await getAddLiquidityWithFilter(filter);

  let accumulatedUsdg = 0;

  nodes.forEach((node) => {
    const { id, account, token, amount, aumInUsdg, olpSupply, usdgAmount, mintAmount, processBlockTime } =
      node;

    // 1709550000
    // 1709547726

    accumulatedUsdg += new BigNumber(usdgAmount).dividedBy(10 ** 18).toNumber();
  });

  return accumulatedUsdg;
};

export const getMyPositionHistory = async (event): Promise<any> => {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  const { address, timestamp } = event.queryStringParameters;
  if (!address) return null;

  // @dev
  // const address = "0x9B4C9cCc79C52063b8B23E69b71F63D616C6b095"
  // const timestamp = 1715948408

  const filter = {
    account: { equalToInsensitive: address },
    processBlockTime: { greaterThanOrEqualTo: timestamp },
  };

  const { nodes } = await getPositionHistoryWithFilter(filter);

  let data: any = {};

  // initialize data object
  for (const underlyingAssetAddress in UA_ADDRESS_TO_TICKER[chainName]) {
    data[UA_ADDRESS_TO_TICKER[chainName][underlyingAssetAddress.toLowerCase()]] = [];
  }

  let lastUpdatedAt = 0;

  nodes.forEach((node) => {
    const {
      id,
      account,
      requestIndex,
      underlyingAssetIndex,
      expiry,
      type,
      optionTokenId,
      size,
      quoteToken,
      quoteAmount,
      collateralToken,
      collateralAmount,
      executionPrice,
      avgExecutionPrice,
      settlePrice,
      settlePayoff,
      spotPrice,
      cashFlow,
      pnl,
      roi,
      processBlockTime,
    } = node;

    if (lastUpdatedAt < Number(processBlockTime)) lastUpdatedAt = Number(processBlockTime);

    const underlyingAssetTicker = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];

    const dataObj = {
      account,
      requestIndex,
      underlyingAssetIndex,
      expiry,
      type,
      optionTokenId,
      size,
      quoteToken,
      quoteAmount,
      collateralToken,
      collateralAmount,
      executionPrice,
      avgExecutionPrice,
      settlePrice,
      settlePayoff,
      spotPrice,
      cashFlow,
      pnl,
      roi,
      processBlockTime,
    };

    data[underlyingAssetTicker].push(dataObj);
  });

  const sortedData = Object.keys(data).map((ticker) => {
    return {
      [ticker]: data[ticker].sort((a, b) => b.processBlockTime - a.processBlockTime), // sort by processBlockTime in descending order
    };
  });

  const reducedSortedData = sortedData.reduce((acc, tokenData) => {
    return { ...acc, ...tokenData };
  }, {});

  return {
    account: address,
    ...reducedSortedData,
    lastUpdatedAt: lastUpdatedAt.toString(),
  };
};

export const getCopyTradePositionHistory = async (event): Promise<any> => {
  const { redis } = await initializeRedis();

  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  const { timestamp } = event.queryStringParameters;

  const sVault = CONTRACT_ADDRESSES[chainId].S_VAULT;

  const filter = {
    processBlockTime: { greaterThanOrEqualTo: timestamp },
    account: { notEqualToInsensitive: sVault },
  };

  const { nodes } = await getCopyTradePositionHistoryWithFilter(filter);

  let data: any = {};

  // initialize data object
  for (const underlyingAssetAddress in UA_ADDRESS_TO_TICKER[chainName]) {
    data[UA_ADDRESS_TO_TICKER[chainName][underlyingAssetAddress.toLowerCase()]] = [];
  }

  let lastUpdatedAt = 0;

  const uniqueAccounts = new Set(nodes.map((node) => String(node.account).toLowerCase()));

  const pipeline = redis.pipeline();
  uniqueAccounts.forEach((account) => {
    pipeline.scard(`FEE-REBATES-COPY_TRADE_RECEIVED-FOLLOWERS:${account}`); // TODO:
    pipeline.zscore('FEE-REBATES-COPY_TRADE_RECEIVED-VOLUME', String(account));
    pipeline.zscore('FEE-REBATES-COPY_TRADE_RECEIVED', String(account));
  });

  const redisResults = await pipeline.exec();

  const redisDataMap = new Map();
  let i = 0;
  uniqueAccounts.forEach((account) => {
    redisDataMap.set(account, {
      copyTraders: redisResults[i][1] || 0,
      copyTradesVolume: redisResults[i + 1][1] || 0,
      rebatesFromCopyTrades: redisResults[i + 2][1] || 0,
    });
    i += 3;
  });

  nodes.forEach(async (node) => {
    const {
      account,
      requestIndex,
      underlyingAssetIndex,
      expiry,
      optionTokenId,
      size,
      quoteToken,
      quoteAmount,
      executionPrice,
      spotPrice,
      processBlockTime,
    } = node;

    if (lastUpdatedAt < Number(processBlockTime)) lastUpdatedAt = Number(processBlockTime);

    const underlyingAssetTicker = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];

    // Redis로부터 Follower 정보 가져오기
    const leaderAddress = String(account).toLowerCase();
    const redisData = redisDataMap.get(leaderAddress);

    const dataObj = {
      account,
      requestIndex,
      underlyingAssetIndex,
      expiry,
      optionTokenId,
      size,
      quoteToken,
      quoteAmount,
      executionPrice,
      spotPrice,
      processBlockTime,
      ...redisData,
    };

    data[underlyingAssetTicker].push(dataObj);
  });

  const sortedData = Object.keys(data).map((ticker) => {
    return {
      [ticker]: data[ticker].sort((a, b) => b.processBlockTime - a.processBlockTime), // sort by processBlockTime in descending order
    };
  });

  const reducedSortedData = sortedData.reduce((acc, tokenData) => {
    return { ...acc, ...tokenData };
  }, {});

  return {
    ...reducedSortedData,
    lastUpdatedAt: lastUpdatedAt.toString(),
  };
};

export const getVaultQueueItems = async (event): Promise<any> => {
  const { address, vaultAddress } = event.queryStringParameters;
  if (!address) return null;

  const filter = {
    user: { equalToInsensitive: address },
    vaultAddress: { equalToInsensitive: vaultAddress },
    status: { equalTo: '0' }, // ENQUEUD ONLY
  };

  const { nodes } = await getVaultQueueItemsWithFilter(filter);

  const deposits = nodes
    .filter((node) => node.actionType == 0)
    .map((node) => ({ index: node.id.split('-')[1], amount: node.amount, user: node.user }));
  const withdrawals = nodes
    .filter((node) => node.actionType == 1)
    .map((node) => ({ index: node.id.split('-')[1], amount: node.amount, user: node.user }));

  return {
    deposits,
    withdrawals,
  };
};

export const hasVaultQueueItems = async (event): Promise<any> => {
  const { address, vaultAddressList } = JSON.parse(event.body);

  if (!address) return null;
  if (vaultAddressList.length > 50) throw Error('Too many vault addresses');

  const map = {};

  for await (const vaultAddress of vaultAddressList) {
    const filter = {
      user: { equalToInsensitive: address },
      vaultAddress: { equalToInsensitive: vaultAddress },
      status: { equalTo: '0' }, // ENQUEUD ONLY
    };

    const { nodes } = await hasVaultQueueItemsWithFilter(filter, 1);

    map[vaultAddress] = nodes.length > 0;
  }

  return map;
};

// @query string date (ex. 2025-03-25)
export const getOlpStatsDaily = async (event): Promise<any> => {
  const { date } = event.queryStringParameters;

  if (!date) return await getDailyRedis(`${REDIS_KEYS.OLP.STATS.DAILY}:${getDateISOString()}`);

  if (!dayjs(date, 'YYYY-MM-DD', true).isValid()) {
    throw Error('Invalid date');
  }

  return await getDailyRedis(`${REDIS_KEYS.OLP.STATS.DAILY}:${date}`);
}

export const getVolatilityScore = async (event): Promise<VolatilityScoreRes> => {
  return await calculateVolatilityScore();
}

export const getMyOlpQueue = async (event): Promise<any> => {
  const { address } = event.queryStringParameters;
  if (!address) return null;

  const filter = {
    user: { equalToInsensitive: address },
    status: { equalTo: 'ENQUEUED' }, // Only ENQUEUED items (not PROCESSED, CANCELLED, or ERROR)
  };

  const { nodes } = await getOlpQueueItemsWithFilter(filter);

  // Group by olpQueueAddress and actionType
  const result = {
    deposits: [],
    withdrawals: [],
  };

  nodes.forEach((node) => {
    const queueItem = {
      queueIndex: node.queueIndex,
      olpQueueAddress: node.olpQueueAddress,
      token: node.token,
      amount: node.amount,
      receiver: node.receiver,
      isNative: node.isNative,
      blockTime: node.blockTime,
    };

    if (node.actionType === '0') {
      // MINT_AND_STAKE
      result.deposits.push(queueItem);
    } else if (node.actionType === '1') {
      // UNSTAKE_AND_REDEEM
      result.withdrawals.push(queueItem);
    }
  });

  return result;
};

export const getMyOlpPnl = async (event): Promise<any> => {
  const { address } = event.queryStringParameters;
  if (!address) return null;

  const filter: any = {
    user: { equalToInsensitive: address },
    status: { equalTo: 'PROCESSED' },
  };

  const { nodes } = await getOlpQueueItemsWithFilter(filter);

  // Sort by processBlockTime (time-ordered)
  const sortedNodes = nodes.sort((a, b) =>
    Number(a.processBlockTime) - Number(b.processBlockTime)
  );

  let currentHoldings = new BigNumber(0); // actionType 0: holdings increase, 1: holdings decrease
  let currentInvestment = new BigNumber(0); // actionType 0: investment increases, 1: investment stays same
  let currentAvgEntryPrice = new BigNumber(0); // actionType 0: avg entry price update, 1: avg entry price stays same

  let totalRealizedPnl = new BigNumber(0);
  let totalRealizedRoi = new BigNumber(0);
  let totalRealizedInvestment = new BigNumber(0);

  let lastUpdatedAt = 0;

  sortedNodes.forEach((node) => {
    if (Number(node.processBlockTime) > lastUpdatedAt) {
      lastUpdatedAt = Number(node.processBlockTime);
    }

    const olpPrice = new BigNumber(node.olpPrice).dividedBy(10 ** 30);

    if (node.actionType === '0') {
      const olpReceived = new BigNumber(node.amountOut).dividedBy(10 ** 18);
      const depositCost = olpReceived.multipliedBy(olpPrice);

      currentHoldings = currentHoldings.plus(olpReceived);
      currentInvestment = currentInvestment.plus(depositCost);
      currentAvgEntryPrice = currentHoldings.isZero() ? new BigNumber(0) : currentInvestment.dividedBy(currentHoldings);
    } else if (node.actionType === '1') {
      const olpSent = new BigNumber(node.amount).dividedBy(10 ** 18);
      const withdrawValue = olpSent.multipliedBy(olpPrice);

      const realizedInvestment = olpSent.multipliedBy(currentAvgEntryPrice);
      const realizedPnl = withdrawValue.minus(realizedInvestment);

      currentHoldings = currentHoldings.minus(olpSent);
      currentInvestment = currentInvestment.minus(realizedInvestment);

      totalRealizedPnl = totalRealizedPnl.plus(realizedPnl);
      totalRealizedInvestment = totalRealizedInvestment.plus(realizedInvestment);
    }
  });

  // ROI calculation based on total realized investment
  totalRealizedRoi = totalRealizedInvestment.isZero() ? new BigNumber(0) : totalRealizedPnl.dividedBy(totalRealizedInvestment).multipliedBy(100);

  return {
    holdings: currentHoldings.toString(),
    investment: currentInvestment.toString(),
    avgEntryPrice: currentAvgEntryPrice.toString(),
    realizedPnl: totalRealizedPnl.toString(),
    realizedRoi: totalRealizedRoi.toString(),
    realizedInvestment: totalRealizedInvestment.toString(),
    lastUpdatedAt: lastUpdatedAt.toString(),
  };
};