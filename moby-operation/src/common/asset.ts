import { UnderlyingAssetIndex } from "./enum";

export const UA_INDEX_TO_NAME = {
    [UnderlyingAssetIndex.BTC]: "BTC",
    [UnderlyingAssetIndex.ETH]: "ETH",
}

export const UA_INDEX_TO_DECIMAL = {
    [UnderlyingAssetIndex.BTC]: 8,
    [UnderlyingAssetIndex.ETH]: 18,
}

export const TICKER_TO_DECIMAL = {
    "BTC": 8,
    "ETH": 18,
    "USDC": 6,
}