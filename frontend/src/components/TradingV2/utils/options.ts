import { MIN_MARK_PRICE_FOR_BUY_POSITION } from "@/constants/constants.position";
import { initialOptionDetail } from "@/constants/constants.slices";
import {
  IOptionDetail,
  IOptionsInfo,
} from "@/interfaces/interfaces.marketSlice";
import { BaseQuoteAsset, FuturesAssetIndexMap, generateOptionTokenData, getMainOptionName, getPairedOptionName, getPairedOptionStrikePrice, isBuyStrategy, isCallStrategy, isSpreadStrategy, isVanillaCallStrategy, isVanillaPutStrategy, isVanillaStrategy, OptionsMarketData, parseOptionTokenId, RP_MID_TERM_IN_DAYS, RP_SHORT_TERM_IN_DAYS, UnderlyingAsset, UnderlyingAssetWithAll } from "@callput/shared";
import { SELECT_OPTION_PAIR_STRIKE_PRICE_RATE } from "@/utils/constants";
import { getDaysToExpiration } from "@/utils/helper";
import { OptionDirection, OptionStrategy, OrderSide } from "@/utils/types";
import { convertExpiryDateToTimestampInSec } from "./dates";
import { SupportedChains } from "@callput/shared";
import {
  QA_ADDRESS_TO_TICKER,
  QA_TICKER_TO_DECIMAL,
  QA_TICKER_TO_IMG,
  UA_TICKER_TO_DECIMAL,
} from "@/networks/assets";
import { Strategy } from "@callput/shared";
import { FlattenedPosition, GroupedPosition, Position } from "@/interfaces/interfaces.positionSlice";
import { BN } from "@/utils/bn";
import { getUnderlyingAssetTickerByIndex } from "@/networks/helpers";
import { calculatePnlRoiCashflow } from "./calculations";
import {
  PositionHistory,
  PositionHistoryState,
  PositionHistoryWithMetadata,
} from "@/store/slices/PositionHistorySlice";
import { PositionsState } from "@/store/slices/PositionsSlice";

export const getHistory = (
  underlyingAsset: UnderlyingAssetWithAll,
  positionHistoryData: PositionHistoryState,
  chain: SupportedChains,
  selectedHistoryFilterType: string,
  selectedHistoryTimestamp: number
): PositionHistoryWithMetadata[] => {
  const history: PositionHistory[] = [];

  if (underlyingAsset === "ALL") {
    const allHistory = [...positionHistoryData.BTC, ...positionHistoryData.ETH];
    const allHistorySorted = allHistory.sort(
      (a, b) => Number(b.processBlockTime) - Number(a.processBlockTime)
    );
    history.push(...allHistorySorted);
  } else {
    history.push(...positionHistoryData[underlyingAsset]);
  }

  const filteredHistory = history.filter((history: PositionHistory) => {
    if (selectedHistoryFilterType === "All Types")
      return Number(history.processBlockTime) >= selectedHistoryTimestamp;
    if (history.type === "transferIn" || history.type === "transferOut")
      return (
        selectedHistoryFilterType === "Transfer" &&
        Number(history.processBlockTime) >= selectedHistoryTimestamp
      );
    return (
      history.type === selectedHistoryFilterType.toLowerCase() &&
      Number(history.processBlockTime) >= selectedHistoryTimestamp
    );
  });

  const historyWithMetadata = filteredHistory.map((history: PositionHistory) => {
    const metadata = getHistoryMetadata(history, chain);

    const {
      type,
      uaPrice,
      instrument,
      optionDirection,
      optionOrderSide,
      optionStrategy,
      pairedOptionStrikePrice,
      size,
      collateral,
      avgPrice,
      settlePayoff,
      pnl,
      roi,
      cashflow,
      entryPrice,
      lastPrice,
    } = metadata;

    return {
      ...history,
      metadata: {
        type,
        uaPrice,
        instrument,
        optionDirection,
        optionOrderSide,
        optionStrategy,
        pairedOptionStrikePrice,
        size,
        collateral,
        avgPrice,
        settlePayoff,
        pnl,
        roi,
        cashflow,
        entryPrice,
        lastPrice,
      },
    } as PositionHistoryWithMetadata;
  });

  return historyWithMetadata;
};

