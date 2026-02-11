import { SupportedChains } from "../constants/networks";
import { InstrumentMarkData, MarkIvAndPrice, OptionsMarketData } from "../types/mark-iv-price";
import { calculateMarkPrice } from "./blackscholes";
import { BN } from "./bn";
import { parseInstrument } from "./instrument";
import {
  generateOptionTokenData,
  getMainOptionName,
  getPairedOptionName,
  parseOptionTokenId,
} from "./options";

export const getMarkIvAndPriceByInstrument = (
  instrument: string,
  instrumentMarkData: Record<string, MarkIvAndPrice>,
  underlyingFutures: number
) => {
  // if the instrument is already in the instrumentMarkData, return the markIv and markPrice
  if (
    instrumentMarkData[instrument] &&
    instrumentMarkData[instrument].markIv !== null &&
    instrumentMarkData[instrument].markPrice !== null
  ) {
    return {
      markIv: instrumentMarkData[instrument].markIv,
      markPrice: instrumentMarkData[instrument].markPrice,
    };
  }

  const { underlyingAsset, expiry, strikePrice, optionDirection } = parseInstrument(instrument);

  // filter instruments that have the same underlyingAsset, expiry, and optionDirection and sort by strikePrice
  const filteredInstruments = Object.keys(instrumentMarkData)
    .filter((key) => {
      const {
        underlyingAsset: keyUnderlyingAsset,
        expiry: keyExpiry,
        optionDirection: keyOptionDirection,
      } = parseInstrument(key);
      return (
        underlyingAsset === keyUnderlyingAsset &&
        expiry === keyExpiry &&
        optionDirection === keyOptionDirection
      );
    })
    .sort((a, b) => {
      const { strikePrice: aStrikePrice } = parseInstrument(a);
      const { strikePrice: bStrikePrice } = parseInstrument(b);
      return new BN(aStrikePrice).minus(new BN(bStrikePrice)).toNumber();
    });

  if (filteredInstruments.length === 0) {
    return {
      markIv: 0,
      markPrice: 0,
    };
  }

  const estimatedMarkIv = getMarkIvFromFilteredInstruments(
    strikePrice,
    filteredInstruments,
    instrumentMarkData,
    underlyingFutures
  );

  const estimatedMarkPrice = calculateMarkPrice({
    underlyingFutures,
    strikePrice,
    iv: estimatedMarkIv,
    fromTime: Math.floor(Date.now() / 1000),
    expiry: expiry,
    isCall: optionDirection === "Call",
  })

  return {
    markIv: estimatedMarkIv,
    markPrice: estimatedMarkPrice,
  }
};

// support vanilla, and spread option
export const getMarkIvAndPriceByOptionTokenId = (
  chain: SupportedChains,
  optionTokenId: bigint,
  instrumentMarkData: Record<string, MarkIvAndPrice>,
  underlyingFutures: number
) => {
  const { length } = parseOptionTokenId(optionTokenId);
  const { optionNames } = generateOptionTokenData(chain, optionTokenId); // optionNames = "BTC-2021-06-25-40000-C,BTC-2021-06-25-40000-C,,,"
  const mainOptionName = getMainOptionName(optionTokenId, optionNames);

  if (length === 1) {
    return getMarkIvAndPriceByInstrument(mainOptionName, instrumentMarkData, underlyingFutures);
  } else if (length === 2) {
    const mainOptionMarkIvAndPrice = getMarkIvAndPriceByInstrument(
      mainOptionName,
      instrumentMarkData,
      underlyingFutures
    );
    const pairedOptionName = getPairedOptionName(optionTokenId, optionNames);
    const pairedOptionMarkIvAndPrice = getMarkIvAndPriceByInstrument(
      pairedOptionName,
      instrumentMarkData,
      underlyingFutures
    );
    return calculateSpreadMarkIvAndPrice(mainOptionMarkIvAndPrice, pairedOptionMarkIvAndPrice);
  }
};

