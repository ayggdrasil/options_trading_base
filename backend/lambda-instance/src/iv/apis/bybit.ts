import { map } from 'rxjs/operators'
import { fetchWithTimeoutAndRetry$ } from "../../utils/misc"
import { formatInstrument } from '../../utils/format'
import { forkJoin, lastValueFrom } from 'rxjs'

export const getIvFromBybit = async (currencies: string[]): Promise<IIVData> => {
  try {
    const ivArr = await lastValueFrom(
      forkJoin(currencies.map((currency) => getBybitIV$(currency))).pipe(
        map((results) => {
          return results.reduce((acc, { data, exchange, timestamp }) => ({
            data: { ...acc.data, ...data },
            exchange,
            timestamp: Math.max(acc.timestamp, timestamp),
          }), { data: {}, exchange: "BYBIT", timestamp: 0 })
        }
      ))
    );
    
    return ivArr;
  } catch (error) {
    console.log('getIvFromBybit error', error);
    return { data: {}, exchange: "BYBIT", timestamp: 0 };
  }
};

const getBybitIV$ = (currency: string) => {
  return fetchWithTimeoutAndRetry$(`https://api.bybit.com/v5/market/tickers?category=option&baseCoin=${currency}`).pipe(
    map(({ result, time }) => ({
      list: result.list,
      timestamp: Math.floor(time / (10 ** 3)), // in sec
    })),
    map(({ list, timestamp }) => ({
      data: list.reduce((acc, { symbol, markIv }) => {
        const instrumentName = formatInstrument('BYBIT', symbol);
        if (!instrumentName) return acc;
        acc[instrumentName] = Number(markIv);
        return acc;
      }, {}),
      exchange: "BYBIT",
      timestamp,
    }))
  );
}