import { map } from 'rxjs/operators'
import { fetchWithTimeoutAndRetry$ } from "../../utils/misc"
import { formatInstrument } from '../../utils/format'
import { forkJoin, lastValueFrom } from 'rxjs'

export const getIvFromOkx = async (currencies: string[]): Promise<IIVData> => {
  try {
    const ivArr = await lastValueFrom(
      forkJoin(currencies.map((currency) => getOkxIV$(currency))).pipe(
        map((results) => {
          return results.reduce((acc, { data, exchange, timestamp }) => ({
            data: { ...acc.data, ...data },
            exchange,
            // Assuming we want to keep the latest timestamp
            timestamp: Math.max(acc.timestamp, timestamp),
          }), { data: {}, exchange: "OKX", timestamp: 0 })
        })
      )
    );

    return ivArr;
  } catch (error) {
    console.log('getIvFromOkx error', error);
    return { data: {}, exchange: "OKX", timestamp: 0 };
  }
};

const getOkxIV$ = (currency: string) => {
  return fetchWithTimeoutAndRetry$(`https://www.okx.com/api/v5/public/opt-summary?instFamily=${currency}-USD`).pipe(
    map(({ data }) => {
      if (!data || data.length === 0) return { data: {}, exchange: "OKX", timestamp: 0 };

      const timestamp = Math.floor(data[0].ts / (10 ** 3)); // Extract timestamp from the first item
      const reducedData = data.reduce((acc, { instId, markVol }) => {
        const instrument = formatInstrument('OKX', instId);
        if (!instrument) return acc;
        acc[instrument] = Number(markVol);
        return acc;
      }, {});

      return { data: reducedData, exchange: "OKX", timestamp };
    })
  );
};