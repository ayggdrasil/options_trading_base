import { useState, ReactNode } from "react";
import { twJoin } from "tailwind-merge";
import Dropdown from "./Dropdown";

import IconArrSelDown from "@assets/img/icon/arr-selector-down.png";
import IconArrSelUp from "@assets/img/icon/arr-selector-up.png";
import IconDropdownSel from "@assets/img/icon/dropdown-sel.png";

export interface DropdownOption<T extends string> {
  value: T;
  icon?: string;
}

interface ReusableDropdownProps<T extends string> {
  options: DropdownOption<T>[];
  selectedOption: T;
  onOptionSelect: (option: T) => void;
  triggerButtonClassName?: string;
  triggerIconClassName?: string;
  triggerTextClassName?: string;
  triggerDropdownGap?: number;
  dropdownPosition?: "bottom-right" | "top-left" | "top-right" | "bottom-left";
  dropdownWidth?: string;
  dropdownItemClassName?: string;
  customTrigger?: (isOpen: boolean) => ReactNode;
  customDropdownItem?: (
    option: DropdownOption<T>,
    isSelected: boolean,
    closeDropdown: () => void
  ) => ReactNode;
}

function ReusableDropdown<T extends string>({
  options,
  selectedOption,
  onOptionSelect,
  triggerButtonClassName,
  triggerIconClassName,
  triggerTextClassName,
  triggerDropdownGap = 4,
  dropdownPosition = "bottom-right",
  dropdownWidth = "max-content",
  dropdownItemClassName = "h-[36px]",
  customTrigger,
  customDropdownItem,
}: ReusableDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOptionObj =
    options.find((opt) => opt.value === selectedOption) || options[0];

  const defaultTrigger = (
    <div
      className={twJoin(
        "cursor-pointer flex flex-row justify-between items-center gap-[6px]",
        "w-fit h-[28px] rounded-[4px] pl-[6px] pr-[2px]",
        "hover:bg-black2023",
        triggerButtonClassName
      )}
    >
      {selectedOptionObj.icon && (
        <img
          className={twJoin("w-[20px] h-[20px]", triggerIconClassName)}
          src={selectedOptionObj.icon}
          alt=""
        />
      )}
      <p
        className={twJoin(
          "text-whitef2f2 text-[14px] font-[600] leading-[28px]",
          triggerTextClassName
        )}
      >
        {selectedOption}
      </p>
      <img
        className="w-[16px] h-[16px]"
        src={isOpen ? IconArrSelUp : IconArrSelDown}
      />
    </div>
  );

  const defaultDropdownItem = (
    option: DropdownOption<T>,
    isSelected: boolean,
    closeDropdown: () => void
  ) => (
    <button
      key={option.value}
      className={twJoin(
        "cursor-pointer group/item flex flex-row items-center justify-between gap-[12px]",
        "w-full h-[36px] px-[8px]",
        "hover:bg-black292c hover:text-whitef2f2",
        dropdownItemClassName
      )}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOptionSelect(option.value);
        closeDropdown();
      }}
    >
      <div className="flex flex-row items-center gap-[8px]">
        {option.icon && (
          <img
            className={twJoin(
              "flex-shrink-0 w-[20px] h-[20px]",
              triggerIconClassName
            )}
            src={option.icon}
            alt=""
          />
        )}

        <p className="text-[14px] font-[500] leading-[24px] text-gray8c8c group-hover/item:text-whitef2f2">
          {option.value}
        </p>
      </div>
      {isSelected ? (
        <img
          className="w-[18px] h-[18px]"
          src={IconDropdownSel}
          alt="Selected"
        />
      ) : (
        <div className="w-[18px]" />
      )}
    </button>
  );

  return (
    <Dropdown
      trigger={customTrigger ? customTrigger(isOpen) : defaultTrigger}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      triggerDropdownGap={triggerDropdownGap}
      dropdownPosition={dropdownPosition}
      dropdownWidth={dropdownWidth}
    >
      {(closeDropdown) => (
        <>
          {options.map((option) =>
            customDropdownItem
              ? customDropdownItem(
                  option,
                  selectedOption === option.value,
                  closeDropdown
                )
              : defaultDropdownItem(
                  option,
                  selectedOption === option.value,
                  closeDropdown
                )
          )}
        </>
      )}
    </Dropdown>
  );
}

export default ReusableDropdown;
