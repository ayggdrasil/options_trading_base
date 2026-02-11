import BigNumber from 'bignumber.js';
import initializeContracts from '../contract';
import Redis, { ChainableCommander } from 'ioredis';
import { UNDERLYING_ASSET_CURRENCIES } from '../constants';
import { LogLevel, SlackTag } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';
import { sendMessage } from '../utils/slack';
import { initializeRedis } from '../redis';
import { convertTimestampToExpiryDate } from '../utils/format';
import { CHECK_VOLATILITY, REDIS_KEYS } from '../utils/redis-key';
import { getMarketDataS3 } from '../utils/aws-getter';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ChainId } from '../constants/constants.networks';

dayjs.extend(utc);

const SENSITIVITY_RATE = 0.05;
const SENSITIVITY_RATE_MARK_IV = 0.1;
const SENSITIVITY_RATE_MARK_IV_FOR_0DTE = 0.2;
const MEMORY_EX = 7200; // 2 hours
const PREV_DATA_INTERVAL = 3600; // 1 hour

const OPTION_TYPES = ['call', 'put'] as const;

type IVsResult = {
  [underlyingAsset: string]: {
    [optionType: string]: {
      [expiry: number]: {
        [strikePrice: string]: number;
      };
    };
  };
};

export const checkMarketChange = async () => {
  try {
    const { redis } = await initializeRedis();
    const recentNotifiedTimes = await getRecentNotifiedTimes(redis);

    // Execute checkPriceVolatility only if on the Arbitrum chain
    // Execute checkOlpChange on all chains
    await Promise.all([
      isArbitrumChain() ? checkPriceVolatility(redis, recentNotifiedTimes) : Promise.resolve(),
      checkOlpChange(redis, recentNotifiedTimes),
    ]);

  } catch (error) {
    await handleError('checkMarketChange', error);
  }
};

const checkPriceVolatility = async (
  redis: Redis,
  recentNotifiedTimes: Record<string, string | null>,
) => {
  try {
    const [prevData, marketData] = await Promise.all([
      getPrevPrices(redis, recentNotifiedTimes),
      getMarketDataS3(),
    ]);
    const { market, spotIndices: newSpotPrices, futuresIndices: newFuturesPrices } = marketData;
    const newIvs = getIvs(market);
    const atms = getAtms(market, newSpotPrices);
    const { message, itemsToNotify } = getPriceVolatilityMessages(
      prevData.prevFuturesPrices,
      newFuturesPrices,
      prevData.prevSpotPrices,
      newSpotPrices,
      prevData.prevIvs,
      newIvs,
      atms,
    );

    if (message.length > 0) await notifyPriceVolatility(message);
    await storeCurrentPriceData(redis, newSpotPrices, newFuturesPrices, newIvs, itemsToNotify);
  } catch (error) {
    await handleError('checkPriceVolatility', error);
  }
};

const checkOlpChange = async (redis: Redis, recentNotifiedTimes: Record<string, string | null>) => {
  try {
    const [prevData, onchainData] = await Promise.all([
      getPrevOlpData(redis, recentNotifiedTimes),
      getAppOnchainData(),
    ]);
    const { olpDv: newOlpDv, olpPrice: newOlpPrice } = getOlpDvAndPrice(onchainData);
    const { message, olpDvShouldNotify, olpPriceShouldNotify } = getOlpChangeMessages(
      prevData.prevOlpDv,
      newOlpDv,
      prevData.prevOlpPrice,
      newOlpPrice,
    );
    if (message.length > 0) await notifyOlpChange(message);
    await storeCurrentOlpData(redis, newOlpDv, newOlpPrice, olpDvShouldNotify, olpPriceShouldNotify);
  } catch (error) {
    await handleError('checkOlpChange', error);
  }
};

async function notifyPriceVolatility(message: string) {
  await sendMessage(
    `\`[Lambda][checkPriceVolatility.ts]\` ${MESSAGE_TYPE.PRICE_VOLATILITY_DETECTED}`,
    LogLevel.INFO,
    {
      description: message,
      tags: [SlackTag.PRICE_VOLATILITY_CHECKER],
    },
  );
}

