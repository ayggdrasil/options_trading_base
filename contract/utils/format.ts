import BN from 'bn.js'

import { Exchange, Strategy, Ticker, UnderlyingAssetIndex, VaultIndex } from "./enums";
import { DateObject, FuturesData, OptionData, OptionType } from "./types"
import { solidityPacked, zeroPadBytes } from 'ethers';

import { MONTHS_MAP, MONTHS_MAP_REV, UNDERLYING_ASSET_INDEX_TO_TICKER, UNDERLYING_ASSET_TICKER_TO_INDEX } from './constants'
import { IMarket, IOptionsInfo, OptionDataStr } from './interfaces';


//////////////////////////////////
//   OptionTokenId              //
//////////////////////////////////

// Option
// underlyingAssetIndex - 16-bits
// expiry - 40-bits
// strategy - 4-bits

// length - 1-bits

// isBuy - 1-bits
// strikePrice - 46-bits
// isCall - 1-bits

// isBuy - 1-bits
// strikePrice - 46-bits
// isCall - 1-bits

// isBuy - 1-bits
// strikePrice - 46-bits
// isCall - 1-bits

// isBuy - 1-bits
// strikePrice - 46-bits
// isCall - 1-bits

// vaultIndex - 3-bits

// Main function to format option token ID
export function formatOptionTokenId(
  underlyingAssetIndex: UnderlyingAssetIndex,
  expiry: number,
  length: number,
  isBuys: boolean[],
  strikePrices: number[],
  isCalls: boolean[],
  vaultIndex: VaultIndex
): bigint {
  const { strategy } = determineStrategy(length, isBuys, strikePrices, isCalls);

  let optionTokenId =
      (BigInt(underlyingAssetIndex) << BigInt(240)) + 
      (BigInt(expiry) << BigInt(200)) +
      (BigInt(strategy) << BigInt(196)) +
      (BigInt(length - 1) << BigInt(194)) + // Adjusted for 2 bits length
      (BigInt(isBuys[0] ? 1 : 0) << BigInt(193)) +
      (BigInt(strikePrices[0]) << BigInt(147)) +
      (BigInt(isCalls[0] ? 1 : 0) << BigInt(146)) +
      (BigInt(isBuys[1] ? 1 : 0) << BigInt(145)) +
      (BigInt(strikePrices[1]) << BigInt(99)) +
      (BigInt(isCalls[1] ? 1 : 0) << BigInt(98)) +
      (BigInt(isBuys[2] ? 1 : 0) << BigInt(97)) +
      (BigInt(strikePrices[2]) << BigInt(51)) +
      (BigInt(isCalls[2] ? 1 : 0) << BigInt(50)) +
      (BigInt(isBuys[3] ? 1 : 0) << BigInt(49)) +
      (BigInt(strikePrices[3]) << BigInt(3)) +
      (BigInt(isCalls[3] ? 1 : 0) << BigInt(2)) +
      (BigInt(vaultIndex & 0x3)); // Adjusted for 2 bits vault index

  return optionTokenId;
}

