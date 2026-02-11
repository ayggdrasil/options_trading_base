import BigNumber from "bignumber.js";
import { solidityPacked, zeroPadBytes } from "ethers";
import { OLP_TERM_THRESHOLD } from "../constants";
import dayjs from "dayjs";
import { MESSAGE_TYPE } from "./messages";
import { ChainNames, getDaysToExpiration, OlpKey, parseOptionTokenId, UnderlyingAssetIndex, VAULT_INDEX_TO_ADDRESS, VaultIndex } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export function getVaultAddressByOptionTokenId(optionTokenId) {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];
  const { vaultIndex } = parseOptionTokenId(optionTokenId);
  return VAULT_INDEX_TO_ADDRESS[chainName][vaultIndex];
}

export function getOlpKeyByExpiry(chainId: number, expiry: number): OlpKey {
  const daysToExpiration = getDaysToExpiration(expiry);
  if (daysToExpiration <= OLP_TERM_THRESHOLD[chainId].SHORT) return "sOlp";
  if (daysToExpiration <= OLP_TERM_THRESHOLD[chainId].MID) return "mOlp";
  return "lOlp";
}

export function getOlpKeyByVaultIndex(vaultIndex: VaultIndex): OlpKey {
  if (vaultIndex === 0) return "sOlp";
  if (vaultIndex === 1) return "mOlp";
  if (vaultIndex === 2) return "lOlp";
  throw new Error("Invalid vault index");
}

export function getCurrentTimestampAndDate() {
  return {
    timestamp: Date.now(),
    lastUpdatedAt: new Date().toISOString(),
  }
}

export function getOptionId(underlyingAssetIndex: UnderlyingAssetIndex, expiry: number, strikePrice: number): string {
  return zeroPadBytes(
    solidityPacked(
      ["uint16", "uint40", "uint48"],
      [underlyingAssetIndex, expiry, strikePrice]
    ),
    32
  );
}

export function getKoreanTimeFormatted() {
  const now = new Date();
  const koreaTimeOffset = 9 * 60;
  const koreanTime = new Date(now.getTime() + (koreaTimeOffset + now.getTimezoneOffset()) * 60000);
  
  const year = koreanTime.getFullYear();
  const month = String(koreanTime.getMonth() + 1).padStart(2, '0');
  const day = String(koreanTime.getDate()).padStart(2, '0');
  const hours = String(koreanTime.getHours()).padStart(2, '0');
  const minutes = String(koreanTime.getMinutes()).padStart(2, '0');
  const seconds = String(koreanTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

//////////////////////////////////
//   OLP Pool Dashboard utility
//////////////////////////////////

export const getOldestData = (data: any) => {
  const sortedDates = Object.keys(data).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );
  return data[sortedDates[0]];
}

export const interpolateData = (
  data: any, 
  dates: string[], 
  interpolationType: 'initial' | 'previous',
  initialData?: any
) => {
  // dates asc
  const sortedDates = dates.sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
  );

  ///@dev: if no tx occurs in period, fill with the most recent data 
  const dataLatestDate = Object.keys(data).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )[0];
  if (dataLatestDate && new Date(sortedDates[0]).getTime() > new Date(dataLatestDate).getTime()) {
    return sortedDates.reduce((acc, date) => {
      acc[date] = data[dataLatestDate];
      return acc;
    }, {});
  }
  
  const result: any = {};
  let previousData = data[sortedDates[0]] || initialData;

  for (const date of sortedDates) {
      if (data[date]) {
          result[date] = data[date];
          previousData = data[date];
      } else {
          result[date] = (interpolationType === 'initial') 
            ? initialData 
            : previousData;
      }
  }
  return result;
};

export const interpolateDate = (dates: string[]): string[] => {
  if (dates.length === 0) return [];

  // dates desc
  const sortedDates = dates.sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
  );

  const interpolatedDates: string[] = [];
  const startDate = new Date(sortedDates[sortedDates.length - 1]);
  const endDate = new Date(sortedDates[0]);
  
  let currentDate = endDate;
  while (currentDate >= startDate) {
      interpolatedDates.push(dayjs(currentDate).format('YYYY-MM-DD'));
      // move to next day
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  }

  return interpolatedDates;
};

//////////////////////////////////
//   Message Helper //
//////////////////////////////////

export const isIgnorableError = (error: any): boolean => {
  const IGNORABLE_ERRORS = [
    MESSAGE_TYPE.NONCE_ALREADY_USED,
    MESSAGE_TYPE.COULD_NOT_COALESCE_ERROR,
    MESSAGE_TYPE.NONCE_LOWER_THAN_CURRENT_NONCE,
    MESSAGE_TYPE.NO_FEE_DATA_FOUND
  ];

  return IGNORABLE_ERRORS.some((msg) => error.message.includes(msg));
};