async function notifyOlpChange(message: string) {
  await sendMessage(
    `\`[Lambda][checkOlpChange.ts]\` ${MESSAGE_TYPE.SIGNIFICANT_OLP_CHANGE_DETECTED}`,
    LogLevel.INFO,
    {
      description: message,
      tags: [SlackTag.ALL],
    },
  );
}

async function handleError(functionName: string, error: any) {
  console.log(`Error processing ${functionName}:`, error);
  await sendMessage(
    `\`[Lambda][${functionName}.ts]\` ${MESSAGE_TYPE.ERROR_DURING_CHECKING_MARKET_CHANGE}`,
    LogLevel.INFO,
    { description: error?.message || error },
  );
}

async function storeCurrentPriceData(
  redis: Redis,
  newSpotPrices: any,
  newFuturesPrices: any,
  newIvs: any,
  itemsToNotify: string[],
) {
  try {
    const timestamp = Date.now();
    const pipeline = redis.pipeline();

    pipeline.zadd(REDIS_KEYS.CHECK_VOLATILITY.SPOT_INDICES, timestamp, JSON.stringify(newSpotPrices));
    pipeline.zadd(REDIS_KEYS.CHECK_VOLATILITY.FUTURES_INDICES, timestamp, JSON.stringify(newFuturesPrices));
    pipeline.zadd(REDIS_KEYS.CHECK_VOLATILITY.MARK_IVS, timestamp, JSON.stringify(newIvs));

    pipeline.expire(REDIS_KEYS.CHECK_VOLATILITY.SPOT_INDICES, MEMORY_EX);
    pipeline.expire(REDIS_KEYS.CHECK_VOLATILITY.FUTURES_INDICES, MEMORY_EX);
    pipeline.expire(REDIS_KEYS.CHECK_VOLATILITY.MARK_IVS, MEMORY_EX);

    itemsToNotify.forEach((item) => {
      pipeline.set(`${REDIS_KEYS.CHECK_VOLATILITY.RECENT_NOTIFIED_TIME}:${item}`, timestamp, 'EX', MEMORY_EX);
    });

    await pipeline.exec();
  } catch (error) {
    console.log('Error processing storeCurrentPriceData:', error);
    throw error;
  }
}

async function storeCurrentOlpData(
  redis: Redis,
  newOlpDv: number,
  newOlpPrice: number,
  olpDvShouldNotify: boolean,
  olpPriceShouldNotify: boolean,
) {
  try {
    const timestamp = Date.now();
    const pipeline = redis.pipeline();

    pipeline.zadd(REDIS_KEYS.CHECK_VOLATILITY.OLP_DV, timestamp, JSON.stringify(newOlpDv));
    pipeline.zadd(REDIS_KEYS.CHECK_VOLATILITY.OLP_PRICE, timestamp, JSON.stringify(newOlpPrice));

    pipeline.expire(REDIS_KEYS.CHECK_VOLATILITY.OLP_DV, MEMORY_EX);
    pipeline.expire(REDIS_KEYS.CHECK_VOLATILITY.OLP_PRICE, MEMORY_EX);
    olpDvShouldNotify &&
      pipeline.set(`${REDIS_KEYS.CHECK_VOLATILITY.RECENT_NOTIFIED_TIME}:${REDIS_KEYS.CHECK_VOLATILITY.OLP_DV}`, timestamp, 'EX', MEMORY_EX);
    olpPriceShouldNotify &&
      pipeline.set(`${REDIS_KEYS.CHECK_VOLATILITY.RECENT_NOTIFIED_TIME}:${REDIS_KEYS.CHECK_VOLATILITY.OLP_PRICE}`, timestamp, 'EX', MEMORY_EX);

    await pipeline.exec();
  } catch (error) {
    console.log('Error processing storeCurrentOlpData:', error);
    throw error;
  }
}