function determineStrategy(
  length: number,
  isBuys: boolean[],
  strikePrices: number[],
  isCalls: boolean[]
): {
  strategy: Strategy,
  isBuys: boolean[],
  strikePrices: number[],
  isCalls: boolean[]
} {
  // Sort the strikePrices array and adjust isBuys and isCalls accordingly
  for (let i = 0; i < strikePrices.length; i++) {
      for (let j = 0; j < strikePrices.length - i - 1; j++) {
          let shouldSwap = (strikePrices[j] > strikePrices[j + 1] && strikePrices[j + 1] !== 0) || (strikePrices[j] === 0 && strikePrices[j + 1] !== 0);
          if (shouldSwap) {
              // Swap strikePrices
              [strikePrices[j], strikePrices[j + 1]] = [strikePrices[j + 1], strikePrices[j]];
              // Swap isBuys and isCalls
              [isBuys[j], isBuys[j + 1]] = [isBuys[j + 1], isBuys[j]];
              [isCalls[j], isCalls[j + 1]] = [isCalls[j + 1], isCalls[j]];
          }
      }
  }

  let _length = 0;
  for (let i = 0; i < strikePrices.length; i++) {
      if (strikePrices[i] !== 0) _length++;
  }
  if (length !== _length) throw new Error("Length is not correct");

  let strategy = Strategy.NotSupported;

  // Determine the strategy based on the inputs
  if (length === 1) {
      if (isBuys[0] && isCalls[0]) {
          strategy = Strategy.BuyCall;
      } else if (!isBuys[0] && isCalls[0]) {
          strategy = Strategy.SellCall;
      } else if (isBuys[0] && !isCalls[0]) {
          strategy = Strategy.BuyPut;
      } else if (!isBuys[0] && !isCalls[0]) {
          strategy = Strategy.SellPut;
      }
  } else if (length === 2) {
      if (isBuys[0] && isCalls[0] && !isBuys[1] && isCalls[1]) {
          strategy = Strategy.BuyCallSpread;
      } else if (!isBuys[0] && isCalls[0] && isBuys[1] && isCalls[1]) {
          strategy = Strategy.SellCallSpread;
      } else if (!isBuys[0] && !isCalls[0] && isBuys[1] && !isCalls[1]) {
          strategy = Strategy.BuyPutSpread;
      } else if (isBuys[0] && !isCalls[0] && !isBuys[1] && !isCalls[1]) {
          strategy = Strategy.SellPutSpread;
      }
  }

  return {strategy, isBuys, strikePrices, isCalls};
}

export function parseOptionTokenId(optionTokenId: bigint): {
  underlyingAssetIndex: UnderlyingAssetIndex,
  expiry: number,
  strategy: Strategy,
  length: number,
  isBuys: boolean[],
  strikePrices: number[],
  isCalls: boolean[],
  vaultIndex: VaultIndex
} {
  const underlyingAssetIndex = Number((optionTokenId >> BigInt(240)) & BigInt(0xFFFF));
  const expiry = Number((optionTokenId >> BigInt(200)) & BigInt(0xFFFFFFFFFF));
  const strategy = Number((optionTokenId >> BigInt(196)) & BigInt(0xF));
  if (strategy === Strategy.NotSupported) {
    console.log("Not supported strategy");
  };
  
  const length = Number((optionTokenId >> BigInt(194)) & BigInt(0x3)) + 1; // Adjusted for 2 bits length


  let isBuys = [];
  let strikePrices = [];
  let isCalls = [];

  for (let i = 0; i < 4; i++) {
    isBuys.push(Boolean((optionTokenId >> BigInt(193 - 48 * i)) & BigInt(0x1)));
    strikePrices.push(Number((optionTokenId >> BigInt(147 - 48 * i)) & BigInt(0x3FFFFFFFFFF)));
    isCalls.push(Boolean((optionTokenId >> BigInt(146 - 48 * i)) & BigInt(0x1)));
  }

  const vaultIndex = Number(optionTokenId & BigInt(0x3)); // Adjusted for 2 bits vault index

  return { underlyingAssetIndex, expiry, strategy, length, isBuys, strikePrices, isCalls, vaultIndex };
}

export function getOppositeStrategy(strategy: Strategy): Strategy {
  switch (strategy) {
    case Strategy.BuyCall:
      return Strategy.SellCall;
    case Strategy.SellCall:
      return Strategy.BuyCall;
    case Strategy.BuyPut:
      return Strategy.SellPut;
    case Strategy.SellPut:
      return Strategy.BuyPut;
    case Strategy.BuyCallSpread:
      return Strategy.SellCallSpread;
    case Strategy.SellCallSpread:
      return Strategy.BuyCallSpread;
    case Strategy.BuyPutSpread:
      return Strategy.SellPutSpread;
    case Strategy.SellPutSpread:
      return Strategy.BuyPutSpread;
    default:
      return Strategy.NotSupported;
  }
}

export function isBuyStrategy(strategy: Strategy) {
  return strategy === Strategy.BuyCall || strategy === Strategy.BuyPut || strategy === Strategy.BuyCallSpread || strategy === Strategy.BuyPutSpread;
}

