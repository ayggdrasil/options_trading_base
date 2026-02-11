import { MONTHS_MAP_REV } from "@/utils/constants";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

// 8MAR24 to 2024-03-08T08:00:00Z
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

// 8MAR24 to timestamp
export function convertExpiryDateToTimestampInSec(expiryDate: string): number {
  const dateStr = convertExpiryDateToIsoDate(expiryDate);
  const date = new Date(dateStr);

  return Math.floor(date.getTime() / 1000);
}

/**
 * 날짜의 ISO 형식 문자열(YYYY-MM-DD)을 반환합니다. (UTC 기준)
 * @param days 이동할 일수 (음수: 과거, 양수: 미래, 기본값: 0(현재))
 */
export const getDateISOString = (days: number = 0): string => {
  return dayjs().utc().add(days, "day").format("YYYY-MM-DD");
};
