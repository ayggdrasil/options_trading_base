import React, { useState } from "react";
import { twJoin } from "tailwind-merge";
import DisplayWithTooltip from "../DisplayWithToolTip";

const SLIPPAGE_DEFAULT_VALUES = [3, 5, 10];
const DEFAULT_SLIPPAGE = 5;

interface SlippageSettingsProps {
  slippage: number;
  setSlippage: (value: number) => void;
}

function SlippageSettings({ slippage, setSlippage }: SlippageSettingsProps) {
  const [slippageInputValue, setSlippageInputValue] = useState<string>("");

  const handleDefaultButtonClick = (value: number) => {
    setSlippageInputValue("");
    setSlippage(value);
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Reject spaces
    if (inputValue.includes(" ")) return;

    // Reject non-numeric inputs
    if (isNaN(Number(inputValue))) return;

    // Reset to default if input is empty
    if (inputValue === "") {
      setSlippageInputValue("");
      setSlippage(DEFAULT_SLIPPAGE);
      return;
    }

    // Remove leading zeros
    const cleanedValue = inputValue.replace(/^0+(?=\d)/, "");

    // Cap at 100%
    if (Number(cleanedValue) >= 100) {
      setSlippageInputValue("100");
      setSlippage(100);
      return;
    }

    setSlippageInputValue(cleanedValue);
    setSlippage(Number(cleanedValue));
  };

  return (
    <div className="w-full flex flex-col gap-[20px]">
      <p className="text-whitef2f2 text-[13px] font-[600] leading-[24px]">
        Slippage Tolerance Setting
      </p>
      <div className="w-full h-[36px] flex flex-row items-center justify-between">
        {/* Default value buttons */}
        <div className="flex-1 h-full flex flex-row items-center gap-[4px]">
          {SLIPPAGE_DEFAULT_VALUES.map((value) => (
            <button
              key={value}
              className={twJoin(
                "cursor-pointer h-full px-[16px] py-[6px] rounded-[6px]",
                "text-[14px] text-gray8c8c text-center font-[600] leading-[24px]",
                "hover:text-whitef2f2 hover:bg-black292c",
                "active:scale-95 active:opacity-80",
                slippage === value && "!text-blue278e !font-[700] !bg-black2023"
              )}
              onClick={() => handleDefaultButtonClick(value)}
            >
              {value}%
            </button>
          ))}
        </div>

        {/* Custom value input */}
        <div
          className={twJoin(
            "flex flex-row justify-between items-center",
            "w-[133px] h-[36px] p-[6px] pl-[16px] rounded-[4px]",
            "bg-black181a border-[1px] border-black2023"
          )}
        >
          <input
            value={slippageInputValue}
            placeholder="Custom"
            className={twJoin(
              "w-full h-full",
              "text-gray8c8c text-[14px] font-[700] bg-transparent",
              "focus:outline-none",
              "placeholder:text-[14px] placeholder:text-gray8c8c"
            )}
            onChange={handleCustomInputChange}
          />
          <p className="text-gray4b50 text-[14px] font-[600] leading-[24px] px-[8px]">
            %
          </p>
        </div>
      </div>

      {/* Information section */}
      <DisplayWithTooltip
        title="Why this number?"
        tooltipContent={
          <p>
            CallPut calculates real-time prices based on Synchronized Liquidity
              Engine (SLE). Accordingly, prices may be updated during trade
              execution. The configured tolerance is set to facilitate trade execution,
              even in volatile markets.
          </p>
        }
        className="text-gray8c8c text-[12px] font-[500] leading-[20px] mt-[12px]"
        textAlign="right"
        tooltipClassName="w-[336px]"
      />
    </div>
  );
}

export default SlippageSettings;
