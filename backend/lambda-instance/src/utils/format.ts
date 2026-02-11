import BN from 'bn.js'
import { solidityPacked, zeroPadBytes } from 'ethers';
import { MONTHS_MAP, MONTHS_MAP_REV } from '../constants'
import { ChainNames, generateOptionTokenData, getMainOptionName, getPairedOptionName, getStrategyByOptionTokenId, isBuyStrategy, isCallStrategy, isVanillaStrategy, UA_INDEX_TO_TICKER, UA_TICKER_TO_INDEX, UnderlyingAssetIndex } from '@callput/shared';

export function generateCexCommonInstrument(optionTokenId: bigint) {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  const strategy = getStrategyByOptionTokenId(optionTokenId);
  const _isNaked = isVanillaStrategy(strategy);
  const _isCall = isCallStrategy(strategy);
  const isBuy = isBuyStrategy(strategy);
  const data = generateOptionTokenData(chainName, optionTokenId);
  const mainOptionName = getMainOptionName(optionTokenId, data.optionNames);
  const pairedOptionName = getPairedOptionName(optionTokenId, data.optionNames);

  const type = _isNaked
    ? _isCall
      ? "Call"
      : "Put"
    : _isCall
      ? "Call Spread"
      : "Put Spread";
  const legs = _isNaked
    ? [mainOptionName]
    : {
      main: (isBuy ? "Buy " : "Sell ") + mainOptionName,
      pair: (isBuy ? "Sell " : "Buy ") + pairedOptionName,
    }
  
  return {
    type,
    legs,
  }
}


//////////////////////////////////
//   Formatting option infos    //
//////////////////////////////////

export function getOptionInstrument(underlyingAssetIndex: UnderlyingAssetIndex, expiry: number, strikePrice: number, isCall: boolean): string {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];
  
  const day = new Date(expiry * 1000).getUTCDate();
  const month = new Date(expiry * 1000).getUTCMonth() + 1;
  const year = String(new Date(expiry * 1000).getUTCFullYear()).slice(2, 4);

  const formattedUnderlyingAsset = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex];
  const formattedExpiry = `${day}${MONTHS_MAP[month]}${year}`;
  const formattedStrikePrice = strikePrice.toString();
  const formattedType = isCall ? 'C' : 'P';

  switch (underlyingAssetIndex) {
    case 1:
      return `${formattedUnderlyingAsset}-${formattedExpiry}-${formattedStrikePrice}-${formattedType}`;
    case 2:
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

export const getInstrumentPriceInfo = async (url, items) => {

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
export const formatInstrument = (exchange, id) => {

  // deribit, bybit: "ETH-29MAR24-3200-C"
  if (["DERIBIT"].includes(exchange)) {
    return id
  }

  const splitted = id.split('-')

  // bybit: 2 cases
  // - ETH-4APR25-4300-C
  // - ETH-4APR25-4300-C-USDT
  if (exchange === 'BYBIT') {
    if (splitted.length <= 4) return id; // 4개 이하면 그대로 반환
    if (splitted[4] === 'USDT') return `${splitted[0]}-${splitted[1]}-${splitted[2]}-${splitted[3]}`; // 5개면 앞의 4개만 사용
    return null;
  }
  
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

export const getOptionKey = (instrumentName) => {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  const [symbol, expiryString, strikePrice, _4] = instrumentName.split('-')
  const expiry = convertExpiryDateToTimestampInSec(expiryString);
  const underlyingAssetIndex = UA_TICKER_TO_INDEX[chainName][symbol];
  return zeroPadBytes(
    solidityPacked(
      ["uint16", "uint40", "uint48"],
      [underlyingAssetIndex, expiry, strikePrice]
    ),
    32
  )
}

export const removeCallPutPart = (instrumentName) => {
  const [symbol, expiryString, strikePrice, callPut] = instrumentName.split('-')
  return `${symbol}-${expiryString}-${strikePrice}`
}