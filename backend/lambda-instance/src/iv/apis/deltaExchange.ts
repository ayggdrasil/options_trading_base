import { map } from 'rxjs/operators'
import { fetchWithTimeoutAndRetry$ } from "../../utils/misc"
import { formatInstrument } from '../../utils/format'
import { lastValueFrom } from 'rxjs'

export const getIvFromDeltaExchange = async () => {
  try {
    const ivArr = await lastValueFrom(getDeltaExchangeIV$());
    return ivArr;
  } catch (error) {
    console.log('getIvFromDeltaExchange error', error);
    return { data: {}, timestamp: 0 };
  }
};

const getDeltaExchangeIV$ = () => {
  return fetchWithTimeoutAndRetry$(`https://api.delta.exchange/v2/tickers?contract_types=call_options,put_options`).pipe(
    map(({ result }) => {
      if (!result || result.length === 0) return { data: {}, timestamp: 0 };

      const timestamp = Math.floor(result[0].timestamp / (10 ** 6)); // Extract timestamp from the first item
      
      const reducedData = result.reduce((acc, { symbol, mark_vol }) => {
        const instrumentName = formatInstrument('DELTAEXCHANGE', symbol);
        if (!instrumentName) return acc;
        acc[instrumentName] = Number(mark_vol);
        return acc;
      }, {});

      return { data: reducedData, timestamp };
    })
  );
};