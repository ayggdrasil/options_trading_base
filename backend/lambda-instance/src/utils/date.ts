import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * 날짜의 ISO 형식 문자열(YYYY-MM-DD)을 반환합니다. (UTC 기준)
 * @param days 이동할 일수 (음수: 과거, 양수: 미래, 기본값: 0(현재))
 */
export const getDateISOString = (days: number = 0): string => {
  return dayjs().utc().add(days, 'day').format('YYYY-MM-DD');
};

/**
 * 타임스탬프를 ISO 형식 문자열(YYYY-MM-DD)로 변환합니다. (UTC 기준)
 * @param timestamp 밀리초 단위의 타임스탬프
 * @returns ISO 형식의 날짜 문자열 (YYYY-MM-DD)
 */
export const getDateISOStringFromTimestamp = (timestamp: number): string => {
  return dayjs(timestamp).utc().format('YYYY-MM-DD');
};

/**
 * 지정된 날짜에 시간, 분, 초를 설정하여 UTC 기준 타임스탬프를 반환합니다.
 * @param dateStr 날짜 문자열 (YYYY-MM-DD)
 * @param hours 시간 (0-23)
 * @param minutes 분 (0-59)
 * @param seconds 초 (0-59)
 */
export const getTimestampFromDateAndTime = (
  dateStr: string,
  hours: number,
  minutes: number,
  seconds: number,
): number => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes, seconds);
};

/**
 * 타임스탬프를 DD-MM-YYYY 형식 문자열로 변환합니다. (UTC 기준)
 * @param timestamp 밀리초 단위의 타임스탬프
 * @returns DD-MM-YYYY 형식의 날짜 문자열
 */
export const getDateDDMMYYYYFromTimestamp = (timestamp: number): string => {
  return dayjs(timestamp).utc().format('DD-MM-YYYY');
};
