import { MONTHS_MAP } from 'src/common/constants';
import { SviDataByExpiry } from '../iv-curve.interface';

export const formatInstrument = (exchange: string, id: any): string => {
  // deribit: "ETH-29MAR24-3200-C"
  if (['deribit'].includes(exchange)) {
    return id;
  }

  const splitted = id.split('-');

  // bybit: 2 cases
  // - ETH-4APR25-4300-C
  // - ETH-4APR25-4300-C-USDT
  if (exchange === 'bybit') {
    if (splitted.length <= 4) return id; // 4개 이하면 그대로 반환
    if (splitted[4] === 'USDT') return `${splitted[0]}-${splitted[1]}-${splitted[2]}-${splitted[3]}`; // 5개면 앞의 4개만 사용
    return null;
  }

  // okx: "ETH-USD-230929-12000-C"
  if (exchange === 'okx') {
    const currency = splitted[0];
    const expiry = splitted[2];

    const year = `20${expiry.slice(0, 2)}`; // Ensure year is in YYYY format for clarity and consistency
    const month = Number(expiry.slice(2, 4));
    const day = Number(expiry.slice(4, 6)); // Convert to Number to remove leading zero

    const formattedExpiry = `${day}${MONTHS_MAP[month]}${year.slice(-2)}`; // Use slice(-2) to get last 2 digits of the year

    const strikePrice = splitted[3];
    const callPut = splitted[4];

    return `${currency}-${formattedExpiry}-${strikePrice}-${callPut}`;
  }

  // binance: "ETH-231229-1000-C"
  if (exchange === 'binance') {
    const currency = splitted[0];
    const expiry = splitted[1];

    const year = expiry.slice(0, 2);
    const month = Number(expiry.slice(2, 4));
    const day = expiry.slice(4, 6);

    const formattedExpiry = `${day}${MONTHS_MAP[month]}${year}`;

    const strikePrice = splitted[2];
    const callPut = splitted[3];

    return `${currency}-${formattedExpiry}-${strikePrice}-${callPut}`;
  }

  // delta exchange: "P-BTC-33000-290923"
  if (exchange === 'deltaexchange') {
    const callPut = splitted[0];
    const currency = splitted[1];
    const strikePrice = splitted[2];
    const expiry = splitted[3];

    const day = expiry.slice(0, 2);
    const month = Number(expiry.slice(2, 4));
    const year = expiry.slice(4, 6);

    const formattedExpiry = `${day}${MONTHS_MAP[month]}${year}`;

    return `${currency}-${formattedExpiry}-${strikePrice}-${callPut}`;
  }

  throw new Error('Unsupported exchange');
};

// SVI 데이터의 유효성을 검증하는 함수
export function validateSVIData(sviDataByExpiry: SviDataByExpiry | undefined): {
  isValid: boolean;
  message: string;
} {
  let message = '';

  if (!sviDataByExpiry) {
    message = 'No SVI data exists';
    return {
      isValid: false,
      message,
    };
  }

  if (sviDataByExpiry.length < 16) {
    message = 'SVI data is not enough';
    return {
      isValid: false,
      message,
    };
  }

  return {
    isValid: true,
    message: 'SVI data validation successful',
  };
}
