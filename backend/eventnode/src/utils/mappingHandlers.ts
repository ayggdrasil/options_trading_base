import BigNumber from 'bignumber.js';
import {
  advancedFormatNumber,
  generatePositionDataToStr,
  getMainOptionName,
  getMainOptionStrikePrice,
  getOptionInstrument,
  getPairedOptionName,
  isBuy,
  isCall,
  isSpread,
  parseOptionTokenId,
} from './format';
import { Position } from '../entity/position';
import { CollectFee } from '../entity/collectFee';
import { SettlePrice } from '../entity/settlePrice';
import { queryRunner } from '../sync';
import { PositionHistory } from '../entity/positionHistory';
import { calculateAvgPriceWithSize } from './calculations';
import { createTransferHistoryRecord, isVault } from './helper';
import {
  OA_ADDRESS_TO_DECIMAL,
  OLP_MANAGER_ADDRESS_TO_OLP_ADDRESS,
  ONE_DAY,
  UNDERLYING_ASSET_ADDRESS_TO_TICKER,
  UNDERLYING_ASSET_INDEX_TO_DECIMALS,
  UNDERLYING_ASSET_INDEX_TO_TICKER,
  UNDERLYING_ASSET_TICKER_TO_DECIMALS,
  VAULT_INDEX_TO_NAME,
  VAULT_UTILS_ADDRESS_TO_OLP_KEY,
} from './constants';
import { DailyNotionalVolumeAndExecutionPrice } from '../entity/dailyNotionalVolumeAndExecutionPrice';
import { redis } from '../redis';
import { BuySellUsdg } from '../entity/buySellUsdg';
import { AddLiquidity } from '../entity/addLiquidity';
import { RemoveLiquidity } from '../entity/removeLiquidity';
import {
  applyFeePoint,
  applyTradePoint,
  deregisterOLPDeposit,
  registerOLPDeposit,
  registerParent,
} from './points';
import { CollectPositionFee } from '../entity/collectPositionFee';
import { SyncedRequestIndex } from '../entity/syncedRequestIndex';
import { OptionType } from 'dayjs';
import { NotifyPendingAmount } from '../entity/notifyPendingAmount';
import { FeeRebate } from '../entity/feeRebate';
import { updateRebates } from './feeRebates';
import { CopyTradePositionHistory } from '../entity/copyTradePositionHistory';
import { OlpQueueItem } from '../entity/olpQueueItem';

import { CONTRACT_ADDRESSES } from '../addresses';

export async function handleOptionTokenTransfer(log: any): Promise<void> {
  console.log(`New handleOptionTokenTransfer log at block ${log.blockNumber}`);

  const from = log.args.from;
  const to = log.args.to;
  const optionTokenId = BigInt(log.args.id);
  const size = log.args.value;

  const transferLogIgnoreList = [
    '0x' + '0'.repeat(40),
    CONTRACT_ADDRESSES[process.env.CHAIN_ID].POSITION_MANAGER,
    CONTRACT_ADDRESSES[process.env.CHAIN_ID].SETTLE_MANAGER,
    CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT,
    CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT,
    CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT,
  ];
  if (transferLogIgnoreList.includes(from)) return;
  if (transferLogIgnoreList.includes(to)) return;

  const { underlyingAssetIndex, expiry, strategy } = parseOptionTokenId(optionTokenId);
  const isBuyStrategy = isBuy(strategy);

  // From part
  const from_id = `${from}-${optionTokenId}`;
  const to_id = `${to}-${optionTokenId}`;
  const from_existingPosition: Position = await queryRunner.manager.findOne(Position, {
    where: { id: from_id },
  });

  if (!from_existingPosition) return;

  const fromNextSize = new BigNumber(from_existingPosition.size).minus(size).toString();
  const fromNextSizeTransferredOut = new BigNumber(from_existingPosition.sizeTransferredOut)
    .plus(size)
    .toString();

  if (isBuyStrategy) {
    const transferredOpenedAmount = new BigNumber(from_existingPosition.openedAmount)
      .multipliedBy(size)
      .dividedBy(from_existingPosition.size)
      .toString();
    const fromNextOpenedAmount = new BigNumber(from_existingPosition.openedAmount)
      .minus(transferredOpenedAmount)
      .toString();

    const newLog = {
      args: {
        optionTokenId: String(optionTokenId),
        account: to,
        size: size,
        executionPrice: from_existingPosition.executionPrice,
        amountPaid: transferredOpenedAmount,
        spotPrice: from_existingPosition.openedAvgSpotPrice,
        underlyingAssetIndex: underlyingAssetIndex,
        expiry: expiry,
        quoteToken: from_existingPosition.openedToken,
      },
      block: log.block || { timestamp: Math.floor(Date.now() / 1000) },
      blockNumber: log.blockNumber || 0,
    };

    await handleOpenBuyPosition(newLog, true);

    from_existingPosition.size = fromNextSize;
    from_existingPosition.sizeTransferredOut = fromNextSizeTransferredOut;
    from_existingPosition.openedAmount = fromNextOpenedAmount;
    from_existingPosition.lastProcessBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(from_existingPosition);

    const fromTransferHistoryRecord = createTransferHistoryRecord({
      id: `${from_id}-${log.block.timestamp}`,
      account: from,
      type: 'transferOut',
      position: from_existingPosition,
      size: String(size),
      underlyingAssetIndex: underlyingAssetIndex,
      expiry: expiry,
      blockTimestamp: String(log.block.timestamp),
      transferredAmount: transferredOpenedAmount,
    });

    const toTransferHistoryRecord = createTransferHistoryRecord({
      id: `${to_id}-${log.block.timestamp}`,
      account: to,
      type: 'transferIn',
      position: from_existingPosition,
      size: String(size),
      underlyingAssetIndex,
      expiry,
      blockTimestamp: String(log.block.timestamp),
      transferredAmount: transferredOpenedAmount,
    });

    await queryRunner.manager.save(fromTransferHistoryRecord);
    await queryRunner.manager.save(toTransferHistoryRecord);
  } else {
    const transferredCollateralAmount = new BigNumber(from_existingPosition.openedCollateralAmount)
      .multipliedBy(size)
      .dividedBy(from_existingPosition.size)
      .toString();

    const fromNextOpenedCollateralAmount = new BigNumber(from_existingPosition.openedCollateralAmount)
      .minus(transferredCollateralAmount)
      .toString();

    const newLog = {
      args: {
        optionTokenId: String(optionTokenId),
        account: to,
        size: size,
        executionPrice: from_existingPosition.executionPrice,
        amountReceived: String(0),
        collateralAmount: transferredCollateralAmount,
        spotPrice: from_existingPosition.openedAvgSpotPrice,
        underlyingAssetIndex: underlyingAssetIndex,
        expiry: expiry,
        quoteToken: from_existingPosition.openedToken,
        collateralToken: from_existingPosition.openedCollateralToken,
      },
      block: log.block || { timestamp: Math.floor(Date.now() / 1000) },
      blockNumber: log.blockNumber || 0,
    };

    await handleOpenSellPosition(newLog, true);

    from_existingPosition.size = fromNextSize;
    from_existingPosition.sizeTransferredOut = fromNextSizeTransferredOut;
    from_existingPosition.openedCollateralAmount = fromNextOpenedCollateralAmount;
    from_existingPosition.lastProcessBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(from_existingPosition);

    const fromTransferHistoryRecord = createTransferHistoryRecord({
      id: `${from_id}-${log.block.timestamp}`,
      account: from,
      type: 'transferOut',
      position: from_existingPosition,
      size: String(size),
      underlyingAssetIndex,
      expiry,
      blockTimestamp: String(log.block.timestamp),
      transferredCollateralAmount: transferredCollateralAmount,
    });

    const toTransferHistoryRecord = createTransferHistoryRecord({
      id: `${to_id}-${log.block.timestamp}`,
      account: to,
      type: 'transferIn',
      position: from_existingPosition,
      size: String(size),
      underlyingAssetIndex,
      expiry,
      blockTimestamp: String(log.block.timestamp),
      transferredCollateralAmount: transferredCollateralAmount,
    });

    await queryRunner.manager.save(fromTransferHistoryRecord);
    await queryRunner.manager.save(toTransferHistoryRecord);
  }
}

export async function handleCreateClosePosition(log: any): Promise<void> {
  console.log(`New handleCreateClosePosition log at block ${log.blockNumber}`);

  const optionTokenId = BigInt(log.args.optionTokenId);

  const _id = `${log.args.account}-${optionTokenId}`;

  const existingPosition: Position = await queryRunner.manager.findOne(Position, { where: { id: _id } });

  if (existingPosition) {
    const nextSize = new BigNumber(existingPosition.size).minus(log.args.size).toString();
    const nextSizeClosing = new BigNumber(existingPosition.sizeClosing).plus(log.args.size).toString();

    existingPosition.size = nextSize;
    existingPosition.sizeClosing = nextSizeClosing;

    await queryRunner.manager.save(existingPosition);
  }
}

