import BigNumber from 'bignumber.js'
import initializeContracts from '../contract';
import { getS3, putS3 } from '../utils/aws'
import { ASSET_TICKER_TO_DECIMALS } from '../constants'
import { convertExpiryDateToTimestampInSec } from '../utils/format';
import { LogLevel } from '../utils/enums';
import { getCurrentTimestampAndDate, getOlpKeyByExpiry, getOptionId } from '../utils/helper';
import { sendMessage } from '../utils/slack';
import { initializeRedis, setDailyRedis } from '../redis';
import { CONTRACT_ADDRESSES } from '../constants/constants.addresses';
import { MESSAGE_TYPE } from '../utils/messages';
import { getFuturesS3, getRiskFreeRatesS3, getSpotS3 } from '../utils/aws-getter';
import { REDIS_KEYS } from '../utils/redis-key';
import { REDIS_ALERT_THRESHOLD_IV_CURVE_IN_MS } from '../constants/global';
import { getDateISOString } from '../utils/date';
import { calculateGreeks, calculateRiskPremiumRate, calculateUnderlyingFutures, ChainNames, generateOptionTokenData, getMarkIvAndPriceByInstrument, Greeks, OptionDirection, OptionRiskPremiumInputData, parseOptionTokenId, UA_INDEX_TO_TICKER, UA_TICKER_TO_DECIMAL, UA_TICKER_TO_INDEX, UnderlyingAsset, UnderlyingAssetIndex } from '@callput/shared';
import { calculateVolatilityScore } from '../utils/volatility-score';
import { getInstrumentMarkDataFromApp } from '../iv/apis/app';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export const collectMarketData = async (count, isParallel) => {
  const { redis } = await initializeRedis()

  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  const dateISOString = getDateISOString();

  const [{ instruments }, { data: futuresAssetIndexMap }, { data: spotAssetIndexMap }, riskFreeRates, { data: volatilityScore }] = await Promise.all([
    getS3({
      Bucket: process.env.APP_DATA_BUCKET,
      Key: process.env.APP_DATA_INSTRUMENTS_KEY,
    }),
    getFuturesS3(),
    getSpotS3(),
    getRiskFreeRatesS3(),
    calculateVolatilityScore()
  ])

  if (!instruments || !futuresAssetIndexMap || !riskFreeRates) {
    throw new Error('need to initialize instruments, futures, and risk free rates first.')
  }

  const { active: active_instrument_name_list, inactive: inactive_instrument_name_list } = instruments;

  const activeInstrumentsMap = active_instrument_name_list.reduce((acc, cur) => {
    acc[cur] = true
    return acc
  }, {})

  const instrumentMarkData = await getInstrumentMarkDataFromApp();

  if (count === 1 && isParallel) {
    console.log("Saving IV curve for the first round...");

    try {
      const currInstrumentMarkData = {
        data: instrumentMarkData,
        lastUpdatedAt: Date.now()
      }

      await setDailyRedis(REDIS_KEYS.IV_CURVE.DAILY, currInstrumentMarkData, REDIS_ALERT_THRESHOLD_IV_CURVE_IN_MS)
      console.log("IV curve daily data has been saved to redis successfully.");
    } catch (error) {
      console.log("Error saving IV curve:", error);

      await sendMessage(
        `\`[Lambda][collect.marketData.ts]\` ${MESSAGE_TYPE.ERROR_DURING_SAVING_IV_CURVE}`,
        LogLevel.ERROR,
        {
          description: error?.message || error,
        }
      )
    }
  }

  console.log("get olp greeks, assets, and assetAmounts..")

  let olpGreeks = {
    sOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      }
    },
    mOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      }
    },
    lOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      }
    }
  }

  try {
    olpGreeks = await getOlpGreeksV2(futuresAssetIndexMap, riskFreeRates, instrumentMarkData)
  } catch (error) {
    try {
      olpGreeks = await getOlpGreeksV3(futuresAssetIndexMap, riskFreeRates, instrumentMarkData)
    } catch (error) {
      console.log('Error getting olp greeks:', error)
      await sendMessage(
        `\`[Lambda][collect.marketData.ts]\` ${MESSAGE_TYPE.ERROR_DURING_GETTING_OLP_GREEKS}`,
        LogLevel.ERROR,
        {
          description: error?.message || error,
        }
      )
    }
  }

  const [olpAssetAmounts, olpUtilityRatio] = await Promise.all([
    getOlpAssetAmounts(),
    getOlpUtilityRatio()
  ])

  const olpStats = getOlpStats(olpGreeks, olpAssetAmounts, olpUtilityRatio);

  const allInstruments = [...active_instrument_name_list, ...inactive_instrument_name_list]
  const notionalVolumes = await redis.mget(
    ...allInstruments.map((name: string) => `volume:${name}`)
  )
  const volumeCurve = allInstruments.reduce((acc, instrument) => {
    acc[instrument] = Number(notionalVolumes[allInstruments.indexOf(instrument)]) || 0
    return acc
  }, {})

  const result = (Object.entries(instrumentMarkData) as any).reduce((acc, [instrument, data]) => {
    if (!allInstruments.includes(instrument)) return acc;

    const [underlyingAsset, expiryString, strikePrice, optionTypeLetter] = instrument.split('-')
    
    const expiry = convertExpiryDateToTimestampInSec(expiryString)
    const underlyingFutures = calculateUnderlyingFutures(underlyingAsset, expiry, futuresAssetIndexMap, riskFreeRates);

    const { markIv, markPrice } = getMarkIvAndPriceByInstrument(instrument, instrumentMarkData, underlyingFutures);

    const underlyingAssetSpotIndex = spotAssetIndexMap[underlyingAsset];

    const underlyingAssetVolatilityScore = volatilityScore[underlyingAsset];
    
    const olpKey = getOlpKeyByExpiry(chainId, expiry)
    const olpGreeksToApply: Greeks = olpGreeks[olpKey][underlyingAsset]
    
    const optionType: OptionDirection = optionTypeLetter === 'C' ? "Call" : "Put"

    const mainOption: OptionRiskPremiumInputData = {
      strikePrice: Number(strikePrice),
      markIv: markIv,
      markPrice: markPrice
    }

    let { RP_rate: riskPremiumRateForBuy, newTradeGreeks } = calculateRiskPremiumRate({
      underlyingAsset: underlyingAsset as UnderlyingAsset,
      expiry: expiry,
      isOpen: true,
      orderSide: "Buy",
      optionDirection: optionType,
      mainOption: mainOption,
      pairedOption: null,
      size: 1,
      underlyingFutures,
      underlyingAssetSpotIndex,
      underlyingAssetVolatilityScore,
      olpKey,
      olpGreeks: olpGreeksToApply,
      olpUtilityRatio,
    })

    let { RP_rate: riskPremiumRateForSell } = calculateRiskPremiumRate({
      underlyingAsset: underlyingAsset as UnderlyingAsset,
      expiry: expiry,
      isOpen: true,
      orderSide: "Sell",
      optionDirection: optionType,
      mainOption: mainOption,
      pairedOption: null,
      size: 1,
      underlyingFutures,
      underlyingAssetSpotIndex,
      underlyingAssetVolatilityScore,
      olpKey,
      olpGreeks: olpGreeksToApply,
      olpUtilityRatio
    })

    const optionId = getOptionId(UA_TICKER_TO_INDEX[chainName][underlyingAsset], expiry, Number(strikePrice));
    const isOptionAvailable = Boolean(activeInstrumentsMap[instrument])

    if (!acc.market[underlyingAsset].expiries.includes(expiry)) {
      acc.market[underlyingAsset].expiries.push(expiry)
      acc.market[underlyingAsset].options[expiry] = {
        call: [],
        put: []
      }
    }

    if (optionTypeLetter === 'C') {
      acc.market[underlyingAsset].options[expiry].call.push({
        instrument: instrument,
        optionId: optionId,
        strikePrice: Number(strikePrice),
        markIv: markIv,
        markPrice: markPrice,
        riskPremiumRateForBuy: riskPremiumRateForBuy,
        riskPremiumRateForSell: riskPremiumRateForSell,
        delta: newTradeGreeks.delta, 
        gamma: newTradeGreeks.gamma, 
        vega: newTradeGreeks.vega, 
        theta: newTradeGreeks.theta,
        volume: volumeCurve[instrument] || 0,
        isOptionAvailable: isOptionAvailable,
        expiry,
      })
    } else {
      acc.market[underlyingAsset].options[expiry].put.push({
        instrument: instrument,
        optionId: optionId,
        strikePrice: Number(strikePrice),
        markIv: markIv, 
        markPrice: markPrice,
        riskPremiumRateForBuy: riskPremiumRateForBuy,
        riskPremiumRateForSell: riskPremiumRateForSell,
        delta: newTradeGreeks.delta, 
        gamma: newTradeGreeks.gamma, 
        vega: newTradeGreeks.vega, 
        theta: newTradeGreeks.theta, 
        volume: volumeCurve[instrument] || 0,
        isOptionAvailable: isOptionAvailable,
        expiry,
      })
    }
    
    return acc
  }, {
    market: {
      BTC: {
        expiries: [],
        options: {}
      },
      ETH: {
        expiries: [],
        options: {}
      }
    }
  })

  const { market } = result;

  // expiry 정렬
  for (const underlyingAssetTicker in market) {
    market[underlyingAssetTicker].expiries.sort((a: string, b: string) => Number(a) - Number(b));
  }

  // strike price 정렬
  for (const underlyingAssetTicker in market) {
    for (const expiry in market[underlyingAssetTicker].options) {
      market[underlyingAssetTicker].options[expiry].call.sort((a: any, b: any) => a.strikePrice - b.strikePrice);
      market[underlyingAssetTicker].options[expiry].put.sort((a: any, b: any) => a.strikePrice - b.strikePrice);
    }
  }

  const timeData = getCurrentTimestampAndDate();

  const body = {
    data: {
      market: result.market,
      futuresIndices: futuresAssetIndexMap,
      spotIndices: spotAssetIndexMap,
      riskFreeRates,
      olpStats,
      volatilityScore
    },
    timestamp: timeData.timestamp,
    lastUpdatedAt: timeData.lastUpdatedAt
  }

  if (isParallel) {
    return putS3({
      Bucket: process.env.APP_DATA_BUCKET,
      Key: process.env.APP_DATA_MARKET_DATA_KEY,
      Body: JSON.stringify(body),
      CacheControl: 'no-cache',
    })
  }

  // Check if daily data already exists
  const dailyKey = `${process.env.APP_DATA_MARKET_DAILY_KEY}-${dateISOString}.json`;
  const existingData = await getS3({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: dailyKey,
  });

  if (existingData) {
    console.log(`Daily market data already exists for ${dateISOString}, skipping save`);
    return;
  }

  return putS3({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: dailyKey,
    Body: JSON.stringify(body),
    CacheControl: 'no-cache',
  })
}