export function isSell(strategy: Strategy) {
  return strategy === Strategy.SellCall || strategy === Strategy.SellPut || strategy === Strategy.SellCallSpread || strategy === Strategy.SellPutSpread;
}

export function isCallStrategy(strategy: Strategy) {
  return strategy === Strategy.BuyCall || strategy === Strategy.SellCall || strategy === Strategy.BuyCallSpread || strategy === Strategy.SellCallSpread;
}

export function isPut(strategy: Strategy) {
  return strategy === Strategy.BuyPut || strategy === Strategy.SellPut || strategy === Strategy.BuyPutSpread || strategy === Strategy.SellPutSpread;
}

export function isNakedCall(strategy: Strategy) {
  return strategy === Strategy.BuyCall || strategy === Strategy.SellCall;
}

export function isNakedPut(strategy: Strategy) {
  return strategy === Strategy.BuyPut || strategy === Strategy.SellPut;
}

export function isNaked(strategy: Strategy) {
  return isNakedCall(strategy) || isNakedPut(strategy);
}

export function isCallSpread(strategy: Strategy) {
  return strategy === Strategy.BuyCallSpread || strategy === Strategy.SellCallSpread;
}

export function isPutSpread(strategy: Strategy) {
  return strategy === Strategy.BuyPutSpread || strategy === Strategy.SellPutSpread;
}

export function isSpread(strategy: Strategy) {
  return isCallSpread(strategy) || isPutSpread(strategy);
}

export function getStrategy(optionTokenId: bigint): Strategy {
  const { strategy } = parseOptionTokenId(optionTokenId);
  return strategy;
}

export function getMainOptionName(optionTokenId: bigint, optionNames: string): string {
  const strategy = getStrategy(optionTokenId);
  const optionNameArr = optionNames.split(",");

  if (isPutSpread(strategy)) return optionNameArr[1];

  return optionNameArr[0];
}

export function getPairedOptionName(optionTokenId: bigint, optionNames: string): string {
  const strategy = getStrategy(optionTokenId);
  const optionNameArr = optionNames.split(",");

  if (isPutSpread(strategy)) return optionNameArr[0];

  if (isCallSpread(strategy)) return optionNameArr[1];

  return "";
}

export function getMainOptionStrikePrice(optionTokenId: bigint): number {
  const { strategy, strikePrices } = parseOptionTokenId(optionTokenId);

  if (isPutSpread(strategy)) return strikePrices[1];

  return strikePrices[0];
}

export function getPairedOptionStrikePrice(optionTokenId: bigint): number {
  const { strategy, strikePrices } = parseOptionTokenId(optionTokenId);

  if (isPutSpread(strategy)) return strikePrices[0];

  if (isCallSpread(strategy)) return strikePrices[1];

  return 0;
}

export function generatePositionDataToStr(optionTokenId: bigint): OptionDataStr {
  const { underlyingAssetIndex, expiry, length, isBuys, strikePrices, isCalls } = parseOptionTokenId(optionTokenId);

  const isBuysStr = isBuys.join(",")
  const strikePricesStr = strikePrices.join(",")
  const isCallsStr = isCalls.join(",")

  const formattedIndexAsset: string = underlyingAssetIndex === UnderlyingAssetIndex.BTC ? 'BTC' : underlyingAssetIndex === UnderlyingAssetIndex.ETH ? 'ETH' : '';
  const date = new Date(Number(expiry) * 1000);
  const formattedMonth = MONTHS_MAP[date.getUTCMonth() + 1];
  const formattedYear = (date.getUTCFullYear() % 100).toString().padStart(2, '0');
  const formattedDay = date.getUTCDate().toString();

  const optionNames = isBuys.map((isBuy, index) => {
    if (index >= length) return "";

    const formattedStrikePrice = Number(strikePrices[index]).toString();
    const formattedType: string = isCalls[index] ? 'C' : 'P';

    return `${formattedIndexAsset}-${formattedDay}${formattedMonth}${formattedYear}-${formattedStrikePrice}-${formattedType}`;
  }).join(",")
  
  return {
    length: length,
    isBuys: isBuysStr,
    strikePrices: strikePricesStr,
    isCalls: isCallsStr,
    optionNames: optionNames
  }
}


