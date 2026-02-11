export function toFixedNoRounding(num: number, fixed: number): string {
  // eslint-disable-next-line no-useless-escape
  const re = new RegExp(`^-?\\d+(?:\.\\d{0,${fixed || -1}})?`);
  const match = num.toString().match(re);
  return (match && match[0]) || "0";
}

// 숫자를 1,000,000.00 형태로 변환하는 함수
export function formatNumber(
  num: number,
  decimal: number,
  shouldTrimZero: boolean = false,
  shouldRound: boolean = false
): string {
  const parsedNum = shouldRound ? num.toFixed(decimal) : toFixedNoRounding(num, decimal);

  if (isNaN(parseFloat(parsedNum))) return "-";

  const parts = parsedNum.split(".");
  const integerPart = parts[0];
  let fractionPart = parts[1];

  const formattedIntegerPart = Number(integerPart).toLocaleString();

  // Make sure fractionPart is not undefined and has correct number of decimal places
  if (!fractionPart) {
    fractionPart = "0".repeat(decimal);
  } else if (fractionPart.length < decimal) {
    const zerosToAdd = decimal - fractionPart.length;
    fractionPart += "0".repeat(zerosToAdd);
  }

  // If decimal is zero, or if the fractional part is missing or all zeros, then return just the integer part.
  if (decimal === 0 || !fractionPart || (shouldTrimZero && fractionPart.match(/^0+$/))) {
    return formattedIntegerPart;
  }

  // If shouldTrimZero is true, then remove trailing zeros.
  if (shouldTrimZero) {
    const trimmedFractionPart = fractionPart.replace(/0+$/, "");
    if (trimmedFractionPart.length > 0) {
      return `${formattedIntegerPart}.${trimmedFractionPart}`;
    } else {
      return formattedIntegerPart;
    }
  }

  return `${formattedIntegerPart}.${fractionPart}`;
}

// 숫자가 너무 작을 때 부등호로 표시하는 함수 (with sign) - Display용
export function advancedFormatNumber(
  num: number,
  decimal: number,
  sign: string = "",
  shouldTrimZero: boolean = false,
  shouldRound: boolean = false
): string {
  const parsedDecimal = decimal <= 0 ? 0 : decimal - 1;

  if (num !== 0 && Math.abs(num) < Math.pow(10, -decimal)) {
    if (num > 0) {
      return `< ${sign}0.${"0".repeat(parsedDecimal)}1`;
    } else {
      return `> -${sign}0.${"0".repeat(parsedDecimal)}1`;
    }
  }

  if (num >= 0) {
    return `${sign}${formatNumber(num, decimal, shouldTrimZero, shouldRound)}`;
  } else {
    return `-${sign}${formatNumber(Math.abs(num), decimal, shouldTrimZero, shouldRound)}`;
  }
}

// 숫자가 NaN일 경우 0으로 반환하는 함수
export const safeNumber = (value: unknown): number => {
  return isNaN(Number(value)) ? 0 : Number(value);
};