export const getOlpGreeksV2 = async (futures, riskFreeRates, instrumentMarkData) => {
  const { ViewAggregator } = await initializeContracts();

  const result = await ViewAggregator.getAllOptionToken();

  return result.reduce((acc, positions, index) => {
    const olpCategory = ['sOlp', 'mOlp', 'lOlp'][index];
    const olpGreeks = getGreeksFromPositions(positions, futures, riskFreeRates, instrumentMarkData);
    acc[olpCategory] = olpGreeks;
    return acc;
  }, {
    sOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      }
    },
    mOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      }
    },
    lOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      }
    }
  })
}

export const getOlpGreeksV3 = async (futures, riskFreeRates, instrumentMarkData) => {
  const chainId = Number(process.env.CHAIN_ID);
  const { ViewAggregator } = await initializeContracts();

  const allExpiries = await ViewAggregator.getAllExpiries();

  const chunkArray = (array, size) => {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  };

  const multicallToGetPositions = [];
  const pageSize = 2;

  const vaultUtils = [
    CONTRACT_ADDRESSES[chainId].S_VAULT_UTILS,
    CONTRACT_ADDRESSES[chainId].M_VAULT_UTILS,
    CONTRACT_ADDRESSES[chainId].L_VAULT_UTILS
  ]

  let chunkCounts = [0, 0, 0];

  allExpiries.forEach((expiries, index) => { 
    const vaultUtilsIndex = index;

    let startIndex = 0;

    const chunks = chunkArray(expiries, pageSize);
    
    chunks.forEach((chunk) => {
      multicallToGetPositions.push(
        ViewAggregator.getOptionTokens(vaultUtils[vaultUtilsIndex], startIndex, startIndex + chunk.length)
      )
      startIndex += chunk.length;
    })

    chunkCounts[vaultUtilsIndex] += chunks.length;
  });

  const results = await Promise.all(multicallToGetPositions);

  const endIndexes = chunkCounts.reduce((acc, curr) => {
    if (acc.length === 0) return [curr];
    return [...acc, acc[acc.length - 1] + curr];
  }, []);

  return results.reduce((acc, positions, index) => {
    const olpCategoryIndex = endIndexes.findIndex(endIndex => index < endIndex);
    const olpCategory = ['sOlp', 'mOlp', 'lOlp'][olpCategoryIndex];
    const olpGreeks = getGreeksFromPositions(positions, futures, riskFreeRates, instrumentMarkData);

    acc[olpCategory].BTC.delta += olpGreeks.BTC.delta;
    acc[olpCategory].BTC.gamma += olpGreeks.BTC.gamma;
    acc[olpCategory].BTC.vega += olpGreeks.BTC.vega;
    acc[olpCategory].BTC.theta += olpGreeks.BTC.theta;

    acc[olpCategory].ETH.delta += olpGreeks.ETH.delta;
    acc[olpCategory].ETH.gamma += olpGreeks.ETH.gamma;
    acc[olpCategory].ETH.vega += olpGreeks.ETH.vega;
    acc[olpCategory].ETH.theta += olpGreeks.ETH.theta;

    return acc;
  }, {
    sOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      }
    },
    mOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      }
    },
    lOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0
      }
    }
  })
}