export async function handleCancelClosePosition(log: any): Promise<void> {
  console.log(`New handleCancelClosePosition log at block ${log.blockNumber}`);

  const optionTokenId = BigInt(log.args.optionTokenId);

  const _id = `${log.args.account}-${optionTokenId}`;

  const existingPosition: Position = await queryRunner.manager.findOne(Position, { where: { id: _id } });

  if (existingPosition) {
    const nextSize = new BigNumber(existingPosition.size).plus(log.args.size).toString();
    const nextSizeClosing = new BigNumber(existingPosition.sizeClosing).minus(log.args.size).toString();

    existingPosition.size = nextSize;
    existingPosition.sizeClosing = nextSizeClosing;

    await queryRunner.manager.save(existingPosition);
  }
}

export async function handleOpenBuyPosition(log: any, isTransfer: boolean = false): Promise<void> {
  console.log(`New handleOpenBuyPosition log at block ${log.blockNumber}`);
  const optionTokenId = BigInt(log.args.optionTokenId);
  const _id = `${log.args.account}-${optionTokenId}`;

  // 1. update position
  const existingPosition: Position = await queryRunner.manager.findOne(Position, { where: { id: _id } });
  let avgExecutionPrice = '0';

  if (existingPosition) {
    avgExecutionPrice = existingPosition.openedAvgExecutionPrice;

    const nextSize = new BigNumber(existingPosition.size).plus(log.args.size).toString();
    const nextExecutionPrice = calculateAvgPriceWithSize(
      existingPosition.size,
      existingPosition.executionPrice,
      log.args.size,
      log.args.executionPrice,
    );

    const nextSizeOpened = new BigNumber(existingPosition.sizeOpened).plus(log.args.size).toString();
    const nextSizeTransferredIn = new BigNumber(existingPosition.sizeTransferredIn)
      .plus(log.args.size)
      .toString();
    const nextOpenedAmount = new BigNumber(existingPosition.openedAmount)
      .plus(log.args.amountPaid)
      .toString();
    const nextOpenedAvgExecutionPrice = calculateAvgPriceWithSize(
      existingPosition.sizeOpened,
      existingPosition.openedAvgExecutionPrice,
      log.args.size,
      log.args.executionPrice,
    );
    const nextOpenedAvgSpotPrice = calculateAvgPriceWithSize(
      existingPosition.sizeOpened,
      existingPosition.openedAvgSpotPrice,
      log.args.size,
      log.args.spotPrice,
    );

    existingPosition.size = nextSize;
    existingPosition.executionPrice = nextExecutionPrice;

    existingPosition.sizeOpened = nextSizeOpened;
    existingPosition.sizeTransferredIn = nextSizeTransferredIn;
    existingPosition.openedAmount = nextOpenedAmount;
    existingPosition.openedAvgExecutionPrice = nextOpenedAvgExecutionPrice;
    existingPosition.openedAvgSpotPrice = nextOpenedAvgSpotPrice;

    existingPosition.lastProcessBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(existingPosition);
  } else {
    const { length, isBuys, strikePrices, isCalls, optionNames } = generatePositionDataToStr(optionTokenId);

    const record = new Position({
      id: _id,
      account: log.args.account,
      underlyingAssetIndex: String(log.args.underlyingAssetIndex),
      expiry: String(log.args.expiry),
      optionTokenId: String(optionTokenId),
      length: String(length),
      isBuys: isBuys,
      strikePrices: strikePrices,
      isCalls: isCalls,
      optionNames: optionNames,
      size: String(log.args.size),
      sizeOpened: String(log.args.size),
      sizeClosing: String(0),
      sizeClosed: String(0),
      sizeSettled: String(0),
      sizeTransferredIn: isTransfer ? String(log.args.size) : String(0),
      sizeTransferredOut: String(0),
      isBuy: true,
      executionPrice: String(log.args.executionPrice),
      openedToken: log.args.quoteToken, // for buy position, openToken is usdc
      openedAmount: String(log.args.amountPaid), // for buy position, openAmount is amountPaid
      openedCollateralToken: '',
      openedCollateralAmount: String(0),
      openedAvgExecutionPrice: String(log.args.executionPrice),
      openedAvgSpotPrice: String(log.args.spotPrice),
      closedToken: '',
      closedAmount: String(0),
      closedCollateralToken: '',
      closedCollateralAmount: String(0),
      closedAvgExecutionPrice: String(0),
      closedAvgSpotPrice: String(0),
      settledToken: '',
      settledAmount: String(0),
      settledCollateralToken: '',
      settledCollateralAmount: String(0),
      settledPrice: String(0),
      isSettled: false,
      lastProcessBlockTime: String(log.block.timestamp),
    });

    await queryRunner.manager.save(record);
  }

  if (isTransfer) return;

  // 2. update position history
  const positionHistoryRecord = new PositionHistory({
    id: `${_id}-${log.block.timestamp}`,
    account: log.args.account,
    requestIndex: String(log.args.requestIndex),
    underlyingAssetIndex: String(log.args.underlyingAssetIndex),
    expiry: String(log.args.expiry),
    type: 'open',
    optionTokenId: String(optionTokenId),
    size: String(log.args.size),
    quoteToken: log.args.quoteToken, // BuyCall, BuyPut, BuyCallSpread, BuyPutSpread => USDC
    quoteAmount: String(log.args.amountPaid),
    collateralToken: '',
    collateralAmount: String(0),
    executionPrice: String(log.args.executionPrice),
    avgExecutionPrice: avgExecutionPrice,
    settlePrice: String(0),
    settlePayoff: String(0),
    spotPrice: String(log.args.spotPrice),
    cashFlow: new BigNumber(log.args.size) // 96697643
      .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex]) // 1.234
      .multipliedBy(log.args.executionPrice) // 1.234 * 100 * 10**30
      .multipliedBy(-1)
      .toString(),
    pnl: String(0),
    roi: String(0),
    processBlockTime: String(log.block.timestamp),
  });

  await queryRunner.manager.save(positionHistoryRecord);

  const { strategy } = parseOptionTokenId(BigInt(optionTokenId));
  if (
    Math.abs(Number(log.args.expiry) - Number(log.block.timestamp)) < ONE_DAY &&
    isBuy(strategy) &&
    isSpread(strategy)
  ) {
    const copyTradePositionHistoryRecord = new CopyTradePositionHistory({
      id: `${_id}-${log.block.timestamp}`,
      account: log.args.account,
      requestIndex: String(log.args.requestIndex),
      underlyingAssetIndex: String(log.args.underlyingAssetIndex),
      expiry: String(log.args.expiry),
      optionTokenId: String(optionTokenId),
      size: String(log.args.size),
      quoteToken: log.args.quoteToken,
      quoteAmount: String(log.args.amountPaid),
      executionPrice: String(log.args.executionPrice),
      spotPrice: String(log.args.spotPrice),
      processBlockTime: String(log.block.timestamp),
    });
    await queryRunner.manager.save(copyTradePositionHistoryRecord);
  }

  // 3. point
  if (!isVault(log.args.account)) {
    await applyTradePoint(log, log.args.account.toLowerCase());
  }

  // 4. request index
  const syncedRequestIndex: SyncedRequestIndex =
    (await SyncedRequestIndex.get(0)) || new SyncedRequestIndex({ id: 0 });
  syncedRequestIndex.requestIndex = String(log.args.requestIndex);
  syncedRequestIndex.processBlockTime = String(log.block.timestamp);

  await syncedRequestIndex.save();
  await redis.set(
    `syncedRequestIndex`,
    JSON.stringify({
      requestIndex: String(log.args.requestIndex),
      processBlockTime: String(log.block.timestamp),
    }),
  );

  if (!isVault(log.args.account)) {
    await increaseNotionalVolume(
      // 5. increase notional volume
      optionTokenId,
      log.args.size,
      log.args.spotPrice,
      log.block.timestamp,
    );

    await increaseExecutionPrice(
      // 6. increase execution price
      optionTokenId,
      log.args.size,
      log.args.executionPrice,
      log.block.timestamp,
    );
  }
}

