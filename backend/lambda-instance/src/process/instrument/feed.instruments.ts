import hash from 'object-hash'
import { uniq } from 'lodash'
import { forkJoin, lastValueFrom, of } from 'rxjs'
import { map, catchError } from 'rxjs/operators'
import dayjs from "dayjs"
import { fetchDataFromS3, getS3, putS3 } from '../../utils/aws'
import { UNDERLYING_ASSET_CURRENCIES } from '../../constants'
import { convertExpiryDateToTimestampInSec, formatInstrument, getDaysToExpiration } from '../../utils/format'
import { fetchWithRetry$, filterByDateConditionV2, filterDuplicates } from '../../utils/misc'
import { updateOptionsMarket } from './update.optionsMarket'
import { getFuturesS3 } from '../../utils/aws-getter'

const initialInstrumentsData = {
  instruments: {
    active: [],
    inactive: [],
  },
  priceAtUpdated: {},
  updatedAt: 0,
}

const initialInstrumentsHashData = {
  hash: '',
}

export const feedInstruments = async () => {
  let newActiveInstruments = {}
  let newInactiveInstruments = []

  // get futures price
  const { data: futures } = await getFuturesS3();
  
  for await (const currency of UNDERLYING_ASSET_CURRENCIES) {
    newActiveInstruments = {
      ...newActiveInstruments,
      ...(await trackInstruments(currency, futures[currency])),
    }
  }
  
  // check previous active instruments if it should be inactive
  const prevInstruments = await fetchDataFromS3({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: process.env.APP_DATA_INSTRUMENTS_KEY,
    initialData: initialInstrumentsData,
  })

  const prevActiveInstruments = prevInstruments?.instruments?.active || []
  const prevInactiveInstruments = prevInstruments?.instruments?.inactive || []

  newInactiveInstruments = uniq([
    ...(prevInactiveInstruments || []),
    ...(prevActiveInstruments || []).filter((instrumentName) => !newActiveInstruments[instrumentName]),
  ]).filter((instrumentName) => {
    // remove expired instruments
    const [_currency, expiryString, _strikePrice, _callPut] = instrumentName.split('-')

    const expiry = convertExpiryDateToTimestampInSec(expiryString)

    // If it's activated, remove it from inactive list
    if (newActiveInstruments[instrumentName]) {
      return false
    }

    // SWEEP_BUFFER_TIME
    return expiry > Date.now() / 1000
  })

  const instruments = {
    active: Object.keys(newActiveInstruments),
    inactive: newInactiveInstruments,
  }

  if (instruments.active.length !== 0) {
    const prevHash = await fetchDataFromS3({
      Bucket: process.env.APP_DATA_BUCKET,
      Key: process.env.APP_DATA_INSTRUMENTS_HASH_KEY,
      initialData: initialInstrumentsHashData,
    })

    const newHash = hash(instruments)
    const shouldUpdate = prevHash?.hash != newHash
    console.log('shouldUpdate', shouldUpdate)

    if (shouldUpdate) {
      await Promise.all([
        putS3({
          Bucket: process.env.APP_DATA_BUCKET,
          Key: process.env.APP_DATA_INSTRUMENTS_KEY,
          Body: JSON.stringify({
            instruments,
            priceAtUpdated: futures,
            updatedAt: Date.now(),
          }),
          CacheControl: 'no-cache',
        }),
        putS3({
          Bucket: process.env.APP_DATA_BUCKET,
          Key: process.env.APP_DATA_INSTRUMENTS_HASH_KEY,
          Body: JSON.stringify({
            hash: newHash,
          }),
          CacheControl: 'no-cache',
        }),
        updateOptionsMarket(instruments)
      ])
    }
  }
}

