import { OptionDirection } from "@/utils/types";
import { twJoin } from "tailwind-merge";

import IconCallOn from "@assets/img/icon/call-on.png";
import IconCallOff from "@assets/img/icon/call-off.png";
import IconPutOn from "@assets/img/icon/put-on.png";
import IconPutOff from "@assets/img/icon/put-off.png";

interface OptionDirectionSelectorProps {
  selectedOptionDirection: OptionDirection;
  setSelectedOptionDirection: (optionDirection: OptionDirection) => void;
}

function OptionDirectionSelector({
  selectedOptionDirection,
  setSelectedOptionDirection,
}: OptionDirectionSelectorProps) {
  const optionDirections: OptionDirection[] = ["Call", "Put"];

  return (
    <div className="flex flex-row items-center gap-[4px]">
      {optionDirections.map((optionDirection) => (
        <OptionDirectionButton
          key={optionDirection}
          optionDirection={optionDirection}
          isSelected={optionDirection === selectedOptionDirection}
          setSelectedOptionDirection={setSelectedOptionDirection}
        />
      ))}
    </div>
  );
}

export default OptionDirectionSelector;

interface OptionDirectionButtonProps {
  optionDirection: OptionDirection;
  isSelected: boolean;
  setSelectedOptionDirection: (optionDirection: OptionDirection) => void;
}

function OptionDirectionButton({
  optionDirection,
  isSelected,
  setSelectedOptionDirection,
}: OptionDirectionButtonProps) {
  return (
    <button
      className={twJoin(
        "cursor-pointer group flex flex-row items-center gap-[12px]",
        "w-fit h-[36px] pl-[16px] pr-[12px] rounded-[6px]",
        "hover:bg-black292c",
        "active:opacity-80 active:scale-95",
        isSelected && "!bg-black2023"
      )}
      onClick={() => setSelectedOptionDirection(optionDirection)}
    >
      <p
        className={twJoin(
          "text-gray8c8c text-[14px] font-[600]",
          "group-hover:text-whitef2f2",
          isSelected && "!font-[700]",
          isSelected && optionDirection === "Call" && "!text-green71b8",
          isSelected && optionDirection === "Put" && "!text-rede04a"
        )}
      >
        {optionDirection}
      </p>
      <img
        src={getOptionIconSource(isSelected, optionDirection)}
        alt={optionDirection}
        className="w-[24px] h-[24px]"
      />
    </button>
  );
}

function getOptionIconSource(isSelected: boolean, direction: OptionDirection) {
  if (isSelected) {
    return direction === "Call" ? IconCallOn : IconPutOn;
  } else {
    return direction === "Call" ? IconCallOff : IconPutOff;
  }
}