async function getPrevPrices(redis: Redis, recentNotifiedTimes: Record<string, string | null>) {
  try {
    const prevTime = Date.now() - PREV_DATA_INTERVAL * 1000;
    let pipeline = redis.pipeline();
    checkLastNotifiedAndAddPipeline(
      pipeline,
      REDIS_KEYS.CHECK_VOLATILITY.SPOT_INDICES,
      Number(recentNotifiedTimes[REDIS_KEYS.CHECK_VOLATILITY.SPOT_INDICES]),
      prevTime,
    );
    checkLastNotifiedAndAddPipeline(
      pipeline,
      REDIS_KEYS.CHECK_VOLATILITY.FUTURES_INDICES,
      Number(recentNotifiedTimes[REDIS_KEYS.CHECK_VOLATILITY.FUTURES_INDICES]),
      prevTime,
    );
    checkLastNotifiedAndAddPipeline(
      pipeline,
      REDIS_KEYS.CHECK_VOLATILITY.MARK_IVS,
      Number(recentNotifiedTimes[REDIS_KEYS.CHECK_VOLATILITY.MARK_IVS]),
      prevTime,
    );
    const results = await pipeline.exec();

    // pipeline.exec()의 결과 처리
    const [prevSpotPrices, prevFuturesPrices, prevIvs] = results!.map(([err, result]) => {
      if (err) throw err;
      const data = result as string[];
      return data.length > 0 ? JSON.parse(data[0]) : null;
    });

    return { prevSpotPrices, prevFuturesPrices, prevIvs };
  } catch (error) {
    console.log('Error getPrevPrices:', error);
    throw error;
  }
}

async function getPrevOlpData(redis: Redis, recentNotifiedTimes: Record<string, string | null>) {
  try {
    const prevTime = Date.now() - PREV_DATA_INTERVAL * 1000;
    let pipeline = redis.pipeline();
    checkLastNotifiedAndAddPipeline(
      pipeline,
      REDIS_KEYS.CHECK_VOLATILITY.OLP_DV,
      Number(recentNotifiedTimes[REDIS_KEYS.CHECK_VOLATILITY.OLP_DV]),
      prevTime,
    );
    checkLastNotifiedAndAddPipeline(
      pipeline,
      REDIS_KEYS.CHECK_VOLATILITY.OLP_PRICE,
      Number(recentNotifiedTimes[REDIS_KEYS.CHECK_VOLATILITY.OLP_PRICE]),
      prevTime,
    );
    const results = await pipeline.exec();

    // pipeline.exec()의 결과 처리
    const [prevOlpDv, prevOlpPrice] = results!.map(([err, result]) => {
      if (err) throw err;
      const data = result as string[];
      return data.length > 0 ? JSON.parse(data[0]) : null;
    });

    return { prevOlpDv, prevOlpPrice };
  } catch (error) {
    console.log('Error getPrevOlpData:', error);
    throw error;
  }
}

function checkLastNotifiedAndAddPipeline(
  pipeline: ChainableCommander,
  key: string,
  lastNotificationTime: number | null,
  prevTime: number,
): ChainableCommander {
  const wasRecentlyNotified = !!lastNotificationTime && Number(lastNotificationTime) > prevTime;
  const lastCheckTime = wasRecentlyNotified ? lastNotificationTime : prevTime;
  if (wasRecentlyNotified) {
    pipeline.zrangebyscore(key, lastCheckTime, lastCheckTime);
  } else {
    pipeline.zrevrangebyscore(key, lastCheckTime, '-inf', 'LIMIT', 0, 1);
  }
  return pipeline;
}

function checkAndGetMessage(
  prevValue: number,
  newValue: number,
  name: string,
  sensitivityMarketUpdateRate: number,
): string {
  const diffRate = Math.abs(1 - newValue / prevValue);
  if (
    !isValidNonZeroFiniteNumber(prevValue) ||
    !isValidNonZeroFiniteNumber(newValue) ||
    !isValidFiniteNumber(diffRate)
  ) {
    console.log('invalid number', prevValue, newValue, diffRate);
    return '';
  }
  const positive = newValue > prevValue;
  const sign = positive ? '+' : '-';
  const changeType = positive ? '상승' : '하락';
  const shouldNotice = diffRate > sensitivityMarketUpdateRate;
  const message = shouldNotice
    ? `\n${name} : ${sign}\`${Number(diffRate * 100).toFixed(2)}%\` ${changeType} (${prevValue.toFixed(2)} -> ${newValue.toFixed(2)})`
    : '';
  return message;
}

