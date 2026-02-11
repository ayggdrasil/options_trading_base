import BigNumber from "bignumber.js";
import { sendMessage } from "../utils/slack";
import {
  advancedFormatNumber
} from "../utils/format";
import { LogLevel, SlackTag } from "../utils/enums";
import { getPositionHistoryWithFilter } from "../utils/queries";
import { initializeRedis } from "../redis";
import { REDIS_KEYS } from "../utils/redis-key";
import { getKstTime } from "../utils/misc";
import _ from "lodash";
import { ChainNames, generateOptionTokenData, getMainOptionName, getPairedOptionName, isSpreadStrategy, parseOptionTokenId, Strategy, UA_INDEX_TO_DECIMAL, UnderlyingAssetIndex } from "@callput/shared";
import { REDEPLOYED_BLOCK_TIME } from "../constants";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface PositionData {
  message: string;
  isBig: boolean;
}

const MAX_NOTIFY_POSITIONS = 30;
const MIN_PREMIUM_TO_TAG = 2000;
const TYPES = ["open", "close"];

export const notifyPositions = async () => {
  // read last cursor from redis
  const lastCursor = await getCursor();
  const { nodes: openNodes, filteredNodes: openFilteredNodes, positionData: openPositionData } = await generateDataByType("open", lastCursor);
  const { nodes: closeNodes, filteredNodes: closeFilteredNodes, positionData: closePositionData } = await generateDataByType("close", lastCursor);
  if (isEmptyCursor(lastCursor)) {
    // init
    await initializeLastCursor(openNodes, closeNodes);
    return;
  }

  const { combinedMessage, bigPositionExists } = createCombinedMessage(openPositionData, closePositionData);
  if (!combinedMessage) return;

  const isSuccess = await sendMessage("PositionHistory", LogLevel.INFO, {
    description: combinedMessage,
    isTrade: true,
    ...(bigPositionExists && { tags: [SlackTag.ALL] })
  });

  if (!isSuccess) {
    console.log("Failed to send message to slack");
  } else {
    await setCursor({
      open: openFilteredNodes.length > 0 ? openFilteredNodes[openFilteredNodes.length - 1].requestIndex : lastCursor.open,
      close: closeFilteredNodes.length > 0 ? closeFilteredNodes[closeFilteredNodes.length - 1].requestIndex : lastCursor.close,
    });
  }
};

function generatePositionData(nodes: any[]): PositionData[] {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  return nodes.filter((node) => TYPES.includes(node.type)).map((node) => {
    const tradeType = node.collateralToken ? "Buy" : "Sell";
    const { strategy, mainOptionName, pairedOptionName } = getDataFromOptionTokenId(node.optionTokenId);
    const sizeInNumber = new BigNumber(node.size)
      .dividedBy(10 ** UA_INDEX_TO_DECIMAL[chainName][Number(node.underlyingAssetIndex) as UnderlyingAssetIndex])
      .toNumber();
    const parsedSize = advancedFormatNumber(sizeInNumber, 2, "");
    const premium = calculatePremium(sizeInNumber, String(node.executionPrice));
    const parsedPremium = advancedFormatNumber(premium, 2, "");
    const NakedOrSpread = isSpreadStrategy(strategy) ? "Spread" : "Naked";
    const isBig = premium > MIN_PREMIUM_TO_TAG;
    const imogi = isBig ? "🔥" : "";
    const message = `[\`${getKstTime(Number(node.processBlockTime) * 1000)}\`][\`${node.type}\`] ${imogi} \`${mainOptionName}\` ${pairedOptionName ? " / `" + pairedOptionName + "`" : ""} / ${NakedOrSpread} / ${tradeType} / Qty. ${parsedSize} / $${parsedPremium}`;
    return { message, isBig };
  })
}

function getDataFromOptionTokenId(optionTokenId: string): {
  strategy: Strategy;
  mainOptionName: string;
  pairedOptionName: string;
} {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];
  
  const optionTokenIdBigInt = BigInt(optionTokenId);
  const { optionNames } = generateOptionTokenData(chainName, optionTokenIdBigInt);
  const { strategy, length } = parseOptionTokenId(optionTokenIdBigInt);
  const mainOptionName = getMainOptionName(optionTokenIdBigInt, optionNames);
  const pairedOptionName = length === 2 ? getPairedOptionName(optionTokenIdBigInt, optionNames) : "";
  return { strategy, mainOptionName, pairedOptionName };
}

function createCombinedMessage(openPositionData: PositionData[], closePositionData: PositionData[]): { combinedMessage: string, bigPositionExists: boolean } {
  const positionData = [...openPositionData, ...closePositionData];
  const bigPositionExists = positionData.some((position) => position.isBig);
  let combinedMessage = positionData.map((position) => position.message).join("\n");
  return { combinedMessage, bigPositionExists };
}

function calculatePremium(size: number, executionPrice: string) {
  return new BigNumber(executionPrice)
    .dividedBy(10 ** 30)
    .multipliedBy(size)
    .toNumber();
}

async function generateDataByType(type: "open" | "close", lastCursor: { open: number, close: number }) {
  const filter = {
    requestIndex: { greaterThan: lastCursor[type] },
    type: { like: type },
    processBlockTime: { greaterThan: REDEPLOYED_BLOCK_TIME / 1000 }
  };

  const { nodes } = await getPositionHistoryWithFilter(filter);
  nodes.sort((a, b) => a.requestIndex - b.requestIndex);

  const filteredNodes = nodes.slice(0, MAX_NOTIFY_POSITIONS);
  const positionData = generatePositionData(filteredNodes);

  return { nodes, filteredNodes, positionData };
}

function isEmptyCursor(lastCursor: { open: number, close: number }) {
  return lastCursor.open === 0 && lastCursor.close === 0;
}

const getCursor = async (): Promise<{ open: number, close: number }> => {
  try {
    const { redis } = await initializeRedis();
    const cursor = JSON.parse(await redis.get(REDIS_KEYS.NOTIFY_POSITION_CURSOR)) || {
      open: 0,
      close: 0,
    };
    return {
      open: Number(cursor.open),
      close: Number(cursor.close),
    };
  } catch (error) {
    console.log("[lambda][notify.positions.ts] Failed to get last cursor from Redis", error);
    throw error;
  }
};

const setCursor = async (lastCursor: { open: number, close: number }) => {
  try {
    const { redis } = await initializeRedis();
    await redis.set(REDIS_KEYS.NOTIFY_POSITION_CURSOR, JSON.stringify(lastCursor));
  } catch (error) {
    console.log("[lambda][notify.positions.ts] Failed to set last cursor in Redis", error);
    throw error;
  }
};

async function initializeLastCursor(openNodes: any[], closeNodes: any[]) {
  await setCursor({
    open: openNodes.length > 0 ? openNodes[openNodes.length - 1].requestIndex - 60 : 0,
    close: closeNodes.length > 0 ? closeNodes[closeNodes.length - 1].requestIndex - 60 : 0,
  });
}