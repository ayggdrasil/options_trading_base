interface IQuoteToken {
  wbtc: string,
  weth: string,
  usdc: string,
}

export interface InterfaceOlp {
  sOlp: string,
  mOlp: string,
  lOlp: string
}

export interface IControllerAllowance {
  quoteToken: IQuoteToken
}

export interface IPoolAllowance {
  sOlpManager: IQuoteToken,
  mOlpManager: IQuoteToken,
  lOlpManager: IQuoteToken
}

interface IUserAllowance {
  controller: IControllerAllowance,
  pool: IPoolAllowance
}

export interface IUserBalance {
  quoteAsset: {
    [key: string]: string
  },
  quoteToken: IQuoteToken,
  olpToken: InterfaceOlp,
  claimableReward: InterfaceOlp,
  cooldown: InterfaceOlp,
}

interface ITradeData {
  tradeCount: number,
  tradeSize: string,
  notionalVolume: string
}

export interface ITwitterInfo {
  isConnected: boolean,
  id: string,
  username: string,
  profileImageUrl: string,
}

export interface IUserSlice {
  allowance: IUserAllowance,
  balance: IUserBalance,
  volume: {
    totalNotionalVolume: number,
  },
  tradeData: {
    BTC: ITradeData,
    ETH: ITradeData
  },
  twitterInfo: ITwitterInfo
}