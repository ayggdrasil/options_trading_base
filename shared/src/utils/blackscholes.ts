import { getDaysToExpiration, getYearsBetweenUnixTimestamps, getYearsToExpiration } from "./dates";
import {
  Greeks,
  GreeksInputData,
  MarkPriceInputData,
  MarkPriceProfitInputData,
  OptionDirection,
  OptionRiskPremiumInputData,
  OrderSide,
} from "../types/options";
import {
  CALL_PUT_RATIO,
  MUL_RATIO,
  OLP_STANDARD_SIZES,
  TOTAL_RATIO,
  UNDERLYING_ASSET_RATIO,
  UNIT_PERCENTAGE_MAX_RATE,
  UNIT_PERCENTAGE_MIN_RATE,
  UR_INITIAL_MULTIPLIER,
  UR_MAX_VALUE,
  UR_THRESHOLD,
} from "../constants/blackscholes";
import {
  RP_MAX_RATE_FOR_SHORT_TERM,
  RP_MID_TERM_IN_DAYS,
  RP_MUL_ARRAY,
  RP_SHORT_TERM_IN_DAYS,
  RP_WEIGHT_V3,
} from "../constants/risk-premiums";
import {
  getOppositeStrategy,
  getStrategy,
  isBuyStrategy,
  isSellStrategy,
  isVanillaStrategy,
} from "./strategy";
import { NetworkQuoteAsset, UnderlyingAsset } from "../constants/assets";
import { SupportedChains } from "../constants/networks";
import { FEE_RATES, TRADE_FEE_CALCULATION_LIMIT_RATE } from "../constants/fees";
import { BN } from "./bn";
import { Strategy } from "../constants/strategy";
import { getMarkPrice } from "./mark-price";
import { OlpKey } from "../types/olp";
import { generateStrikePriceArr } from "./strike-price";
import { convertQuoteAssetToNormalizedSpotAsset } from "./assets";
import { AllNetworkQuoteAsset, NetworkQuoteAssetKey } from "../types/assets";
import { FuturesAssetIndexMap, SpotAssetIndexMap } from "../types/indices";
import { RiskFreeRateCollection } from "../types/risk-free-rates";
import { UA_TICKER_TO_DECIMAL } from "../constants/asset-mapping";
import { QA_TICKER_TO_DECIMAL } from "../constants/asset-mapping";

export type CalculateRiskPremiumRateParams = {
  underlyingAsset: UnderlyingAsset;
  expiry: number;
  isOpen: boolean;
  orderSide: OrderSide;
  optionDirection: OptionDirection;
  mainOption: OptionRiskPremiumInputData;
  pairedOption: OptionRiskPremiumInputData | null;
  size: number;
  underlyingFutures: number;
  underlyingAssetSpotIndex: number;
  underlyingAssetVolatilityScore: number;
  olpKey: OlpKey;
  olpGreeks: Greeks;
  olpUtilityRatio: any;
};