//////////////////////////////////
//   Formatting option infos    //
//////////////////////////////////

export function getOptionInstrument(underlyingAssetIndex: UnderlyingAssetIndex, expiry: number, strikePrice: number, isCall: boolean): string {
  const day = new Date(expiry * 1000).getUTCDate();
  const month = new Date(expiry * 1000).getUTCMonth() + 1;
  const year = String(new Date(expiry * 1000).getUTCFullYear()).slice(2, 4);

  const formattedUnderlyingAsset = UNDERLYING_ASSET_INDEX_TO_TICKER[underlyingAssetIndex];
  const formattedExpiry = `${day}${MONTHS_MAP[month]}${year}`;
  const formattedStrikePrice = strikePrice.toString();
  const formattedType = isCall ? 'C' : 'P';

  switch (underlyingAssetIndex) {
    case UnderlyingAssetIndex.BTC:
      return `${formattedUnderlyingAsset}-${formattedExpiry}-${formattedStrikePrice}-${formattedType}`;
    case UnderlyingAssetIndex.ETH:
      return `${formattedUnderlyingAsset}-${formattedExpiry}-${formattedStrikePrice}-${formattedType}`;
    default:
      return '';
  }
}


//////////////////////////////////
//   Formatting numbers         //
//////////////////////////////////

function toFixedNoRounding(num: number, fixed: number): string {
  const multiplier = Math.pow(10, fixed);
  const wholeNumber = Math.floor(num * multiplier);
  const result = (wholeNumber / multiplier).toFixed(fixed);
  return result;
}


function formatNumber(num: number, decimal: number, shouldTrimZero: boolean = false, shouldRound: boolean = false): string {
  const parsedNum = shouldRound ? num.toFixed(decimal) : toFixedNoRounding(num, decimal);

  if (isNaN(parseFloat(parsedNum))) return "-";

  let [integerPart, fractionPart] = parsedNum.split(".");

  const formattedIntegerPart = Number(integerPart).toLocaleString();

  // Make sure fractionPart is not undefined and has correct number of decimal places
  if (!fractionPart) {
    fractionPart = '0'.repeat(decimal);
  } else if (fractionPart.length < decimal) {
    const zerosToAdd = decimal - fractionPart.length;
    fractionPart += '0'.repeat(zerosToAdd);
  }

  // If decimal is zero, or if the fractional part is missing or all zeros, then return just the integer part.
  if (decimal === 0 || !fractionPart || (shouldTrimZero && fractionPart.match(/^0+$/))) {
    return formattedIntegerPart;
  }

  // If shouldTrimZero is true, then remove trailing zeros.
  if (shouldTrimZero) {
    const trimmedFractionPart = fractionPart.replace(/0+$/, '');
    if (trimmedFractionPart.length > 0) {
      return `${formattedIntegerPart}.${trimmedFractionPart}`;
    } else {
      return formattedIntegerPart;
    }
  }

  return `${formattedIntegerPart}.${fractionPart}`;
}

// 숫자가 너무 작을 때 부등호로 표시하는 함수 (with sign) - Display용
export function advancedFormatNumber(num: number, decimal: number, sign: string = "", shouldTrimZero: boolean = false, shouldRound: boolean = false): string {
  const parsedDecimal = decimal <= 0 ? 0 : decimal - 1;
  
  if (num !== 0 && Math.abs(num) < Math.pow(10, -decimal)) {
    if (num > 0) {
      return `< ${sign}0.${"0".repeat(parsedDecimal)}1`;  
    } else {
      return `> -${sign}0.${"0".repeat(parsedDecimal)}1`;
    }
  }

  if(num >= 0) {
    return `${sign}${formatNumber(num, decimal, shouldTrimZero, shouldRound)}`;
  } else {
    return `-${sign}${formatNumber(Math.abs(num), decimal, shouldTrimZero, shouldRound)}`;
  }
}


//////////////////////////////////
//   Formatting dates           //
//////////////////////////////////

