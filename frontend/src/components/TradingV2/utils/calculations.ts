import { IOlpStats, IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { HistoryRangeType, OptionStrategy, OrderSide } from "@/utils/types";
import { parseInstrument } from "./options";
import { getOlpKeyByExpiry } from "@/networks/helpers";
import { OptionDirection, SupportedChains } from "@callput/shared";
import { BN } from "@/utils/bn";
import { QA_ADDRESS_TO_TICKER, QA_TICKER_TO_DECIMAL } from "@/networks/assets";
import { FlattenedPosition } from "@/interfaces/interfaces.positionSlice";
import {
  calculateBlackScholesProfit,
  calculateRiskPremiumRate,
  convertQuoteAssetToNormalizedSpotAsset,
  SpotAssetIndexMap,
} from "@callput/shared";

/**
 * 포지션 통계를 계산하는 함수
 */

export interface PositionStats {
  openPositions: number;
  positionsValue: number;
  invested: number;
  collateral: number;
  pnl: number;
  roi: number;
  greeks: {
    delta: number;
    gamma: number;
    vega: number;
    theta: number;
  };
}

export const calculatePositionStats = (
  positions: FlattenedPosition[],
  chain: SupportedChains,
  spotAssetIndexMap: SpotAssetIndexMap
): PositionStats => {
  let stats = {
    openPositions: 0,
    positionsValue: 0,
    invested: 0,
    collateral: 0,
    pnl: 0,
    roi: 0,
    greeks: {
      delta: 0,
      gamma: 0,
      vega: 0,
      theta: 0,
    },
  };

  positions.forEach((position) => {
    stats.openPositions += 1;
    stats.pnl = new BN(stats.pnl).plus(position.metadata.pnl).toNumber();

    const positionValue = new BN(position.metadata.lastPrice).multipliedBy(position.metadata.size).toNumber();

    if (position.metadata.optionOrderSide === "Buy") {
      stats.positionsValue = new BN(stats.positionsValue).plus(positionValue).toNumber();
    } else {
      stats.positionsValue = new BN(stats.positionsValue).minus(positionValue).toNumber();
    }

    stats.invested = new BN(stats.invested)
      .plus(new BN(position.metadata.avgPrice).multipliedBy(position.metadata.size))
      .toNumber();

    if (position.metadata.optionOrderSide === "Sell" && position.openedCollateralToken) {
      const collateral = QA_ADDRESS_TO_TICKER[chain][position.openedCollateralToken];
      const collateralDecimals =
        QA_TICKER_TO_DECIMAL[chain][collateral as keyof (typeof QA_TICKER_TO_DECIMAL)[SupportedChains]];
      const remainingCollateral = new BN(position.openedCollateralAmount)
        .minus(position.closedCollateralAmount)
        .dividedBy(new BN(10).pow(collateralDecimals))
        .toNumber();
      const normalizedCollateral = convertQuoteAssetToNormalizedSpotAsset(collateral, false);

      if (normalizedCollateral) {
        stats.collateral = new BN(stats.collateral)
          .plus(new BN(remainingCollateral).multipliedBy(spotAssetIndexMap[normalizedCollateral]))
          .toNumber();
      }
    }

    stats.greeks.delta = new BN(stats.greeks.delta).plus(position.metadata.greeks.delta).toNumber();
    stats.greeks.gamma = new BN(stats.greeks.gamma).plus(position.metadata.greeks.gamma).toNumber();
    stats.greeks.vega = new BN(stats.greeks.vega).plus(position.metadata.greeks.vega).toNumber();
    stats.greeks.theta = new BN(stats.greeks.theta).plus(position.metadata.greeks.theta).toNumber();
  });

  // ROI 계산
  stats.roi =
    stats.pnl === 0 || stats.invested === 0
      ? 0
      : new BN(stats.pnl).div(stats.invested).multipliedBy(100).toNumber();

  return stats;
};

export function calculatePnlRoiCashflow({
  optionOrderSide,
  size,
  avgPrice,
  payoff,
}: {
  optionOrderSide: OrderSide;
  size: number;
  avgPrice: number;
  payoff: number;
}): { pnl: number; roi: number; cashflow: number } {
  const pnl = new BN(payoff).multipliedBy(size).toNumber();
  const roi = new BN(payoff).div(avgPrice).multipliedBy(100).toNumber();
  const cashflow = new BN(avgPrice)
    .multipliedBy(size)
    .multipliedBy(optionOrderSide === "Buy" ? -1 : 1)
    .toNumber();
  return { pnl, roi, cashflow };
}

export const calculateTimestampByHistoryRange = (range: HistoryRangeType) => {
  const now = Math.floor(new Date().getTime() / 1000);
  switch (range) {
    case "1 Day":
      return now - 86400;
    case "1 Week":
      return now - 604800;
    case "1 Month":
      return now - 2592000;
    case "3 Months":
      return now - 7776000;
    case "6 Months":
      return now - 15552000;
    case "All":
      return 1; // 1 is a special value to indicate all history
    default:
      return now;
  }
};

export function calculateBreakEvenPoint({
  expiry,
  orderSide,
  options,
  tickerInterval,
}: {
  expiry: number;
  orderSide: OrderSide;
  options: IOptionDetail[];
  tickerInterval: number;
}): number {
  const { underlyingMinPrice, underlyingMaxPrice } = calculatePriceRange(options);

  const profitsByUnderlyingPrice: [number, number][] = []; // [underlyingPrice, profit]

  for (
    let underlyingPrice = underlyingMinPrice;
    underlyingPrice <= underlyingMaxPrice;
    underlyingPrice += tickerInterval
  ) {
    let profit = 0;

    options.forEach((option) => {
      if (!option.instrument) return;

      const { optionDirection } = parseInstrument(option.instrument);

      const orderPrice = calculateVanillaBidAskPrice(orderSide, option);

      profit += calculateBlackScholesProfit({
        markPriceInputData: {
          underlyingFutures: underlyingPrice,
          strikePrice: option.strikePrice,
          iv: option.markIv || 0,
          fromTime: expiry - 1,
          expiry: expiry,
          isCall: optionDirection === "Call",
        },
        orderPrice: orderPrice,
        size: 1,
      });

      profitsByUnderlyingPrice.push([underlyingPrice, profit]);
    });
  }

  let bep = 0;

  profitsByUnderlyingPrice.forEach(([underlyingPrice, profit], idx) => {
    if (idx !== 0) {
      const [prevUnderlyingPrice, prevProfit] = profitsByUnderlyingPrice[idx - 1];

      // 마이너스에서 플러스로 혹은 플러스에서 마이너스로 넘어가는 지점
      if (prevProfit < 0 && profit > 0) {
        bep = (underlyingPrice + prevUnderlyingPrice) / 2;
      } else if (prevProfit > 0 && profit < 0) {
        bep = (underlyingPrice + prevUnderlyingPrice) / 2;
      }
    }
  });

  return bep;
}

// @desc Spread에서 calculateVanillaBidAskPrice를 사용한 이유는 chart 내 bep 계산 방식과 동일하게 하기 위함으로 나중에 수정 필요
export function calculateBreakEvenPointV2({
  optionDirection,
  orderSide,
  optionStrategy,
  options,
}: {
  optionDirection: OptionDirection;
  orderSide: OrderSide;
  optionStrategy: OptionStrategy;
  options: IOptionDetail[];
}): number {
  let mainOptionStrikePrice = 0;
  let totalPremium = 0;

  switch (optionStrategy) {
    case "Vanilla":
      mainOptionStrikePrice = options[0].strikePrice;
      totalPremium = calculateVanillaBidAskPrice(orderSide, options[0]);
      break;
    case "Spread":
      mainOptionStrikePrice = options[0].strikePrice;
      const price0 = calculateVanillaBidAskPrice(orderSide, options[0]);
      const price1 = calculateVanillaBidAskPrice(orderSide === "Buy" ? "Sell" : "Buy", options[1]);
      totalPremium = Math.abs(price0 - price1);
      break;
  }

  const bep =
    optionDirection === "Call" ? mainOptionStrikePrice + totalPremium : mainOptionStrikePrice - totalPremium;

  return bep;
}

// Vanilla 옵션의 매수/매도 가격을 계산하는 함수
export function calculateVanillaBidAskPrice(orderSide: OrderSide, option: IOptionDetail) {
  if (!option.instrument) return 0;
  return orderSide === "Buy"
    ? Math.max(option.markPrice * (1 + option.riskPremiumRateForBuy), 0)
    : Math.max(option.markPrice * (1 - option.riskPremiumRateForSell), 0);
}

// Spread 옵션의 Mark Price를 계산하는 함수
export function calculateSpreadMarkPrice(option: IOptionDetail, optionPair: IOptionDetail) {
  return Math.abs(option.markPrice - optionPair.markPrice);
}

// Spread 옵션의 매수/매도 가격을 계산하는 함수
export function calculateSpreadBidAskPrice(
  orderSide: OrderSide,
  option: IOptionDetail,
  optionPair: IOptionDetail,
  chain: SupportedChains,
  olpStats: IOlpStats,
  underlyingFutures: number,
  underlyingAssetSpotIndex: number,
  underlyingAssetVolatilityScore: number
) {
  if (!option.instrument || !optionPair.instrument) return 0;

  const { underlyingAsset, expiry, optionDirection } = parseInstrument(option.instrument);

  const olpKey = getOlpKeyByExpiry(chain, expiry);

  const olpGreeks = olpStats[olpKey].greeks[underlyingAsset];

  const currentOlpUtilityRatio = {
    sOlp: olpStats.sOlp.utilityRatio,
    mOlp: olpStats.mOlp.utilityRatio,
    lOlp: olpStats.lOlp.utilityRatio,
  };

  const spreadMarkPrice = calculateSpreadMarkPrice(option, optionPair);

  const { RP_rate: rpRate } = calculateRiskPremiumRate({
    underlyingAsset: underlyingAsset,
    expiry: expiry,
    isOpen: true,
    orderSide: orderSide,
    optionDirection: optionDirection,
    mainOption: option,
    pairedOption: optionPair,
    size: 1,
    underlyingFutures,
    underlyingAssetSpotIndex,
    underlyingAssetVolatilityScore,
    olpKey,
    olpGreeks,
    olpUtilityRatio: currentOlpUtilityRatio,
  });

  const spreadBidAskPrice =
    orderSide === "Buy"
      ? Math.max(spreadMarkPrice * (1 + rpRate), 0)
      : Math.max(spreadMarkPrice * (1 - rpRate), 0);

  return spreadBidAskPrice;
}

// Vanilla 옵션과 Spread 옵션의 매수/매도 가격을 계산하는 함수
export function calculateBidAskPrice(
  orderSide: OrderSide,
  optionStrategy: OptionStrategy,
  option: IOptionDetail,
  optionPair: IOptionDetail,
  chain: SupportedChains,
  olpStats: IOlpStats,
  underlyingFutures: number,
  underlyingAssetSpotIndex: number,
  underlyingAssetVolatilityScore: number
) {
  switch (optionStrategy) {
    case "Vanilla":
      return calculateVanillaBidAskPrice(orderSide, option);
    case "Spread":
      return calculateSpreadBidAskPrice(
        orderSide,
        option,
        optionPair,
        chain,
        olpStats,
        underlyingFutures,
        underlyingAssetSpotIndex,
        underlyingAssetVolatilityScore
      );
    default:
      return 0;
  }
}

export const handleMaxValue = (amount: string): string => {
  if (isNaN(Number(amount))) return "0";
  return amount;
};

/*
 *
 * Internal functions
 *
 */

function calculatePriceRange(options: IOptionDetail[]) {
  const result = options.reduce(
    (acc, option) => {
      const strikePrice = option.strikePrice;

      if (strikePrice < acc.underlyingMinPrice) {
        acc.underlyingMinPrice = strikePrice;
      }
      if (strikePrice > acc.underlyingMaxPrice) {
        acc.underlyingMaxPrice = strikePrice;
      }

      return acc;
    },
    {
      underlyingMinPrice: Infinity,
      underlyingMaxPrice: 0,
    }
  );

  return {
    underlyingMinPrice: Math.floor((result.underlyingMinPrice * 0.5) / 100) * 100,
    underlyingMaxPrice: Math.ceil((result.underlyingMaxPrice * 1.5) / 100) * 100,
  };
}
