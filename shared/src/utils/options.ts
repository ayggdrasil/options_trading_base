import { getStrategyByIndex, getStrategyByOptionTokenId } from "./strategy";
import { isCallSpreadStrategy, isPutSpreadStrategy } from "./strategy";
import { SupportedChains } from "../constants/networks";
import { InstrumentOptionData, OptionTokenData } from "../types/options";
import { UnderlyingAssetIndex, VaultIndex } from "../types/assets";
import { Strategy, StrategyValue } from "../constants/strategy";
import { MONTHS_MAP } from "../constants/dates";
import { getUnderlyingAssetByIndex } from "./assets";
import { OptionsMarketData } from "../types/mark-iv-price";

export const getInstrumentOptionDataFromMarket = (optionsMarket: OptionsMarketData) => {
  return Object.entries(optionsMarket).reduce((acc, [underlyingAsset, optionsMarketItem]) => {
    optionsMarketItem.expiries.forEach((expiry: number) => {
      const options = optionsMarketItem.options[expiry];
      Object.entries(options).forEach(([optionDirection, optionDataList]) => {
        (optionDataList as []).forEach(
          ({
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
            isOptionAvailable,
            expiry,
          }) => {
            acc[instrument] = {
              instrument: instrument,
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
              isOptionAvailable: isOptionAvailable,
              expiry: expiry,
            };
          }
        );
      });
    });
    return acc;
  }, {} as InstrumentOptionData);
};

export function getMainOptionName(optionTokenId: bigint, optionNames: string): string {
  const strategy = getStrategyByOptionTokenId(optionTokenId);
  const optionNameArr = optionNames.split(",");
  if (isPutSpreadStrategy(strategy)) return optionNameArr[1];
  return optionNameArr[0];
}

export function getPairedOptionName(optionTokenId: bigint, optionNames: string): string {
  const strategy = getStrategyByOptionTokenId(optionTokenId);
  const optionNameArr = optionNames.split(",");
  if (isPutSpreadStrategy(strategy)) return optionNameArr[0];
  if (isCallSpreadStrategy(strategy)) return optionNameArr[1];
  return "";
}

export function getMainOptionStrikePrice(optionTokenId: bigint): number {
  const { strategy, strikePrices } = parseOptionTokenId(optionTokenId);
  if (isPutSpreadStrategy(strategy)) return strikePrices[1];
  return strikePrices[0];
}

export function getPairedOptionStrikePrice(optionTokenId: bigint): number {
  const { strategy, strikePrices } = parseOptionTokenId(optionTokenId);
  if (isPutSpreadStrategy(strategy)) return strikePrices[0];
  if (isCallSpreadStrategy(strategy)) return strikePrices[1];
  return 0;
}

export function getMainOptionGreeksInputData(
  optionTokenId: bigint,
  ivs: number[]
): {
  strikePrice: number;
  iv: number;
  isCall: boolean;
  isBuy: boolean;
} {
  const { strategy, isBuys, strikePrices, isCalls } = parseOptionTokenId(optionTokenId);

  const mainStrikePrice = isPutSpreadStrategy(strategy) ? strikePrices[1] : strikePrices[0];
  const mainIv = isPutSpreadStrategy(strategy) ? ivs[1] : ivs[0];
  const mainIsCall = isPutSpreadStrategy(strategy) ? isCalls[1] : isCalls[0];
  const mainIsBuy = isPutSpreadStrategy(strategy) ? isBuys[1] : isBuys[0];

  return {
    strikePrice: mainStrikePrice,
    iv: mainIv,
    isCall: mainIsCall,
    isBuy: mainIsBuy,
  };
}

export function getPairedOptionGreeksInputData(
  optionTokenId: bigint,
  ivs: number[]
): {
  strikePrice: number;
  iv: number;
  isCall: boolean;
  isBuy: boolean;
} {
  const { strategy, isBuys, strikePrices, isCalls } = parseOptionTokenId(optionTokenId);

  const pairedStrikePrice = isPutSpreadStrategy(strategy) ? strikePrices[0] : strikePrices[1];
  const pairedIv = isPutSpreadStrategy(strategy) ? ivs[0] : ivs[1];
  const pairedIsCall = isPutSpreadStrategy(strategy) ? isCalls[0] : isCalls[1];
  const pairedIsBuy = isPutSpreadStrategy(strategy) ? isBuys[0] : isBuys[1];

  return {
    strikePrice: pairedStrikePrice,
    iv: pairedIv,
    isCall: pairedIsCall,
    isBuy: pairedIsBuy,
  };
}

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
    BigInt(vaultIndex & 0x3); // Adjusted for 2 bits vault index

  return optionTokenId;
}

