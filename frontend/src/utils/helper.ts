import { solidityPacked, zeroPadBytes } from "ethers";
import { MONTHS_MAP, MONTHS_MAP_CAPITALIZED, MONTHS_MAP_REV, SELECT_OPTION_PAIR_STRIKE_PRICE_RATE } from "./constants";
import BigNumber from "bignumber.js";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { OlpKey, VaultIndex } from "./enums";
import dayjs from "dayjs";
import { RP_MID_TERM_IN_DAYS, RP_SHORT_TERM_IN_DAYS } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export const copyToClipboard = async (str: string) => {
  if (typeof window === "undefined") {
    return;
  }

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(str);
  } else {
    let textArea = document.createElement("textarea");
    textArea.value = str;

    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Unable to copy to clipboard", err);
    }
  }
};

// 주소를 0x1234...5678 형태로 변환하는 함수
export function shortenAddress(address: `0x${string}` | undefined | null, startLength = 6, endLength = 4) {
  if (!address) return "";
  return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
}

// 주소를 0x12345678xx..xx => User-123456 형태로 변환하는 함수
export function defaultUserName(address: `0x${string}`|undefined) {
  if (!address) {
    return ""
  } else {
    return "User-" + address.slice(2).slice(0,6)
  }
}

// 유저이름을 잘라내는 함수
export function shortenUserName(name: string, endLength = 12) {
  if (!name) return "";
  // Check if the length of the name exceeds the endLength
  if (name.length > endLength) {
    return `${name.substring(0, endLength)}..`;
  }
  
  // If name length is within the endLength, return as is
  return name;
}


// 숫자를 소수점 이하 n자리까지 표시하는 함수
export function truncateDecimalNumber(numString: string | undefined | null, decimalPlaces: number) {
  if (!numString) return "";
  const num = parseFloat(numString);
  return (Math.floor(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces)).toFixed(decimalPlaces);
}

export function convertExpiryDateToISOString(expiry: string) {
  const day = expiry.length === 6 ? '0' + expiry.charAt(0) : expiry.substring(0, 2);
  const monthAbbrev = expiry.substring(expiry.length - 5, expiry.length - 2).toUpperCase();
  const year = "20" + expiry.substring(expiry.length - 2);

  const month = MONTHS_MAP_REV[monthAbbrev];

  const formattedMonth = month.toString().padStart(2, '0');
  const formattedDay = day.padStart(2, '0');

  return `${year}-${formattedMonth}-${formattedDay}`;
}

// TimestampInSeconds를 "DD MMM YYYY" 형태로 변환하는 함수
export function formatDate(timestampInSeconds: string): string {
  const parsedTimestampInSeconds = Number(timestampInSeconds);

  if (isNaN(parsedTimestampInSeconds)) return "-";

  const date = new Date(parsedTimestampInSeconds * 1000);

  const day = date.getDate(); // 날짜
  const month = MONTHS_MAP[date.getMonth() + 1]; // 월 (0-11)
  const year = date.getFullYear(); // 년

  return `${day} ${month} ${year}`;
}

// TimestampInSeconds를 "DD Mmm YYYY" 형태로 변환하는 함수
export function formatDateDDMmmYYYY(timestampInSeconds: string): string {
  const parsedTimestampInSeconds = Number(timestampInSeconds);

  if (isNaN(parsedTimestampInSeconds)) return "-";

  const date = new Date(parsedTimestampInSeconds * 1000);

  const day = date.getDate(); // 날짜
  const monthCapitalized = MONTHS_MAP_CAPITALIZED[date.getMonth() + 1]; // 월 (0-11)
  const year = date.getFullYear(); // 년

  return `${day} ${monthCapitalized} ${year}`;
}

// TimestampInSeconds를 "DD MMM" 형태로 변환하는 함수
export function formatDateDDMMM(timestampInSeconds: string): string {
  const parsedTimestampInSeconds = Number(timestampInSeconds);

  if (isNaN(parsedTimestampInSeconds)) return "-";

  const date = new Date(parsedTimestampInSeconds * 1000);

  const day = date.getDate(); // 날짜
  const month = MONTHS_MAP[date.getMonth() + 1]; // 월 (0-11)

  return `${day} ${month}`;
}

// TimestampInSeconds를 "DDMMMYY" 형태로 변환하는 함수
export function formatDDMMMYY(timestampInSeconds: string): string {
  const parsedTimestampInSeconds = Number(timestampInSeconds);

  if (isNaN(parsedTimestampInSeconds)) return "-";

  const date = new Date(parsedTimestampInSeconds * 1000);

  const day = date.getDate(); // 날짜
  const month = MONTHS_MAP[date.getMonth() + 1]; // 월 (0-11)
  const year = date.getFullYear(); // 년

  return `${day}${month}${year
    .toString()
    .substring(year.toString().length - 2)}`;
}