function isValidNonZeroFiniteNumber(value: any): boolean {
  const num = Number(value);
  return Number.isFinite(num) && num !== 0;
}

function isValidFiniteNumber(value: any): boolean {
  const num = Number(value);
  return Number.isFinite(num);
}

function getIvs(market: any): IVsResult {
  const result: IVsResult = {};

  for (const underlyingAsset in market) {
    for (const expiry in market[underlyingAsset].options) {
      const options = market[underlyingAsset].options;
      for (const optionType of OPTION_TYPES) {
        for (const option of options[expiry][optionType]) {
          const [underlyingAsset, expiryDate, strikePrice] = option.instrument.split('-');
          if (!result[underlyingAsset]) result[underlyingAsset] = {};
          if (!result[underlyingAsset][optionType]) result[underlyingAsset][optionType] = {};
          if (!result[underlyingAsset][optionType][expiry]) result[underlyingAsset][optionType][expiry] = {};

          result[underlyingAsset][optionType][expiry][strikePrice] = option.markIv;
        }
      }
    }
  }

  return result;
}

function getAtms(market: any, spotPrices: any) {
  try {
    const strikePrices = getAllStrikePrices(market);
    return UNDERLYING_ASSET_CURRENCIES.reduce((acc, currency) => {
      acc[currency] = getNearest(strikePrices[currency], spotPrices[currency]);
      return acc;
    }, {});
  } catch (error) {
    console.log('Error getting atms:', error);
    throw error;
  }
}

function getAllStrikePrices(market: any) {
  try {
    const strikePrices: { [key: string]: Set<number> } = {};

    UNDERLYING_ASSET_CURRENCIES.forEach((currency) => {
      strikePrices[currency] = new Set<number>();
    });

    for (const currency in market) {
      const options = market[currency].options;

      for (const expiry in options) {
        OPTION_TYPES.forEach((optionType) => {
          const optionsList = options[expiry][optionType];
          if (!Array.isArray(optionsList)) return;

          optionsList.forEach((option) => {
            if (option.strikePrice) {
              strikePrices[currency].add(option.strikePrice);
            }
          });
        });
      }
    }

    return UNDERLYING_ASSET_CURRENCIES.reduce(
      (acc, currency) => {
        acc[currency] = Array.from(strikePrices[currency]).sort((a, b) => a - b);
        return acc;
      },
      {} as { [key: string]: number[] },
    );
  } catch (error) {
    console.log('Error getting all strike prices:', error);
    throw error;
  }
}

function getNearest(values: number[], value: number): number {
  if (values.length === 0) throw new Error(MESSAGE_TYPE.NO_VALUES_TO_GET_NEAREST);
  return values.reduce((closest, current) => {
    const currentDiff = Math.abs(current - value);
    const closestDiff = Math.abs(closest - value);
    return currentDiff < closestDiff ? current : closest;
  });
}

function getPriceVolatilityMessages(
  prevFuturesPrices: any,
  newFuturesPrices: any,
  prevSpotPrices: any,
  newSpotPrices: any,
  prevIvs: any,
  newIvs: any,
  atms: any,
): { message: string; itemsToNotify: string[] } {
  const { message: futureMessage, itemsToNotify: futureItemsToNotify } = getFuturePriceMessage(
    prevFuturesPrices,
    newFuturesPrices,
  );
  const { message: spotMessage, itemsToNotify: spotItemsToNotify } = getSpotPriceMessage(
    prevSpotPrices,
    newSpotPrices,
  );
  const { message: markIvMessage, itemsToNotify: markIvItemsToNotify } = getMarkIvMessage(
    prevIvs,
    newIvs,
    atms,
  );
  const message = futureMessage + spotMessage + markIvMessage;

  return { message, itemsToNotify: [...futureItemsToNotify, ...spotItemsToNotify, ...markIvItemsToNotify] };
}