// 2024-03-08T08:00:00Z to 8MAR24
export function convertIsoDateToExpiryDate(isoDate: string) {
  const date = new Date(isoDate);

  const day = date.getUTCDate();
  const month = MONTHS_MAP[date.getUTCMonth() + 1];
  const year = date.getUTCFullYear().toString().slice(-2);

  return `${day}${month}${year}`;
}

// 8MAR24 to 2024-03-08T08:00:00Z
export function convertExpiryDateToIsoDate(expiryDate: string): string {
  const datePattern = /(\d{1,2})([A-Z]{3})(\d{2})/;
  const match = expiryDate.match(datePattern);

  if (!match) throw new Error("Invalid expiry format");

  const [, day, month, year] = match;

  const formattedDay = day.padStart(2, '0');
  const formattedMonth = MONTHS_MAP_REV[month.toUpperCase()].toString().padStart(2, '0');
  const formattedYear = `20${year}`;

  return `${formattedYear}-${formattedMonth}-${formattedDay}T08:00:00Z`;
}

// 8MAR24 to timestamp
export function convertExpiryDateToTimestampInSec(expiryDate: string): number {
  const dateStr = convertExpiryDateToIsoDate(expiryDate);
  const date = new Date(dateStr);

  return Math.floor(date.getTime() / 1000);
}

// ETH-8MAR24-3000-C to 2024-03-08T08:00:00Z
export function convertInstrumentToIsoDate(instrument: string): string {
  const instrumentPattern = /(\d{1,2})([A-Z]{3})(\d{2})/;
  const match = instrument.match(instrumentPattern);
  
  if (!match) throw new Error("Invalid expiry format");
  
  const [, day, month, year] = match;

  const formattedDay = day.padStart(2, '0');
  const formattedMonth = MONTHS_MAP_REV[month.toUpperCase()].toString().padStart(2, '0');
  const formattedYear = `20${year}`;

  return `${formattedYear}-${formattedMonth}-${formattedDay}T08:00:00Z`;
}

// timestamp to 8MAR24
export function convertTimestampToExpiryDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  
  const day = date.getUTCDate();
  const month = MONTHS_MAP[date.getUTCMonth() + 1];
  const year = date.getUTCFullYear().toString().slice(-2);

  return `${day}${month}${year}`;
}












//////////////////////////////////
//   old versions               //
//////////////////////////////////



export const EMPTY_OPTION_PRICE: OptionData = {
  ticker: null,
  price: 0,
  iv: 0,
  date: {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
  },
  strikePrice: 0,
  type: null,
  timestamp: 0,
  diff: 0
}



export function convertTimestampToUTCDate(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();

  return {
    year,
    month,
    day,
    hour,
  };
}

export function isExpiryExpired(expiry: number): boolean {
  return expiry * 1000 < Date.now();
}

export function getTimeToExpirationInUTC(date: DateObject): number {
  const nowTimestamp = Date.now();
  const expiration = Date.UTC(date.year, date.month - 1, date.day, date.hour, 0, 0, 0);
  return expiration > nowTimestamp ? expiration - nowTimestamp : 0;
}

export function getYearToExpirationInUTC(date: DateObject): number {
  const timestampDiff = getTimeToExpirationInUTC(date);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const daysToExpiration = timestampDiff / millisecondsPerDay;

  return Number((daysToExpiration / 365).toFixed(6));
}

// Expiry 기준 남은 일수를 계산하는 함수
export function getDaysToExpiration(expiry: number): number {
  const nowTimestamp = Date.now();
  const timestampDiff = expiry * 1000 - nowTimestamp;
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return timestampDiff / millisecondsPerDay;
}

// Expiry 기준 남은 연수를 계산하는 함수
export function getYearsToExpiration(expiry: number): number {
  const daysToExpiration = getDaysToExpiration(expiry);
  return Number((daysToExpiration / 365).toFixed(6));
}

export function getYearsFromTimeToTime(fromTimestampInSec: number, toTimestampInSec: number): number {
  if (fromTimestampInSec >= toTimestampInSec) return 0;
  
  const timestampDiffInSec = toTimestampInSec - fromTimestampInSec;
  const secondsPerYear = 60 * 60 * 24 * 365;
  return timestampDiffInSec / secondsPerYear;
}

