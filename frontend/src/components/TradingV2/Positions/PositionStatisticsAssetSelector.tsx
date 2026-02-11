import { UnderlyingAsset, UnderlyingAssetWithAll } from "@callput/shared";
import { twJoin } from "tailwind-merge";
import ReusableDropdown, {
  DropdownOption,
} from "@/components/Common/ReusuableDropdown";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";

import IconBTCSelected from "@assets/trading-v2/icon-btc-selected.png";
import IconBTCInactive from "@assets/trading-v2/icon-btc-unselected.png";
import IconETHSelected from "@assets/trading-v2/icon-eth-selected.png";
import IconETHInactive from "@assets/trading-v2/icon-eth-unselected.png";

import IconFilter from "@assets/img/icon/filter.png";
import { UA_INFO } from "@/networks/assets";
import { useState } from "react";

interface PositionStatisticsAssetSelectorProps {
  underlyingAsset: UnderlyingAssetWithAll;
  setUnderlyingAsset: (underlyingAsset: UnderlyingAssetWithAll) => void;
  setCurrentPage: (page: number) => void;
}

function PositionStatisticsAssetSelector({
  underlyingAsset,
  setUnderlyingAsset,
  setCurrentPage,
}: PositionStatisticsAssetSelectorProps) {
  const { chain } = useAppSelector((state) => state.network) as NetworkState;
  const [selectedOption, setSelectedOption] = useState<string>(
    getSelectedOptionFromAsset(underlyingAsset)
  );

  const options: DropdownOption<string>[] = Object.keys(UA_INFO[chain]).map(
    (asset) => ({
      value: `${UA_INFO[chain][asset as UnderlyingAsset].symbol} Options`,
      icon: UA_INFO[chain][asset as UnderlyingAsset].offSrc,
    })
  );

  options.unshift({
    value: "All Assets",
    icon: "",
  });

  const handleOptionSelect = (selectedOption: string) => {
    setSelectedOption(selectedOption);
    setUnderlyingAsset(getAssetFromSelectedOption(selectedOption));
    setCurrentPage(1);
  };

  const customTrigger = (isOpen: boolean) => (
    <button
      className={twJoin(
        "cursor-pointer flex flex-row items-center justify-between gap-[6px]",
        "h-[36px] px-[8px] py-[6px] pr-[16px] rounded-[6px] bg-black2023",
        "hover:bg-black292c",
        "active:scale-95 active:opacity-80 "
      )}
    >
      <img src={IconFilter} className="w-[24px] h-[24px]" />
      <p className="h-[24px] text-gray8c8c text-[14px] font-[700] leading-[24px]">
        {selectedOption}
      </p>
    </button>
  );

  return (
    <div className="h-full flex flex-row items-center justify-center">
      <ReusableDropdown
        options={options}
        selectedOption={selectedOption}
        onOptionSelect={handleOptionSelect}
        triggerDropdownGap={6}
        dropdownPosition="bottom-right"
        dropdownWidth="215px"
        customTrigger={customTrigger}
      />
    </div>
  );
}

export default PositionStatisticsAssetSelector;

const getAssetFromSelectedOption = (
  displayText: string
): UnderlyingAssetWithAll => {
  if (displayText === "All Assets") return "ALL";
  if (displayText === "BTC Options") return "BTC";
  if (displayText === "ETH Options") return "ETH";
  return "ALL";
};

const getSelectedOptionFromAsset = (asset: UnderlyingAssetWithAll): string => {
  if (asset === "ALL") return "All Assets";
  if (asset === "BTC") return "BTC Options";
  if (asset === "ETH") return "ETH Options";
  return "All Assets";
};