export const calculateRiskPremiumRate = ({
  underlyingAsset,
  expiry,
  isOpen,
  orderSide,
  optionDirection,
  mainOption,
  pairedOption,
  size,
  underlyingFutures,
  underlyingAssetSpotIndex,
  underlyingAssetVolatilityScore,
  olpKey,
  olpGreeks,
  olpUtilityRatio,
}: CalculateRiskPremiumRateParams) => {
  const daysToExpiration = getDaysToExpiration(expiry);
  const isBuy = orderSide === "Buy";
  const isCall = optionDirection === "Call";

  const { greeks: newTradeGreeks, moneyness: newTradeMoneyness } = calculateGreeksAndMoneyness({
    expiry,
    isBuy,
    isCall,
    mainOption,
    pairedOption,
    size: size,
    underlyingFutures,
  });

  const nextOlpUtilityRatio = getNextOlpUtilityRatio({
    isOpen,
    isBuy,
    isCall,
    mainOption,
    pairedOption,
    size,
    underlyingAssetSpotIndex,
    olpKey,
    olpUtilityRatio,
  });

  const result = {
    RP_rate: 0,
    g0Greeks: olpGreeks,
    newTradeGreeks: newTradeGreeks,
    newTradeMoneyness: newTradeMoneyness,
    nextOlpUtilityRatio: nextOlpUtilityRatio,
    G1_delta: 0,
    G1_vega: 0,
    G1_theta: 0,
    UG_delta: 0,
    UG_vega: 0,
    UG_theta: 0,
    ur1: 0,
    urMultiplier: 0,
  };

  const G0 = [olpGreeks.delta, olpGreeks.vega, olpGreeks.theta];
  const G1 = isOpen
    ? [
        // Open Position인 경우, newTradeGreeks의 반대 방향으로 열림
        olpGreeks.delta - newTradeGreeks.delta,
        olpGreeks.vega - newTradeGreeks.vega,
        olpGreeks.theta - newTradeGreeks.theta,
      ]
    : [
        // Close Position인 경우, newTradeGreeks와 같은 방향으로 열림
        olpGreeks.delta + newTradeGreeks.delta,
        olpGreeks.vega + newTradeGreeks.vega,
        olpGreeks.theta + newTradeGreeks.theta,
      ];

  result.G1_delta = G1[0];
  result.G1_vega = G1[1];
  result.G1_theta = G1[2];

  const olpDv: number = olpUtilityRatio[olpKey].depositedUsd;
  if (olpDv === 0 || underlyingFutures === 0) return result;

  // Unit percentage 계산하는 부분
  const UP = [
    G0[0] !== 0
      ? Math.min(Math.max(Math.abs(G1[0] / G0[0]), UNIT_PERCENTAGE_MIN_RATE), UNIT_PERCENTAGE_MAX_RATE)
      : UNIT_PERCENTAGE_MAX_RATE,
    G0[1] !== 0
      ? Math.min(Math.max(Math.abs(G1[1] / G0[1]), UNIT_PERCENTAGE_MIN_RATE), UNIT_PERCENTAGE_MAX_RATE)
      : UNIT_PERCENTAGE_MAX_RATE,
    G0[2] !== 0
      ? Math.min(Math.max(Math.abs(G1[2] / G0[2]), UNIT_PERCENTAGE_MIN_RATE), UNIT_PERCENTAGE_MAX_RATE)
      : UNIT_PERCENTAGE_MAX_RATE,
  ];

  // scalFac 계산하는 부분
  let scalFac = 1;

  if (olpDv < OLP_STANDARD_SIZES[0]) {
    scalFac = OLP_STANDARD_SIZES[0] / olpDv;
  } else if (olpDv >= OLP_STANDARD_SIZES[0] && olpDv < OLP_STANDARD_SIZES[1]) {
    scalFac = OLP_STANDARD_SIZES[1] / olpDv;
  } else if (olpDv >= OLP_STANDARD_SIZES[1] && olpDv < OLP_STANDARD_SIZES[2]) {
    scalFac = OLP_STANDARD_SIZES[2] / olpDv;
  } else if (olpDv >= OLP_STANDARD_SIZES[2] && olpDv < OLP_STANDARD_SIZES[3]) {
    scalFac = OLP_STANDARD_SIZES[3] / olpDv;
  } else if (olpDv >= OLP_STANDARD_SIZES[3] && olpDv < OLP_STANDARD_SIZES[4]) {
    scalFac = OLP_STANDARD_SIZES[4] / olpDv;
  }

  scalFac = Math.max(1, Math.min(scalFac, 10));

  // Unit greeks 계산하는 부분
  const UG = [
    Math.sqrt(underlyingFutures * 0.01 * Math.abs(G1[0]) * scalFac) * UP[0], // Unit Delta
    Math.sqrt(Math.abs(G1[1] * scalFac) / (underlyingFutures * 0.01)) * UP[1], // Unit Vega
    Math.sqrt(Math.abs(G1[2] * scalFac) / (underlyingFutures * 0.01)) * UP[2], // Unit Theta
  ];

  result.UG_delta = UG[0];
  result.UG_vega = UG[1];
  result.UG_theta = UG[2];

  if (daysToExpiration <= 0) return result;

  // rp_greeks 계산하는 부분
  let rpGreeks: number[] = [];
  for (let i = 0; i < 3; i++) {
    const rpGreek = Math.abs(UG[i]) * getWeightByTermV3(underlyingAsset, daysToExpiration, i);

    if (G0[i] * G1[i] >= 0 && Math.abs(G0[i]) >= Math.abs(G1[i])) {
      //Direction = Minus
      rpGreeks.push(rpGreek * 0.1);
    } else {
      //Direction = Plus
      rpGreeks.push(rpGreek);
    }
  }

  // rp 계산하는 부분
  const UR0 = Math.min(
    olpUtilityRatio[olpKey].depositedUsd === 0
      ? 0
      : new BN(olpUtilityRatio[olpKey].utilizedUsd).div(olpUtilityRatio[olpKey].depositedUsd).toNumber(),
    UR_MAX_VALUE
  );
  const UR1 = Math.min(
    nextOlpUtilityRatio[olpKey].depositedUsd === 0
      ? 0
      : new BN(nextOlpUtilityRatio[olpKey].utilizedUsd)
          .div(nextOlpUtilityRatio[olpKey].depositedUsd)
          .toNumber(),
    UR_MAX_VALUE
  );

  const baseRp = rpGreeks.reduce((acc, cur) => acc + cur, 0);
  const rpMultipier = calculateRpMultiplier(newTradeMoneyness, daysToExpiration);
  const urMultiplier = calculateUrMultiplier(UR0, UR1);

  result.ur1 = UR1;
  result.urMultiplier = urMultiplier;

  const rpRateForBuy =
    TOTAL_RATIO *
    baseRp *
    rpMultipier *
    urMultiplier *
    UNDERLYING_ASSET_RATIO[underlyingAsset] *
    CALL_PUT_RATIO[optionDirection];
  const rpRateForSell = Math.min(rpRateForBuy, RP_MAX_RATE_FOR_SHORT_TERM);
  const volatilityScoreRate = underlyingAssetVolatilityScore / 100;

  // @desc:
  // 1. when Delta's absolute value is increasing
  // 2. when Delta's absolute value is decreasing, but the sign changes
  const isDeltaDirectionPlus = !(G0[0] * G1[0] >= 0 && Math.abs(G0[0]) >= Math.abs(G1[0]));
  
  result.RP_rate =
    (isBuy ? rpRateForBuy : rpRateForSell) +
    (isDeltaDirectionPlus ? volatilityScoreRate : 0);

  return result;
};