export function getHistoryMetadata(history: PositionHistory, chain: SupportedChains) {
  const type =
    history.type === "open"
      ? "Open"
      : history.type === "close"
      ? "Close"
      : history.type === "settle"
      ? "Settle"
      : "Transfer";
  const underlyingAsset = getUnderlyingAssetTickerByIndex(chain, Number(history.underlyingAssetIndex));

  const uaPrice =
    type === "Settle"
      ? new BN(history.settlePrice).dividedBy(10 ** 30).toNumber()
      : new BN(history.spotPrice).dividedBy(10 ** 30).toNumber();

  const { optionNames } = generateOptionTokenData(chain, BigInt(history.optionTokenId));
  const instrument = getMainOptionName(BigInt(history.optionTokenId), optionNames);
  const { strategy, length } = parseOptionTokenId(BigInt(history.optionTokenId));
  const optionDirection: OptionDirection = isCallStrategy(strategy) ? "Call" : "Put";
  const optionOrderSide: OrderSide = isBuyStrategy(strategy) ? "Buy" : "Sell";
  const optionStrategy: OptionStrategy = length === 1 ? "Vanilla" : "Spread";
  const pairedOptionStrikePrice = getPairedOptionStrikePrice(BigInt(history.optionTokenId));

  const size = new BN(history.size)
    .dividedBy(10 ** UA_TICKER_TO_DECIMAL[chain][underlyingAsset])
    .toNumber();
  const collateralTicker = QA_ADDRESS_TO_TICKER[chain][history.collateralToken];
  const collateral =
    type === "Transfer"
      ? 0
      : new BN(history.collateralAmount)
          .dividedBy(
            10 **
              QA_TICKER_TO_DECIMAL[chain][
                collateralTicker as keyof (typeof QA_TICKER_TO_DECIMAL)[typeof chain]
              ]
          )
          .multipliedBy(type === "Open" || history.type === "transferIn" ? -1 : 1)
          .toNumber() || 0;

  const avgPrice = new BN(history.executionPrice).dividedBy(10 ** 30).toNumber();
  const settlePayoff = new BN(history.settlePayoff).dividedBy(10 ** 30).toNumber();
  const pnl = new BN(history.pnl).dividedBy(10 ** 30).toNumber();
  const roi = new BN(history.roi).toNumber();
  const cashflow = new BN(history.cashFlow).dividedBy(10 ** 30).toNumber();

  const entryPrice = new BN(history.avgExecutionPrice).dividedBy(10 ** 30).toNumber();
  const lastPrice = type === "Open" ? 0 : type === "Close" ? avgPrice : settlePayoff;

  return {
    type,
    uaPrice,
    instrument,
    optionDirection,
    optionOrderSide,
    optionStrategy,
    pairedOptionStrikePrice,
    size,
    collateral,
    avgPrice,
    settlePayoff,
    pnl,
    roi,
    cashflow,
    entryPrice,
    lastPrice,
  };
}

/**
 * 포지션 데이터를 가공하고 반환하는 함수
 */