function getOlpChangeMessages(
  prevOlpDv: number,
  newOlpDv: number,
  prevOlpPrice: number,
  newOlpPrice: number,
): { message: string; olpDvShouldNotify: boolean; olpPriceShouldNotify: boolean } {
  const { message: olpDvMessage, shouldNotify: olpDvShouldNotify } = getOlpDvMessage(prevOlpDv, newOlpDv);
  const { message: olpPriceMessage, shouldNotify: olpPriceShouldNotify } = getOlpPriceMessage(
    prevOlpPrice,
    newOlpPrice,
  );
  const message = olpDvMessage + olpPriceMessage;

  return { message, olpDvShouldNotify, olpPriceShouldNotify };
}

function getSpotPriceMessage(
  prevSpotPrices: any,
  newSpotPrices: any,
): { message: string; itemsToNotify: string[] } {
  if (!prevSpotPrices) return { message: '', itemsToNotify: [] };

  const { message, itemsToNotify } = UNDERLYING_ASSET_CURRENCIES.reduce(
    (acc, currency) => {
      const message =
        acc.message +
        checkAndGetMessage(
          prevSpotPrices[currency],
          newSpotPrices[currency],
          `[\`spot\`] ${currency}`,
          SENSITIVITY_RATE,
        );
      acc.itemsToNotify.push(REDIS_KEYS.CHECK_VOLATILITY.SPOT_INDICES + `:${currency}`);
      return { message, itemsToNotify: acc.itemsToNotify };
    },
    { message: '', itemsToNotify: [] },
  );

  return { message, itemsToNotify };
}

function getFuturePriceMessage(
  prevFuturesPrices: any,
  newFuturesPrices: any,
): { message: string; itemsToNotify: string[] } {
  if (!prevFuturesPrices) return { message: '', itemsToNotify: [] };
  const { message, itemsToNotify } = UNDERLYING_ASSET_CURRENCIES.reduce(
    (acc, currency) => {
      const message =
        acc.message +
        checkAndGetMessage(
          prevFuturesPrices[currency],
          newFuturesPrices[currency],
          `[\`future\`] ${currency}`,
          SENSITIVITY_RATE,
        );
      acc.itemsToNotify.push(REDIS_KEYS.CHECK_VOLATILITY.FUTURES_INDICES + `:${currency}`);
      return { message, itemsToNotify: acc.itemsToNotify };
    },
    { message: '', itemsToNotify: [] },
  );
  return { message, itemsToNotify };
}

function getMarkIvMessage(
  prevIvs: any,
  newIvs: any,
  atms: any,
): { message: string; itemsToNotify: string[] } {
  if (!prevIvs) return { message: '', itemsToNotify: [] };
  const expiryFor0DTE = getExpiryFor0DTE();
  const { message, itemsToNotify } = UNDERLYING_ASSET_CURRENCIES.reduce(
    (acc, currency) => {
      const { message: messageToPaste, itemsToNotify: ivItemsToNotify } = getMarkIvMessageByCurrency(
        currency,
        prevIvs,
        newIvs,
        atms[currency],
        expiryFor0DTE,
      );
      const message = acc.message + messageToPaste;
      acc.itemsToNotify.push(...ivItemsToNotify);
      return { message, itemsToNotify: acc.itemsToNotify };
    },
    { message: '', itemsToNotify: [] },
  );

  return { message, itemsToNotify };
}

function getOlpDvMessage(prevOlpDv: number, newOlpDv: number): { message: string; shouldNotify: boolean } {
  if (!prevOlpDv) return { message: '', shouldNotify: false };
  const message = checkAndGetMessage(prevOlpDv, newOlpDv, `[\`olp-dv\`]`, SENSITIVITY_RATE);
  return { message, shouldNotify: message.length > 0 };
}

