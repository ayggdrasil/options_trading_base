export enum UnderlyingAssetIndex {
  BTC = 1,
  ETH = 2
}

export enum UnderlyingAssetTicker {
  BTC = 'BTC',
  ETH = 'ETH'
}

export enum AssetTicker {
  BTC = 'BTC',
  ETH = 'ETH',
  USDC = 'USDC',
}

export enum VaultIndex {
  sVault = 0,
  mVault = 1,
  lVault = 2,
}

export enum Strategy {
  NotSupported = 0,
  BuyCall = 1,
  SellCall = 2,
  BuyPut = 3,
  SellPut = 4,
  BuyCallSpread = 5,
  SellCallSpread = 6,
  BuyPutSpread = 7,
  SellPutSpread = 8
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum SlackTag {
  CALLPUT = '',
  PRICE_VOLATILITY_CHECKER = '',
}
