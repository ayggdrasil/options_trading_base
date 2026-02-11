import dayjs from "dayjs"
import weekOfYear from 'dayjs/plugin/weekOfYear'
import utc from 'dayjs/plugin/utc'
import { of } from "rxjs"
import { fromFetch } from "rxjs/fetch"
import { switchMap, retry, catchError, timeout } from "rxjs/operators"
import { convertExpiryDateToTimestampInSec } from "./format"
import timezone from 'dayjs/plugin/timezone';

interface InstrumentGroup {
  instruments: string[];
  expiryDate: dayjs.Dayjs;
}

interface InstrumentsByExpiry {
  [key: string]: InstrumentGroup;
}

dayjs.extend(weekOfYear)
dayjs.extend(utc)
dayjs.extend(timezone);

export const fetchWithRetry$ = (fetchRequest) => {
  return fromFetch(fetchRequest).pipe(
    switchMap((response) => response.json()),
    retry(3),
    catchError((err) => {
      console.log(err, 'fetchWithRetry$ err')
      return of(0)
    }),
  )
}

export const fetchWithTimeoutAndRetry$ = (url, apiKey = null, timeoutDuration = 3 * 1000) => {
  // Initialize headers only if apiKey is provided
  let headers = apiKey ? new Headers({ 'X-Api-Key': apiKey }) : undefined;

  // Create a fetch request with headers if the apiKey is provided
  let fetchRequest = apiKey ? new Request(url, { headers }) : url;

  return fromFetch(fetchRequest).pipe(
    switchMap((response) => response.json()),
    timeout(timeoutDuration),
    retry(3),
    catchError((err) => {
      if (err.name === 'TimeoutError') {
        console.log('Request timed out', fetchRequest);
        return of(null);
      } else {
        console.log(err, 'fetchWithRetry$ error');
        return of(null);
      }
    }),
  );
};

export const filterDuplicates = (arr) => {
  const countMap = arr.reduce((map, item) => {
    map[item] = (map[item] || 0) + 1
    return map;
  }, {});

  return Object.keys(countMap).filter(item => countMap[item] >= 3)
}

export const makeDayjsObjectByInstrumentName = (instrument_name) => {
  const [currency, expiryString, strikePrice, callPut] = instrument_name.split('-')
  const expiryTimestamp = convertExpiryDateToTimestampInSec(expiryString) * 1000
  const expiryDate = dayjs(expiryTimestamp).utc(true)

  return { expiryDate }
}

export const findMonthLastFriday = (dayjsObject: dayjs.Dayjs) => {
  const month = dayjsObject.month()

  const lastFridayCandidate = dayjsObject.utc(true).endOf('month').day(5).hour(8).minute(0).second(0)

  if (month + 1 == lastFridayCandidate.month() + 1) {
    return lastFridayCandidate
  }

  return lastFridayCandidate.subtract(7, 'day')
}

export const filterByDateConditionV2 = (instruments: string[], currentDate: dayjs.Dayjs) => {
  // 1. 만기일별로 instruments 그룹화
  const instrumentsByExpiry = instruments.reduce((acc, instrument_name) => {
    const { expiryDate } = makeDayjsObjectByInstrumentName(instrument_name)
    const key = expiryDate.format('YYYY-MM-DD')
    acc[key] = acc[key] || {
      instruments: [],
      expiryDate
    }
    acc[key].instruments.push(instrument_name)
    return acc
  }, {} as InstrumentsByExpiry)

  // 2. 만기일이 속할 condition 결정
  const { expiryConditionMap } = determineConditions(instrumentsByExpiry, currentDate)

  // 3. 결정된 condition에 따라 instruments 할당
  const result: { [key: string]: boolean } = {}
  Object.entries(instrumentsByExpiry).forEach(([expiryKey, { instruments: expiryInstruments }]) => {
    const condition = expiryConditionMap[expiryKey]
    if (condition) {
      expiryInstruments.forEach(instrument => {
        result[instrument] = true
      })
    }
  })

  return result
}

