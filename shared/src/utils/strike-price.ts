import { OptionRiskPremiumInputData } from "../types/options";

export function generateStrikePriceArr(
  isCall: boolean,
  mainOption: OptionRiskPremiumInputData,
  pairedOption: OptionRiskPremiumInputData | null
) {
  if (pairedOption === null) {
    return [mainOption.strikePrice, 0, 0, 0];
  }

  if (isCall) {
    return [mainOption.strikePrice, pairedOption.strikePrice, 0, 0];
  }

  return [pairedOption.strikePrice, mainOption.strikePrice, 0, 0];
}