export const calculateGreeks = ({
  size, // absolute value
  underlyingFutures,
  strikePrice,
  iv,
  expiry,
  isCall,
  isBuy,
  r = 0,
}: GreeksInputData): Greeks => {
  const yearsToExpiration = getYearsToExpiration(expiry);

  if (size === 0 || underlyingFutures <= 0 || strikePrice <= 0 || iv <= 0 || yearsToExpiration <= 0) {
    return {
      delta: 0,
      gamma: 0,
      vega: 0,
      theta: 0,
    };
  }

  const parsedSize = isBuy ? size : -size;

  // d1: F>K일 확률을 나타내기 위한 매개변수, Call과 Put 동일
  const d1 =
    (Math.log(underlyingFutures / strikePrice) + (r + iv ** 2 / 2) * yearsToExpiration) /
    (iv * Math.sqrt(yearsToExpiration));

  const delta_c = parsedSize * _cumulativeNormalDistribution(d1);
  const delta_p = parsedSize * (_cumulativeNormalDistribution(d1) - 1);

  const gamma =
    (parsedSize * _normalDistribution(d1)) / (underlyingFutures * iv * Math.sqrt(yearsToExpiration));
  const vega =
    (parsedSize * underlyingFutures * Math.sqrt(yearsToExpiration) * _normalDistribution(d1)) / 100;
  const theta = _negativeZeroToZero(
    (-parsedSize *
      ((underlyingFutures * _normalDistribution(d1) * iv) / (2 * Math.sqrt(yearsToExpiration)))) /
      365
  );

  return {
    delta: isCall ? delta_c : delta_p,
    gamma,
    vega,
    theta,
  };
};

