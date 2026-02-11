import BigNumber from "bignumber.js"

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 18,
})

export function calculateAvgPriceWithSize(prevSize: string, prevAvgPrice: string, nextSize: string, nextAvgPrice: string): string {
  const denominator = new BigNumber(prevSize).plus(nextSize).toString()
  const numerator = new BigNumber(prevSize)
    .multipliedBy(prevAvgPrice)
    .plus(new BigNumber(nextSize).multipliedBy(nextAvgPrice))
    .toString()

  return new BigNumber(numerator).div(denominator).toString()
}