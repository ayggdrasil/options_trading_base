import React, { useEffect, useRef, useState } from "react";
import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import { OptionDirection, OrderSide } from "@/utils/types";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";

import IconSelectedOptionArrowUp from "@assets/icon-selected-option-arrow-up.svg";
import IconSelectedOptionArrowDown from "@assets/icon-selected-option-arrow-down.svg";

interface SelectedOptionTitle {
  isComboMode: boolean;
  selectedOptionDirection: OptionDirection;
  selectedOption: IOptionDetail;
  selectedOrderSide: OrderSide;
  selectableOptionPairs: IOptionDetail[];
  pairedOption: IOptionDetail;
  setPairedOption: React.Dispatch<React.SetStateAction<IOptionDetail>>;
  handleInitializeInputValues: () => void;
}

const SelectedOptionTitle: React.FC<SelectedOptionTitle> = ({
  isComboMode,
  selectedOptionDirection,
  selectedOption,
  selectedOrderSide,
  selectableOptionPairs,
  pairedOption,
  setPairedOption,
  handleInitializeInputValues,
}) => {
  const selectableOptionPairsRef = useRef<HTMLDivElement>(null);

  const [isSelectableOptionPairsOpen, setIsSelectableOptionPairsOpen] =
    useState<boolean>(false);

  useEffect(() => {
    const handleClick = (event: any) => {
      if (selectableOptionPairsRef.current?.contains(event.target)) return;
      setIsSelectableOptionPairsOpen(false);
    };

    document.body.addEventListener("click", handleClick);

    return () => {
      document.body.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div>
      {/* Name and Description of Selected Option */}
      <div className="h-[47px]">
        <div className="flex flex-row gap-[8px] items-center">
          <p
            className={twJoin(
              "text-[18px] font-bold",
              `${selectedOrderSide === "Buy" ? "text-green4c" : "text-redc7"}`
            )}
          >
            {selectedOrderSide} {selectedOptionDirection}{" "}
            {isComboMode ? "Spread Option" : "Option"}
          </p>
        </div>

        <div className="flex flex-row gap-[6px]">
          <p className="text-[18px] font-bold">{selectedOption.instrument}</p>
          {isComboMode && (
            <div ref={selectableOptionPairsRef} className="relative">
              <div
                className={twJoin(
                  "cursor-pointer flex flex-row items-center justify-center",
                  "w-fit h-[28px] pl-[4px] rounded-[4px] text-[13px] text-gray80",
                  "hover:bg-black29"
                )}
                onClick={() =>
                  setIsSelectableOptionPairsOpen(!isSelectableOptionPairsOpen)
                }
              >
                <p
                  className={twJoin(
                    selectedOptionDirection === "Call"
                      ? "border-t-[1.4px] border-t-gray80"
                      : "border-b-[1.4px] border-b-gray80"
                  )}
                >
                  {"$" + advancedFormatNumber(pairedOption.strikePrice, 0, "")}
                </p>
                {isSelectableOptionPairsOpen ? (
                  <img src={IconSelectedOptionArrowUp} />
                ) : (
                  <img src={IconSelectedOptionArrowDown} />
                )}
              </div>
              {isSelectableOptionPairsOpen && (
                <div className="z-20 absolute w-[96px] h-fit top-[34px] left-[-18px] p-[4px] bg-black1f shadow-[0_0_8px_0_rgba(10,10,10,.72)]">
                  {selectableOptionPairs.map((option, index) => (
                    <div
                      key={index}
                      className={twJoin(
                        "cursor-pointer flex flex-row items-center",
                        "w-full h-[30px] px-[10px] py-[6px] rounded-[4px] text-[15px] text-whitee0 font-semibold",
                        "hover:bg-black29 hover:text-greenc1"
                      )}
                      onClick={() => {
                        setPairedOption(selectableOptionPairs[index]);
                        handleInitializeInputValues();
                        setIsSelectableOptionPairsOpen(false);
                      }}
                    >
                      <p>
                        {"$" + advancedFormatNumber(option.strikePrice, 0, "")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectedOptionTitle;