export async function handleOpenSellPosition(log: any, isTransfer: boolean = false): Promise<void> {
  console.log(`New handleOpenSellPosition log at block ${log.blockNumber}`);
  const optionTokenId = BigInt(log.args.optionTokenId);
  const _id = `${log.args.account}-${optionTokenId}`;

  // 1. update existing position
  const existingPosition: Position = await queryRunner.manager.findOne(Position, { where: { id: _id } });
  let avgExecutionPrice = '0';

  if (existingPosition) {
    avgExecutionPrice = existingPosition.openedAvgExecutionPrice;

    const nextSize = new BigNumber(existingPosition.size).plus(log.args.size).toString();
    const nextExecutionPrice = calculateAvgPriceWithSize(
      existingPosition.size,
      existingPosition.executionPrice,
      log.args.size,
      log.args.executionPrice,
    );

    const nextSizeOpened = new BigNumber(existingPosition.sizeOpened).plus(log.args.size).toString();
    const nextSizeTransferredIn = new BigNumber(existingPosition.sizeTransferredIn)
      .plus(log.args.size)
      .toString();
    const nextOpenedAmount = new BigNumber(existingPosition.openedAmount)
      .plus(log.args.amountReceived)
      .toString();
    const nextOpenedCollateralAmount = new BigNumber(existingPosition.openedCollateralAmount)
      .plus(log.args.collateralAmount)
      .toString();
    const nextOpenedAvgExecutionPrice = calculateAvgPriceWithSize(
      existingPosition.sizeOpened,
      existingPosition.openedAvgExecutionPrice,
      log.args.size,
      log.args.executionPrice,
    );
    const nextOpenedAvgSpotPrice = calculateAvgPriceWithSize(
      existingPosition.sizeOpened,
      existingPosition.openedAvgSpotPrice,
      log.args.size,
      log.args.spotPrice,
    );

    existingPosition.size = nextSize;
    existingPosition.executionPrice = nextExecutionPrice;

    existingPosition.sizeOpened = nextSizeOpened;
    existingPosition.sizeTransferredIn = nextSizeTransferredIn;
    existingPosition.openedAmount = nextOpenedAmount;
    existingPosition.openedCollateralAmount = nextOpenedCollateralAmount;
    existingPosition.openedAvgExecutionPrice = nextOpenedAvgExecutionPrice;
    existingPosition.openedAvgSpotPrice = nextOpenedAvgSpotPrice;

    existingPosition.lastProcessBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(existingPosition);
  } else {
    const { length, isBuys, strikePrices, isCalls, optionNames } = generatePositionDataToStr(optionTokenId);

    const record = new Position({
      id: _id,
      account: log.args.account,
      underlyingAssetIndex: String(log.args.underlyingAssetIndex),
      expiry: String(log.args.expiry),
      optionTokenId: String(optionTokenId),
      length: String(length),
      isBuys: isBuys,
      strikePrices: strikePrices,
      isCalls: isCalls,
      optionNames: optionNames,
      size: String(log.args.size),
      sizeOpened: String(log.args.size),
      sizeClosing: String(0),
      sizeClosed: String(0),
      sizeSettled: String(0),
      sizeTransferredIn: isTransfer ? String(log.args.size) : String(0),
      sizeTransferredOut: String(0),
      isBuy: false,
      executionPrice: String(log.args.executionPrice),
      openedToken: log.args.quoteToken, // for sell position, openToken is usdc
      openedAmount: String(log.args.amountReceived), // for sell position, openAmount is amountReceived
      openedCollateralToken: log.args.collateralToken,
      openedCollateralAmount: String(log.args.collateralAmount),
      openedAvgExecutionPrice: String(log.args.executionPrice),
      openedAvgSpotPrice: String(log.args.spotPrice),
      closedToken: '',
      closedAmount: String(0),
      closedCollateralToken: '',
      closedCollateralAmount: String(0),
      closedAvgExecutionPrice: String(0),
      closedAvgSpotPrice: String(0),
      settledToken: '',
      settledAmount: String(0),
      settledCollateralToken: '',
      settledCollateralAmount: String(0),
      settledPrice: String(0),
      isSettled: false,
      lastProcessBlockTime: String(log.block.timestamp),
    });

    await queryRunner.manager.save(record);
  }

  if (isTransfer) return;

  // 2. update position history
  const positionHistoryRecord = new PositionHistory({
    id: `${_id}-${log.block.timestamp}`,
    account: log.args.account,
    requestIndex: String(log.args.requestIndex),
    underlyingAssetIndex: String(log.args.underlyingAssetIndex),
    expiry: String(log.args.expiry),
    type: 'open',
    optionTokenId: String(optionTokenId),
    size: String(log.args.size),
    quoteToken: log.args.quoteToken, // SellCall, SellPut, SellCallSpread, SellPutSpread => USDC
    quoteAmount: String(log.args.amountReceived),
    collateralToken: log.args.collateralToken,
    collateralAmount: String(log.args.collateralAmount),
    executionPrice: String(log.args.executionPrice),
    avgExecutionPrice: avgExecutionPrice,
    settlePrice: String(0),
    settlePayoff: String(0),
    spotPrice: String(log.args.spotPrice),
    cashFlow: new BigNumber(log.args.size) // 1 * 10**8
      .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex]) // 1
      .multipliedBy(log.args.executionPrice) // size * executionPrice
      .toString(),
    pnl: String(0),
    roi: String(0),
    processBlockTime: String(log.block.timestamp),
  });

  await queryRunner.manager.save(positionHistoryRecord);

  // 3. point
  if (!isVault(log.args.account)) {
    await applyTradePoint(log, log.args.account.toLowerCase());
  }

  // 4. request index
  const syncedRequestIndex: SyncedRequestIndex =
    (await SyncedRequestIndex.get(0)) || new SyncedRequestIndex({ id: 0 });
  syncedRequestIndex.requestIndex = String(log.args.requestIndex);
  syncedRequestIndex.processBlockTime = String(log.block.timestamp);

  await syncedRequestIndex.save();
  await redis.set(
    `syncedRequestIndex`,
    JSON.stringify({
      requestIndex: String(log.args.requestIndex),
      processBlockTime: String(log.block.timestamp),
    }),
  );

  if (!isVault(log.args.account)) {
    await increaseNotionalVolume(
      // 5. increase notional volume
      optionTokenId,
      log.args.size,
      log.args.spotPrice,
      log.block.timestamp,
    );

    await increaseExecutionPrice(
      // 6. increase execution price
      optionTokenId,
      log.args.size,
      log.args.executionPrice,
      log.block.timestamp,
    );
  }
}