const determineConditions = (instrumentsByExpiry: InstrumentsByExpiry, currentDate: dayjs.Dayjs) => {
  const expiryConditionMap: { [key: string]: number } = {}
  const assignedExpiryDates = new Set<string>()

  // Condition 1: 현 시점 기준 24시간 이내 만기
  Object.entries(instrumentsByExpiry).forEach(([expiryKey, { expiryDate }]) => {
    if (isWithin24Hours(expiryDate, currentDate)) {
      expiryConditionMap[expiryKey] = 1
      assignedExpiryDates.add(expiryKey)
    }
  })

  // Condition 2: 현 시점 기준 24시간 초과 & 48시간 이내 만기
  Object.entries(instrumentsByExpiry).forEach(([expiryKey, { expiryDate }]) => {
    if (
      !assignedExpiryDates.has(expiryKey) &&
      isWithin48Hours(expiryDate, currentDate)
    ) {
      expiryConditionMap[expiryKey] = 2
      assignedExpiryDates.add(expiryKey)
    }
  })

  // Condition 3: 현 시점 기준 48시간 초과 & 9일(24h * 9) 이내 금요일 (근주물) 만기
  Object.entries(instrumentsByExpiry).forEach(([expiryKey, { expiryDate }]) => {
    if (
      !assignedExpiryDates.has(expiryKey) &&
      isWeeklyExpiry(expiryDate, currentDate)
    ) {
      expiryConditionMap[expiryKey] = 3
      assignedExpiryDates.add(expiryKey)
    }
  })

  // Condition 4
  // - 현 시점 기준 이번 달 마지막 금요일 만기
  // - 단, 이번 달 마지막 금요일이 지났거나 condition 1, 2, 3에 해당하는 경우 다음 달 마지막 금요일 만기
  Object.entries(instrumentsByExpiry).forEach(([expiryKey, { expiryDate }]) => {
    if (
      !assignedExpiryDates.has(expiryKey) && 
      isMonthlyExpiry(expiryDate, currentDate)
    ) {
      expiryConditionMap[expiryKey] = 4
      assignedExpiryDates.add(expiryKey)
    }
  })

  return { expiryConditionMap, assignedExpiryDates }
}

const isWithin24Hours = (targetDate: dayjs.Dayjs, currentDate: dayjs.Dayjs): boolean => {
  const futureDate = currentDate.add(24, 'hour')
  return targetDate.isBefore(futureDate)
}

const isWithin48Hours = (targetDate: dayjs.Dayjs, currentDate: dayjs.Dayjs): boolean => {
  const future24h = currentDate.add(24, 'hour')
  const future48h = currentDate.add(48, 'hour')
  return targetDate.isAfter(future24h) && targetDate.isBefore(future48h)
}

const isWeeklyExpiry = (targetDate: dayjs.Dayjs, currentDate: dayjs.Dayjs): boolean => {
  const thisWeekFriday = currentDate.day(5).hour(8).minute(0).second(0)
  const nextWeekFriday = currentDate.clone().add(1, 'week').day(5).hour(8).minute(0).second(0)

  // 현 시점 기준으로
  // - 이번주 금요일이 condition 1, 2에 해당하는 경우 또는 지났을 경우 다음주 금요일을 대상으로
  // - 그렇지 않은 경우 이번주 금요일을 대상으로
  const isWithin24h = isWithin24Hours(thisWeekFriday, currentDate)
  const isWithin48h = isWithin48Hours(thisWeekFriday, currentDate)
  const isAfterOrSame = currentDate.isAfter(thisWeekFriday) || currentDate.isSame(thisWeekFriday)

  const targetFriday = (isWithin24h || isWithin48h || isAfterOrSame) 
    ? nextWeekFriday 
    : thisWeekFriday

  return (
    targetDate.isSame(targetFriday, 'day') &&
    targetDate.isSame(targetFriday, 'month') &&
    targetDate.isSame(targetFriday, 'year')
  )
}

const isMonthlyExpiry = (targetDate: dayjs.Dayjs, currentDate: dayjs.Dayjs): boolean => {
  const thisMonthLastFriday = findMonthLastFriday(currentDate)
  const nextMonthLastFriday = findMonthLastFriday(currentDate.add(1, 'month'))

  // 현 시점 기준으로
  // - 이번달 금요일이 condition 1, 2, 3에 해당하는 경우 또는 지났을 경우 다음달 금요일을 대상으로
  // - 그렇지 않은 경우 이버달 금요일을 대상으로
  const isWithin24h = isWithin24Hours(thisMonthLastFriday, currentDate)
  const isWithin48h = isWithin48Hours(thisMonthLastFriday, currentDate)
  const isWeekly = isWeeklyExpiry(thisMonthLastFriday, currentDate)
  const isAfterOrSame = currentDate.isAfter(thisMonthLastFriday) || currentDate.isSame(thisMonthLastFriday)

  const targetMonthLastFriday = (isWithin24h || isWithin48h || isWeekly || isAfterOrSame)
    ? nextMonthLastFriday
    : thisMonthLastFriday

  return (
    targetDate.isSame(targetMonthLastFriday, 'day') &&
    targetDate.isSame(targetMonthLastFriday, 'month') &&
    targetDate.isSame(targetMonthLastFriday, 'year')
  )
}

export const isTimeInRange = (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
  const now = dayjs().tz('Asia/Seoul');
  const today = now.clone().startOf('day');
  
  const start = today.hour(startHour).minute(startMinute);
  const end = today.hour(endHour).minute(endMinute);
  
  return now.isAfter(start) && now.isBefore(end);
}

export function getKstTime(millisecondTimestamp: number): string {
  return dayjs(millisecondTimestamp).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
}

// When the network is congested, there's a risk of submitting stale values.
// The deadline parameter protects against this by enforcing a time limit for transaction execution.
export const getDeadline = () => {
  // as solidity seconds
  const deadlineSeconds = Number(process.env.DEADLINE_SECONDS || 90);
  const deadline = dayjs().unix() + deadlineSeconds;
  return deadline
}