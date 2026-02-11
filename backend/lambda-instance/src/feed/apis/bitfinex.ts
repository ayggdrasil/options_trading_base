export const getHistoricalPriceFromBitfinex = async (priceData, currency, currentTimestamp) => {
  const currencyParsed = currency.toLowerCase();
  const symbolMap = { "btc": "tBTCUSD", "eth": "tETHUSD", "usdc": "tUDCUSD" };
  const symbol = symbolMap[currencyParsed] || "";

  if (!symbol) throw new Error("bitfinex.ts: invalid currency");

  const prevPrice = priceData[currencyParsed];
  const prevTimestamp = priceData[`${currencyParsed}Timestamp`];
  const nearestHourTimestamp = Math.floor(currentTimestamp / 3600) * 3600;

  if (prevPrice && prevTimestamp && prevTimestamp == nearestHourTimestamp) {
    return priceData;
  }

  const startMillisec = nearestHourTimestamp * 1000;
  const endMillisec = (nearestHourTimestamp + 3600) * 1000;

  try {
    const response = await fetch(`https://api-pub.bitfinex.com/v2/tickers/hist?symbols=${symbol}&limit=1&start=${startMillisec}&end=${endMillisec}`);
    const result = await response.json();
    
    priceData[currencyParsed] = (result[0][1] + result[0][3]) / 2;
    priceData[`${currencyParsed}Timestamp`] = nearestHourTimestamp;
  } catch (error) {
    console.log("getHistoricalPriceFromBitfinex error", error);
  }

  return priceData;
}