const trackInstruments = async (currency, futuresIndex) => {
  // intersection of instruments from 3 exchanges
  const [deribitInstruments, okxInstruments, bybitInstruments] = await lastValueFrom(
    forkJoin([
      getDeribitInstruments$(currency),
      getOKXInstruments$(currency),
      getBybitInstruments$(currency),
    ])
  )

  const nonEmptyInstruments = [
    Object.keys(deribitInstruments),
    Object.keys(okxInstruments),
    Object.keys(bybitInstruments),
  ]
  .filter((keys) => keys.length !== 0)
  .flat()

  // 3개 거래소 모두 상장된 경우에만 지원
  const intersectedInstruments = filterDuplicates(nonEmptyInstruments)

  const filteredInstruments = filterByDateConditionV2(
    intersectedInstruments,
    dayjs().utc(true)
  )

  // // atm +-
  // // instruments
  return Object.keys(filteredInstruments).reduce((acc, instrument_name) => {

    const [currency, expiryString, strikePrice, callPut] = instrument_name.split('-')
    const expiry = convertExpiryDateToTimestampInSec(expiryString)

    const dayToExpiration = Math.ceil(getDaysToExpiration(expiry))

    if (isWhitelistedCriteria(futuresIndex, strikePrice, dayToExpiration, callPut)) {
      acc[instrument_name] = true
    }

    return acc
  }, {})
}

const getDeribitInstruments$ = (currency) => {
  const url = "https://www.deribit.com/api/v2/public/get_instruments" + `?currency=${currency}&expired=false&include_spots=false&kind=option`
  
  return fetchWithRetry$(url).pipe(
    map(({ result }) => {
      return result.reduce((acc, { instrument_name, expiration_timestamp }) => {
        acc[instrument_name] = true
        return acc
      }, {})
    }),
    catchError((e) => {
      console.log(e, '**e')
      return of({})
    })
  )
}

const getOKXInstruments$ = (currency) => {

  const url = `https://www.okx.com/api/v5/public/instruments?instType=OPTION&instFamily=${currency}-USD`

  return fetchWithRetry$(url).pipe(
    map(({ data }) => {
      return data.reduce((acc, { instId, expTime }) => {
        const instrumentName = formatInstrument('OKX', instId)
        if (!instrumentName) return acc;
        acc[instrumentName] = true
        return acc
      }, {})
    }),
    catchError((e) => {
      console.log(e, '**e')
      return of({})
    })
  )
}

const getBybitInstruments$ = (currency) => {
  const url = `https://api.bybit.com/v5/market/instruments-info?category=option&status=Trading&baseCoin=${currency}&limit=1000`

  return fetchWithRetry$(url).pipe(
    map(({ result }) => result.list),
    map((data) => {
      return data.reduce((acc, { symbol }) => {
        const instrumentName = formatInstrument('BYBIT', symbol)
        if (!instrumentName) return acc;
        acc[instrumentName] = true
        return acc
      }, {})
    }),
    catchError((e) => {
      console.log(e, '**e')
      return of({})
    })
  )
}

// whitelisted criteria
const weeks = 7
const month = 31
const quarter = 92

const isWhitelistedCriteria = (futurePrice, strikePrice, dayToExpiry, callPut) => {
  const moneynessRate = (strikePrice / futurePrice) - 1

  switch (true) {
    case dayToExpiry <= 1:
      return moneynessRate <= 0.10 && moneynessRate >= -0.10
    case dayToExpiry <= 2:
      return moneynessRate <= 0.10 && moneynessRate >= -0.10
    case dayToExpiry <= 1 * weeks:
      return moneynessRate <= 0.20 && moneynessRate >= -0.20
    case dayToExpiry <= 2 * weeks:
      return moneynessRate <= 0.20 && moneynessRate >= -0.20
    case dayToExpiry <= 3 * weeks:
      return moneynessRate <= 0.20 && moneynessRate >= -0.20
    case dayToExpiry <= 1 * month:
      return moneynessRate <= 0.40 && moneynessRate >= -0.40
    case dayToExpiry <= 2 * month:
      return moneynessRate <= 0.40 && moneynessRate >= -0.40
    case dayToExpiry <= 1 * quarter:
      return moneynessRate <= 0.50 && moneynessRate >= -0.50
    case dayToExpiry <= 2 * quarter:
      return moneynessRate <= 0.50 && moneynessRate >= -0.50
    case dayToExpiry <= 3 * quarter:
      return moneynessRate <= 0.50 && moneynessRate >= -0.50
    default:
      return moneynessRate <= 0.20 && moneynessRate >= -0.20
  }
}