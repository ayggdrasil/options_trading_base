import { OptionType } from "../shared/types/options";
import { MONTHS_MAP_REV } from "../shared/constants/date";
import { UnderlyingAsset } from "../shared/enums/assets";

export interface ParsedInstrument {
  underlyingAsset: UnderlyingAsset;
  expiryDate: string;
  strikePrice: number;
  optionType: OptionType;
}

export function parseInstrument(instrument: string): ParsedInstrument {
  try {
    const parts = instrument.split("-");

    if (parts.length !== 4) {
      throw new Error(`Invalid option name format: ${instrument}`);
    }

    const underlyingAsset = parts[0];
    const expiryDate = parts[1];
    const strikePriceStr = parts[2];
    const optionTypeIndicator = parts[3];

    const strikePrice = parseFloat(strikePriceStr);

    if (isNaN(strikePrice)) {
      throw new Error(`Invalid strike price: ${strikePriceStr}`);
    }

    if (optionTypeIndicator !== "C" && optionTypeIndicator !== "P") {
      throw new Error(
        `Invalid option type indicator: ${optionTypeIndicator}. Must be 'C' for Call or 'P' for Put.`
      );
    }

    const optionType: OptionType = optionTypeIndicator === "C" ? "Call" : "Put";

    return {
      underlyingAsset: underlyingAsset as UnderlyingAsset,
      expiryDate,
      strikePrice,
      optionType,
    };
  } catch (error) {
    console.error(`Error parsing option name "${instrument}":`, error);

    return {
      underlyingAsset: UnderlyingAsset.ALL,
      expiryDate: "",
      strikePrice: 0,
      optionType: "Call",
    };
  }
}

// 8MAR24 to 2024-03-08T08:00:00Z
export function convertExpiryDateToISODate(expiryDate: string): string {
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
export function convertExpiryDateToTimestamp(expiryDate: string): number {
  const dateStr = convertExpiryDateToISODate(expiryDate);
  return new Date(dateStr).getTime();
}

// timestamp to days
export function getDaysToExpiration(expiry: number): number {
  const nowTimestamp = Date.now();
  const timestampDiff = expiry - nowTimestamp;
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return timestampDiff / millisecondsPerDay;
}

// timestamp to days, hours, minutes, seconds
export function getTimeToExpiration(expiry: number): string {
  const now = Date.now();
  const diff = Math.max(0, expiry - now); // Ensure we don't get negative time

  // Calculate time components
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  // Format time components with padding
  const paddedHours = hours.toString().padStart(2, "0");
  const paddedMinutes = minutes.toString().padStart(2, "0");
  const paddedSeconds = seconds.toString().padStart(2, "0");

  // Return formatted time string
  if (days > 0) {
    return `${days}d ${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  } else {
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  }
}
