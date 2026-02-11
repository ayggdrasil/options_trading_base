import { SupportedChains } from "@callput/shared";

export const BLOCK_EXPLORER = {
  [SupportedChains["Base"]]: "https://basescan.org",
  [SupportedChains["Arbitrum One"]]: "https://arbiscan.io",
}


// Lambda API

export const EPOCH_INFO_API = {
  [SupportedChains["Base"]]: "https://q2ky1hk656.execute-api.ap-southeast-1.amazonaws.com/prod/getEpochInfo",
  [SupportedChains["Arbitrum One"]]: "",
}

export const VOLUME_DATA_API = {
  [SupportedChains["Base"]]: "https://q2ky1hk656.execute-api.ap-southeast-1.amazonaws.com/prod/getVolumeData",
  [SupportedChains["Arbitrum One"]]: "",
}

export const CONNECT_TWITTER_API = {
  [SupportedChains["Base"]]: "https://q2ky1hk656.execute-api.ap-southeast-1.amazonaws.com/prod/connectTwitter?address=",
  [SupportedChains["Arbitrum One"]]: "",
}

export const REMOVE_TWITTER_API = {
  [SupportedChains["Base"]]: "https://q2ky1hk656.execute-api.ap-southeast-1.amazonaws.com/prod/removeTwitter?address=",
  [SupportedChains["Arbitrum One"]]: "",
}

export const GET_TWITTER_API = {
  [SupportedChains["Base"]]: "https://q2ky1hk656.execute-api.ap-southeast-1.amazonaws.com/prod/getTwitterInfo?addresses=",
  [SupportedChains["Arbitrum One"]]: "",
}


// S3 Data API

export const MARKET_DATA_API = {
  [SupportedChains["Base"]]: "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json",
  [SupportedChains["Arbitrum One"]]: "",
}

export const TRADE_DATA_API = {
  [SupportedChains["Base"]]: "https://app-data-base.s3.ap-southeast-1.amazonaws.com/trade-data.json.gz",
  [SupportedChains["Arbitrum One"]]: "",
}

export const OLP_DETAIL_DATA_API = {
  [SupportedChains["Base"]]: "https://dune-data-base.s3.ap-southeast-1.amazonaws.com/olp-dashboard.json",
  [SupportedChains["Arbitrum One"]]: "",
}


// Query API

export const API_QUERY_BASE_URL = {
  [SupportedChains["Base"]]: "https://4wfz19irck.execute-api.ap-southeast-1.amazonaws.com/default/app-lambda-base-prod-query",
  [SupportedChains["Arbitrum One"]]: "",
}

export const LEADERBOARD_API = {
  [SupportedChains["Base"]]: API_QUERY_BASE_URL[SupportedChains["Base"]] + "?method=getLeaderboard",
  [SupportedChains["Arbitrum One"]]: API_QUERY_BASE_URL[SupportedChains["Arbitrum One"]] + "?method=getLeaderboard",
}

export const USER_POINT_INFO_API = {
  [SupportedChains["Base"]]: API_QUERY_BASE_URL[SupportedChains["Base"]] + "?method=getUserPointInfo&address=",
  [SupportedChains["Arbitrum One"]]: API_QUERY_BASE_URL[SupportedChains["Arbitrum One"]] + "?method=getUserPointInfo&address=",
}

export const OLP_APR_API = {
  [SupportedChains["Base"]]: API_QUERY_BASE_URL[SupportedChains["Base"]] + "?method=getOlpApr",
  [SupportedChains["Arbitrum One"]]: API_QUERY_BASE_URL[SupportedChains["Arbitrum One"]] + "?method=getOlpApr",
}

export const COPY_TRADE_POSITION_HISTORY_API = {
  [SupportedChains["Base"]]: API_QUERY_BASE_URL[SupportedChains["Base"]] + "?method=getCopyTradePositionHistory&timestamp=",
  [SupportedChains["Arbitrum One"]]: API_QUERY_BASE_URL[SupportedChains["Arbitrum One"]] + "?method=getCopyTradePositionHistory&timestamp=",
}

export const MY_POSITION_HISTORY_API = {
  [SupportedChains["Base"]]: API_QUERY_BASE_URL[SupportedChains["Base"]] + "?method=getMyPositionHistory",
  [SupportedChains["Arbitrum One"]]: API_QUERY_BASE_URL[SupportedChains["Arbitrum One"]] + "?method=getMyPositionHistory",
}

export const MY_POSITION_API = {
  [SupportedChains["Base"]]: API_QUERY_BASE_URL[SupportedChains["Base"]] + "?method=getMyPositions&address=",
  [SupportedChains["Arbitrum One"]]: API_QUERY_BASE_URL[SupportedChains["Arbitrum One"]] + "?method=getMyPositions&address=",
} 

export const MY_OLP_QUEUE_API = {
  [SupportedChains["Base"]]: API_QUERY_BASE_URL[SupportedChains["Base"]] + "?method=getMyOlpQueue&address=",
  [SupportedChains["Arbitrum One"]]: API_QUERY_BASE_URL[SupportedChains["Arbitrum One"]] + "?method=getMyOlpQueue&address=",
}

export const MY_OLP_PNL_API = {
  [SupportedChains["Base"]]: API_QUERY_BASE_URL[SupportedChains["Base"]] + "?method=getMyOlpPnl&address=",
  [SupportedChains["Arbitrum One"]]: API_QUERY_BASE_URL[SupportedChains["Arbitrum One"]] + "?method=getMyOlpPnl&address=",
}