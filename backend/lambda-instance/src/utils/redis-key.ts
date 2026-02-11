export const CHECK_VOLATILITY = 'check-volatility';

export const REDIS_KEYS = {
  IV_CURVE: {
    MAIN: 'server-main:iv-curve',
    DAILY: 'lambda:iv-curve:daily',
  },
  FUTURES: {
    MAIN: 'server-main:futures',
    DAILY: 'lambda:futures:daily',
  },
  SPOT: {
    MAIN: 'server-main:spot',
    DAILY: 'lambda:spot:daily',
    LAST_FEED: 'lambda:spot:last-feed',
  },
  RF_RATE: {
    MAIN: 'server-main:rf-rate',
  },
  OLP: {
    PV: {
      LAST_FEED: 'lambda:olp:pv:last-feed',
    },
    STATS: {
      DAILY: 'lambda:olp:stats:daily',
    },
    EPOCH: {
      PREFIX: 'lambda:olp:epoch',
    },
  },
  LAST_CLEARED_TIME: 'last-cleared-time',
  LAST_OPTIONS_MARKET_UPDATED_TIME: 'last-options-market-updated-time',
  CHECK_VOLATILITY: {
    SPOT_INDICES: `${CHECK_VOLATILITY}:spot-indices`,
    FUTURES_INDICES: `${CHECK_VOLATILITY}:futures-indices`,
    MARK_IVS: `${CHECK_VOLATILITY}:mark-ivs`,
    OLP_DV: `${CHECK_VOLATILITY}:olp-dv`,
    OLP_PRICE: `${CHECK_VOLATILITY}:olp-price`,
    RECENT_NOTIFIED_TIME: `${CHECK_VOLATILITY}:recent-notified-time`,
  },
  NOTIFY_POSITION_CURSOR: 'notify-position:cursor',
};
