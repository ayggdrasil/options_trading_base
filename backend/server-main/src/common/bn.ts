import BigNumber from 'bignumber.js';

// Configure BigNumber globally
BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

/**
 * Custom BigNumber utility class
 * Provides convenient methods for common operations with consistent configuration
 */
export class BN {
  /**
   * Create a new BigNumber instance
   */
  static from(value: string | number | BigNumber): BigNumber {
    return new BigNumber(value);
  }

  /**
   * Convert to number (use carefully due to potential precision loss)
   */
  static toNumber(value: string | number | BigNumber): number {
    return new BigNumber(value).toNumber();
  }

  /**
   * Convert to string with specified decimal places
   */
  static toString(value: string | number | BigNumber, decimalPlaces = 8): string {
    return new BigNumber(value).toFixed(decimalPlaces);
  }

  /**
   * Divide and return a BigNumber
   */
  static divide(value: string | number | BigNumber, divisor: string | number | BigNumber): BigNumber {
    return new BigNumber(value).dividedBy(divisor);
  }

  /**
   * Divide and return a number (convenience method)
   */
  static divideToNumber(value: string | number | BigNumber, divisor: string | number | BigNumber): number {
    return new BigNumber(value).dividedBy(divisor).toNumber();
  }

  /**
   * Divide by a value, floor the result, and return as a number
   */
  static divideFloor(value: string | number | BigNumber, divisor: string | number | BigNumber): number {
    return new BigNumber(value).dividedBy(divisor).integerValue(BigNumber.ROUND_FLOOR).toNumber();
  }

  /**
   * Multiply and return a BigNumber
   */
  static multiply(value: string | number | BigNumber, multiplier: string | number | BigNumber): BigNumber {
    return new BigNumber(value).multipliedBy(multiplier);
  }

  /**
   * Add and return a BigNumber
   */
  static add(value: string | number | BigNumber, addend: string | number | BigNumber): BigNumber {
    return new BigNumber(value).plus(addend);
  }

  /**
   * Subtract and return a BigNumber
   */
  static subtract(value: string | number | BigNumber, subtrahend: string | number | BigNumber): BigNumber {
    return new BigNumber(value).minus(subtrahend);
  }

  /**
   * Format percentage (multiply by 100 and append %)
   */
  static formatPercent(value: string | number | BigNumber, decimalPlaces = 2): string {
    return `${new BigNumber(value).multipliedBy(100).toFixed(decimalPlaces)}%`;
  }

  /**
   * Check if value is zero
   */
  static isZero(value: string | number | BigNumber): boolean {
    return new BigNumber(value).isZero();
  }

  /**
   * Compare two values (returns -1, 0, or 1)
   */
  static compare(a: string | number | BigNumber, b: string | number | BigNumber): number {
    return new BigNumber(a).comparedTo(b);
  }
}