export function getFuturesDataSymbol(ticker: Ticker, exchange: Exchange): string {
  if (exchange === Exchange.BINANCE) {
    switch (ticker) {
      case Ticker.BTC:
        return 'BTCUSDT';
      case Ticker.ETH:
        return 'ETHUSDT';
      default:
        return '';
    }
  } else if (exchange === Exchange.BITFINEX) {
    switch (ticker) {
      case Ticker.BTC:
        return 'tBTCF0:USTF0';
      case Ticker.ETH:
        return 'tETHF0:USTF0';
      default:
        return '';
    }
  } else if (exchange === Exchange.DERIBIT) {
    switch (ticker) {
      case Ticker.BTC:
        return 'BTC-PERPETUAL';
      case Ticker.ETH:
        return 'ETH-PERPETUAL';
      default:
        return '';
    }
  }

  return '';
}

export function getOptionSymbol(ticker: Ticker, exchange: Exchange, date: DateObject, strikePrice: number, optionType: OptionType): string {
  if (exchange === Exchange.BINANCE) {

    const formattedYear: string = (date.year % 100).toString().padStart(2, '0');
    const formattedMonth: string = (date.month).toString().padStart(2, '0');
    const formattedDay: string = date.day.toString().padStart(2, '0');
    const formattedStrikePrice: string = strikePrice.toString();
    const formattedType: string = optionType === "Call" ? 'C' : 'P';

    switch (ticker) {
      case Ticker.BTC:
        return `${Ticker.BTC}-${formattedYear}${formattedMonth}${formattedDay}-${formattedStrikePrice}-${formattedType}`;
      case Ticker.ETH:
        return `${Ticker.ETH}-${formattedYear}${formattedMonth}${formattedDay}-${formattedStrikePrice}-${formattedType}`;
      default:
        return '';
    }
  } else if (exchange === Exchange.BYBIT) {

    const formattedMonth: string = MONTHS_MAP[date.month].toUpperCase().slice(0, 3);
    const formattedYear: string = (date.year % 100).toString().padStart(2, '0');
    const formattedDay: string = date.day.toString();
    const formattedStrikePrice: string = strikePrice.toString();
    const formattedType: string = optionType === "Call" ? 'C' : 'P';

    switch (ticker) {
      case Ticker.BTC:
        return `${Ticker.BTC}-${formattedDay}${formattedMonth}${formattedYear}-${formattedStrikePrice}-${formattedType}`;
      case Ticker.ETH:
        return `${Ticker.ETH}-${formattedDay}${formattedMonth}${formattedYear}-${formattedStrikePrice}-${formattedType}`;
      default:
        return '';
    }
  } else if (exchange === Exchange.DERIBIT) {

    const formattedMonth: string = MONTHS_MAP[date.month].toUpperCase().slice(0, 3);
    const formattedYear: string = (date.year % 100).toString().padStart(2, '0');
    const formattedDay: string = date.day.toString();
    const formattedStrikePrice: string = strikePrice.toString();
    const formattedType: string = optionType === "Call" ? 'C' : 'P';

    switch (ticker) {
      case Ticker.BTC:
        return `${Ticker.BTC}-${formattedDay}${formattedMonth}${formattedYear}-${formattedStrikePrice}-${formattedType}`;
      case Ticker.ETH:
        return `${Ticker.ETH}-${formattedDay}${formattedMonth}${formattedYear}-${formattedStrikePrice}-${formattedType}`;
      default:
        return '';
    }
  }

  return '';
}