// TimestampInSeconds를 "DD MMM YYYY, HH:MM" 형태로 변환하는 함수
export function formatDateWithTime(timestampInSeconds: string): string {
  const parsedTimestampInSeconds = Number(timestampInSeconds);

  if (isNaN(parsedTimestampInSeconds)) return "-";

  const date = new Date(parsedTimestampInSeconds * 1000);

  const day = date.getDate();
  const month = MONTHS_MAP[date.getMonth() + 1];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

// Timestamp를 10am, Jun 12 형태로 변환하는 함수
export function formatReadableDate(timestamp: string, includeTime: boolean, includeYear = false): string {
  const date = new Date(Number(timestamp) * 1000);

  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    month: 'short',
    year: 'numeric',
    day: 'numeric'
  };

  const formattedDate = dayjs(date).format('MMM DD, YYYY, hh:mm')

  // formattedDate 예시: "Jun 12, 10:00 AM"
  const [monthDay, year, time] = formattedDate.split(',');

  const [empty, timeStr, amPm] = time.split(' ');

  if (!includeTime) return includeYear 
    ? `${year}, ${monthDay}`
    : `${monthDay}`;

  return includeYear 
    ? `${year}, ${monthDay}, ${timeStr}`
    : `${monthDay}, ${timeStr}`
}

export function toFixedNoRounding(num: number, fixed: number): string {
  const multiplier = Math.pow(10, fixed);
  const wholeNumber = Math.floor(num * multiplier);
  const result = (wholeNumber / multiplier).toFixed(fixed);
  return result;
}

export function toFixedNoRoundingBN(value: BigNumber, decimals: number): string {
  const factor = new BigNumber(10).pow(decimals);
  return value.multipliedBy(factor).integerValue(BigNumber.ROUND_FLOOR).dividedBy(factor).toString();
}