export async function handleCloseBuyPosition(log: any): Promise<void> {
  console.log(`New handleCloseBuyPosition log at block ${log.blockNumber}`);
  const optionTokenId = BigInt(log.args.optionTokenId);
  const _id = `${log.args.account}-${optionTokenId}`;

  const existingPosition: Position = await queryRunner.manager.findOne(Position, { where: { id: _id } });

  // 1. update position history (should in this order)
  // 2. update position
  if (existingPosition) {
    if (existingPosition.closedToken === '') {
      existingPosition.closedToken = log.args.quoteToken;
    }

    // 1. update position history
    const profitPerUnit = new BigNumber(log.args.executionPrice)
      .minus(existingPosition.executionPrice)
      .toString();
    const pnl = new BigNumber(log.args.size) // 0.5 * 10**8
      .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex]) // 0.5
      .multipliedBy(profitPerUnit) // 0.5 * profitPerUnit
      .toString();
    const roi = new BigNumber(profitPerUnit)
      .div(existingPosition.executionPrice)
      .multipliedBy(100)
      .toString();

    const positionHistoryRecord = new PositionHistory({
      id: `${_id}-${log.block.timestamp}`,
      account: log.args.account,
      requestIndex: String(log.args.requestIndex),
      underlyingAssetIndex: String(log.args.underlyingAssetIndex),
      expiry: String(log.args.expiry),
      type: 'close',
      optionTokenId: String(optionTokenId),
      size: String(log.args.size),
      quoteToken: log.args.quoteToken,
      quoteAmount: String(log.args.amountReceived),
      collateralToken: '',
      collateralAmount: String(0),
      executionPrice: String(log.args.executionPrice),
      avgExecutionPrice: existingPosition.executionPrice,
      settlePrice: String(0),
      settlePayoff: String(0),
      spotPrice: String(log.args.spotPrice),
      cashFlow: new BigNumber(log.args.size)
        .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex])
        .multipliedBy(log.args.executionPrice)
        .toString(),
      pnl: pnl,
      roi: roi,
      processBlockTime: String(log.block.timestamp),
    });

    await queryRunner.manager.save(positionHistoryRecord);

    // 2. update position
    const nextSizeClosed = new BigNumber(existingPosition.sizeClosed).plus(log.args.size).toString();
    const nextClosedAmount = new BigNumber(existingPosition.closedAmount)
      .plus(log.args.amountReceived)
      .toString();
    const nextClosedAvgExecutionPrice = calculateAvgPriceWithSize(
      existingPosition.sizeClosed,
      existingPosition.closedAvgExecutionPrice,
      log.args.size,
      log.args.executionPrice,
    );
    const nextClosedAvgSpotPrice = calculateAvgPriceWithSize(
      existingPosition.sizeClosed,
      existingPosition.closedAvgSpotPrice,
      log.args.size,
      log.args.spotPrice,
    );

    if (isVault(log.args.account)) {
      const nextSize = new BigNumber(existingPosition.size).minus(log.args.size).toString();
      existingPosition.size = nextSize;
    } else {
      const nextSizeClosing = new BigNumber(existingPosition.sizeClosing).minus(log.args.size).toString();
      existingPosition.sizeClosing = nextSizeClosing;
    }

    existingPosition.sizeClosed = nextSizeClosed;
    existingPosition.closedAmount = nextClosedAmount;
    existingPosition.closedAvgExecutionPrice = nextClosedAvgExecutionPrice;
    existingPosition.closedAvgSpotPrice = nextClosedAvgSpotPrice;
    existingPosition.lastProcessBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(existingPosition);

    // 3. point
    if (!isVault(log.args.account)) {
      await applyTradePoint(log, log.args.account.toLowerCase());
    }

    // 4. request index
    const syncedRequestIndex: SyncedRequestIndex =
      (await SyncedRequestIndex.get(0)) || new SyncedRequestIndex({ id: 0 });
    syncedRequestIndex.requestIndex = String(log.args.requestIndex);
    syncedRequestIndex.processBlockTime = String(log.block.timestamp);

    await syncedRequestIndex.save();
    await redis.set(
      `syncedRequestIndex`,
      JSON.stringify({
        requestIndex: String(log.args.requestIndex),
        processBlockTime: String(log.block.timestamp),
      }),
    );

    if (!isVault(log.args.account)) {
      await increaseNotionalVolume(
        // 5. increase notional volume
        optionTokenId,
        log.args.size,
        log.args.spotPrice,
        log.block.timestamp,
      );

      await increaseExecutionPrice(
        // 6. increase execution price
        optionTokenId,
        log.args.size,
        log.args.executionPrice,
        log.block.timestamp,
      );
    }
  }
}

export async function handleCloseSellPosition(log: any): Promise<void> {
  console.log(`New handleCloseSellPosition log at block ${log.blockNumber}`);
  const optionTokenId = BigInt(log.args.optionTokenId);
  const _id = `${log.args.account}-${optionTokenId}`;

  const existingPosition: Position = await queryRunner.manager.findOne(Position, { where: { id: _id } });

  // 1. update position history (should in this order)
  // 2. update position
  if (existingPosition) {
    if (existingPosition.closedToken === '') {
      existingPosition.closedToken = log.args.quoteToken;
    }

    if (existingPosition.closedCollateralToken === '') {
      existingPosition.closedCollateralToken = log.args.collateralToken;
    }

    // 1. update position history
    const profitPerUnit = new BigNumber(existingPosition.executionPrice)
      .minus(log.args.executionPrice)
      .toString();
    const pnl = new BigNumber(log.args.size)
      .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex])
      .multipliedBy(profitPerUnit)
      .toString();
    const roi = new BigNumber(profitPerUnit)
      .div(existingPosition.executionPrice)
      .multipliedBy(100)
      .toString();

    const positionHistoryRecord = new PositionHistory({
      id: `${_id}-${log.block.timestamp}`,
      account: log.args.account,
      requestIndex: String(log.args.requestIndex),
      underlyingAssetIndex: String(log.args.underlyingAssetIndex),
      expiry: String(log.args.expiry),
      type: 'close',
      optionTokenId: String(optionTokenId),
      size: String(log.args.size),
      quoteToken: log.args.quoteToken,
      quoteAmount: String(log.args.amountPaid),
      collateralToken: log.args.collateralToken,
      collateralAmount: String(log.args.collateralAmount),
      executionPrice: String(log.args.executionPrice),
      avgExecutionPrice: existingPosition.executionPrice,
      settlePrice: String(0),
      settlePayoff: String(0),
      spotPrice: String(log.args.spotPrice),
      cashFlow: new BigNumber(log.args.size)
        .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex])
        .multipliedBy(log.args.executionPrice)
        .multipliedBy(-1)
        .toString(),
      pnl: pnl,
      roi: roi,
      processBlockTime: String(log.block.timestamp),
    });

    await queryRunner.manager.save(positionHistoryRecord);

    // 2. update existing position
    const nextSizeClosed = new BigNumber(existingPosition.sizeClosed).plus(log.args.size).toString();
    const nextClosedAmount = new BigNumber(existingPosition.closedAmount)
      .plus(log.args.amountPaid)
      .toString();
    const nextClosedCollateralAmount = new BigNumber(existingPosition.closedCollateralAmount)
      .plus(log.args.collateralAmount)
      .toString();
    const nextClosedAvgExecutionPrice = calculateAvgPriceWithSize(
      existingPosition.sizeClosed,
      existingPosition.closedAvgExecutionPrice,
      log.args.size,
      log.args.executionPrice,
    );
    const nextClosedAvgSpotPrice = calculateAvgPriceWithSize(
      existingPosition.sizeClosed,
      existingPosition.closedAvgSpotPrice,
      log.args.size,
      log.args.spotPrice,
    );

    if (isVault(log.args.account)) {
      const nextSize = new BigNumber(existingPosition.size).minus(log.args.size).toString();
      existingPosition.size = nextSize;
    } else {
      const nextSizeClosing = new BigNumber(existingPosition.sizeClosing).minus(log.args.size).toString();
      existingPosition.sizeClosing = nextSizeClosing;
    }

    existingPosition.sizeClosed = nextSizeClosed;
    existingPosition.closedAmount = nextClosedAmount;
    existingPosition.closedCollateralAmount = nextClosedCollateralAmount;
    existingPosition.closedAvgExecutionPrice = nextClosedAvgExecutionPrice;
    existingPosition.closedAvgSpotPrice = nextClosedAvgSpotPrice;
    existingPosition.lastProcessBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(existingPosition);

    // 3. point
    if (!isVault(log.args.account)) {
      await applyTradePoint(log, log.args.account.toLowerCase());
    }

    // 4. request index
    const syncedRequestIndex: SyncedRequestIndex =
      (await SyncedRequestIndex.get(0)) || new SyncedRequestIndex({ id: 0 });
    syncedRequestIndex.requestIndex = String(log.args.requestIndex);
    syncedRequestIndex.processBlockTime = String(log.block.timestamp);

    await syncedRequestIndex.save(),
      await redis.set(
        `syncedRequestIndex`,
        JSON.stringify({
          requestIndex: String(log.args.requestIndex),
          processBlockTime: String(log.block.timestamp),
        }),
      );

    if (!isVault(log.args.account)) {
      await increaseNotionalVolume(
        // 5. increase notional volume
        optionTokenId,
        log.args.size,
        log.args.spotPrice,
        log.block.timestamp,
      );

      await increaseExecutionPrice(
        // 6. increase execution price
        optionTokenId,
        log.args.size,
        log.args.executionPrice,
        log.block.timestamp,
      );
    }
  }
}

