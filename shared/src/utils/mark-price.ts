import { OptionRiskPremiumInputData } from "../types/options";

export function getMarkPrice(mainOption: OptionRiskPremiumInputData, pairedOption: OptionRiskPremiumInputData | null) {
  if (pairedOption === null) {
    return mainOption.markPrice;
  }
  return Math.abs(mainOption.markPrice - pairedOption.markPrice);
}