export function formatNumber(num: number, decimal: number, shouldTrimZero: boolean = false, shouldRound: boolean = false): string {
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

  if (isNaN(num)) return `${sign} -`;

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

export function advancedFormatBigNumber(num: number, shouldTrimZero: boolean = false): string {
  if (num < 1000) {
    return advancedFormatNumber(num, 0, "", shouldTrimZero);
  } else if (num < 1000000) {
    return advancedFormatNumber(num / 1000, 1, "", shouldTrimZero) + "K";
  } else if (num < 1000000000) {
    return advancedFormatNumber(num / 1000000, 1, "", shouldTrimZero) + "M";
  } else {
    return advancedFormatNumber(num / 1000000000, 1, "", shouldTrimZero) + "B";
  }
}

// Order Price와 Current Price 기준으로 ROI 계산하는 함수
export function calculateROI(totalValue: number, totalCost: number): number {
  if (totalValue === 0 || totalCost === 0) return 0;
  const roi = BigNumber(totalValue).minus(totalCost).dividedBy(totalCost).multipliedBy(100).toNumber();
  return roi;
}

// Order Price, Current Price, 그리고 Qty 기준으로 PnL 계산하는 함수
export function calculatePnL(currentPrice: number, orderPrice: number, qty: number): number {
  const pnl = BigNumber(currentPrice).minus(orderPrice).multipliedBy(qty).toNumber();
  return pnl;
}

export const positionValuation = (currentPrice: number, entryPrice: number, quantity: number) => {
  const input = new BigNumber(entryPrice).multipliedBy(quantity).toNumber();
  const output = new BigNumber(currentPrice).multipliedBy(quantity).toNumber();
  const pnl = output - input;
  const roi = (pnl / input) * 100;
  return { input, output, pnl, roi };
};

export const calculatePnlAndRoi = (currentPrice: number, entryPrice: number, quantity: number) => {
  const input = new BigNumber(entryPrice).multipliedBy(quantity).toNumber();
  const output = new BigNumber(currentPrice).multipliedBy(quantity).toNumber();

  const pnl = output - input;
  const roi = (pnl / input) * 100;

  return { pnl, roi };
};

// Calculates the estimated IV based on the current IV, price change, and Vega value
export function calculateEstimatedIV(
  currentIV: number,
  markPrice: number,
  changedPrice: number,
  vega: number,
  isLong: boolean
): number {
  const priceChange = Math.abs(markPrice - changedPrice);
  let estimatedIV = currentIV;

  if (isLong) {
    estimatedIV = currentIV * (1 + (priceChange / vega / 100));
  } else {
    estimatedIV = currentIV * (1 - (priceChange / vega / 100));
  }

  estimatedIV = Math.max(0, Math.min(estimatedIV, 3));

  return estimatedIV;
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

export function getExpirationFromDays(days: number): number {
  const nowTimestamp = Date.now();
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const expirationTimestamp = nowTimestamp + (days * millisecondsPerDay);
  return Math.floor(expirationTimestamp / 1000);
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

export function timeSince(timestampInSec: number) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const seconds = currentTimestamp - timestampInSec;

  let interval = seconds / 31536000; // Number of seconds in a year
  if (interval > 1) {
      return Math.floor(interval) + "y";
  }

  interval = seconds / 2592000; // Number of seconds in a month
  if (interval > 1) {
      return Math.floor(interval) + "m";
  }

  interval = seconds / 86400; // Number of seconds in a day
  if (interval > 1) {
      return Math.floor(interval) + "d";
  }

  interval = seconds / 3600; // Number of seconds in an hour
  if (interval > 1) {
      return Math.floor(interval) + "h";
  }

  interval = seconds / 60; // Number of seconds in a minute
  if (interval > 1) {
      return Math.floor(interval) + "m";
  }

  return Math.floor(seconds) + "s";
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

// get index asset, expiry, strike price based on option id
export function parseOptionId(optionId: string) {
  const underlyingAssetIndex = parseInt(optionId.substring(2, 6), 16); // Adjusted offsets for "0x"
  const expiry = parseInt(optionId.substring(6, 16), 16); // Adjusted offsets for the next 5 bytes
  const strikePrice = parseInt(optionId.substring(16, 28), 16); // Adjusted offsets for the next 6 bytes

  return {
    underlyingAssetIndex,
    expiry,
    strikePrice
  };
}

export function getPairedOptionStrikePriceByTermV2(
  expiry: number,
  mainOptionStrikePrice: number,
  pairedOptionStrikePrices: IOptionDetail[],
  isCall: boolean
): number {
  const daysToExpiration = getDaysToExpiration(expiry);

  let selectPairedOptionStrikePriceRate;

  if (daysToExpiration <= RP_SHORT_TERM_IN_DAYS) {
    selectPairedOptionStrikePriceRate = SELECT_OPTION_PAIR_STRIKE_PRICE_RATE[0];
  } else if (daysToExpiration <= RP_MID_TERM_IN_DAYS) {
    selectPairedOptionStrikePriceRate = SELECT_OPTION_PAIR_STRIKE_PRICE_RATE[1];
  } else {
    selectPairedOptionStrikePriceRate = SELECT_OPTION_PAIR_STRIKE_PRICE_RATE[2];
  }

  let pairedIndex;

  if (isCall) {
    const standardStrikePrice = mainOptionStrikePrice * (1 + selectPairedOptionStrikePriceRate)
    pairedIndex = pairedOptionStrikePrices.findIndex((option) => option.strikePrice >= standardStrikePrice)
    if (pairedIndex < 0) pairedIndex = pairedOptionStrikePrices.length - 1;
  } else {
    const standardStrikePrice = mainOptionStrikePrice * (1 - selectPairedOptionStrikePriceRate);
    // 역순으로 조건을 만족하는 인덱스 찾기
    pairedIndex = -1; // 초기 값은 -1로 설정
    for (let i = pairedOptionStrikePrices.length - 1; i >= 0; i--) {
      if (pairedOptionStrikePrices[i].strikePrice <= standardStrikePrice) {
        pairedIndex = i;
        break; // 조건을 만족하는 첫 번째 요소를 찾으면 반복문 종료
      }
    }
    // 조건을 만족하는 요소를 찾지 못했다면, 0을 사용
    if (pairedIndex < 0) pairedIndex = 0;
  }

  return pairedIndex;
}

export function capitalizeFirstLetter(target: string) {
  return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
};

export const getPlusMinusColor = (value: number | null) => {
  if (!value) return "text-whitee0";
  return value > 0 ? "text-[#63E073]" : "text-[#E03F3F]";
}

export const calculateMaxPayoff = (mainStrikePrice: number, pairedStrikePrice: number, size: number) => {
  return Math.abs(mainStrikePrice - pairedStrikePrice) * size;
}

export function getOlpKeyByVaultIndex(vaultIndex: VaultIndex) {
  if (vaultIndex === VaultIndex.sVault) return OlpKey.sOlp
  if (vaultIndex === VaultIndex.mVault) return OlpKey.mOlp
  if (vaultIndex === VaultIndex.lVault) return OlpKey.lOlp
  throw new Error("Invalid vault index");
}

export const getLeverageText = (leverage: number) => {
  const B_999 = 999_000_000_000
  if (leverage >= B_999) return "999B+"

  return advancedFormatBigNumber(leverage, true)
} 