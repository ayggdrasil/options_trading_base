import { getDateDDMMYYYYFromTimestamp } from "../../utils/date";

export const getHistoricalPriceFromCoinGecko = async (priceData, currency, timestampInSec) => {
  const currencyParsed = currency.toLowerCase();

  const symbolMap = { "BTC": "bitcoin", "ETH": "ethereum", "USDC": "usd-coin" };
  const symbol = symbolMap[currency] || "";

  const prevPrice = priceData[currencyParsed];
  const prevTimestampInSec = priceData[`${currencyParsed}Timestamp`];
  const diffInTimestampInSec = Math.abs(timestampInSec - prevTimestampInSec);

  if (prevPrice && prevTimestampInSec && (diffInTimestampInSec <= 3600)) {
    return priceData;
  }

  const dateDDMMYYYY = getDateDDMMYYYYFromTimestamp(timestampInSec * 1000);

  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol}/history?date=${dateDDMMYYYY}`);
    const data = await response.json();

    priceData[currencyParsed] = data.market_data.current_price.usd;
    priceData[`${currencyParsed}Timestamp`] = timestampInSec;
  } catch (error) {
    console.log("getHistoricalPriceFromCoinGecko error", error)
  }
  
  return priceData;
};