const getGreeksFromPositions = (positions, futures, riskFreeRates, instrumentMarkData) => {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  return positions.reduce((acc, position) => {
    const [optionTokenId, size] = position;
    const { underlyingAssetIndex, expiry } = parseOptionTokenId(optionTokenId);

    const underlyingAsset = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];
    const decimals = UA_TICKER_TO_DECIMAL[chainName][underlyingAsset];
    const underlyingFutures = calculateUnderlyingFutures(underlyingAsset, Number(expiry), futures, riskFreeRates);
    const parsedSize = new BigNumber(size).div(10 ** decimals).toNumber();

    const greeks = {
      delta: 0,
      gamma: 0,
      vega: 0,
      theta: 0
    }

    const optionDataStr = generateOptionTokenData(chainName, optionTokenId);
    const length = optionDataStr.length;
    const isBuysArr = optionDataStr.isBuys.split(",");
    const strikePricesArr = optionDataStr.strikePrices.split(",");
    const isCallsArr = optionDataStr.isCalls.split(",");
    const optionNamesArr = optionDataStr.optionNames.split(",");

    for (let i = 0; i < length; i++) {
      const isBuy = isBuysArr[i] === 'true';
      const strikePrice = strikePricesArr[i];
      const isCall = isCallsArr[i] === 'true';
      const optionName = optionNamesArr[i];

      const { markIv } = getMarkIvAndPriceByInstrument(optionName, instrumentMarkData, underlyingFutures);

      const newGreeks = calculateGreeks({
        size: parsedSize,
        underlyingFutures,
        strikePrice: Number(strikePrice),
        iv: markIv,
        expiry: Number(expiry),
        isCall: isCall,
        isBuy: isBuy
      })

      greeks.delta += newGreeks.delta;
      greeks.gamma += newGreeks.gamma;
      greeks.vega += newGreeks.vega;
      greeks.theta += newGreeks.theta;
    }

    if (!greeks.delta || !greeks.gamma || !greeks.vega || !greeks.theta) {
      return acc
    }

    acc[underlyingAsset] = {
      delta: acc[underlyingAsset].delta + greeks.delta,
      gamma: acc[underlyingAsset].gamma + greeks.gamma,
      vega: acc[underlyingAsset].vega + greeks.vega,
      theta: acc[underlyingAsset].theta + greeks.theta
    }

    return acc;
  }, {
    BTC: {
      delta: 0,
      gamma: 0,
      vega: 0,
      theta: 0
    },
    ETH: {
      delta: 0,
      gamma: 0,
      vega: 0,
      theta: 0
    }
  })
}

