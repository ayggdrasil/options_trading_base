export enum Chain {
    NEW_ARBITRUM_ONE = 'newArbitrumOne',
    OLD_ARBITRUM_ONE = 'oldArbitrumOne'
}

export enum UnderlyingAssetIndex {
    BTC = 1,
    ETH = 2
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