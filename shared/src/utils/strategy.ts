import { Strategy } from "../constants/strategy";
import { parseOptionTokenId } from "./options";

export function getStrategy(isBuy: boolean, isCall: boolean, isVanilla: boolean): Strategy {
  if (isBuy) {
    if (isCall) {
      return isVanilla ? "BuyCall" : "BuyCallSpread";
    } else {
      return isVanilla ? "BuyPut" : "BuyPutSpread";
    }
  } else {
    if (isCall) {
      return isVanilla ? "SellCall" : "SellCallSpread";
    } else {
      return isVanilla ? "SellPut" : "SellPutSpread";
    }
  }
}

export function getStrategyByOptionTokenId(optionTokenId: bigint): Strategy {
  const { strategy } = parseOptionTokenId(optionTokenId);
  return strategy;
}

export function getStrategyByIndex(index: number): Strategy {
  const strategies = Object.keys(Strategy) as Strategy[];
  return strategies[index];
}

export function getOppositeStrategy(strategy: Strategy): Strategy {
  switch (strategy) {
    case "BuyCall":
      return "SellCall";
    case "SellCall":
      return "BuyCall";
    case "BuyPut":
      return "SellPut";
    case "SellPut":
      return "BuyPut";
    case "BuyCallSpread":
      return "SellCallSpread";
    case "SellCallSpread":
      return "BuyCallSpread";
    case "BuyPutSpread":
      return "SellPutSpread";
    case "SellPutSpread":
      return "BuyPutSpread";
    default:
      return "NotSupported";
  }
}

export function isBuyStrategy(strategy: Strategy) {
  return (
    strategy === "BuyCall" ||
    strategy === "BuyPut" ||
    strategy === "BuyCallSpread" ||
    strategy === "BuyPutSpread"
  );
}

export function isSellStrategy(strategy: Strategy) {
  return (
    strategy === "SellCall" ||
    strategy === "SellPut" ||
    strategy === "SellCallSpread" ||
    strategy === "SellPutSpread"
  );
}

export function isCallStrategy(strategy: Strategy) {
  return (
    strategy === "BuyCall" ||
    strategy === "SellCall" ||
    strategy === "BuyCallSpread" ||
    strategy === "SellCallSpread"
  );
}

export function isPutStrategy(strategy: Strategy) {
  return (
    strategy === "BuyPut" ||
    strategy === "SellPut" ||
    strategy === "BuyPutSpread" ||
    strategy === "SellPutSpread"
  );
}

export function isVanillaCallStrategy(strategy: Strategy) {
  return strategy === "BuyCall" || strategy === "SellCall";
}

export function isVanillaPutStrategy(strategy: Strategy) {
  return strategy === "BuyPut" || strategy === "SellPut";
}

export function isVanillaStrategy(strategy: Strategy) {
  return isVanillaCallStrategy(strategy) || isVanillaPutStrategy(strategy);
}

export function isCallSpreadStrategy(strategy: Strategy) {
  return strategy === "BuyCallSpread" || strategy === "SellCallSpread";
}

export function isPutSpreadStrategy(strategy: Strategy) {
  return strategy === "BuyPutSpread" || strategy === "SellPutSpread";
}

export function isSpreadStrategy(strategy: Strategy) {
  return isCallSpreadStrategy(strategy) || isPutSpreadStrategy(strategy);
}