function getOlpPriceMessage(
  prevOlpPrice: number,
  newOlpPrice: number,
): { message: string; shouldNotify: boolean } {
  if (!prevOlpPrice) return { message: '', shouldNotify: false };
  const message = checkAndGetMessage(
    prevOlpPrice,
    newOlpPrice,
    `[\`olp-price\`]`,
    SENSITIVITY_RATE,
  );
  return { message, shouldNotify: message.length > 0 };
}

function getMarkIvMessageByCurrency(
  currency: string,
  prevIvs: IVsResult,
  newIvs: IVsResult,
  atm: number,
  expiryFor0DTE: number,
): { message: string; itemsToNotify: string[] } {
  let message = '';
  const itemsToNotify = [];

  for (const optionType in prevIvs[currency] ?? {}) {
    for (const expiry in prevIvs[currency]?.[optionType] ?? {}) {
      const prevIvOfAtmOption = prevIvs[currency]?.[optionType]?.[expiry]?.[atm];
      const newIvOfAtmOption = newIvs[currency]?.[optionType]?.[expiry]?.[atm];
      if (prevIvOfAtmOption === undefined || newIvOfAtmOption === undefined) continue;
      const expiryDate = convertTimestampToExpiryDate(Number(expiry));
      const is0Dte = Number(expiry) * 1000 <= expiryFor0DTE;
      const optionTypeSymbol = optionType === 'call' ? 'C' : 'P';
      const instrument = `${currency}-${expiryDate}-${atm}-${optionTypeSymbol}`;
      const messsageToPaste = checkAndGetMessage(
        prevIvOfAtmOption,
        newIvOfAtmOption,
        `[\`mark-iv\`] ${instrument}`,
        is0Dte ? SENSITIVITY_RATE_MARK_IV_FOR_0DTE : SENSITIVITY_RATE_MARK_IV,
      );
      if (messsageToPaste.length > 0) {
        message += messsageToPaste;
        itemsToNotify.push(REDIS_KEYS.CHECK_VOLATILITY.MARK_IVS + `:${instrument}`);
      }
    }
  }
  return { message, itemsToNotify };
}

async function getAppOnchainData(): Promise<{
  sOlpData: any;
  sOlpAssetUsdData: any;
}> {
  try {
    const { sOLPManager, ViewAggregator } = await initializeContracts();

    const result = await Promise.all([ViewAggregator.getOlpStats(), sOLPManager.getTotalOlpAssetUsd(true)]);

    const sOlpData = result[0][0];
    const sOlpAssetUsdData = result[1];
    return { sOlpData, sOlpAssetUsdData };
  } catch (error) {
    console.error('Error getting app onchain data:', error);
    throw error;
  }
}

function getOlpDvAndPrice(onchainData: { sOlpData: any; sOlpAssetUsdData: any }) {
  const olpPrice = new BigNumber(onchainData.sOlpData[0]).dividedBy(10 ** 30).toNumber();
  const olpDv = new BigNumber(onchainData.sOlpAssetUsdData[6]).dividedBy(10 ** 30).toNumber();
  return { olpDv, olpPrice };
}

function getExpiryFor0DTE() {
  const now = dayjs().utc();
  const today8am = dayjs().utc().hour(8).minute(0).second(0).millisecond(0);

  return now.isAfter(today8am) ? today8am.add(1, 'day').valueOf() : today8am.valueOf();
}

function isArbitrumChain() {
  return Number(process.env.CHAIN_ID) === ChainId.ARBITRUM_ONE;
}

async function getRecentNotifiedTimes(redis: Redis): Promise<Record<string, string | null>> {
  const pattern = `${REDIS_KEYS.CHECK_VOLATILITY.RECENT_NOTIFIED_TIME}:${CHECK_VOLATILITY}:*`;
  let cursor = '0';
  const keys: string[] = [];
  do {
    const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');

  if (keys.length === 0) {
    return {};
  }

  const values = await redis.mget(keys);

  return keys.reduce(
    (acc, key, index) => {
      acc[key] = values[index];
      return acc;
    },
    {} as Record<string, string | null>,
  );
}
