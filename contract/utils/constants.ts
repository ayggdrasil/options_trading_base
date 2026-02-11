import { AssetTicker, UnderlyingAssetIndex, UnderlyingAssetTicker, VaultIndex } from "./enums"

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
export const ZERO_KEY = "0x0000000000000000000000000000000000000000000000000000000000000000"
//////////////////////////////////
//  Underlying asset related    //
//////////////////////////////////

// 0, 1 -> "BTC", "ETH"
export const UNDERLYING_ASSET_INDEX_TO_TICKER: { [key: number]: UnderlyingAssetTicker} = {
  [UnderlyingAssetIndex.BTC]: UnderlyingAssetTicker.BTC,
  [UnderlyingAssetIndex.ETH]: UnderlyingAssetTicker.ETH
}

// 0, 1 -> 소수점 자리수
export const UNDERLYING_ASSET_INDEX_TO_DECIMALS: { [key: number]: number} = {
  [UnderlyingAssetIndex.BTC]: 8,
  [UnderlyingAssetIndex.ETH]: 18
}


// "BTC", "ETH" -> 0, 1
export const UNDERLYING_ASSET_TICKER_TO_INDEX: { [key: string]: number} = {
  [UnderlyingAssetTicker.BTC]: UnderlyingAssetIndex.BTC,
  [UnderlyingAssetTicker.ETH]: UnderlyingAssetIndex.ETH
}

// "BTC", "ETH" -> 소수점 자리수
export const UNDERLYING_ASSET_TICKER_TO_DECIMALS: { [key: string]: number} = {
  [UnderlyingAssetTicker.BTC]: 8,
  [UnderlyingAssetTicker.ETH]: 18
}

//////////////////////////////////
//  Month related               //
//////////////////////////////////

export const MONTHS_MAP: { [key: number]: string } = {
  1: 'JAN', 2: 'FEB', 3: 'MAR', 4: 'APR', 5: 'MAY', 6: 'JUN',
  7: 'JUL', 8: 'AUG', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DEC'
}

export const MONTHS_MAP_REV: { [key: string]: number } = {
  'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
}


// Synced with frontend














export enum Ticker {
  BTC = 'BTC',
  ETH = 'ETH',
  USDC = 'USDC',
}


// Assets
export const ASSETS: Ticker[] = [
  Ticker.BTC,
  Ticker.ETH,
  Ticker.USDC,
]

// "BTC", "ETH" -> 소수점 자리수
export const INDEX_ASSET_TICKER_TO_DECIMAL: { [key: string]: number } = {
  [Ticker.BTC]: 8,
  [Ticker.ETH]: 18,
  [Ticker.USDC]: 6
}

// "BTC", "ETH" -> 틱 간격
export const INDEX_ASSET_TICKER_TO_TICK_INTERVAL: { [key: string]: number } = {
  [Ticker.BTC]: 100,
  [Ticker.ETH]: 10,
}