export function calculateOptimalFuturesPrice(data: FuturesData[]): [number, number] {
  // validation check
  // 1. price !== 0
  // 2. timestamp !== 0
  // 3. diff < 30 seconds
  const validData: FuturesData[] = data.filter(
    (item) =>
      item.ticker !== undefined &&
      item.price !== 0 &&
      item.timestamp !== 0 &&
      item.diff !== undefined &&
      Math.abs(item.diff) < 1000 * 30,
  );

  if (validData.length === 0) {
    return [0, 0];
  }

  let optimalValue = 0;

  if (validData.length === 3) {
    validData.sort((a, b) => a.price - b.price);
    const midIndex = Math.round(validData.length / 2);
    optimalValue = validData[midIndex].price;

    // Weighted Average Method
    // let totalDiff = 0;
    // for (let price of validData) {
    //   totalDiff += Math.abs(price.diff);
    // }

    // let weights: number[] = [];
    // for (let price of validData) {
    //   weights.push(Math.abs(price.diff) / totalDiff);
    // }

    // for (let i = 0; i < validData.length; i++) {
    //   optimalValue += validData[i].value * weights[i];
    // }
  } else if (validData.length === 2) {
    let sumValue = 0;
    for (let price of validData) {
      sumValue += price.price;
    }
    optimalValue = sumValue / validData.length;
  } else if (validData.length === 1) {
    optimalValue = validData[0].price;
  }

  return [optimalValue, validData.length];
};

export function calculateOptimalOptionIV(data: OptionData[]): [number, number] {
  // validation check
  // 1. value !== 0
  // 2. date !== 0
  // 3. type !== null
  const validData: OptionData[] = data.filter(
    (item) =>
      item.iv !== 0 &&
      item.date !== EMPTY_OPTION_PRICE.date &&
      item.type !== null,
  );

  let optimalIv = 0;

  if (validData.length === 3) {
    validData.sort((a, b) => a.iv - b.iv);
    const midIndex = Math.floor(validData.length / 2);
    optimalIv = validData[midIndex].iv;
  } else if (validData.length === 2) {
    let sumIv = 0;
    for (let price of validData) {
      sumIv += price.iv;
    }
    optimalIv = sumIv / validData.length;
  } else if (validData.length === 1) {
    optimalIv = validData[0].iv;
  }

  return [optimalIv, validData.length];
};

