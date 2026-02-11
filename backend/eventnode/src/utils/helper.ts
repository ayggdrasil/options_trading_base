import { CONTRACT_ADDRESSES } from "../addresses";
import { solidityPacked, zeroPadBytes } from "ethers";
import { UnderlyingAssetIndex } from "./enums";
import { PositionHistory } from '../entity/positionHistory';
import { Position } from '../entity/position';
import { MONTHS_MAP } from './constants';
import { ChainId } from "../networks";

export function isVault(address: string): boolean {
  const vaults = [
    CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT.toLowerCase(),
    CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT.toLowerCase(),
    CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT.toLowerCase(),
  ]

  return vaults.includes(address.toLowerCase())
}

// get option id based on index asset, expiry, strike price
export function getOptionId(underlyingAssetIndex: UnderlyingAssetIndex, expiry: number, strikePrice: number): string {
  return zeroPadBytes(
    solidityPacked(
      ["uint16", "uint40", "uint48"],
      [underlyingAssetIndex, expiry, strikePrice]
    ),
    32
  );
}

// get index asset, expiry, strike price based on option id
export function parseOptionId(optionId: string) {
  const underlyingAssetIndex = parseInt(optionId.substring(2, 6), 16); // Adjusted offsets for "0x"
  const expiry = parseInt(optionId.substring(6, 16), 16); // Adjusted offsets for the next 5 bytes
  const strikePrice = parseInt(optionId.substring(16, 28), 16); // Adjusted offsets for the next 6 bytes

  return {
    underlyingAssetIndex,
    expiry,
    strikePrice
  };
}

export function createTransferHistoryRecord(
  params: {
    id: string,
    account: string,
    type: 'transferIn' | 'transferOut',
    position: Position,
    size: string,
    underlyingAssetIndex: number,
    expiry: number,
    blockTimestamp: string,
    transferredAmount?: string,  // for buy position
    transferredCollateralAmount?: string  // for sell position
  }
): PositionHistory {
  return new PositionHistory({
    id: params.id,
    account: params.account,
    requestIndex: String(-1),
    underlyingAssetIndex: String(params.underlyingAssetIndex),
    expiry: String(params.expiry),
    type: params.type,
    optionTokenId: params.position.optionTokenId,
    size: params.size,
    quoteToken: params.position.openedToken,
    quoteAmount: params.transferredAmount || String(0),
    collateralToken: params.position.openedCollateralToken,
    collateralAmount: params.transferredCollateralAmount || String(0),
    executionPrice: params.position.executionPrice,
    avgExecutionPrice: params.position.executionPrice,
    settlePrice: String(0),
    settlePayoff: String(0),
    spotPrice: params.position.openedAvgSpotPrice,
    cashFlow: String(0),
    pnl: String(0),
    roi: String(0),
    processBlockTime: params.blockTimestamp
  })
}


// timestampInSec to 8MAR24
export function convertTimestampInSecToExpiryDate(timestampInSec: number): string {
  const date = new Date(timestampInSec * 1000);
  
  const day = date.getUTCDate();
  const month = MONTHS_MAP[date.getUTCMonth() + 1];
  const year = date.getUTCFullYear().toString().slice(-2);

  return `${day}${month}${year}`;
}

export const isChain = (chainId: ChainId) => {
  return Number(process.env.CHAIN_ID) === Number(chainId)
}