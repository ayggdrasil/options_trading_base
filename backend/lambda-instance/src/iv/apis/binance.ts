import { map } from 'rxjs/operators'
import { fetchWithTimeoutAndRetry$ } from "../../utils/misc"
import { formatInstrument } from '../../utils/format'
import { lastValueFrom } from 'rxjs'

export const getIvFromBinance = async () => {
  try {
    const ivArr = await lastValueFrom(getBinanaceIV$())
    return ivArr;
  } catch (error) {
    console.log('getIvFromBinance error', error)
    return { data: {}, timestamp: 0 };
  }
}

const getBinanaceIV$ = () => {
  return fetchWithTimeoutAndRetry$(`https://eapi.binance.com/eapi/v1/mark`).pipe(
    map((data) => {
      if (!data) return { data: {}, timestamp: 0 };

      const timestamp = Math.floor(Date.now() / (10 ** 3));

      const reducedData = data.reduce((acc, { symbol, markIV }) => {
        const instrumentName = formatInstrument('BINANCE', symbol)
        if (!instrumentName) return acc;
        acc[instrumentName] = Number(markIV)
        return acc
      }, {})

      return { data: reducedData, timestamp: timestamp};
    })
  )
}