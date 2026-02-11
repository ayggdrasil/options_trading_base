import { SupportedChains, UnderlyingAsset } from "@callput/shared";
import { PriceUnit } from "@/utils/types";
import { twJoin } from "tailwind-merge";
import { useAppSelector } from "@/store/hooks";
import { NetworkState } from "@/networks/types";
import { useEffect } from "react";
import { UA_INFO } from "@/networks/assets";

import IconSymbolDollarOn from "@assets/img/symbol/dollar-on.png";
import IconSymbolDollarOff from "@assets/img/symbol/dollar-off.png";

interface PriceUnitSelectorProps {
  selectedUnderlyingAsset: UnderlyingAsset;
  selectedPriceUnit: PriceUnit;
  setSelectedPriceUnit: (priceUnit: PriceUnit) => void;
}

function PriceUnitSelector({
  selectedUnderlyingAsset,
  selectedPriceUnit,
  setSelectedPriceUnit,
}: PriceUnitSelectorProps) {
  const priceUnits: PriceUnit[] = [selectedUnderlyingAsset, "USD"];

  useEffect(() => {
    if (
      selectedPriceUnit !== "USD" &&
      selectedPriceUnit !== selectedUnderlyingAsset
    ) {
      setSelectedPriceUnit(selectedUnderlyingAsset);
    }
  }, [selectedUnderlyingAsset]);

  return (
    <div className="flex flex-row items-center gap-[4px]">
      {priceUnits.map((priceUnit) => (
        <PriceUnitButton
          key={priceUnit}
          priceUnit={priceUnit}
          isSelected={priceUnit === selectedPriceUnit}
          onClick={() => setSelectedPriceUnit(priceUnit)}
        />
      ))}
    </div>
  );
}

export default PriceUnitSelector;

interface PriceUnitButtonProps {
  priceUnit: PriceUnit;
  isSelected: boolean;
  onClick: () => void;
}

function PriceUnitButton({
  priceUnit,
  isSelected,
  onClick,
}: PriceUnitButtonProps) {
  const { chain } = useAppSelector((state) => state.network) as NetworkState;
  return (
    <button
      className={twJoin(
        "cursor-pointer flex flex-row items-center",
        "w-[36px] h-[36px] p-[6px] rounded-[6px]",
        "hover:bg-black292c",
        "active:opacity-80 active:scale-95",
        isSelected && "bg-black2023"
      )}
      onClick={onClick}
    >
      <img
        src={getPriceUnitIconSource(isSelected, chain, priceUnit)}
        alt={priceUnit}
        className="w-[24px] h-[24px]"
      />
    </button>
  );
}

function getPriceUnitIconSource(
  isSelected: boolean,
  chain: SupportedChains,
  priceUnit: PriceUnit
) {
  if (priceUnit === "USD")
    return isSelected ? IconSymbolDollarOn : IconSymbolDollarOff;
  return isSelected
    ? UA_INFO[chain][priceUnit as UnderlyingAsset].src
    : UA_INFO[chain][priceUnit as UnderlyingAsset].offSrc;
}
