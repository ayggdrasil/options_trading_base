import { MONTHS_MAP, MONTHS_MAP_REV } from './constants';

// 2024-03-08T08:00:00Z to 8MAR24
export function convertISODateToExpiryDate(isoDate: string) {
  const date = new Date(isoDate);

  const day = date.getUTCDate();
  const month = MONTHS_MAP[date.getUTCMonth() + 1];
  const year = date.getUTCFullYear().toString().slice(-2);

  return `${day}${month}${year}`;
}

// 8MAR24 to 2024-03-08T08:00:00Z
export function convertExpiryDateToISODate(expiryDate: string): string {
  const datePattern = /(\d{1,2})([A-Z]{3})(\d{2})/;
  const match = expiryDate.match(datePattern);

  if (!match) throw new Error('Invalid expiry format');

  const [, day, month, year] = match;

  const formattedDay = day.padStart(2, '0');
  const formattedMonth = MONTHS_MAP_REV[month.toUpperCase()].toString().padStart(2, '0');
  const formattedYear = `20${year}`;

  return `${formattedYear}-${formattedMonth}-${formattedDay}T08:00:00Z`;
}

// 8MAR24 to timestamp
export function convertExpiryDateToTimestamp(expiryDate: string): number {
  const dateStr = convertExpiryDateToISODate(expiryDate);
  return new Date(dateStr).getTime();
}

// timestamp to 2024-03-08T08:00:00Z
export function convertTimestampToISODate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString();
}

// timestamp to 8MAR24
export function convertTimestampToExpiryDate(timestamp: number): string {
  const date = new Date(timestamp);

  const day = date.getUTCDate();
  const month = MONTHS_MAP[date.getUTCMonth() + 1];
  const year = date.getUTCFullYear().toString().slice(-2);

  return `${day}${month}${year}`;
}

export function getStrikePriceFromInstrument(instrument: string): number {
  return Number(instrument.split('-')[2]);
}

export function getMedian(values: number[]) {
  if (values.length === 0) return 0;

  // sort without mutation
  const sorted = [...values].sort((a, b) => a - b);

  const half = Math.floor(sorted.length / 2);

  // even
  if (sorted.length % 2 == 0) {
    return (sorted[half - 1] + sorted[half]) / 2;
  }

  // odd
  return sorted[half];
}

export function calculateRiskFreeRate(
  underlyingFutures: number,
  futuresPrice: number,
  daysToExpiry: number,
): number {
  return ((underlyingFutures / futuresPrice - 1) * 365) / daysToExpiry;
}

// Expiry 기준 남은 일수를 계산하는 함수
export function getDaysToExpiration(expiry: number): number {
  const nowTimestamp = Date.now();
  const timestampDiff = expiry - nowTimestamp;
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return timestampDiff / millisecondsPerDay;
}

// Expiry 기준 남은 연수를 계산하는 함수
export function getYearsToExpiration(expiry: number): number {
  const daysToExpiration = getDaysToExpiration(expiry);
  return Number((daysToExpiration / 365).toFixed(6));
}