export async function handleSettleBuyPosition(log: any): Promise<void> {
  console.log(`New handleSettleBuyPosition log at block ${log.blockNumber}`);

  const optionTokenId = BigInt(log.args.optionTokenId);
  const _id = `${log.args.account}-${optionTokenId}`;

  const existingPosition: Position = await queryRunner.manager.findOne(Position, { where: { id: _id } });

  if (existingPosition) {
    if (existingPosition.settledToken === '') {
      existingPosition.settledToken = log.args.quoteToken;
    }

    // 1. update position history
    const strikePrice = getMainOptionStrikePrice(optionTokenId);
    const parsedStrikePrice = new BigNumber(strikePrice).multipliedBy(10 ** 30).toString();

    const { strategy } = parseOptionTokenId(optionTokenId);

    const isItm = isCall(strategy)
      ? new BigNumber(parsedStrikePrice).lt(log.args.settlePrice) // buy call 기준
      : new BigNumber(parsedStrikePrice).gt(log.args.settlePrice); // buy put 기준

    const settlePayoff = isItm
      ? isCall(strategy)
        ? new BigNumber(log.args.settlePrice).minus(parsedStrikePrice).toString()
        : new BigNumber(parsedStrikePrice).minus(log.args.settlePrice).toString()
      : String(0);

    const profitPerUnit = new BigNumber(settlePayoff).minus(existingPosition.executionPrice).toString();
    const pnl = new BigNumber(log.args.size)
      .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex])
      .multipliedBy(profitPerUnit)
      .toString();
    const roi = new BigNumber(profitPerUnit)
      .div(existingPosition.executionPrice)
      .multipliedBy(100)
      .toString();

    const positionHistoryRecord = new PositionHistory({
      id: `${_id}-${log.block.timestamp}`,
      account: log.args.account,
      requestIndex: String(0),
      underlyingAssetIndex: String(log.args.underlyingAssetIndex),
      expiry: String(log.args.expiry),
      type: 'settle',
      optionTokenId: String(optionTokenId),
      size: String(log.args.size),
      quoteToken: log.args.quoteToken,
      quoteAmount: String(log.args.amountReceived),
      collateralToken: '',
      collateralAmount: String(0),
      executionPrice: String(0),
      avgExecutionPrice: existingPosition.executionPrice,
      settlePrice: String(log.args.settlePrice),
      settlePayoff: settlePayoff,
      spotPrice: String(0),
      cashFlow: new BigNumber(log.args.size)
        .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex])
        .multipliedBy(settlePayoff)
        .toString(),
      pnl: pnl,
      roi: roi,
      processBlockTime: String(log.block.timestamp),
    });

    await queryRunner.manager.save(positionHistoryRecord);

    // 2. update existing position
    const nextSize = new BigNumber(existingPosition.size).minus(log.args.size).toString();

    const nextSizeSettled = new BigNumber(existingPosition.sizeSettled).plus(log.args.size).toString();
    const nextSettledAmount = new BigNumber(existingPosition.settledAmount)
      .plus(log.args.amountReceived)
      .toString();
    const nextSettledPrice = calculateAvgPriceWithSize(
      existingPosition.sizeSettled,
      existingPosition.settledPrice,
      log.args.size,
      log.args.settlePrice,
    );

    existingPosition.size = nextSize;

    existingPosition.sizeSettled = nextSizeSettled;
    existingPosition.settledAmount = nextSettledAmount;
    existingPosition.settledPrice = nextSettledPrice;
    existingPosition.isSettled = true;

    existingPosition.lastProcessBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(existingPosition);
  }
}

export async function handleSettleSellPosition(log: any): Promise<void> {
  console.log(`New handleSettleSellPosition log at block ${log.blockNumber}`);

  const optionTokenId = BigInt(log.args.optionTokenId);
  const _id = `${log.args.account}-${optionTokenId}`;
  const existingPosition: Position = await queryRunner.manager.findOne(Position, { where: { id: _id } });

  if (existingPosition) {
    if (existingPosition.settledToken === '') {
      existingPosition.settledToken = log.args.quoteToken;
    }

    if (existingPosition.settledCollateralToken === '') {
      existingPosition.settledCollateralToken = log.args.collateralToken;
    }

    // 1. update position history
    const strikePrice = getMainOptionStrikePrice(optionTokenId);
    const parsedStrikePrice = new BigNumber(strikePrice).multipliedBy(10 ** 30).toString();

    const { strategy } = parseOptionTokenId(optionTokenId);

    const isItm = isCall(strategy)
      ? BigNumber(parsedStrikePrice).lt(log.args.settlePrice) // buy call 기준
      : BigNumber(parsedStrikePrice).gt(log.args.settlePrice); // buy put 기준

    const settlePayoff = isItm
      ? isCall(strategy)
        ? new BigNumber(log.args.settlePrice).minus(parsedStrikePrice).toString()
        : new BigNumber(parsedStrikePrice).minus(log.args.settlePrice).toString()
      : String(0);

    const profitPerUnit = new BigNumber(existingPosition.executionPrice).minus(settlePayoff).toString();
    const pnl = new BigNumber(log.args.size)
      .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex])
      .multipliedBy(profitPerUnit)
      .toString();
    const roi = new BigNumber(profitPerUnit)
      .div(existingPosition.executionPrice)
      .multipliedBy(100)
      .toString();

    const positionHistoryRecord = new PositionHistory({
      id: `${_id}-${log.block.timestamp}`,
      account: log.args.account,
      requestIndex: String(0),
      underlyingAssetIndex: String(log.args.underlyingAssetIndex),
      expiry: String(log.args.expiry),
      type: 'settle',
      optionTokenId: String(optionTokenId),
      size: String(log.args.size),
      quoteToken: log.args.quoteToken,
      quoteAmount: String(log.args.amountPaid),
      collateralToken: log.args.collateralToken,
      collateralAmount: String(log.args.collateralAmount),
      executionPrice: String(0),
      avgExecutionPrice: existingPosition.executionPrice,
      settlePrice: String(log.args.settlePrice),
      settlePayoff: settlePayoff,
      spotPrice: String(0),
      cashFlow: new BigNumber(log.args.size)
        .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[log.args.underlyingAssetIndex])
        .multipliedBy(settlePayoff)
        .multipliedBy(-1)
        .toString(),
      pnl: pnl,
      roi: roi,
      processBlockTime: String(log.block.timestamp),
    });

    await queryRunner.manager.save(positionHistoryRecord);

    // 2. update existing position
    const nextSize = new BigNumber(existingPosition.size).minus(log.args.size).toString();

    const nextSizeSettled = new BigNumber(existingPosition.sizeSettled).plus(log.args.size).toString();
    const nextSettledAmount = new BigNumber(existingPosition.settledAmount)
      .plus(log.args.amountPaid)
      .toString();
    const nextSettledCollateralAmount = new BigNumber(existingPosition.settledCollateralAmount)
      .plus(log.args.collateralAmount)
      .toString();
    const nextSettledPrice = calculateAvgPriceWithSize(
      existingPosition.sizeSettled,
      existingPosition.settledPrice,
      log.args.size,
      log.args.settlePrice,
    );

    existingPosition.size = nextSize;

    existingPosition.sizeSettled = nextSizeSettled;
    existingPosition.settledAmount = nextSettledAmount;
    existingPosition.settledCollateralAmount = nextSettledCollateralAmount;
    existingPosition.settledPrice = nextSettledPrice;
    existingPosition.isSettled = true;

    existingPosition.lastProcessBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(existingPosition);
  }
}