export const getFlattenedPositions = (
  underlyingAsset: UnderlyingAssetWithAll,
  positionsData: PositionsState,
  chain: SupportedChains,
  optionsInfo: IOptionsInfo,
  futuresAssetIndexMap: FuturesAssetIndexMap
): FlattenedPosition[] => {
  const currentTimestampInSeconds = Math.floor(Date.now() / 1000);
  const groupedPositions: GroupedPosition[] = [];

  if (underlyingAsset === "ALL") {
    const allGroupedPositions = [...positionsData.BTC, ...positionsData.ETH];
    const allGroupedPositionsSorted = allGroupedPositions.sort((a, b) => a.expiry - b.expiry);
    groupedPositions.push(...allGroupedPositionsSorted);
  } else {
    groupedPositions.push(...positionsData[underlyingAsset]);
  }

  return groupedPositions.flatMap((groupedPosition: GroupedPosition) => {
    return groupedPosition.positions.map((position: Position) => {
      const metadata = getPositionMetadata(
        position,
        groupedPosition,
        currentTimestampInSeconds,
        chain,
        optionsInfo,
        futuresAssetIndexMap
      );

      const {
        expiry,
        isExpired,
        settlePrice,
        instrument,
        optionDirection,
        optionOrderSide,
        optionStrategy,
        size,
        lastPrice,
        avgPrice,
        payoff,
        pnl,
        roi,
        cashflow,
        greeks,
      } = metadata;

      return {
        ...position,
        metadata: {
          expiry,
          isExpired,
          settlePrice,
          instrument,
          optionDirection,
          optionOrderSide,
          optionStrategy,
          size,
          lastPrice,
          avgPrice,
          payoff,
          pnl,
          roi,
          cashflow,
          greeks,
        },
      } as FlattenedPosition;
    });
  });
};

export function getPositionMetadata(
  position: Position,
  groupedPosition: GroupedPosition,
  currentTimestampInSeconds: number,
  chain: SupportedChains,
  optionsInfo: IOptionsInfo,
  futuresAssetIndexMap: FuturesAssetIndexMap
) {
  const expiry = groupedPosition.expiry;
  const isExpired = expiry <= currentTimestampInSeconds;
  const settlePrice = new BN(groupedPosition.settlePrice).toNumber();
  const optionTokenId = BigInt(position.optionTokenId);
  const { underlyingAssetIndex, strategy } = parseOptionTokenId(optionTokenId);
  const underlyingAsset = getUnderlyingAssetTickerByIndex(chain, underlyingAssetIndex);
  const instrument = getMainOptionName(optionTokenId, position.optionNames);
  const { mainOption, pairedOption } = getMainAndPairedOptionData({
    position,
    strategy,
    optionsInfo,
  });
  const optionDirection: OptionDirection = isCallStrategy(strategy) ? "Call" : "Put";
  const optionOrderSide: OrderSide = position.isBuy ? "Buy" : "Sell";
  const optionStrategy: OptionStrategy = Number(position.length) === 1 ? "Vanilla" : "Spread";

  const size = new BN(position.size)
    .dividedBy(10 ** UA_TICKER_TO_DECIMAL[chain as keyof typeof UA_TICKER_TO_DECIMAL][underlyingAsset])
    .toNumber();

  const lastPrice = getLastPrice({
    position,
    mainOption,
    pairedOption,
    strategy,
    isExpired,
    settlePrice,
  });

  const avgPrice = new BN(position.executionPrice).div(10 ** 30).toNumber();

  const payoff = getPayoff({
    position,
    strategy,
    isExpired,
    optionOrderSide,
    lastPrice,
    avgPrice,
    underlyingAsset,
    futuresAssetIndexMap,
  });

  const { pnl, roi, cashflow } = calculatePnlRoiCashflow({
    optionOrderSide,
    size,
    avgPrice,
    payoff,
  });

  const greeks = getGreeks({
    strategy,
    size,
    mainOption,
    pairedOption,
  });

  return {
    expiry,
    isExpired,
    settlePrice,
    optionTokenId,
    underlyingAsset,
    instrument,
    optionDirection,
    optionOrderSide,
    optionStrategy,
    size,
    lastPrice,
    avgPrice,
    payoff,
    mainOption,
    pairedOption,
    pnl,
    roi,
    cashflow,
    greeks,
  };
}

