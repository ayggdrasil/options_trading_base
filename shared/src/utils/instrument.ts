import { UnderlyingAsset } from "../constants/assets";
import { OptionDirection } from "../types/options";
import { convertExpiryDateToUnixTimestamp } from "./dates";

export function parseInstrument(instrument: string) {
  const [underlyingAsset, expiryDate, strikePrice, optionDirectionAbbr] = instrument.split("-");
  const optionDirection: OptionDirection = optionDirectionAbbr === "C" ? "Call" : "Put";
  return {
    underlyingAsset: underlyingAsset as UnderlyingAsset,
    expiry: convertExpiryDateToUnixTimestamp(expiryDate),
    strikePrice: Number(strikePrice),
    optionDirection,
  };
}

export function getStrikePriceByInstrument(instrument: string): number {
  const instrumentArr = instrument.split("-");
  return Number(instrumentArr[2]);
}
