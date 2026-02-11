import { isBuyStrategy, isCallStrategy, isSpreadStrategy, Strategy } from "@callput/shared";
import BigNumber from "bignumber.js";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface CalculateSettlePayoffParams {
  strategy: Strategy;
  mainOptionStrikePrice: number;
  settlePrice: number;
  pairedOptionStrikePrice?: number;
  parsedExecutionPrice: number;
  parsedSize: number;
}

interface SettlePayoffResult {
  settlePayoff: number;
  pnl: number;
  roi: number;
}

interface CalculateClosePayoffParams {
  strategy: Strategy;
  mainOptionStrikePrice: number;
  parsedMarkPrice: number;
  pairedOptionStrikePrice?: number;
  parsedExecutionPrice: number;
  parsedSize: number;
  futuresPrice: number;
}

interface ClosePayoffResult {
  closePayoff: number;
  pnl: number;
  roi: number;
}

/**
 * Calculates the settle payoff, PnL, and ROI for an option position
 *
 * @param params Parameters needed for calculation
 * @returns Object containing settlePayoff, pnl, and roi values
 */
export const calculateSettlePayoff = ({
  strategy,
  mainOptionStrikePrice,
  settlePrice,
  pairedOptionStrikePrice = 0,
  parsedExecutionPrice,
  parsedSize,
}: CalculateSettlePayoffParams): SettlePayoffResult => {
  const isCall = isCallStrategy(strategy);
  const isBuy = isBuyStrategy(strategy);
  const isCombo = isSpreadStrategy(strategy);

  // Determine if the option is in-the-money
  const isItm = isCall ? mainOptionStrikePrice < settlePrice : mainOptionStrikePrice > settlePrice;

  // Calculate settle payoff based on strategy and whether it's in-the-money
  let settlePayoff = 0;

  if (isItm) {
    if (isCombo) {
      if (isCall) {
        settlePayoff = Math.min(
          new BigNumber(settlePrice).minus(mainOptionStrikePrice).toNumber(),
          new BigNumber(mainOptionStrikePrice).minus(pairedOptionStrikePrice).abs().toNumber()
        );
      } else {
        settlePayoff = Math.min(
          new BigNumber(mainOptionStrikePrice).minus(settlePrice).toNumber(),
          new BigNumber(mainOptionStrikePrice).minus(pairedOptionStrikePrice).abs().toNumber()
        );
      }
    } else {
      if (isCall) {
        settlePayoff = new BigNumber(settlePrice).minus(mainOptionStrikePrice).toNumber();
      } else {
        settlePayoff = new BigNumber(mainOptionStrikePrice).minus(settlePrice).toNumber();
      }
    }
  }

  // Calculate PnL and ROI
  const pnlInUnit = isBuy
    ? new BigNumber(settlePayoff).minus(parsedExecutionPrice).toNumber()
    : new BigNumber(parsedExecutionPrice).minus(settlePayoff).toNumber();

  const pnl = new BigNumber(pnlInUnit).multipliedBy(parsedSize).toNumber();
  const roi = new BigNumber(pnlInUnit).div(parsedExecutionPrice).multipliedBy(100).toNumber();

  return {
    settlePayoff,
    pnl,
    roi,
  };
};

export const calculateClosePayoff = ({
  strategy,
  mainOptionStrikePrice,
  parsedMarkPrice,
  pairedOptionStrikePrice = 0,
  parsedExecutionPrice,
  parsedSize,
  futuresPrice,
}: CalculateClosePayoffParams): ClosePayoffResult => {
  const isCall = isCallStrategy(strategy);
  const isBuy = isBuyStrategy(strategy);
  const isCombo = isSpreadStrategy(strategy);

  const closePayoff = isBuy
    ? new BigNumber(parsedMarkPrice).minus(parsedExecutionPrice).toNumber()
    : new BigNumber(parsedExecutionPrice).minus(parsedMarkPrice).toNumber();

  let pnl = 0;
  let roi = 0;

  if (isBuy) {
    pnl = new BigNumber(closePayoff).multipliedBy(parsedSize).toNumber();
    roi = new BigNumber(closePayoff).div(parsedExecutionPrice).multipliedBy(100).toNumber();
  } else {
    let maxClosePayoff = 0;

    if (isCall && !isCombo) {
      maxClosePayoff = closePayoff < 0 ? Math.max(closePayoff, -futuresPrice) : closePayoff;
    } else {
      const collateralUsd = isCombo
        ? new BigNumber(mainOptionStrikePrice).minus(pairedOptionStrikePrice).abs().toNumber()
        : new BigNumber(mainOptionStrikePrice).toNumber();

      maxClosePayoff = closePayoff < 0 ? Math.max(closePayoff, -collateralUsd) : closePayoff;
    }

    pnl = new BigNumber(maxClosePayoff).multipliedBy(parsedSize).toNumber();
    roi = new BigNumber(maxClosePayoff).div(parsedExecutionPrice).multipliedBy(100).toNumber();
  }

  return {
    closePayoff,
    pnl,
    roi,
  };
};
