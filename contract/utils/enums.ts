export namespace Ticker {
  export enum MainStableAsset {
    USDC = 'USDC'
  }

  export enum UnderlyingAsset {
    BTC = 'BTC',
    ETH = 'ETH'
  }

  export enum OlpAsset {
    WBTC = "WBTC",
    WETH = "WETH",
    USDC = "USDC"
  }

  export enum QuoteAsset { // OlpAsset + Native ETH
    ETH = "ETH",
    WBTC = "WBTC",
    WETH = "WETH",
    USDC = "USDC"
  }
}

export enum KeeperType {
  MAIN = "MAIN",
  SUB1 = "SUB1",
  NONE = "NONE"
}


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
  USDC = 'USDC'
}

export enum OlpKey {
  sOlp = "sOlp",
  mOlp = "mOlp",
  lOlp = "lOlp",
}

export enum VaultIndex {
  sVault = 0,
  mVault = 1,
  lVault = 2
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





// old version below

export enum Ticker {
  BTC = 'BTC',
  ETH = 'ETH',
  USDC = 'USDC',
}

export enum Exchange {
  BINANCE = 'BINANCE',
  BITFINEX = 'BITFINEX',
  DERIBIT = 'DERIBIT',
  BYBIT = 'BYBIT',
}

export enum OptionDirection {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export const INDEX_ASSET_TICKER_TO_DECIMAL: { [key: string]: number } = {
  [Ticker.BTC]: 8,
  [Ticker.ETH]: 18,
  [Ticker.USDC]: 6
}