export function getLastPrice({
  position,
  mainOption,
  pairedOption,
  strategy,
  isExpired,
  settlePrice,
}: {
  position: Position;
  mainOption: IOptionDetail;
  pairedOption: IOptionDetail;
  strategy: Strategy;
  isExpired: boolean;
  settlePrice: number;
}): number {
  const isVanilla = isVanillaStrategy(strategy);

  if (!isExpired) {
    if (isVanilla) return mainOption.markPrice;
    return Math.max(mainOption.markPrice - pairedOption.markPrice, 0);
  }

  const isItm = isCallStrategy(strategy)
    ? Number(position.mainOptionStrikePrice) < settlePrice
    : Number(position.mainOptionStrikePrice) > settlePrice;

  if (!isItm) return 0;

  if (isVanillaCallStrategy(strategy)) {
    return new BN(settlePrice).minus(position.mainOptionStrikePrice).toNumber();
  } else if (isVanillaPutStrategy(strategy)) {
    return new BN(position.mainOptionStrikePrice).minus(settlePrice).toNumber();
  } else if (isSpreadStrategy(strategy)) {
    const spreadDifference = new BN(position.mainOptionStrikePrice).minus(position.pairedOptionStrikePrice).abs().toNumber();

    if (isCallStrategy(strategy)) {
      return Math.min(new BN(settlePrice).minus(position.mainOptionStrikePrice).toNumber(), spreadDifference);
    } else {
      return Math.min(new BN(position.mainOptionStrikePrice).minus(settlePrice).toNumber(), spreadDifference);
    }
  }

  return 0;
}

export function getPayoff({
  position,
  strategy,
  isExpired,
  optionOrderSide,
  lastPrice,
  avgPrice,
  underlyingAsset,
  futuresAssetIndexMap,
}: {
  position: Position;
  strategy: Strategy;
  isExpired: boolean;
  optionOrderSide: OrderSide;
  lastPrice: number;
  avgPrice: number;
  underlyingAsset: UnderlyingAsset;
  futuresAssetIndexMap: FuturesAssetIndexMap;
}): number {
  const defaultPayoff = optionOrderSide === "Buy" ? lastPrice - avgPrice : avgPrice - lastPrice;

  // Settle 된 주문의 경우
  if (isExpired) return defaultPayoff;

  // Buy 주문의 경우
  if (optionOrderSide === "Buy") return defaultPayoff;

  // Sell 주문의 경우 (이미 양수면 그대로 반환)
  if (defaultPayoff >= 0) return defaultPayoff;

  // Sell 주문의 경우 (이미 음수면 최대값 계산)
  if (isVanillaCallStrategy(strategy)) {
    return Math.max(defaultPayoff, -futuresAssetIndexMap[underlyingAsset]);
  }

  const collateralUsd = isVanillaStrategy(strategy)
    ? new BN(position.mainOptionStrikePrice).toNumber()
    : new BN(position.mainOptionStrikePrice).minus(position.pairedOptionStrikePrice).abs().toNumber();

  return Math.max(defaultPayoff, -collateralUsd);
}

export function getMainAndPairedOptionData({
  position,
  strategy,
  optionsInfo,
}: {
  position: Position;
  strategy: Strategy;
  optionsInfo: IOptionsInfo;
}): { mainOption: IOptionDetail; pairedOption: IOptionDetail } {
  const instrument = getMainOptionName(BigInt(position.optionTokenId), position.optionNames);
  const mainOption = optionsInfo[instrument] || initialOptionDetail;

  if (isVanillaStrategy(strategy)) return { mainOption, pairedOption: initialOptionDetail };

  const optionPairInstrument = getPairedOptionName(BigInt(position.optionTokenId), position.optionNames);
  const pairedOption = optionsInfo[optionPairInstrument] || initialOptionDetail;
  return { mainOption, pairedOption };
}

