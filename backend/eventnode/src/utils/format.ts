import { Strategy, UnderlyingAssetIndex, VaultIndex } from "./enums";
import { OptionDataStr } from "./interfaces";
import { MONTHS_MAP, UNDERLYING_ASSET_INDEX_TO_TICKER } from "./constants";


//////////////////////////////////
//   OptionTokenId              //
//////////////////////////////////

// Option
// underlyingAssetIndex - 16-bits
// expiry - 40-bits
// strategy - 4-bits

// length - 2-bits (can be 1, 2, 3, 4)

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

// vaultIndex - 2-bits (can be 0, 1, 2, 3)

// Main function to format option token ID
export function formatOptionTokenId(
    underlyingAssetIndex: UnderlyingAssetIndex,
    expiry: number,
    length: number,
    isBuys: boolean[],
    strikePrices: number[],
    isCalls: boolean[],
    sourceVaultIndex: VaultIndex
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
        (BigInt(sourceVaultIndex & 0x3)); // Adjusted for 2 bits vault index

    return optionTokenId;
}

export function determineStrategy(
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
  sourceVaultIndex: VaultIndex
} {
  const underlyingAssetIndex = Number((optionTokenId >> BigInt(240)) & BigInt(0xFFFF));
  const expiry = Number((optionTokenId >> BigInt(200)) & BigInt(0xFFFFFFFFFF));
  const strategy = Number((optionTokenId >> BigInt(196)) & BigInt(0xF));
  if (strategy === Strategy.NotSupported) throw new Error("Invalid strategy");
  
  const length = Number((optionTokenId >> BigInt(194)) & BigInt(0x3)) + 1; // Adjusted for 2 bits length


  let isBuys = [];
  let strikePrices = [];
  let isCalls = [];

  for (let i = 0; i < 4; i++) {
      isBuys.push(Boolean((optionTokenId >> BigInt(193 - 48 * i)) & BigInt(0x1)));
      strikePrices.push(Number((optionTokenId >> BigInt(147 - 48 * i)) & BigInt(0x3FFFFFFFFFF)));
      isCalls.push(Boolean((optionTokenId >> BigInt(146 - 48 * i)) & BigInt(0x1)));
  }

  const sourceVaultIndex = Number(optionTokenId & BigInt(0x3)); // Adjusted for 2 bits vault index

  return { underlyingAssetIndex, expiry, strategy, length, isBuys, strikePrices, isCalls, sourceVaultIndex };
}

export function isBuy(strategy: Strategy) {
  return strategy === Strategy.BuyCall || strategy === Strategy.BuyPut || strategy === Strategy.BuyCallSpread || strategy === Strategy.BuyPutSpread;
}

export function isSell(strategy: Strategy) {
  return strategy === Strategy.SellCall || strategy === Strategy.SellPut || strategy === Strategy.SellCallSpread || strategy === Strategy.SellPutSpread;
}

export function isCall(strategy: Strategy) {
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
    optionNames: optionNames,
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