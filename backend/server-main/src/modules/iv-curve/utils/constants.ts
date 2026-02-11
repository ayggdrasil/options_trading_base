export const IV_EQUALITY_TOLERANCE = 0.0001; // if ivs are within this tolerance, they are considered equal
export const IV_UPDATE_THRESHOLD = 60 * 60 * 1000; // 1 hour
export const IV_WEIGHTS = {
  deribit: 0.6,
  okx: 0.2,
  bybit: 0.2,
};

export const SHORT_TERM_EXPIRY_THRESHOLD = 14; // short-term expiry (≤ 14 days), long-term expiry (> 14 days)
export const SHORT_TERM_SVI_DATA_FILTER_THRESHOLD = 0.15; // 15%
export const LONG_TERM_SVI_DATA_FILTER_THRESHOLD = 1; // 100%