export const calculateGreeksAndMoneyness = ({
  expiry,
  isBuy,
  isCall,
  mainOption,
  pairedOption,
  size, // absolute value
  underlyingFutures,
}: {
  expiry: number;
  isBuy: boolean;
  isCall: boolean;
  mainOption: OptionRiskPremiumInputData;
  pairedOption: OptionRiskPremiumInputData | null;
  size: number;
  underlyingFutures: number;
}) => {
  const greeks = {
    delta: 0,
    gamma: 0,
    vega: 0,
    theta: 0,
  };

  const mainOptionGreeksInputData: GreeksInputData = {
    expiry: expiry,
    isBuy: isBuy,
    isCall: isCall,
    strikePrice: mainOption.strikePrice,
    iv: mainOption.markIv || 0,
    size: size,
    underlyingFutures: underlyingFutures,
  };

  const mainOptionGreeks = calculateGreeks(mainOptionGreeksInputData);
  const mainOptionMoneyness = calculateMoneyness([mainOptionGreeksInputData]);

  greeks.delta += mainOptionGreeks.delta;
  greeks.gamma += mainOptionGreeks.gamma;
  greeks.vega += mainOptionGreeks.vega;
  greeks.theta += mainOptionGreeks.theta;

  if (pairedOption) {
    const pairedOptionGreeksInputData: GreeksInputData = {
      expiry: expiry,
      isBuy: !isBuy,
      isCall: isCall,
      strikePrice: pairedOption.strikePrice,
      iv: pairedOption.markIv || 0,
      size: size,
      underlyingFutures: underlyingFutures,
    };

    const pairedOptionGreeks = calculateGreeks(pairedOptionGreeksInputData);

    greeks.delta += pairedOptionGreeks.delta;
    greeks.gamma += pairedOptionGreeks.gamma;
    greeks.vega += pairedOptionGreeks.vega;
    greeks.theta += pairedOptionGreeks.theta;
  }

  return {
    greeks: greeks,
    moneyness: mainOptionMoneyness,
  };
};

export const calculateUnderlyingFutures = (
  underlyingAsset: UnderlyingAsset,
  expiry: number,
  futuresAssetIndexMap: FuturesAssetIndexMap,
  riskFreeRateCollection: RiskFreeRateCollection
) => {
  // Initialize riskFreeRate
  const upperBound = 0.18;
  const lowerBound = 0.03;
  let riskFreeRate = (upperBound + lowerBound) / 2;

  // Extract rates for the specific underlying asset
  const expiryToRiskFreeRateMap = riskFreeRateCollection[underlyingAsset];

  if (Object.keys(expiryToRiskFreeRateMap).length > 0) {
    // Convert expiry keys to numbers and sort them
    const expiries = Object.keys(expiryToRiskFreeRateMap)
      .map(Number)
      .sort((a, b) => a - b);

    // Find the first expiry that is greater than or equal to the provided expiry
    const selectedExpiry = expiries.find((e) => e >= expiry);

    // If no expiry is found that is greater than or equal, select the largest one (the last element)
    const effectiveExpiry = selectedExpiry !== undefined ? selectedExpiry : expiries[expiries.length - 1];

    const effectiveRate = expiryToRiskFreeRateMap[effectiveExpiry];

    // Use the rate corresponding to the selected or effective expiry
    riskFreeRate = Math.max(Math.min(effectiveRate, upperBound), lowerBound);
  }

  // Calculate years to expiration
  const yearsToExpiration = getYearsToExpiration(expiry);

  // Calculate the underlying futures value
  const futuresIndex = futuresAssetIndexMap[underlyingAsset];
  const underlyingFutures = futuresIndex * (1 + riskFreeRate * yearsToExpiration);

  return underlyingFutures;
};

