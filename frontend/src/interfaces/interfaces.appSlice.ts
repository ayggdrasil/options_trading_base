interface IOlpAssetToken {
  wbtc: string,
  weth: string,
  usdc: string,
}

interface IMetricsItem {
  currentWeight: IOlpAssetToken,
  targetWeight: IOlpAssetToken,
  buyUsdgFee: IOlpAssetToken,
  sellUsdgFee: IOlpAssetToken,
  price: string,
  totalSupply: string,
}

export interface IOlpMetrics {
  sOlp: IMetricsItem,
  mOlp: IMetricsItem,
  lOlp: IMetricsItem,
}