const getOlpAssetAmounts = async (): Promise<any> => {
  const chainId = Number(process.env.CHAIN_ID);
  const { ViewAggregator } = await initializeContracts();

  // const ASSETS = [CONTRACT_ADDRESSES[chainId].WBTC, CONTRACT_ADDRESSES[chainId].WETH, CONTRACT_ADDRESSES[chainId].USDC];
  const ASSETS = [CONTRACT_ADDRESSES[chainId].USDC];

  const data = await ViewAggregator.getOlpAssetAmounts(ASSETS);

  const sOlpAssetAmounts = data[0];
  const mOlpAssetAmounts = data[1];
  const lOlpAssetAmounts = data[2];

  return {
    sOlp: {
      // wbtc: {
      //   utilizedAmount: new BigNumber(sOlpAssetAmounts[0]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["BTC"]).toNumber(),
      //   availableAmount: new BigNumber(sOlpAssetAmounts[1]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["BTC"]).toNumber(),
      //   depositedAmount: new BigNumber(sOlpAssetAmounts[2]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["BTC"]).toNumber()
      // },
      // weth: {
      //   utilizedAmount: new BigNumber(sOlpAssetAmounts[3]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["ETH"]).toNumber(),
      //   availableAmount: new BigNumber(sOlpAssetAmounts[4]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["ETH"]).toNumber(),
      //   depositedAmount: new BigNumber(sOlpAssetAmounts[5]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["ETH"]).toNumber()
      // },
      usdc: {
        utilizedAmount: new BigNumber(sOlpAssetAmounts[0]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["USDC"]).toNumber(),
        availableAmount: new BigNumber(sOlpAssetAmounts[1]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["USDC"]).toNumber(),
        depositedAmount: new BigNumber(sOlpAssetAmounts[2]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["USDC"]).toNumber()
      }
    },
    mOlp: {
      // wbtc: {
      //   utilizedAmount: new BigNumber(mOlpAssetAmounts[0]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["BTC"]).toNumber(),
      //   availableAmount: new BigNumber(mOlpAssetAmounts[1]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["BTC"]).toNumber(),
      //   depositedAmount: new BigNumber(mOlpAssetAmounts[2]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["BTC"]).toNumber()
      // },
      // weth: {
      //   utilizedAmount: new BigNumber(mOlpAssetAmounts[3]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["ETH"]).toNumber(),
      //   availableAmount: new BigNumber(mOlpAssetAmounts[4]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["ETH"]).toNumber(),
      //   depositedAmount: new BigNumber(mOlpAssetAmounts[5]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["ETH"]).toNumber()
      // },
      usdc: {
        utilizedAmount: new BigNumber(mOlpAssetAmounts[0]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["USDC"]).toNumber(),
        availableAmount: new BigNumber(mOlpAssetAmounts[1]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["USDC"]).toNumber(),
        depositedAmount: new BigNumber(mOlpAssetAmounts[2]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["USDC"]).toNumber()
      }
    },
    lOlp: {
      // wbtc: {
      //   utilizedAmount: new BigNumber(lOlpAssetAmounts[0]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["BTC"]).toNumber(),
      //   availableAmount: new BigNumber(lOlpAssetAmounts[1]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["BTC"]).toNumber(),
      //   depositedAmount: new BigNumber(lOlpAssetAmounts[2]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["BTC"]).toNumber()
      // },
      // weth: {
      //   utilizedAmount: new BigNumber(lOlpAssetAmounts[3]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["ETH"]).toNumber(),
      //   availableAmount: new BigNumber(lOlpAssetAmounts[4]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["ETH"]).toNumber(),
      //   depositedAmount: new BigNumber(lOlpAssetAmounts[5]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["ETH"]).toNumber()
      // },
      usdc: {
        utilizedAmount: new BigNumber(lOlpAssetAmounts[0]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["USDC"]).toNumber(),
        availableAmount: new BigNumber(lOlpAssetAmounts[1]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["USDC"]).toNumber(),
        depositedAmount: new BigNumber(lOlpAssetAmounts[2]).dividedBy(10 ** ASSET_TICKER_TO_DECIMALS[chainId]["USDC"]).toNumber()
      }
    }
  }
}