export async function handleClearPosition(log: any): Promise<void> {
  console.log(`New handleClearPosition log at block ${log.blockNumber}`);

  const optionTokenId = log.args.optionTokenId;
  const oppositeOptionTokenId = log.args.oppositeOptionTokenId;

  const _id = `${log.args.vault}-${optionTokenId}`;
  const _opposite_id = `${log.args.vault}-${oppositeOptionTokenId}`;

  const existingPosition: Position = await queryRunner.manager.findOne(Position, { where: { id: _id } });
  const existingOppositePosition: Position = await queryRunner.manager.findOne(Position, {
    where: { id: _opposite_id },
  });

  if (existingPosition) {
    const nextSize = new BigNumber(existingPosition.size).minus(log.args.sizeToClear).toString();
    const nextSizeClosed = new BigNumber(existingPosition.sizeClosed).plus(log.args.sizeToClear).toString();

    const clearRatio = new BigNumber(log.args.sizeToClear).dividedBy(existingPosition.size).toString();

    const estimatedClearedAmountPaid = new BigNumber(existingPosition.openedAmount)
      .multipliedBy(clearRatio)
      .toString();
    const estimatedClearedCollateralAmount = new BigNumber(existingPosition.openedCollateralAmount)
      .multipliedBy(clearRatio)
      .toString();
    const estimatedClearedAvgExecutionPrice = existingPosition.openedAvgExecutionPrice;
    const estimatedClearedAvgSpotPrice = existingPosition.openedAvgSpotPrice;

    let nextClosedAmount = String(0);
    if (estimatedClearedAmountPaid !== '0') {
      nextClosedAmount = new BigNumber(existingPosition.closedAmount)
        .plus(estimatedClearedAmountPaid)
        .toString();
    }

    let nextClosedCollateralAmount = String(0);
    if (estimatedClearedCollateralAmount !== '0') {
      nextClosedCollateralAmount = new BigNumber(existingPosition.closedCollateralAmount)
        .plus(estimatedClearedCollateralAmount)
        .toString();
    }

    const nextClosedAvgExecutionPrice = calculateAvgPriceWithSize(
      existingPosition.sizeClosed,
      existingPosition.closedAvgExecutionPrice,
      log.args.sizeToClear,
      estimatedClearedAvgExecutionPrice,
    );
    const nextClosedAvgSpotPrice = calculateAvgPriceWithSize(
      existingPosition.sizeClosed,
      existingPosition.closedAvgSpotPrice,
      log.args.sizeToClear,
      estimatedClearedAvgSpotPrice,
    );

    existingPosition.size = nextSize;
    existingPosition.sizeClosed = nextSizeClosed;
    existingPosition.closedAmount = nextClosedAmount;
    existingPosition.closedCollateralAmount = nextClosedCollateralAmount;
    existingPosition.closedAvgExecutionPrice = nextClosedAvgExecutionPrice;
    existingPosition.closedAvgSpotPrice = nextClosedAvgSpotPrice;

    existingPosition.lastProcessBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(existingPosition);
  }

  if (existingOppositePosition) {
    const nextSize = new BigNumber(existingOppositePosition.size).minus(log.args.sizeToClear).toString();
    const nextSizeClosed = new BigNumber(existingOppositePosition.sizeClosed)
      .plus(log.args.sizeToClear)
      .toString();

    const clearRatio = new BigNumber(log.args.sizeToClear)
      .dividedBy(existingOppositePosition.size)
      .toString();

    const estimatedClearedAmountPaid = new BigNumber(existingOppositePosition.openedAmount)
      .multipliedBy(clearRatio)
      .toString();
    const estimatedClearedCollateralAmount = new BigNumber(existingOppositePosition.openedCollateralAmount)
      .multipliedBy(clearRatio)
      .toString();
    const estimatedClearedAvgExecutionPrice = existingOppositePosition.openedAvgExecutionPrice;
    const estimatedClearedAvgSpotPrice = existingOppositePosition.openedAvgSpotPrice;

    let nextClosedAmount = String(0);
    if (estimatedClearedAmountPaid !== '0') {
      nextClosedAmount = new BigNumber(existingOppositePosition.closedAmount)
        .plus(estimatedClearedAmountPaid)
        .toString();
    }

    let nextClosedCollateralAmount = String(0);
    if (estimatedClearedCollateralAmount !== '0') {
      nextClosedCollateralAmount = new BigNumber(existingOppositePosition.closedCollateralAmount)
        .plus(estimatedClearedCollateralAmount)
        .toString();
    }

    const nextClosedAvgExecutionPrice = calculateAvgPriceWithSize(
      existingOppositePosition.sizeClosed,
      existingOppositePosition.closedAvgExecutionPrice,
      log.args.sizeToClear,
      estimatedClearedAvgExecutionPrice,
    );

    const nextClosedAvgSpotPrice = calculateAvgPriceWithSize(
      existingOppositePosition.sizeClosed,
      existingOppositePosition.closedAvgSpotPrice,
      log.args.sizeToClear,
      estimatedClearedAvgSpotPrice,
    );

    existingOppositePosition.size = nextSize;
    existingOppositePosition.sizeClosed = nextSizeClosed;
    existingOppositePosition.closedAmount = nextClosedAmount;
    existingOppositePosition.closedCollateralAmount = nextClosedCollateralAmount;
    existingOppositePosition.closedAvgExecutionPrice = nextClosedAvgExecutionPrice;
    existingOppositePosition.closedAvgSpotPrice = nextClosedAvgSpotPrice;

    existingOppositePosition.lastProcessBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(existingOppositePosition);
  }
}

export async function handleFeeRebate(log: any): Promise<void> {
  console.log(`New handleFeeRebate log at block ${log.blockNumber}`);

  const feeRebate = new FeeRebate({
    id: log.transactionHash,
    from: log.args.from,
    to: log.args.to,
    token: log.args.token,
    feeRebateAmount: new BigNumber(log.args.feeRebateAmount).toString(),
    feeAmount: new BigNumber(log.args.feeAmount).toString(),
    afterFeePaidAmount: new BigNumber(log.args.afterFeePaidAmount).toString(),
    tokenSpotPrice: new BigNumber(log.args.tokenSpotPrice).toString(),
    underlyingAsset: log.args.underlyingAsset,
    size: new BigNumber(log.args.size).toString(),
    price: new BigNumber(log.args.price).toString(),
    isSettle: log.args.isSettle,
    isCopyTrade: log.args.isCopyTrade,
  });

  await queryRunner.manager.save(feeRebate);

  const token = String(log.args.token).toLowerCase();
  const tokenSpotPrice = new BigNumber(log.args.tokenSpotPrice).dividedBy(10 ** 30).toNumber();
  const feeRebateUsd = new BigNumber(log.args.feeRebateAmount)
    .dividedBy(10 ** OA_ADDRESS_TO_DECIMAL[token])
    .multipliedBy(tokenSpotPrice)
    .toNumber();
  const totalAmountPaid = new BigNumber(log.args.feeRebateAmount)
    .plus(log.args.feeAmount)
    .plus(log.args.afterFeePaidAmount)
    .toNumber();
  const totalTransactionVolume = new BigNumber(totalAmountPaid)
    .dividedBy(10 ** OA_ADDRESS_TO_DECIMAL[token])
    .multipliedBy(tokenSpotPrice)
    .toNumber();

  const timestamp = log.block.timestamp * 1000;
  const rebatePayer = String(log.args.from).toLowerCase();
  const rebateReceiver = String(log.args.to).toLowerCase();

  if (feeRebate.isCopyTrade) {
    // copy trade case
    await updateRebates(
      'COPY_TRADE_RECEIVED',
      timestamp,
      feeRebateUsd,
      totalTransactionVolume,
      rebateReceiver,
      rebatePayer,
    );
    await updateRebates(
      'COPY_TRADE_PAID',
      timestamp,
      feeRebateUsd,
      totalTransactionVolume,
      rebatePayer,
      rebateReceiver,
    );
  } else {
    // normal trade case
    await updateRebates(
      'RECEIVED',
      timestamp,
      feeRebateUsd,
      totalTransactionVolume,
      rebateReceiver,
      rebatePayer,
    );
    await updateRebates('PAID', timestamp, feeRebateUsd, totalTransactionVolume, rebatePayer, rebateReceiver);
  }
}

export async function handleCollectFees(log: any): Promise<void> {
  console.log(`New handleCollectFees log at block ${log.blockNumber}`);
  const pipeline = redis.pipeline();

  // get YYYY-MM-DD
  const date = new Date(log.block.timestamp * 1000);
  const parsedDate = date.toISOString().split('T')[0];

  const collectFee = new CollectFee({
    id: log.transactionHash,
    token: log.args.token,
    feeUsd: new BigNumber(log.args.feeUsd).toString(),
    feeAmount: new BigNumber(log.args.feeAmount).toString(),
  });

  await queryRunner.manager.save(collectFee);

  const parsedFeeUsd = new BigNumber(log.args.feeUsd).dividedBy(10 ** 30).toString();

  const tokenTicker = UNDERLYING_ASSET_ADDRESS_TO_TICKER[String(log.args.token).toLowerCase()];
  const tokenDecimals = UNDERLYING_ASSET_TICKER_TO_DECIMALS[tokenTicker];
  const parsedFeeAmount = new BigNumber(log.args.feeAmount).dividedBy(10 ** tokenDecimals).toString();

  pipeline.incrbyfloat(`feeUsd:acc`, parsedFeeUsd);
  pipeline.incrbyfloat(`feeUsd:${parsedDate}`, parsedFeeUsd);
  pipeline.incrbyfloat(`feeAmount:${parsedDate}:${tokenTicker}`, parsedFeeAmount);

  await pipeline.exec();
}

export async function handleCollectPositionFees(log: any): Promise<void> {
  console.log(`New handleCollectPositionFees log at block ${log.blockNumber}`);
  const pipeline = redis.pipeline();

  // get YYYY-MM-DD
  const date = new Date(log.block.timestamp * 1000);
  const parsedDate = date.toISOString().split('T')[0];

  const collectPositionFee = new CollectPositionFee({
    id: log.transactionHash,
    account: log.args.account,
    token: log.args.token,
    feeUsd: new BigNumber(log.args.feeUsd).toString(),
    feeAmount: new BigNumber(log.args.feeAmount).toString(),
    isSettle: log.args.isSettle,
  });

  if (!isVault(log.args.account)) {
    await applyFeePoint(log, log.args.account.toLowerCase());
  }

  await queryRunner.manager.save(collectPositionFee);

  const parsedFeeUsd = new BigNumber(log.args.feeUsd).dividedBy(10 ** 30).toString();

  const tokenTicker = UNDERLYING_ASSET_ADDRESS_TO_TICKER[String(log.args.token).toLowerCase()];
  const tokenDecimals = UNDERLYING_ASSET_TICKER_TO_DECIMALS[tokenTicker];
  const parsedFeeAmount = new BigNumber(log.args.feeAmount).dividedBy(10 ** tokenDecimals).toString();

  pipeline.incrbyfloat(`positionFeeUsd:acc`, parsedFeeUsd);
  pipeline.incrbyfloat(`positionFeeUsd:${parsedDate}`, parsedFeeUsd);
  pipeline.incrbyfloat(`positionFeeAmount:${parsedDate}:${tokenTicker}`, parsedFeeAmount);

  await pipeline.exec();
}

