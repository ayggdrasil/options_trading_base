import { CONTRACT_ADDRESSES } from "../addresses"
import { UnderlyingAssetIndex, UnderlyingAssetTicker, VaultIndex } from "./enums"


//////////////////////////////////
//  Underlying asset related    //
//////////////////////////////////

// 0, 1 -> "BTC", "ETH"
export const UNDERLYING_ASSET_INDEX_TO_TICKER: { [key: number]: UnderlyingAssetTicker} = {
  [UnderlyingAssetIndex.BTC]: UnderlyingAssetTicker.BTC,
  [UnderlyingAssetIndex.ETH]: UnderlyingAssetTicker.ETH
}

// 0, 1 -> 컨트랙트 주소
export const UNDERLYING_ASSET_INDEX_TO_ADDRESS: { [key: number]: string} = {
  [UnderlyingAssetIndex.BTC]: CONTRACT_ADDRESSES[process.env.CHAIN_ID].WBTC,
  [UnderlyingAssetIndex.ETH]: CONTRACT_ADDRESSES[process.env.CHAIN_ID].WETH
}

// 0, 1 -> 소수점 자리수
export const UNDERLYING_ASSET_INDEX_TO_DECIMALS: { [key: number]: number} = {
  [UnderlyingAssetIndex.BTC]: 8,
  [UnderlyingAssetIndex.ETH]: 18
}

// 컨트랙트 주소 -> "BTC", "ETH"
export const UNDERLYING_ASSET_ADDRESS_TO_TICKER: { [key: string]: UnderlyingAssetTicker} = {
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].WBTC).toLowerCase()]: UnderlyingAssetTicker.BTC,
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].WETH).toLowerCase()]: UnderlyingAssetTicker.ETH
}

// "BTC", "ETH" -> 컨트랙트 주소
export const UNDERLYING_ASSET_TICKER_TO_ADDRESS: { [key: string]: string} = {
  [UnderlyingAssetTicker.BTC]: CONTRACT_ADDRESSES[process.env.CHAIN_ID].WBTC,
  [UnderlyingAssetTicker.ETH]: CONTRACT_ADDRESSES[process.env.CHAIN_ID].WETH
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

export const OA_ADDRESS_TO_DECIMAL: { [key: string]: number } = {
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].WBTC).toLowerCase()]: 8,
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].WETH).toLowerCase()]: 18,
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].USDC).toLowerCase()]: 6,
}


//////////////////////////////////
//  Vault related               //
//////////////////////////////////

export const VAULT_INDEX_TO_ADDRESS: { [key: number]: string} = {
  [VaultIndex.sVault]: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT,
  [VaultIndex.mVault]: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT,
  [VaultIndex.lVault]: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT
}

export const VAULT_INDEX_TO_NAME: { [key: number]: string} = {
  [VaultIndex.sVault]: "sVault",
  [VaultIndex.mVault]: "mVault",
  [VaultIndex.lVault]: "lVault"
}

export const VAULT_ADDRESS_TO_NAME: { [key: string]: string} = {
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT).toLowerCase()]: "sVault",
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT).toLowerCase()]: "mVault",
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT).toLowerCase()]: "lVault"
}

export const VAULT_UTILS_ADDRESS_TO_OLP_KEY: { [key: string]: string} = {
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT_UTILS).toLowerCase()]: "sOlp",
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT_UTILS).toLowerCase()]: "mOlp",
  [(CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT_UTILS).toLowerCase()]: "lOlp"
}


//////////////////////////////////
//  Olp related                 //
//////////////////////////////////

export const OLP_MANAGER_ADDRESS_TO_OLP_ADDRESS: { [key: string]: string} = {
  [CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_OLP_MANAGER]: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_OLP,
  [CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_OLP_MANAGER]: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_OLP,
  [CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_OLP_MANAGER]: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_OLP
}

export const OLP_ADDRESS_TO_NAME: { [key: string]: string} = {
  [CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_OLP]: "sOlp",
  [CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_OLP]: "mOlp",
  [CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_OLP]: "lOlp"
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

export const ONE_DAY = 86400