function determineStrategy(
  length: number,
  isBuys: boolean[],
  strikePrices: number[],
  isCalls: boolean[]
): {
  strategy: StrategyValue;
  isBuys: boolean[];
  strikePrices: number[];
  isCalls: boolean[];
} {
  // Sort the strikePrices array and adjust isBuys and isCalls accordingly
  for (let i = 0; i < strikePrices.length; i++) {
    for (let j = 0; j < strikePrices.length - i - 1; j++) {
      let shouldSwap =
        (strikePrices[j] > strikePrices[j + 1] && strikePrices[j + 1] !== 0) ||
        (strikePrices[j] === 0 && strikePrices[j + 1] !== 0);
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

  // Strategy 값 타입으로 지정
  let strategy: StrategyValue = Strategy.NotSupported;

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

  return { strategy, isBuys, strikePrices, isCalls };
}

export function parseOptionTokenId(optionTokenId: bigint): {
  underlyingAssetIndex: UnderlyingAssetIndex;
  expiry: number;
  strategy: Strategy;
  length: number;
  isBuys: boolean[];
  strikePrices: number[];
  isCalls: boolean[];
  vaultIndex: VaultIndex;
} {
  const underlyingAssetIndex = Number(
    (optionTokenId >> BigInt(240)) & BigInt(0xffff)
  ) as UnderlyingAssetIndex;
  const expiry = Number((optionTokenId >> BigInt(200)) & BigInt(0xffffffffff));
  const strategyIndex = Number((optionTokenId >> BigInt(196)) & BigInt(0xf));
  const strategy = getStrategyByIndex(strategyIndex);

  if (strategy === "NotSupported") {
    console.log("Not supported strategy");
  }

  const length = Number((optionTokenId >> BigInt(194)) & BigInt(0x3)) + 1; // Adjusted for 2 bits length

  let isBuys: boolean[] = [];
  let strikePrices: number[] = [];
  let isCalls: boolean[] = [];

  for (let i = 0; i < 4; i++) {
    isBuys.push(Boolean((optionTokenId >> BigInt(193 - 48 * i)) & BigInt(0x1)));
    strikePrices.push(Number((optionTokenId >> BigInt(147 - 48 * i)) & BigInt(0x3ffffffffff)));
    isCalls.push(Boolean((optionTokenId >> BigInt(146 - 48 * i)) & BigInt(0x1)));
  }

  const vaultIndex = Number(optionTokenId & BigInt(0x3)) as VaultIndex;

  return { underlyingAssetIndex, expiry, strategy, length, isBuys, strikePrices, isCalls, vaultIndex };
}

export function generateOptionTokenData(chain: SupportedChains, optionTokenId: bigint): OptionTokenData {
  const { underlyingAssetIndex, expiry, length, isBuys, strikePrices, isCalls } =
    parseOptionTokenId(optionTokenId);

  const isBuysStr = isBuys.join(",");
  const strikePricesStr = strikePrices.join(",");
  const isCallsStr = isCalls.join(",");

  const formattedIndexAsset: string = getUnderlyingAssetByIndex(chain, underlyingAssetIndex) || "";

  const date = new Date(Number(expiry) * 1000);
  const formattedMonth = MONTHS_MAP[date.getUTCMonth() + 1];
  const formattedYear = (date.getUTCFullYear() % 100).toString().padStart(2, "0");
  const formattedDay = date.getUTCDate().toString();

  const optionNames = isBuys
    .map((isBuy, index) => {
      if (index >= length) return "";

      const formattedStrikePrice = Number(strikePrices[index]).toString();
      const formattedType: string = isCalls[index] ? "C" : "P";

      return `${formattedIndexAsset}-${formattedDay}${formattedMonth}${formattedYear}-${formattedStrikePrice}-${formattedType}`;
    })
    .join(",");

  return {
    length: length,
    isBuys: isBuysStr,
    strikePrices: strikePricesStr,
    isCalls: isCallsStr,
    optionNames: optionNames,
  };
}
