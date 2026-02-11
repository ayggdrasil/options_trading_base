interface ExpiryToRiskFreeRateMap {
  [key: number]: number; // key is expiry, value is risk-free rate
}

export type RiskFreeRateCollection = {
  [key: string]: ExpiryToRiskFreeRateMap; // key is underlying asset, value is ExpiryRiskFreeRateData
};

export type RiskFreeRateCollectionRes = {
  data: RiskFreeRateCollection;
  lastUpdatedAt: number;
};

export type MultipleRiskFreeRateCollectionRes = {
  [key: string]: RiskFreeRateCollectionRes;
};