export function getGreeks({
  strategy,
  size,
  mainOption,
  pairedOption,
}: {
  strategy: Strategy;
  size: number;
  mainOption: IOptionDetail;
  pairedOption: IOptionDetail;
}) {
  if (isVanillaStrategy(strategy)) {
    return {
      delta: new BN(mainOption.delta).multipliedBy(size).toNumber(),
      gamma: new BN(mainOption.gamma).multipliedBy(size).toNumber(),
      vega: new BN(mainOption.vega).multipliedBy(size).toNumber(),
      theta: new BN(mainOption.theta).multipliedBy(size).toNumber(),
    };
  }

  return {
    delta:
      new BN(mainOption.delta).multipliedBy(size).toNumber() -
      new BN(pairedOption.delta).multipliedBy(size).toNumber(),
    gamma:
      new BN(mainOption.gamma).multipliedBy(size).toNumber() -
      new BN(pairedOption.gamma).multipliedBy(size).toNumber(),
    vega:
      new BN(mainOption.vega).multipliedBy(size).toNumber() -
      new BN(pairedOption.vega).multipliedBy(size).toNumber(),
    theta:
      new BN(mainOption.theta).multipliedBy(size).toNumber() -
      new BN(pairedOption.theta).multipliedBy(size).toNumber(),
  };
}

export function getBaseQuoteAsset(
  underlyingAsset: UnderlyingAsset,
  optionDirection: OptionDirection,
  orderSide: OrderSide,
  optionStrategy: OptionStrategy
) {
  if (orderSide === "Buy") return BaseQuoteAsset.USDC;
  if (optionStrategy === "Spread") return BaseQuoteAsset.USDC;
  if (optionDirection === "Put") return BaseQuoteAsset.USDC;
  switch (underlyingAsset) {
    case UnderlyingAsset.BTC:
      return BaseQuoteAsset.WBTC;
    case UnderlyingAsset.ETH:
      return BaseQuoteAsset.WETH;
    default:
      return BaseQuoteAsset.USDC;
  }
}

export function getBaseQuoteAssetImage(
  underlyingAsset: UnderlyingAsset,
  optionDirection: OptionDirection,
  orderSide: OrderSide,
  optionStrategy: OptionStrategy,
  chain: SupportedChains
) {
  if (orderSide === "Buy") return QA_TICKER_TO_IMG[chain][BaseQuoteAsset.USDC];
  if (optionStrategy === "Spread") return QA_TICKER_TO_IMG[chain][BaseQuoteAsset.USDC];
  if (optionDirection === "Put") return QA_TICKER_TO_IMG[chain][BaseQuoteAsset.USDC];
  switch (underlyingAsset) {
    case UnderlyingAsset.BTC:
      return QA_TICKER_TO_IMG[chain][BaseQuoteAsset.WBTC];
    case UnderlyingAsset.ETH:
      return QA_TICKER_TO_IMG[chain][BaseQuoteAsset.WETH];
    default:
      return QA_TICKER_TO_IMG[chain][BaseQuoteAsset.USDC];
  }
}

export function getBestOptionPair(
  orderSide: OrderSide,
  option: IOptionDetail,
  candidateOptions: IOptionDetail[]
): IOptionDetail {
  const optionPairs = findOptionPairs(orderSide, option, candidateOptions);

  if (!option.instrument || optionPairs.length === 0) return initialOptionDetail;

  const { expiry, strikePrice, optionDirection } = parseInstrument(option.instrument);
  const daysToExpiration = getDaysToExpiration(expiry);
  const optionPairStrikePriceRate = getOptionPairStrikePriceRate(daysToExpiration);

  const bestOptionPairIndex = findBestOptionPairIndex(
    strikePrice,
    optionPairs,
    optionDirection,
    optionPairStrikePriceRate
  );

  if (bestOptionPairIndex < 0) return initialOptionDetail;

  return optionPairs[bestOptionPairIndex];
}

