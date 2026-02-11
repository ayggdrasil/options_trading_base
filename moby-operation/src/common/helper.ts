import fs from "fs";
import path from "path";
import { Chain, Strategy, UnderlyingAssetIndex, VaultIndex } from "./enum";
import { PROJECT_ROOT } from "./constant";

export function isValidChain(chain: string): chain is Chain {
  return Object.values(Chain).includes(chain as Chain);
}

export const mkdirOutputDir = (folderName: string): string => {
  const outputDir = path.join(PROJECT_ROOT, "data", "output", folderName);

  if (!fs.existsSync(outputDir)) {
    console.log("?");
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return outputDir;
};

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
  const underlyingAssetIndex = Number((optionTokenId >> BigInt(240)) & BigInt(0xffff));
  const expiry = Number((optionTokenId >> BigInt(200)) & BigInt(0xffffffffff));
  const strategy = Number((optionTokenId >> BigInt(196)) & BigInt(0xf));

  if (strategy === Strategy.NotSupported) throw new Error("Invalid strategy");

  const length = Number((optionTokenId >> BigInt(194)) & BigInt(0x3)) + 1; // Adjusted for 2 bits length

  let isBuys = [];
  let strikePrices = [];
  let isCalls = [];

  for (let i = 0; i < 4; i++) {
    isBuys.push(Boolean((optionTokenId >> BigInt(193 - 48 * i)) & BigInt(0x1)));
    strikePrices.push(Number((optionTokenId >> BigInt(147 - 48 * i)) & BigInt(0x3ffffffffff)));
    isCalls.push(Boolean((optionTokenId >> BigInt(146 - 48 * i)) & BigInt(0x1)));
  }

  const vaultIndex = Number(optionTokenId & BigInt(0x3)); // Adjusted for 2 bits vault index

  return { underlyingAssetIndex, expiry, strategy, length, isBuys, strikePrices, isCalls, vaultIndex };
}

export function isBuyStrategy(strategy: Strategy) {
  return (
    strategy === Strategy.BuyCall ||
    strategy === Strategy.BuyPut ||
    strategy === Strategy.BuyCallSpread ||
    strategy === Strategy.BuyPutSpread
  );
}

export function isSell(strategy: Strategy) {
  return (
    strategy === Strategy.SellCall ||
    strategy === Strategy.SellPut ||
    strategy === Strategy.SellCallSpread ||
    strategy === Strategy.SellPutSpread
  );
}

export function isCallStrategy(strategy: Strategy) {
  return (
    strategy === Strategy.BuyCall ||
    strategy === Strategy.SellCall ||
    strategy === Strategy.BuyCallSpread ||
    strategy === Strategy.SellCallSpread
  );
}

export function isPut(strategy: Strategy) {
  return (
    strategy === Strategy.BuyPut ||
    strategy === Strategy.SellPut ||
    strategy === Strategy.BuyPutSpread ||
    strategy === Strategy.SellPutSpread
  );
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

export function isSpreadStrategy(strategy: Strategy) {
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

export const getTimestampForDate = (year: number, month: number, day: number) => {
  return Math.floor(new Date(year, month - 1, day).getTime() / 1000);
};

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
