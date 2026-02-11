type ResultRowType = {
  [asset: string]: {
    asset: string;
    depositedAmount: number;
    depositedInUsd: number;
    weight: number;
  }
}

export const getPoolComposition = async () => {
  const response = await fetch(`https://api.app.trade/v1/market/all`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  const result = (await response.json()).data;
  const spotPrices = result.spotIndices
  spotPrices.wbtc = spotPrices.BTC
  spotPrices.weth = spotPrices.ETH
  const totalDepositedInUsd = result.olpStats.sOlp.utilityRatio.depositedUsd;

  const liqAndWeights: ResultRowType = Object.entries(result.olpStats.sOlp.assetAmounts).reduce(
    (acc: ResultRowType, [asset, amounts]: [string, any]) => {
      acc[asset] = {
        asset,
        depositedAmount: amounts.depositedAmount,
        depositedInUsd: amounts.depositedAmount * spotPrices[asset],
        weight: amounts.depositedAmount * spotPrices[asset] / totalDepositedInUsd
      }
      return acc;
    }, {});
  return liqAndWeights;
}