export function findOptionPairs(
  orderSide: OrderSide,
  option: IOptionDetail,
  candidateOptions: IOptionDetail[]
): IOptionDetail[] {
  if (!option.instrument) return [];

  const optionPairs: IOptionDetail[] = [];

  const { underlyingAsset, optionDirection } = parseInstrument(option.instrument);

  candidateOptions.forEach((candidate: IOptionDetail) => {
    if (!candidate.isOptionAvailable) return;

    const isValidStrikePrice =
      (optionDirection === "Call" && option.strikePrice < candidate.strikePrice) ||
      (optionDirection === "Put" && option.strikePrice > candidate.strikePrice);

    if (!isValidStrikePrice) return;

    // For "Buy" orders, check minimum mark price difference
    if (orderSide === "Buy") {
      const diffInMarkPrice = Math.abs(option.markPrice - candidate.markPrice);
      if (diffInMarkPrice <= MIN_MARK_PRICE_FOR_BUY_POSITION[underlyingAsset]) return;

      // Check if this would result in guaranteed loss
      // Net Debit = Long premium - Short premium
      const netDebit = Math.abs(option.markPrice + option.riskPremiumRateForBuy - candidate.markPrice + candidate.riskPremiumRateForSell);
      const strikeDifference = Math.abs(candidate.strikePrice - option.strikePrice);
      
      // For a spread to be valid: Net Debit < Max Profit (Strike Difference)
      // If Net Debit >= Strike Difference, it's a guaranteed loss
      if (netDebit >= strikeDifference) return;
    }

    optionPairs.push(candidate);
  });

  return optionPairs;
}

export function parseInstrument(instrument: string) {
  const [underlyingAsset, expiryDate, strikePrice, optionDirectionAbbr] = instrument.split("-");
  const optionDirection: OptionDirection = optionDirectionAbbr === "C" ? "Call" : "Put";
  return {
    underlyingAsset: underlyingAsset as UnderlyingAsset,
    expiry: convertExpiryDateToTimestampInSec(expiryDate),
    strikePrice: Number(strikePrice),
    optionDirection,
  };
}

// Helper function to extract all options from market data with instrument as key and markPrice and volume as values
export const extractOptions = (
  optionsMarketData: OptionsMarketData
): { [key: string]: IOptionDetail } => {
  const options: {
    [key: string]: IOptionDetail;
  } = {};

  if (!optionsMarketData) return options;

  // Process each asset
  for (const assetData of Object.values(optionsMarketData)) {
    if (!assetData.options) continue;

    // Process each expiry timestamp's options
    for (const optionsByType of Object.values(assetData.options)) {
      // Process call options
      if (optionsByType.call) {
        optionsByType.call.forEach((option) => {
          options[option.instrument || ""] = {
            ...option,
          };
        });
      }

      // Process put options
      if (optionsByType.put) {
        optionsByType.put.forEach((option) => {
          options[option.instrument || ""] = {
            ...option,
          };
        });
      }
    }
  }

  return options;
};

/*
 *
 * Internal functions
 *
 */

function getOptionPairStrikePriceRate(daysToExpiration: number): number {
  if (daysToExpiration <= RP_SHORT_TERM_IN_DAYS) {
    return SELECT_OPTION_PAIR_STRIKE_PRICE_RATE[0];
  } else if (daysToExpiration <= RP_MID_TERM_IN_DAYS) {
    return SELECT_OPTION_PAIR_STRIKE_PRICE_RATE[1];
  } else {
    return SELECT_OPTION_PAIR_STRIKE_PRICE_RATE[2];
  }
}

function findBestOptionPairIndex(
  mainOptionStrikePrice: number,
  optionPairs: IOptionDetail[],
  optionDirection: OptionDirection,
  optionPairStrikePriceRate: number
): number {
  let pairedIndex = -1;
  const standardStrikePrice =
    mainOptionStrikePrice *
    (optionDirection === "Call" ? 1 + optionPairStrikePriceRate : 1 - optionPairStrikePriceRate);

  if (optionDirection === "Call") {
    pairedIndex = optionPairs.findIndex((option) => option.strikePrice >= standardStrikePrice);
    if (pairedIndex < 0) pairedIndex = -1;
  } else {
    for (let i = optionPairs.length - 1; i >= 0; i--) {
      if (optionPairs[i].strikePrice <= standardStrikePrice) {
        pairedIndex = i;
        break;
      }
    }
    if (pairedIndex < 0) pairedIndex = -1;
  }

  return pairedIndex;
}