export async function handleNotifyPendingAmount(log: any): Promise<void> {
  console.log(`New handleNotifyPendingAmount log at block ${log.blockNumber}`);
  const pipeline = redis.pipeline();

  // get YYYY-MM-DD
  const date = new Date(log.block.timestamp * 1000);
  const parsedDate = date.toISOString().split('T')[0];

  const _id = `${log.transactionHash}-${log.args.priceType}`;

  const notifyPendingAmount = new NotifyPendingAmount({
    id: _id,
    priceType: new BigNumber(log.args.priceType).toString(),
    token: log.args.token,
    pendingUsd: new BigNumber(log.args.pendingUsd).toString(),
    pendingAmount: new BigNumber(log.args.pendingAmount).toString(),
  });

  await queryRunner.manager.save(notifyPendingAmount);

  const parsedPendingUsd = new BigNumber(log.args.pendingUsd).dividedBy(10 ** 30).toString();

  const tokenTicker = UNDERLYING_ASSET_ADDRESS_TO_TICKER[String(log.args.token).toLowerCase()];
  const tokenDecimals = UNDERLYING_ASSET_TICKER_TO_DECIMALS[tokenTicker];
  const parsedPendingAmount = new BigNumber(log.args.pendingAmount).dividedBy(10 ** tokenDecimals).toString();

  const olpKey = VAULT_UTILS_ADDRESS_TO_OLP_KEY[String(log.address).toLowerCase()];

  if (Number(log.args.priceType) === 0) {
    pipeline.incrbyfloat(`markPriceUsd:acc`, parsedPendingUsd);
    pipeline.incrbyfloat(`markPriceUsd:${parsedDate}`, parsedPendingUsd);
    pipeline.incrbyfloat(`markPriceUsd:${olpKey}:acc`, parsedPendingUsd);
    pipeline.incrbyfloat(`markPriceUsd:${olpKey}:${parsedDate}`, parsedPendingUsd);
    pipeline.incrbyfloat(`markPriceAmount:${parsedDate}:${tokenTicker}`, parsedPendingAmount);
  } else if (Number(log.args.priceType) === 1) {
    pipeline.incrbyfloat(`riskPremiumUsd:acc`, parsedPendingUsd);
    pipeline.incrbyfloat(`riskPremiumUsd:${parsedDate}`, parsedPendingUsd);
    pipeline.incrbyfloat(`riskPremiumUsd:${olpKey}:acc`, parsedPendingUsd);
    pipeline.incrbyfloat(`riskPremiumUsd:${olpKey}:${parsedDate}`, parsedPendingUsd);
    pipeline.incrbyfloat(`riskPremiumAmount:${parsedDate}:${tokenTicker}`, parsedPendingAmount);
  }

  await pipeline.exec();
}

export async function handleBuyUsdg(log: any): Promise<void> {
  console.log(`New handleBuyUsdg log at block ${log.blockNumber}`);

  const _id = `${log.args.account}-${log.transactionHash}`;

  const buySellUsdg = new BuySellUsdg({
    id: _id,
    isBuy: true,
    account: log.args.account,
    token: log.args.token,
    tokenAmount: String(log.args.tokenAmount),
    usdgAmount: String(log.args.usdgAmount),
    feeBasisPoints: String(log.args.feeBasisPoints),
    processBlockTime: String(log.block.timestamp),
  });

  await queryRunner.manager.save(buySellUsdg);
}

export async function handleSellUsdg(log: any): Promise<void> {
  console.log(`New handleSellUsdg log at block ${log.blockNumber}`);

  const _id = `${log.args.account}-${log.transactionHash}`;

  const buySellUsdg = new BuySellUsdg({
    id: _id,
    isBuy: false,
    account: log.args.account,
    token: log.args.token,
    tokenAmount: String(log.args.tokenAmount),
    usdgAmount: String(log.args.usdgAmount),
    feeBasisPoints: String(log.args.feeBasisPoints),
    processBlockTime: String(log.block.timestamp),
  });

  await queryRunner.manager.save(buySellUsdg);
}

export async function handleAddLiquidty(log: any): Promise<void> {
  console.log(`New handleAddLiquidty log at block ${log.blockNumber}`);

  const _id = `${log.args.account}-${log.transactionHash}`;

  let olp = OLP_MANAGER_ADDRESS_TO_OLP_ADDRESS[log.address];
  if (!olp) olp = '0x0000000000000000000000000000000000000000'; // Default value or appropriate fallback

  const addLiquidity = new AddLiquidity({
    id: _id,
    account: log.args.account,
    olp: olp,
    token: log.args.token,
    amount: String(log.args.amount),
    aumInUsdg: String(log.args.aumInUsdg),
    olpSupply: String(log.args.olpSupply),
    usdgAmount: String(log.args.usdgAmount),
    mintAmount: String(log.args.mintAmount),
    processBlockTime: String(log.block.timestamp),
  });

  await registerOLPDeposit(
    log.args.account.toLowerCase(),
    new BigNumber(log.args.mintAmount).div(10 ** 18).toNumber(),
    log.block.timestamp * 1000,
  );

  await queryRunner.manager.save(addLiquidity);
}

export async function handleRemoveLiquidty(log: any): Promise<void> {
  console.log(`New handleRemoveLiquidty log at block ${log.blockNumber}`);

  const _id = `${log.args.account}-${log.transactionHash}`;

  let olp = OLP_MANAGER_ADDRESS_TO_OLP_ADDRESS[log.address];
  if (!olp) olp = '0x0000000000000000000000000000000000000000'; // Default value or appropriate fallback

  const removeLiquidity = new RemoveLiquidity({
    id: _id,
    account: log.args.account,
    olp: olp,
    token: log.args.token,
    olpAmount: String(log.args.olpAmount),
    aumInUsdg: String(log.args.aumInUsdg),
    olpSupply: String(log.args.olpSupply),
    usdgAmount: String(log.args.usdgAmount),
    amountOut: String(log.args.amountOut),
    processBlockTime: String(log.block.timestamp),
  });

  await deregisterOLPDeposit(
    log.args.account.toLowerCase(),
    new BigNumber(log.args.olpAmount).div(10 ** 18).toNumber(),
  );

  await queryRunner.manager.save(removeLiquidity);
}

export async function handleFeedSettlePrice(log: any): Promise<void> {
  console.log(`New handleFeedSettlePrice log at block ${log.blockNumber}`);

  const record = new SettlePrice({
    id: log.transactionHash,
    underlyingAsset: log.args.underlyingAsset,
    expiry: String(log.args.expiry),
    settlePrice: String(log.args.settlePrice),
  });

  await queryRunner.manager.save(record);
}

export async function handleParentChanged(log: any): Promise<void> {
  console.log(`New handleParentChanged log at block ${log.blockNumber}`);
  const pipeline = redis.pipeline();

  const user = log.args.user.toLowerCase();
  const parent = log.args.parent.toLowerCase();
  const grandparent = log.args.grandParent.toLowerCase();

  pipeline.set(`parent:${user}`, parent);

  if (grandparent != '0x' + '0'.repeat(40)) {
    pipeline.set(`grandparent:${user}`, grandparent);
  }

  pipeline.sadd(`children:${parent}`, user);
  pipeline.sadd(`grandchildren:${grandparent}`, user);

  // point
  await registerParent(user, parent, log.block.timestamp * 1000);

  await pipeline.exec();
}

