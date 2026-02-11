export const CALLPUT_URLS = {
  HOME: "https://callput.app",
  APP: "https://app.callput.app",
  DOCS: "https://docs.callput.app",
  DASHBOARD: "",
};

export const SOCIAL_URLS = {
  X: "https://x.com/CallPutApp",
  TELEGRAM: "https://t.me/Callput_Official",
  DISCORD: "https://discord.gg/thbePJKdmc",
};

export const EXTERNAL_URLS = {
  EARLY_ACCESS: "https://forms.gle/cZv9TzhKDfR6KPa39",
};

export const ALL_URLS = {
  ...CALLPUT_URLS,
  ...SOCIAL_URLS,
  ...EXTERNAL_URLS,
};

export const PRODUCT_URLS = {
  TRADING: `${CALLPUT_URLS.APP}/trading`,
  POOLS: `${CALLPUT_URLS.APP}/pools`,
  REWARDS: `${CALLPUT_URLS.APP}/rewards`,
  DASHBOARD: `${CALLPUT_URLS.DASHBOARD}`,
};

export const ABOUT_URLS = {
  FAQ: "",
  DOCS: `${CALLPUT_URLS.DOCS}`,
  DEVELOPERS: "",
  DISCLAIMER: `${CALLPUT_URLS.DOCS}/disclaimer`,
};

export const API_URLS = {
  VOLUME_DATA: "https://q2ky1hk656.execute-api.ap-southeast-1.amazonaws.com/prod/getVolumeData",
  TRADE_DATA: "https://app-data-base.s3.ap-southeast-1.amazonaws.com/trade-data.json.gz",
  REVENUE_DATA: "https://q2ky1hk656.execute-api.ap-southeast-1.amazonaws.com/prod/getRevenue",
  PROTOCOL_NET_REVENUE: "https://q2ky1hk656.execute-api.ap-southeast-1.amazonaws.com/prod/getProtocolNetRevenue",
  MARKET_DATA: "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json",
  MARKET_DAILY: "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-daily/market-daily",
};