export const calculateMarkPrice = ({
  underlyingFutures,
  strikePrice,
  iv,
  fromTime,
  expiry,
  isCall,
  r = 0,
}: MarkPriceInputData) => {
  const yearsToExpiration = getYearsBetweenUnixTimestamps(fromTime, expiry);

  if (underlyingFutures <= 0 || strikePrice <= 0 || iv <= 0 || yearsToExpiration <= 0) {
    return 0;
  }

  const d1 =
    (Math.log(underlyingFutures / strikePrice) + 0.5 * Math.pow(iv, 2) * yearsToExpiration) /
    (iv * Math.sqrt(yearsToExpiration));
  const d2 = d1 - iv * Math.sqrt(yearsToExpiration);

  let markPrice = 0;

  if (isCall) {
    markPrice =
      underlyingFutures * _cumulativeNormalDistribution(d1) -
      strikePrice * Math.exp(-r * yearsToExpiration) * _cumulativeNormalDistribution(d2);
  } else {
    markPrice =
      strikePrice * Math.exp(-r * yearsToExpiration) * _cumulativeNormalDistribution(-d2) -
      underlyingFutures * _cumulativeNormalDistribution(-d1);
  }

  return markPrice;
};

export const calculateUnitCollateralAmount = ({
  network,
  underlyingAsset,
  strategy,
  strikePrices,
  spotAssetIndexMap,
}: {
  network: SupportedChains;
  underlyingAsset: UnderlyingAsset;
  strategy: Strategy;
  strikePrices: number[];
  spotAssetIndexMap: SpotAssetIndexMap;
}) => {
  if (isBuyStrategy(strategy)) return null;

  if (strategy === "SellCall") {
    // UnderlyAsset
    return new BN(10).pow(UA_TICKER_TO_DECIMAL[network][underlyingAsset]).toNumber();
  }

  let collateralUsd = 0;

  if (strategy === "SellPut") {
    // USDC
    collateralUsd = strikePrices[0];
  }

  if (strategy === "SellCallSpread" || strategy === "SellPutSpread") {
    // USDC
    collateralUsd = strikePrices[1] - strikePrices[0];
  }

  return new BN(collateralUsd)
    .div(spotAssetIndexMap[NetworkQuoteAsset[network].USDC])
    .multipliedBy(new BN(10).pow(QA_TICKER_TO_DECIMAL[network][NetworkQuoteAsset[network].USDC]))
    .toNumber();
};

export const calculateCollateralUsd = ({
  strategy,
  strikePrices,
  size,
  underlyingAssetSpotIndex,
}: {
  strategy: Strategy;
  strikePrices: number[];
  size: number;
  underlyingAssetSpotIndex: number;
}) => {
  const unitCollateralUsd = calculateUnitCollateralUsd({
    strategy,
    strikePrices,
    underlyingAssetSpotIndex,
  });
  return new BN(unitCollateralUsd).multipliedBy(size).toNumber();
};

// the decimals of size here is zero (different from the decimals of underlyingAsset)
export const calculateEstimatedSizeForOpenPosition = ({
  network,
  underlyingAsset,
  strategy,
  strikePrices,
  markPrice,
  quoteAsset,
  quoteAssetAmount,
  spotAssetIndexMap,
}: {
  network: SupportedChains;
  underlyingAsset: UnderlyingAsset;
  strategy: Strategy;
  strikePrices: number[];
  markPrice: number;
  quoteAsset: AllNetworkQuoteAsset;
  quoteAssetAmount: string;
  spotAssetIndexMap: SpotAssetIndexMap;
}) => {
  // BuyCall, BuyPut, BuyCallSpread, BuyPutSpread => quoteAssetTicker: USDC, decimals: 6
  if (isBuyStrategy(strategy)) {
    const normalizedQuoteAsset = convertQuoteAssetToNormalizedSpotAsset(quoteAsset);

    const amountInUsd = new BN(quoteAssetAmount)
      .div(10 ** QA_TICKER_TO_DECIMAL[network][quoteAsset as NetworkQuoteAssetKey<SupportedChains>])
      .multipliedBy(spotAssetIndexMap[normalizedQuoteAsset])
      .toNumber();

    return new BN(amountInUsd).div(markPrice).toNumber();
  }

  // SellCall => quoteAssetTicker: UnderlyAsset, decimals: 8
  // SellPut, SellCallSpread, SellPutSpread => quoteAssetTicker: USDC, decimals: 6
  if (isSellStrategy(strategy)) {
    const collateralAmount = calculateUnitCollateralAmount({
      network,
      underlyingAsset,
      strategy,
      strikePrices,
      spotAssetIndexMap,
    });

    if (collateralAmount === null) return 0;

    if (strategy === "SellCall") {
      // UnderlyAsset
      return new BN(quoteAssetAmount).div(collateralAmount).toNumber();
    }

    if (strategy === "SellPut" || strategy === "SellCallSpread" || strategy === "SellPutSpread") {
      // USDC
      return new BN(quoteAssetAmount).div(collateralAmount).toNumber();
    }
  }
};