async function increaseNotionalVolume(
  optionTokenId: bigint,
  size: any,
  spotPrice: any,
  blockTime: any,
): Promise<void> {
  console.log('Increase option notional volume..');
  const pipeline = redis.pipeline();

  // get YYYY-MM-DD
  const date = new Date(blockTime * 1000);
  const parsedDate = date.toISOString().split('T')[0];

  const { underlyingAssetIndex, expiry, length, strikePrices, isCalls, sourceVaultIndex } =
    parseOptionTokenId(optionTokenId);

  const notionalVolume = new BigNumber(size)
    .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[underlyingAssetIndex])
    .multipliedBy(spotPrice)
    .dividedBy(10 ** 30)
    .toString();

  for (let i = 0; i < length; i++) {
    const ticker = UNDERLYING_ASSET_INDEX_TO_TICKER[underlyingAssetIndex];
    const optionType: OptionType = isCalls[i] ? 'Call' : 'Put';

    const vaultName = VAULT_INDEX_TO_NAME[sourceVaultIndex];

    // 1. update acc, daily, and detail
    // - volume:acc
    // - volume:2024-04-01
    // - volume:2024-04-01:BTC:Call
    // - volume:1711929600:BTC:Call
    // - volume:sVault:2024-04-01:BTC:Call
    // - volume:BTC-1MAR24-60000-C
    pipeline.incrbyfloat('volume:acc', notionalVolume);
    pipeline.incrbyfloat(`volume:${parsedDate}`, notionalVolume);
    pipeline.incrbyfloat(`volume:${parsedDate}:${ticker}:${optionType}`, notionalVolume);
    pipeline.incrbyfloat(`volume:${expiry}:${ticker}:${optionType}`, notionalVolume);
    pipeline.incrbyfloat(`volume:${vaultName}:${parsedDate}:${ticker}:${optionType}`, notionalVolume);

    // 2. update per option
    const optionInstrument = getOptionInstrument(
      // BTC-1MAR24-60000-C
      underlyingAssetIndex,
      expiry,
      strikePrices[i],
      isCalls[i],
    );

    pipeline.incrbyfloat(`volume:${optionInstrument}`, notionalVolume);

    // 3. update postgreSQL
    const exsitingDate: DailyNotionalVolumeAndExecutionPrice = await queryRunner.manager.findOne(
      DailyNotionalVolumeAndExecutionPrice,
      { where: { id: parsedDate } },
    );

    if (exsitingDate) {
      const nextNotionalVolume = new BigNumber(exsitingDate.accumulatedNotionalVolume)
        .plus(notionalVolume)
        .toString();
      exsitingDate.accumulatedNotionalVolume = nextNotionalVolume;

      await queryRunner.manager.save(exsitingDate);
    } else {
      const record = new DailyNotionalVolumeAndExecutionPrice({
        id: parsedDate,
        underlyingAssetIndex: String(underlyingAssetIndex),
        accumulatedNotionalVolume: notionalVolume,
        accumulatedExecutionPrice: String(0),
      });

      await queryRunner.manager.save(record);
    }
  }

  await pipeline.exec();
}

async function increaseExecutionPrice(
  optionTokenId: bigint,
  size: any,
  executionPrice: any,
  blockTime: any,
): Promise<void> {
  console.log('Increase execution price..');
  const pipeline = redis.pipeline();

  // get YYYY-MM-DD
  const date = new Date(blockTime * 1000);
  const parsedDate = date.toISOString().split('T')[0];

  const { underlyingAssetIndex, expiry, strategy, sourceVaultIndex } = parseOptionTokenId(optionTokenId);

  const totalExecutionPrice = new BigNumber(size)
    .dividedBy(10 ** UNDERLYING_ASSET_INDEX_TO_DECIMALS[underlyingAssetIndex])
    .multipliedBy(executionPrice)
    .dividedBy(10 ** 30)
    .toString();

  const ticker = UNDERLYING_ASSET_INDEX_TO_TICKER[underlyingAssetIndex];
  const optionType: OptionType = isCall(strategy) ? 'Call' : 'Put';

  const vaultName = VAULT_INDEX_TO_NAME[sourceVaultIndex];

  // 1. update acc, daily, and detail
  // - executionPrice:acc
  // - executionPrice:2024-04-01
  // - executionPrice:2024-04-01:BTC:Call
  // - executionPrice:1711929600:BTC:Call
  // - executionPrice:sVault:2024-04-01:BTC:Call
  pipeline.incrbyfloat('executionPrice:acc', totalExecutionPrice);
  pipeline.incrbyfloat(`executionPrice:${parsedDate}`, totalExecutionPrice);
  pipeline.incrbyfloat(`executionPrice:${parsedDate}:${ticker}:${optionType}`, totalExecutionPrice);
  pipeline.incrbyfloat(`executionPrice:${expiry}:${ticker}:${optionType}`, totalExecutionPrice);
  pipeline.incrbyfloat(
    `executionPrice:${vaultName}:${parsedDate}:${ticker}:${optionType}`,
    totalExecutionPrice,
  );

  // 2. update postgreSQL
  const exsitingDate: DailyNotionalVolumeAndExecutionPrice = await queryRunner.manager.findOne(
    DailyNotionalVolumeAndExecutionPrice,
    { where: { id: parsedDate } },
  );

  if (exsitingDate) {
    const nextAccumulatedExecutionPrice = new BigNumber(exsitingDate.accumulatedExecutionPrice)
      .plus(totalExecutionPrice)
      .toString();
    exsitingDate.accumulatedExecutionPrice = nextAccumulatedExecutionPrice;

    await queryRunner.manager.save(exsitingDate);
  } else {
    const record = new DailyNotionalVolumeAndExecutionPrice({
      id: parsedDate,
      underlyingAssetIndex: String(underlyingAssetIndex),
      accumulatedNotionalVolume: String(0),
      accumulatedExecutionPrice: totalExecutionPrice,
    });

    await queryRunner.manager.save(record);
  }

  await pipeline.exec();
}

export async function handleEnqueuedMintAndStake(log: any): Promise<void> {
  console.log(`New handleEnqueuedMintAndStake log at block ${log.blockNumber}`);

  const queueIndex = String(log.args.index);
  const actionType = String(log.args.actionType);
  const user = log.args.user;
  const token = log.args.token;
  const amount = String(log.args.amount);
  const minOut = String(log.args.minOut);
  const receiver = log.args.receiver;
  const isNative = log.args.isNative;
  const olpQueueAddress = log.address;

  const _id = `${olpQueueAddress}-${queueIndex}`;

  const record = new OlpQueueItem({
    id: _id,
    user: user,
    queueIndex: queueIndex,
    olpQueueAddress: olpQueueAddress,
    actionType: actionType,
    token: token,
    amount: amount,
    minOut: minOut,
    receiver: receiver,
    isNative: isNative,
    status: 'ENQUEUED',
    amountOut: String(0),
    olpPrice: String(0),
    blockTime: String(log.block.timestamp),
    processBlockTime: String(0),
  });

  await queryRunner.manager.save(record);
}

export async function handleEnqueuedUnstakeAndRedeem(log: any): Promise<void> {
  console.log(`New handleEnqueuedUnstakeAndRedeem log at block ${log.blockNumber}`);

  const queueIndex = String(log.args.index);
  const actionType = String(log.args.actionType);
  const user = log.args.user;
  const tokenOut = log.args.tokenOut;
  const olpAmount = String(log.args.olpAmount);
  const minOut = String(log.args.minOut);
  const receiver = log.args.receiver;
  const isNative = log.args.isNative;
  const olpQueueAddress = log.address;

  const _id = `${olpQueueAddress}-${queueIndex}`;

  const record = new OlpQueueItem({
    id: _id,
    user: user,
    queueIndex: queueIndex,
    olpQueueAddress: olpQueueAddress,
    actionType: actionType,
    token: tokenOut,
    amount: olpAmount,
    minOut: minOut,
    receiver: receiver,
    isNative: isNative,
    status: 'ENQUEUED',
    amountOut: String(0),
    olpPrice: String(0),
    blockTime: String(log.block.timestamp),
    processBlockTime: String(0),
  });

  await queryRunner.manager.save(record);
}

export async function handleProcessedQueueAction(log: any): Promise<void> {
  console.log(`New handleProcessedQueueAction log at block ${log.blockNumber}`);

  const queueIndex = String(log.args.index);
  const olpQueueAddress = log.address;
  const amountOut = String(log.args.amountOut);
  const olpPrice = String(log.args.olpPrice);

  const _id = `${olpQueueAddress}-${queueIndex}`;

  const existingItem: OlpQueueItem = await queryRunner.manager.findOne(OlpQueueItem, {
    where: { id: _id },
  });

  if (existingItem) {
    existingItem.status = 'PROCESSED';
    existingItem.amountOut = amountOut;
    existingItem.olpPrice = olpPrice;
    existingItem.processBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(existingItem);
  }
}

export async function handleCancelledQueueAction(log: any): Promise<void> {
  console.log(`New handleCancelledQueueAction log at block ${log.blockNumber}`);

  const queueIndex = String(log.args.index);
  const olpQueueAddress = log.address;

  const _id = `${olpQueueAddress}-${queueIndex}`;

  const existingItem: OlpQueueItem = await queryRunner.manager.findOne(OlpQueueItem, {
    where: { id: _id },
  });

  if (existingItem) {
    existingItem.status = 'CANCELLED';
    existingItem.processBlockTime = String(log.block.timestamp);

    await queryRunner.manager.save(existingItem);
  }
}