export const getInstrumentPriceInfo = async (url: string, items: string[]) => {

  if (items && items.length == 0) {
    return {}
  }

  try {
    return await fetch(url, {
      // post
      method: 'POST',
      body: JSON.stringify({
        instrument_name_list: items,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
  } catch (e) {
    console.log(e, 'e')
    return {
      marketPrices: {}
    }
  }
}

export type TokenPriceInBits = string;
export type TokenPriceBitArray = string[];

export const getPriceBitArray = (prices: number[]): TokenPriceBitArray => {
  const priceBitArray: string[] = [];
  let shouldExit = false;
  // @ts-ignore
  for (let i = 0; i < parseInt((prices.length - 1) / 8) + 1; i++) {
    let priceBits = new BN("0");
    for (let j = 0; j < 8; j++) {
      const index = i * 8 + j;
      if (index >= prices.length) {
        shouldExit = true;
        break;
      }

      const price = new BN(prices[index]);
      if (price.gt(new BN("2147483648"))) {
        // 2^31
        throw new Error(`price exceeds bit limit ${price.toString()}`);
      }
      priceBits = priceBits.or(price.shln(j * 32));
    }

    priceBitArray.push(priceBits.toString());

    if (shouldExit) {
      break;
    }
  }

  return priceBitArray;
};

// all different instruments format to deribit instrument name format
export const formatInstrument = (exchange: string, id: string) => {

  // deribit, bybit: "ETH-29MAR24-3200-C"
  if (["DERIBIT", "BYBIT"].includes(exchange)) {
    return id
  }

  const splitted = id.split('-')
  
  // okx: "ETH-USD-230929-12000-C"
  if (exchange === "OKX") {
    const currency = splitted[0];
    const expiry = splitted[2];
  
    const year = `20${expiry.slice(0, 2)}`; // Ensure year is in YYYY format for clarity and consistency
    const month = Number(expiry.slice(2, 4));
    const day = Number(expiry.slice(4, 6)); // Convert to Number to remove leading zero
  
    const formattedExpiry = `${day}${MONTHS_MAP[month]}${year.slice(-2)}`; // Use slice(-2) to get last 2 digits of the year
  
    const strikePrice = splitted[3];
    const callPut = splitted[4];
  
    return `${currency}-${formattedExpiry}-${strikePrice}-${callPut}`;
  }

  // binance: "ETH-231229-1000-C"
  if (exchange === "BINANCE") {
    const currency = splitted[0]
    const expiry = splitted[1]

    const year = expiry.slice(0, 2)
    const month = Number(expiry.slice(2, 4))
    const day = expiry.slice(4, 6)

    const formattedExpiry = `${day}${MONTHS_MAP[month]}${year}`

    const strikePrice = splitted[2]
    const callPut = splitted[3]

    return `${currency}-${formattedExpiry}-${strikePrice}-${callPut}`
  }

  // delta exchange: "P-BTC-33000-290923"
  if (exchange === "DELTAEXCHANGE") {
    const callPut = splitted[0]
    const currency = splitted[1]
    const strikePrice = splitted[2]
    const expiry = splitted[3]

    const day = expiry.slice(0, 2)
    const month = Number(expiry.slice(2, 4))
    const year = expiry.slice(4, 6)

    const formattedExpiry = `${day}${MONTHS_MAP[month]}${year}`

    return `${currency}-${formattedExpiry}-${strikePrice}-${callPut}`
  }

  throw new Error("unsupported exchange")
}

export const getOptionKey = (instrumentName: string) => {
  const [symbol, expiryString, strikePrice, _4] = instrumentName.split('-')
  const expiry = convertExpiryDateToTimestampInSec(expiryString);
  const underlyingAssetIndex = UNDERLYING_ASSET_TICKER_TO_INDEX[symbol];
  return zeroPadBytes(
    solidityPacked(
      ["uint16", "uint40", "uint48"],
      [underlyingAssetIndex, expiry, strikePrice]
    ),
    32
  )
}

export const removeCallPutPart = (instrumentName: string) => {
  const [symbol, expiryString, strikePrice, callPut] = instrumentName.split('-')
  return `${symbol}-${expiryString}-${strikePrice}`
}

// timestampInSec to DD-MM-YYYY
export const formatDate = (timestampInSec: number) => {
  const date = new Date(timestampInSec * 1000).toISOString().split("T")[0];
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
};

export const getOptionsInfoFromMarket = (market: IMarket) => {
  return Object.entries(market).reduce((output, [ticker, underlyingAssetData]) => {
    underlyingAssetData.expiries.forEach((expiry: number) => {
      const options = underlyingAssetData.options[expiry];
      Object.entries(options).forEach(([optionType, optionList]) => {
        (optionList as []).forEach(({
          instrument,
          optionId,
          strikePrice,
          markIv,
          markPrice,
          riskPremiumRateForBuy,
          riskPremiumRateForSell,
          delta,
          gamma,
          vega,
          theta,
          volume,
          isOptionAvailable
        }) => {
          output[instrument] = {
            optionId: optionId,
            strikePrice: strikePrice,
            markIv: markIv,
            markPrice: markPrice,
            riskPremiumRateForBuy: riskPremiumRateForBuy,
            riskPremiumRateForSell: riskPremiumRateForSell,
            delta: delta,
            gamma: gamma,
            vega: vega,
            theta: theta,
            volume: volume,
            isOptionAvailable: isOptionAvailable
          };
        });
      });
    });
    return output;
  }, {} as IOptionsInfo);
}

export const getIvCurveFromMarket = (market: IMarket) => {
  return Object.entries(market).reduce((output, [ticker, underlyingAssetData]) => {
    underlyingAssetData.expiries.forEach((expiry: number) => {
      const options = underlyingAssetData.options[expiry];
      Object.entries(options).forEach(([optionType, optionList]) => {
        (optionList as []).forEach(({ instrument, markIv, markPrice }) => {
          output[instrument] = {
            markIv: markIv,
            markPrice: markPrice
          };
        });
      });
    });
    return output;
  }, {} as { [key: string]: { markIv: number, markPrice: number} });
}

// get option id based on index asset, expiry, strike price
export function getOptionId(underlyingAssetIndex: number, expiry: number, strikePrice: number): string {
  return zeroPadBytes(
    solidityPacked(
      ["uint16", "uint40", "uint48"],
      [underlyingAssetIndex, expiry, strikePrice]
    ),
    32
  );
}