export const calculateOpenPositionFee = ({
  network,
  underlyingAsset,
  strategy,
  markPrice,
  quoteAsset,
  quoteAssetAmount,
  spotAssetIndexMap,
  size,
}: {
  network: SupportedChains;
  underlyingAsset: UnderlyingAsset;
  strategy: Strategy;
  markPrice: number;
  quoteAsset: AllNetworkQuoteAsset;
  quoteAssetAmount: string;
  spotAssetIndexMap: SpotAssetIndexMap;
  size: number;
}) => {
  const underlyingAssetSpotPrice = spotAssetIndexMap[underlyingAsset];

  const feeRate = isVanillaStrategy(strategy)
    ? isBuyStrategy(strategy)
      ? FEE_RATES.OPEN_BUY_NAKED_POSITION
      : FEE_RATES.OPEN_SELL_NAKED_POSITION
    : FEE_RATES.OPEN_COMBO_POSITION;

  const feeValue = new BN(underlyingAssetSpotPrice).multipliedBy(size).multipliedBy(feeRate).toNumber();

  const maxFeeValue = new BN(markPrice)
    .multipliedBy(size)
    .multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE)
    .toNumber();

  const appliedFeeValue = Math.min(feeValue, maxFeeValue);

  const normalizedQuoteAsset = convertQuoteAssetToNormalizedSpotAsset(quoteAsset);

  const quoteAssetSpotPrice = spotAssetIndexMap[normalizedQuoteAsset];

  const feeAmount = new BN(appliedFeeValue)
    .div(quoteAssetSpotPrice)
    .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[network][quoteAsset as NetworkQuoteAssetKey<SupportedChains>])
    .toNumber();

  if (new BN(quoteAssetAmount).lt(new BN(feeAmount))) return 0;

  return new BN(quoteAssetAmount).minus(new BN(feeAmount)).toNumber();
};

export const calculateBlackScholesProfit = ({
  markPriceInputData,
  orderPrice,
  size,
}: MarkPriceProfitInputData): number => {
  if (orderPrice === undefined || size === undefined) {
    return 0;
  }

  let markPrice;
  try {
    markPrice = calculateMarkPrice(markPriceInputData);
  } catch (error) {
    console.log(error);
    return 0;
  }

  const totalOrderPrice = orderPrice * size;
  const profit = markPrice * size - totalOrderPrice;

  return isNaN(profit) ? 0 : profit;
};

export const calculateUrMultiplier = (ur0: number, ur1: number) => {
  if (ur1 < UR_THRESHOLD) return UR_INITIAL_MULTIPLIER;
  if (ur1 !== 0)
    return ((ur1 - UR_THRESHOLD) * (ur1 + 1) + UR_INITIAL_MULTIPLIER) * Math.min(Math.max(ur1 / ur0, 1), 2);
  return ((ur1 - UR_THRESHOLD) * (ur1 + 1) + UR_INITIAL_MULTIPLIER) * 2;
};

const getWeightByTermV3 = (underlyingAsset: UnderlyingAsset, term: number, greekTurnNum: number) => {
  if (term <= RP_SHORT_TERM_IN_DAYS) {
    return RP_WEIGHT_V3[underlyingAsset][0][greekTurnNum];
  } else if (term <= RP_MID_TERM_IN_DAYS) {
    return RP_WEIGHT_V3[underlyingAsset][1][greekTurnNum];
  }

  return RP_WEIGHT_V3[underlyingAsset][2][greekTurnNum];
};

