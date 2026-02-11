import initializeContracts from '../contract';
import BigNumber from 'bignumber.js';
import { ZERO_ADDRESS } from '../constants';
import { RP_DEFAULT_VALUE } from '../constants/constants.blackscholes';
import { getDaysToExpiration, getPriceBitArray } from '../utils/format';
import { getOlpKeyByVaultIndex } from '../utils/helper';
import { getS3 } from '../utils/aws';
import { logPositionRequest } from '../utils/log';
import { LogLevel } from '../utils/enums';
import { sendMessage } from '../utils/slack';
import { getOlpGreeksV2, getOlpGreeksV3 } from './collect.marketData';
import { CONTRACT_ADDRESSES } from '../constants/constants.addresses';
import { makeTx } from '../../makeTx';
import { MESSAGE_TYPE } from '../utils/messages';
import { getFuturesS3, getRiskFreeRatesS3, getSpotS3 } from '../utils/aws-getter';
import {
  calculateEstimatedSizeForOpenPosition,
  calculateOpenPositionFee,
  calculateRiskPremiumRate,
  calculateUnderlyingFutures,
  ChainNames,
  generateOptionTokenData,
  getInstrumentMarkDataFromMarket,
  getMainOptionName,
  getMainOptionStrikePrice,
  getMarkIvAndPriceByInstrument,
  getMarkIvAndPriceByOptionTokenId,
  getPairedOptionName,
  getPairedOptionStrikePrice,
  Greeks,
  isBuyStrategy,
  isCallStrategy,
  OptionDirection,
  OptionRiskPremiumInputData,
  parseOptionTokenId,
  QA_ADDRESS_TO_TICKER,
  QA_TICKER_TO_DECIMAL,
  SpotAssetIndexMap,
  UA_INDEX_TO_TICKER,
  UA_TICKER_TO_DECIMAL,
  UnderlyingAssetIndex,
} from '@callput/shared';
import { calculateVolatilityScore } from '../utils/volatility-score';
import { getInstrumentMarkDataFromApp } from '../iv/apis/app';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export const executePositionRequest = async () => {
  const chainId = Number(process.env.CHAIN_ID);

  try {
    const { FastPriceFeed, ViewAggregator, keeper_positionProcessor } = await initializeContracts();

    const [
      positionRequestInfo,
      positionEndIndex,
      sOlpUtilizedUsd,
      sOlpDepositedUsd,
      mOlpUtilizedUsd,
      mOlpDepositedUsd,
      lOlpUtilizedUsd,
      lOlpDepositedUsd,
    ] = await ViewAggregator.positionRequestInfoWithOlpUtilityRatio(process.env.MAX_POSITION_PROCESS_ITEMS);

    let olpUtilityRatio = {
      sOlp: {
        utilizedUsd: new BigNumber(sOlpUtilizedUsd).dividedBy(10 ** 30).toNumber(),
        depositedUsd: new BigNumber(sOlpDepositedUsd).dividedBy(10 ** 30).toNumber(),
      },
      mOlp: {
        utilizedUsd: new BigNumber(mOlpUtilizedUsd).dividedBy(10 ** 30).toNumber(),
        depositedUsd: new BigNumber(mOlpDepositedUsd).dividedBy(10 ** 30).toNumber(),
      },
      lOlp: {
        utilizedUsd: new BigNumber(lOlpUtilizedUsd).dividedBy(10 ** 30).toNumber(),
        depositedUsd: new BigNumber(lOlpDepositedUsd).dividedBy(10 ** 30).toNumber(),
      },
    };

    if (positionRequestInfo.length == 0) {
      console.log('nothing to execute');
      return;
    }

    const {
      position_requestIndexesToExecute,
      position_optionTokenIdsToExecute,
      position_markPrices,
      position_markPriceBitArray,
      position_riskPremiumsInPrice,
      position_riskPremiumBitArray,
      logs_openQueue,
      logs_closeQueue,
    } = await getPositionRequests(positionRequestInfo, olpUtilityRatio);

    const currentTimestamp = parseInt(`${new Date().getTime() / 1000}`);

    if (position_optionTokenIdsToExecute.length > 0) {
      const { isSuccess, receipt } = await makeTx(
        FastPriceFeed,
        keeper_positionProcessor,
        'setPricesAndRiskPremiumsWithBitsAndExecute',
        [
          CONTRACT_ADDRESSES[chainId].POSITION_MANAGER,
          position_markPriceBitArray,
          position_riskPremiumBitArray,
          position_optionTokenIdsToExecute,
          position_requestIndexesToExecute,
          currentTimestamp,
          positionEndIndex,
          process.env.MAX_POSITION_PROCESS_ITEMS,
        ],
      );

      if (!isSuccess) {
        console.log('Error executing position request');
        return;
      }

      await logPositionRequest(receipt, logs_openQueue, logs_closeQueue);
    }
  } catch (error) {
    console.log('Error executing position request:', error);

    const IGNORABLE_ERRORS = [
      MESSAGE_TYPE.NONCE_ALREADY_USED,
      MESSAGE_TYPE.COULD_NOT_COALESCE_ERROR,
      MESSAGE_TYPE.NONCE_LOWER_THAN_CURRENT_NONCE,
    ];

    if (IGNORABLE_ERRORS.some((msg) => error.message.includes(msg))) return;

    await sendMessage(
      `\`[Lambda][execute.PositionRequest.ts]\` ${MESSAGE_TYPE.ERROR_DURING_EXECUTING_POSITION_REQUEST}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      },
    );
  }
};

const getPositionRequests = async (positionRequestInfo, olpUtilityRatio) => {
  const requestIndexesToExecute: any[] = [];
  const optionTokenIdsToExecute: any[] = [];
  const sizesToExecute: any[] = [];
  const amountInTokenToExecute: any[] = [];
  const amountInToExecute: any[] = [];
  const isOpenToExecute: any[] = [];

  for (const [
    requestIndex,
    isOpen,
    account,
    optionTokenId,
    amountInOrSize,
    blockTime,
    status,
    sizeOutOrAmountOut,
    executionPrice,
    processBlockTime,
    path0,
    path1,
  ] of positionRequestInfo) {
    // amountInOrSize : amountIn for open position, size for close position
    const amountInToken = isOpen ? path0 : ZERO_ADDRESS;
    const amountIn = isOpen ? amountInOrSize : 0; // open => amountIn, close => 0
    const size = isOpen ? 0 : amountInOrSize; // open => 0, close => size

    requestIndexesToExecute.push(requestIndex);
    optionTokenIdsToExecute.push(optionTokenId);
    amountInTokenToExecute.push(amountInToken); // openBuySell => amountInToken, closeBuySell => 0x0000000000000000000000000000000000000000
    amountInToExecute.push(amountIn); // openBuySell => amountIn, closeBuySell => 0
    sizesToExecute.push(size); // openBuySell => 0, closeBuySell => size
    isOpenToExecute.push(isOpen);
  }

  const result = await fillPricesToRequests(
    optionTokenIdsToExecute,
    sizesToExecute,
    amountInTokenToExecute,
    amountInToExecute,
    isOpenToExecute,
    olpUtilityRatio,
  );

  return {
    position_requestIndexesToExecute: requestIndexesToExecute,
    position_optionTokenIdsToExecute: optionTokenIdsToExecute,
    position_markPrices: result.markPrices,
    position_markPriceBitArray: result.markPriceBitArray,
    position_riskPremiumsInPrice: result.riskPremiums,
    position_riskPremiumBitArray: result.riskPremiumBitArray,
    logs_openQueue: result.logsOpenQueue,
    logs_closeQueue: result.logsCloseQueue,
  };
};

const fillPricesToRequests = async (
  optionTokenIdsToExecute,
  sizesToExecute,
  amountInTokenToExecute,
  amountInToExecute,
  isOpenToExecute,
  olpUtilityRatio,
) => {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  const logsOpenQueue = [];
  const logsCloseQueue = [];

  const markPrices: any[] = [];
  const riskPremiums: any[] = [];

  const [
    instrumentMarkData,
    { data: futuresAssetIndexMap },
    { data: spotAssetIndexMap },
    riskFreeRates,
    { data: volatilityScore },
  ] = await Promise.all([
    getInstrumentMarkDataFromApp(),
    getFuturesS3(),
    getSpotS3(),
    getRiskFreeRatesS3(),
    calculateVolatilityScore(),
  ]);

  // get olp greeks
  let olpGreeks = {
    sOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0,
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0,
      },
    },
    mOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0,
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0,
      },
    },
    lOlp: {
      BTC: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0,
      },
      ETH: {
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0,
      },
    },
  };

  try {
    olpGreeks = await getOlpGreeksV2(futuresAssetIndexMap, riskFreeRates, instrumentMarkData);
  } catch (error) {
    try {
      olpGreeks = await getOlpGreeksV3(futuresAssetIndexMap, riskFreeRates, instrumentMarkData);
    } catch (error) {
      console.log('Error getting olp greeks:', error);
      await sendMessage(
        `\`[Lambda][execute.PositionRequest.ts]\` ${MESSAGE_TYPE.ERROR_DURING_GETTING_OLP_GREEKS}`,
        LogLevel.ERROR,
        {
          description: error?.message || error,
        },
      );
      throw new Error('Error getting olp greeks');
    }
  }

  for (let i = 0; i < optionTokenIdsToExecute.length; i++) {
    const optionTokenId = BigInt(optionTokenIdsToExecute[i]);

    const { underlyingAssetIndex, expiry, strategy, length, isBuys, strikePrices, vaultIndex } =
      parseOptionTokenId(optionTokenId);

    // 1. Calculate underlyingFutures and markPrice
    const underlyingAsset = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];
    const underlyingFutures = calculateUnderlyingFutures(
      underlyingAsset,
      expiry,
      futuresAssetIndexMap,
      riskFreeRates,
    );

    const underlyingAssetSpotIndex = spotAssetIndexMap[underlyingAsset];

    const underlyingAssetVolatilityScore = volatilityScore[underlyingAsset];

    const { markPrice } = getMarkIvAndPriceByOptionTokenId(
      chainName,
      optionTokenId,
      instrumentMarkData,
      underlyingFutures,
    );
    const markPriceParsed = Math.floor(new BigNumber(markPrice).multipliedBy(10 ** 3).toNumber()); // decimal 0 to 3

    console.log(markPriceParsed, 'markPriceParsed');

    markPrices.push(markPriceParsed);

    // 2. Calculate size and amount after fee
    const quoteAsset = QA_ADDRESS_TO_TICKER[chainName][String(amountInTokenToExecute[i]).toLowerCase()];
    const quoteAssetAmount = new BigNumber(amountInToExecute[i]).toString();

    const isOpen = isOpenToExecute[i];

    let size: number;

    if (isOpen) {
      const estimatedSize = calculateEstimatedSizeForOpenPosition({
        network: chainName,
        underlyingAsset,
        strategy,
        strikePrices,
        markPrice,
        quoteAsset, // amountInTokenToExecute
        quoteAssetAmount, // amountInToExecute
        spotAssetIndexMap: spotAssetIndexMap as SpotAssetIndexMap,
      });

      const afterFeeAmountIn = calculateOpenPositionFee({
        network: chainName,
        underlyingAsset,
        strategy,
        quoteAsset, // amountInTokenToExecute
        quoteAssetAmount, // amountInToExecute
        spotAssetIndexMap: spotAssetIndexMap as SpotAssetIndexMap,
        size: estimatedSize,
        markPrice,
      });

      size = new BigNumber(estimatedSize)
        .multipliedBy(afterFeeAmountIn)
        .dividedBy(quoteAssetAmount)
        .toNumber();
    } else {
      size = new BigNumber(sizesToExecute[i])
        .div(10 ** UA_TICKER_TO_DECIMAL[chainName][underlyingAsset])
        .toNumber();
    }

    const olpKey = getOlpKeyByVaultIndex(vaultIndex);
    const olpGreeksToApply: Greeks = olpGreeks[olpKey][underlyingAsset];
    const olpDvToApply: number = olpUtilityRatio[olpKey].depositedUsd;
    console.log(olpKey, 'olpKey');

    const orderSide = isBuyStrategy(strategy) ? 'Buy' : 'Sell';
    const optionDirection: OptionDirection = isCallStrategy(strategy) ? 'Call' : 'Put';
    console.log('trade and option type', orderSide, optionDirection);

    const { optionNames } = generateOptionTokenData(chainName, optionTokenId);
    const mainOptionName = getMainOptionName(optionTokenId, optionNames);
    const mainOptionStrikePrice = getMainOptionStrikePrice(optionTokenId);
    const mainOptionMarkIvAndPrice = getMarkIvAndPriceByInstrument(
      mainOptionName,
      instrumentMarkData,
      underlyingFutures,
    );

    const mainOption: OptionRiskPremiumInputData = {
      strikePrice: mainOptionStrikePrice,
      markIv: mainOptionMarkIvAndPrice.markIv,
      markPrice: mainOptionMarkIvAndPrice.markPrice,
    };

    let pairedOption: OptionRiskPremiumInputData | null = null;

    if (length === 2) {
      const pairedOptionName = getPairedOptionName(optionTokenId, optionNames);
      const pairedOptionStrikePrice = getPairedOptionStrikePrice(optionTokenId);
      const pairedOptionMarkIvAndPrice = getMarkIvAndPriceByInstrument(
        pairedOptionName,
        instrumentMarkData,
        underlyingFutures,
      );

      pairedOption = {
        strikePrice: pairedOptionStrikePrice,
        markIv: pairedOptionMarkIvAndPrice.markIv,
        markPrice: pairedOptionMarkIvAndPrice.markPrice,
      };
    }

    const {
      RP_rate: rpRate,
      g0Greeks,
      newTradeGreeks,
      newTradeMoneyness,
      nextOlpUtilityRatio,
      G1_delta,
      G1_vega,
      G1_theta,
      UG_delta,
      UG_vega,
      UG_theta,
      ur1,
      urMultiplier,
    } = calculateRiskPremiumRate({
      underlyingAsset: underlyingAsset,
      expiry: expiry,
      isOpen: isOpen,
      orderSide: orderSide,
      optionDirection: optionDirection,
      mainOption: mainOption,
      pairedOption: pairedOption,
      size: size,
      underlyingFutures,
      underlyingAssetSpotIndex,
      underlyingAssetVolatilityScore,
      olpKey,
      olpGreeks: olpGreeksToApply,
      olpUtilityRatio,
    });

    const riskPremium = markPrice * rpRate;

    const riskPremiumParsed = Math.floor(new BigNumber(riskPremium).multipliedBy(10 ** 3).toNumber());

    // Check if riskPremiumParsed is NaN or Zero
    if (isNaN(riskPremiumParsed) || riskPremiumParsed === 0) {
      console.log(`riskPremiumParsed is ${riskPremiumParsed}, setting to 2`); // it's $0.002
      riskPremiums.push(new BigNumber(RP_DEFAULT_VALUE).multipliedBy(10 ** 3).toNumber()); // Set to 0 if it's NaN or Zero
    } else {
      console.log(riskPremiumParsed, 'riskPremiumParsed');
      riskPremiums.push(riskPremiumParsed);
    }

    const logsToPush = {
      amountInTokenToExecute: isOpen ? quoteAsset : '', // for closeBuySell, it's 0x0
      amountInToExecute: isOpen // for closeBuySell, it's 0
        ? new BigNumber(quoteAssetAmount).div(10 ** QA_TICKER_TO_DECIMAL[chainName][quoteAsset]).toNumber()
        : 0,

      sizesToExecute: isOpen // for openBuySell, it's 0
        ? 0
        : new BigNumber(sizesToExecute[i])
            .div(10 ** UA_TICKER_TO_DECIMAL[chainName][underlyingAsset])
            .toNumber(),

      mainOptionIv: mainOption.markIv,
      pairedOptionIv: pairedOption ? pairedOption.markIv : 0,

      newTradeMoneyness,
      underlyingFutures,
      daysToExpiration: getDaysToExpiration(Number(expiry)),
      olpDvToApply,
      UR: ur1,
      UR_Multiplier: urMultiplier,

      rpRate,
      G0_delta: g0Greeks.delta,
      G0_vega: g0Greeks.vega,
      G0_theta: g0Greeks.theta,
      G1_delta,
      G1_vega,
      G1_theta,
      UG_delta,
      UG_vega,
      UG_theta,

      markPrice,
      riskPremium,
    };

    if (isOpen) {
      logsOpenQueue.push(logsToPush);
    } else {
      logsCloseQueue.push(logsToPush);
    }

    olpGreeks = updateGreeks(olpGreeks, olpKey, underlyingAsset, newTradeGreeks, isOpen);
    olpUtilityRatio = nextOlpUtilityRatio;
  }

  console.log(markPrices, 'markPrices');
  console.log(riskPremiums, 'riskPremiums');

  const markPriceBitArray = getPriceBitArray(markPrices);
  const riskPremiumBitArray = getPriceBitArray(riskPremiums);

  return {
    markPrices,
    markPriceBitArray,
    riskPremiums,
    riskPremiumBitArray,
    logsOpenQueue,
    logsCloseQueue,
  };
};

function updateGreeks(olpGreeks, olpKey, underlyingAsset, newGreeks, isOpen) {
  if (isOpen) {
    olpGreeks[olpKey][underlyingAsset] = {
      delta: olpGreeks[olpKey][underlyingAsset].delta - newGreeks.delta,
      gamma: olpGreeks[olpKey][underlyingAsset].gamma - newGreeks.gamma,
      vega: olpGreeks[olpKey][underlyingAsset].vega - newGreeks.vega,
      theta: olpGreeks[olpKey][underlyingAsset].theta - newGreeks.theta,
    };
  } else {
    olpGreeks[olpKey][underlyingAsset] = {
      delta: olpGreeks[olpKey][underlyingAsset].delta + newGreeks.delta,
      gamma: olpGreeks[olpKey][underlyingAsset].gamma + newGreeks.gamma,
      vega: olpGreeks[olpKey][underlyingAsset].vega + newGreeks.vega,
      theta: olpGreeks[olpKey][underlyingAsset].theta + newGreeks.theta,
    };
  }

  return olpGreeks;
}
