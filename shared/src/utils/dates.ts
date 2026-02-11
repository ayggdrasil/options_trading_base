import { MONTHS_MAP_REV } from "../constants/dates";

/**
 * 옵션 만료일 기준 남은 일수를 계산하는 함수
 * @param expiry 옵션 만료일 (Unix Timestamp)
 * @returns 남은 일수
 */
export function getDaysToExpiration(expiry: number): number {
  const nowTimestamp = Date.now();
  const timestampDiff = expiry * 1000 - nowTimestamp;
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return timestampDiff / millisecondsPerDay;
}

/**
 * 옵션 만료일 기준 남은 일수를 계산하는 함수
 * @param instrument 옵션 식별자 (예: "BTC-23APR25-100000-C")
 * @returns 남은 일수
 */
export const getDaysToExpirationByInstrument = (instrument: string) => {
  const [symbol, expiryDate, strikePrice, callPut] = instrument.split("-");
  const expiryTimestamp = convertExpiryDateToUnixTimestamp(expiryDate);

  return (expiryTimestamp - new Date().getTime()) / 1000 / 86400;
};

/**
 * 옵션 만료일 기준 남은 년수를 계산하는 함수
 * @param expiry 옵션 만료일 (Unix Timestamp)
 * @returns 남은 년수
 */
export function getYearsToExpiration(expiry: number): number {
  const daysToExpiration = getDaysToExpiration(expiry);
  return Number((daysToExpiration / 365).toFixed(6));
}

/**
 * 두 타임스탬프 사이의 년수를 계산하는 함수
 * @param unixTimestamp1 첫 번째 타임스탬프
 * @param unixTimestamp2 두 번째 타임스탬프
 * @returns 두 타임스탬프 사이의 년수
 */
export function getYearsBetweenUnixTimestamps(unixTimestamp1: number, unixTimestamp2: number): number {
  const diff = Math.abs(unixTimestamp2 - unixTimestamp1);
  const secondsInYear = 60 * 60 * 24 * 365;
  return diff / secondsInYear;
}

/**
 * 옵션 만료일을 ISO 형식으로 변환하는 함수
 * @param expiryDate 옵션 만료일 (예: "8MAR24")
 * @returns ISO 형식의 날짜 문자열 (예: "2024-03-08T08:00:00Z")
 */
export function convertExpiryDateToIsoDate(expiryDate: string): string {
  const datePattern = /(\d{1,2})([A-Z]{3})(\d{2})/;
  const match = expiryDate.match(datePattern);

  if (!match) throw new Error("Invalid expiry format");

  const [, day, month, year] = match;

  const formattedDay = day.padStart(2, "0");
  const formattedMonth = MONTHS_MAP_REV[month.toUpperCase()].toString().padStart(2, "0");
  const formattedYear = `20${year}`;

  return `${formattedYear}-${formattedMonth}-${formattedDay}T08:00:00Z`;
}

/**
 * 옵션 만료일을 Unix Timestamp로 변환하는 함수
 * @param expiryDate 옵션 만료일 (예: "8MAR24")
 * @returns Unix Timestamp (예: 1715136000)
 */
export function convertExpiryDateToUnixTimestamp(expiryDate: string): number {
  const dateStr = convertExpiryDateToIsoDate(expiryDate);
  const date = new Date(dateStr);

  return Math.floor(date.getTime() / 1000);
}