const calculateRpMultiplier = (moneyness: number, dte: number) => {
  if (dte <= 2) {
    return Math.min(
      (RP_MUL_ARRAY[0][0] / MUL_RATIO) * (moneyness + RP_MUL_ARRAY[0][1]) ** 2 + RP_MUL_ARRAY[0][2],
      8
    );
  } else if (dte <= 7) {
    return Math.min(
      (RP_MUL_ARRAY[1][0] / MUL_RATIO) * (moneyness + RP_MUL_ARRAY[1][1]) ** 2 + RP_MUL_ARRAY[1][2],
      8
    );
  }

  return Math.min(
    (RP_MUL_ARRAY[2][0] / MUL_RATIO) * (moneyness + RP_MUL_ARRAY[2][1]) ** 2 + RP_MUL_ARRAY[2][2],
    4
  );
};

const calculateMoneyness = (GreeksInputDataArr: GreeksInputData[]) => {
  let moneyness = 0;

  for (const greeksInputData of GreeksInputDataArr) {
    const greeks = calculateGreeks({
      ...greeksInputData,
      size: 1,
    });
    moneyness += greeks.delta;
  }

  return Math.abs(moneyness);
};

const getNextOlpUtilityRatio = ({
  isOpen,
  isBuy,
  isCall,
  mainOption,
  pairedOption,
  size,
  underlyingAssetSpotIndex,
  olpKey,
  olpUtilityRatio,
}: {
  isOpen: boolean;
  isBuy: boolean;
  isCall: boolean;
  mainOption: OptionRiskPremiumInputData;
  pairedOption: OptionRiskPremiumInputData | null;
  size: number;
  underlyingAssetSpotIndex: number;
  olpKey: OlpKey;
  olpUtilityRatio: any;
}) => {
  const newOlpUtilityRatio = JSON.parse(JSON.stringify(olpUtilityRatio));
  const isVanilla = pairedOption === null;
  const strategy = getStrategy(isBuy, isCall, isVanilla);
  const markPrice = getMarkPrice(mainOption, pairedOption);
  const optionPremium = new BN(markPrice).multipliedBy(size).toNumber();

  // [Open Sell]
  // - poolUsd = poolUsd + collateralUsd - optionPremium
  // - reservedUsd = reservedUsd + collateralUsd
  // - utilizedUsd = utilizedUsd
  // => depositedUsd = poolUsd - reservedUsd + utilizedUsd
  // => depositedUsd = (poolUsd + collateralUsd - optionPremium) - (reservedUsd + collateralUsd) + utilizedUsd
  // => depositedUsd = poolUsd - optionPremium - reservedUsd + utilizedUsd = depositedUsd - optionPremium
  // [Close Buy]
  // - poolUsd = poolUsd - optionPremium
  // - reservedUsd = reservedUsd
  // - utilizedUsd = utilizedUsd
  // => depositedUsd = poolUsd - reservedUsd + utilizedUsd
  // => depositedUsd = (poolUsd - optionPremium) - reservedUsd + utilizedUsd
  // => depositedUsd = poolUsd - optionPremium - reservedUsd + utilizedUsd = depositedUsd - optionPremium
  if (
    (isOpen && !isBuy) || // Open Sell
    (!isOpen && isBuy) // Close Buy
  ) {
    newOlpUtilityRatio[olpKey].depositedUsd = new BN(newOlpUtilityRatio[olpKey].depositedUsd)
      .minus(optionPremium)
      .toNumber();
    return newOlpUtilityRatio;
  }

  const targetStrategy = isOpen ? getOppositeStrategy(strategy) : strategy;
  const strikePrices = generateStrikePriceArr(isCall, mainOption, pairedOption);
  const collateralUsd = calculateCollateralUsd({
    strategy: targetStrategy,
    strikePrices,
    size,
    underlyingAssetSpotIndex,
  });

  // [Open Buy]
  // - poolUsd = poolUsd + optionPremium
  // - reservedUsd = reservedUsd + collateralUsd
  // - utilizedUsd = utilizedUsd + collateralUsd
  // => depositedUsd = poolUsd - reservedUsd + utilizedUsd
  // => depositedUsd = (poolUsd + optionPremium) - (reservedUsd + collateralUsd) + (utilizedUsd + collateralUsd)
  // => depositedUsd = poolUsd + optionPremium - reservedUsd + utilizedUsd = depositedUsd + optionPremium
  if (isOpen) {
    newOlpUtilityRatio[olpKey].utilizedUsd = new BN(newOlpUtilityRatio[olpKey].utilizedUsd)
      .plus(collateralUsd)
      .toNumber();
    newOlpUtilityRatio[olpKey].depositedUsd = new BN(newOlpUtilityRatio[olpKey].depositedUsd)
      .plus(optionPremium)
      .toNumber();
    return newOlpUtilityRatio;
  }

  // [Close Sell - isSourceVault = true]
  // - poolUsd = poolUsd - collateralUsd + optionPremium
  // - reservedUsd = reservedUsd
  // - utilizedUsd = utilizedUsd + collateralUsd
  // => depositedUsd = poolUsd - reservedUsd + utilizedUsd
  // => depositedUsd = (poolUsd - collateralUsd + optionPremium) - reservedUsd + (utilizedUsd + collateralUsd)
  // => depositedUsd = poolUsd + optionPremium - reservedUsd + utilizedUsd = depositedUsd + optionPremium

  // [Close Sell - isSourceVault = false]
  // - poolUsd = poolUsd - collateralUsd + optionPremium
  // - reservedUsd = reservedUsd
  // - utilizedUsd = utilizedUsd
  // => depositedUsd = poolUsd - reservedUsd + utilizedUsd
  // => depositedUsd = (poolUsd - collateralUsd + optionPremium) - reservedUsd + utilizedUsd
  // => depositedUsd = poolUsd + optionPremium - reservedUsd + utilizedUsd = depositedUsd - collateralUsd + optionPremium

  newOlpUtilityRatio[olpKey].utilizedUsd = new BN(newOlpUtilityRatio[olpKey].utilizedUsd)
    .plus(collateralUsd)
    .toNumber();
  newOlpUtilityRatio[olpKey].depositedUsd = new BN(newOlpUtilityRatio[olpKey].depositedUsd)
    .plus(optionPremium)
    .toNumber();

  return newOlpUtilityRatio;
};