const getOlpUtilityRatio = async (): Promise<any> => {
  const { ViewAggregator } = await initializeContracts();

  const data = await ViewAggregator.getOlpUtilityRatio();

  return {
    sOlp: {
      utilizedUsd: new BigNumber(data[0]).dividedBy(10 ** 30).toNumber(),
      depositedUsd: new BigNumber(data[1]).dividedBy(10 ** 30).toNumber()
    },
    mOlp: {
      utilizedUsd: new BigNumber(data[2]).dividedBy(10 ** 30).toNumber(),
      depositedUsd: new BigNumber(data[3]).dividedBy(10 ** 30).toNumber()
    },
    lOlp: {
      utilizedUsd: new BigNumber(data[4]).dividedBy(10 ** 30).toNumber(),
      depositedUsd: new BigNumber(data[5]).dividedBy(10 ** 30).toNumber()
    }
  }
}

const getOlpStats = (olpGreeks, olpAssetAmounts, olpUtilityRatio) => {
  const deepCopy = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  }

  return {
    sOlp: {
      greeks: deepCopy(olpGreeks.sOlp),
      assetAmounts: deepCopy(olpAssetAmounts.sOlp),
      utilityRatio: deepCopy(olpUtilityRatio.sOlp)
    },
    mOlp: {
      greeks: deepCopy(olpGreeks.mOlp),
      assetAmounts: deepCopy(olpAssetAmounts.mOlp),
      utilityRatio: deepCopy(olpUtilityRatio.mOlp)
    },
    lOlp: {
      greeks: deepCopy(olpGreeks.lOlp),
      assetAmounts: deepCopy(olpAssetAmounts.lOlp),
      utilityRatio: deepCopy(olpUtilityRatio.lOlp)
    }
  }
}