export const calculateSpreadMarkIvAndPrice = (
  mainOptionMarkIvAndPrice: { markIv: number; markPrice: number },
  pairedOptionMarkIvAndPrice: { markIv: number; markPrice: number }
) => {
  return {
    markIv: (mainOptionMarkIvAndPrice.markIv + pairedOptionMarkIvAndPrice.markIv) / 2,
    markPrice: Math.max(mainOptionMarkIvAndPrice.markPrice - pairedOptionMarkIvAndPrice.markPrice, 0),
  };
};

export const getInstrumentMarkDataFromMarket = (optionsMarket: OptionsMarketData) => {
  return Object.entries(optionsMarket).reduce((acc, [underlyingAsset, OptionsMarketItem]) => {
    OptionsMarketItem.expiries.forEach((expiry: number) => {
      const options = OptionsMarketItem.options[expiry];
      Object.entries(options).forEach(([optionDirection, optionDataList]) => {
        (optionDataList as []).forEach(({ instrument, markIv, markPrice }) => {
          acc[instrument] = {
            markIv: markIv,
            markPrice: markPrice,
          };
        });
      });
    });
    return acc;
  }, {} as InstrumentMarkData);
};

const getMarkIvFromFilteredInstruments = (
  targetStrikePrice: number,
  filteredInstruments: string[],
  instrumentMarkData: Record<string, MarkIvAndPrice>,
  underlyingFutures: number
): number => {
  const targetStrikePriceBN = new BN(targetStrikePrice);

  // If strikePrice is less than the smallest available strike
  if (targetStrikePriceBN.lte(new BN(parseInstrument(filteredInstruments[0]).strikePrice))) {
    return instrumentMarkData[filteredInstruments[0]].markIv;
  }

  // If strikePrice is greater than the largest available strike
  if (
    targetStrikePriceBN.gte(
      new BN(parseInstrument(filteredInstruments[filteredInstruments.length - 1]).strikePrice)
    )
  ) {
    return instrumentMarkData[filteredInstruments[filteredInstruments.length - 1]].markIv;
  }

  // Find the nearest strikes
  let lowerStrikeInstrument: string = "";
  let upperStrikeInstrument: string = "";

  for (let i = 0; i < filteredInstruments.length - 1; i++) {
    const currentStrikePrice = new BN(parseInstrument(filteredInstruments[i]).strikePrice);
    const nextStrikePrice = new BN(parseInstrument(filteredInstruments[i + 1]).strikePrice);

    if (targetStrikePriceBN.gt(currentStrikePrice) && targetStrikePriceBN.lte(nextStrikePrice)) {
      lowerStrikeInstrument = filteredInstruments[i];
      upperStrikeInstrument = filteredInstruments[i + 1];
      break;
    }
  }

  const lowerStrikeBN = new BN(parseInstrument(lowerStrikeInstrument).strikePrice);
  const upperStrikeBN = new BN(parseInstrument(upperStrikeInstrument).strikePrice);

  // First, check if the strikePrice is closer to one of the bounds
  const distanceToLower = targetStrikePriceBN.minus(lowerStrikeBN).abs();
  const distanceToUpper = targetStrikePriceBN.minus(upperStrikeBN).abs();

  if (distanceToLower.lt(distanceToUpper)) {
    return instrumentMarkData[lowerStrikeInstrument].markIv;
  } else if (distanceToLower.gt(distanceToUpper)) {
    return instrumentMarkData[upperStrikeInstrument].markIv;
  } else {
    // If equidistant, use underlyingFutures to determine which direction to go
    if (new BN(underlyingFutures).lte(new BN(targetStrikePriceBN))) {
      return instrumentMarkData[lowerStrikeInstrument].markIv;
    } else {
      return instrumentMarkData[upperStrikeInstrument].markIv;
    }
  }
}