const calculateUnitCollateralUsd = ({
  strategy,
  strikePrices,
  underlyingAssetSpotIndex,
}: {
  strategy: Strategy;
  strikePrices: number[];
  underlyingAssetSpotIndex: number;
}) => {
  if (isBuyStrategy(strategy)) throw new Error("Collateral amount is not required for buy strategies");

  let collateralUsd = 0;

  if (strategy === "SellCall") {
    // UnderlyAsset
    collateralUsd = underlyingAssetSpotIndex;
  }

  if (strategy === "SellPut") {
    // USDC
    collateralUsd = strikePrices[0];
  }

  if (strategy === "SellCallSpread" || strategy === "SellPutSpread") {
    // USDC
    collateralUsd = strikePrices[1] - strikePrices[0];
  }

  return collateralUsd;
};

// 정규분포의 확률밀도함수 (평균 M이 0이고, 표준편차 SD가 1인 경우)
function _normalDistribution(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// 누적정규분포함수의 근사식
function _cumulativeNormalDistribution(x: number): number {
  const k = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
  const kSum =
    k * (0.31938153 + k * (-0.356563782 + k * (1.781477937 + k * (-1.821255978 + 1.330274429 * k))));

  if (x >= 0.0) {
    return 1.0 - (1.0 / Math.pow(2 * Math.PI, 0.5)) * Math.exp(-0.5 * x * x) * kSum;
  } else {
    return (1.0 / Math.pow(2 * Math.PI, 0.5)) * Math.exp(-0.5 * x * x) * kSum;
  }
}

// update negative zero value to zero
function _negativeZeroToZero(value: number) {
  return Object.is(value, -0) ? 0 : value;
}
