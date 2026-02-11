import React, { useEffect, useRef, useState } from 'react'
import { advancedFormatNumber } from '@/utils/helper';
import { twJoin } from 'tailwind-merge';
import { OptionDirection, OrderSide } from '@/utils/types';
import { IOptionDetail } from '@/interfaces/interfaces.marketSlice';

import IconSelectedOptionArrowUp from "@assets/icon-selected-option-arrow-up.svg";
import IconSelectedOptionArrowDown from "@assets/icon-selected-option-arrow-down.svg";
import { Greeks } from '@callput/shared';

interface SelectedOptionTitle {
  isComboMode: boolean
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
  handleInitializeInputValues
}) => {
  const selectableOptionPairsRef = useRef<HTMLDivElement>(null)

  const [isSelectableOptionPairsOpen, setIsSelectableOptionPairsOpen] = useState<boolean>(false);
  const [greeks, setGreeks] = useState<Greeks>({ delta: 0, gamma: 0, vega: 0, theta: 0 });

  useEffect(() => {
    const handleClick = (event: any) => {
      if (selectableOptionPairsRef.current?.contains(event.target)) return;
      setIsSelectableOptionPairsOpen(false);
    }

    document.body.addEventListener("click", handleClick);

    return () => {
      document.body.removeEventListener("click", handleClick);
    }
  }, []);

  useEffect(() => {
    setGreeks({
      delta: isComboMode 
        ? selectedOption.delta - pairedOption.delta
        : selectedOption.delta,
      gamma: isComboMode 
        ? selectedOption.gamma - pairedOption.gamma
        : selectedOption.gamma,
      vega: isComboMode 
        ? selectedOption.vega - pairedOption.vega
        : selectedOption.vega,
      theta: isComboMode 
        ? selectedOption.theta - pairedOption.theta
        : selectedOption.theta,
    })
  }, [isComboMode, selectedOption, pairedOption])

  return (
    <div>
      {/* Name and Description of Selected Option */}
      <div className="h-[47px]">
        
        <div className="flex flex-row gap-[8px] items-center">
          <p className={twJoin(
            "text-[18px] font-bold",
            `${selectedOrderSide === "Buy" ? "text-green4c" : "text-redc7"}`
          )}>{selectedOrderSide} {selectedOptionDirection} {isComboMode ? "Spread Option" : "Option"}</p>
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
                onClick={() => setIsSelectableOptionPairsOpen(!isSelectableOptionPairsOpen)}
              > 
                <p className={twJoin(
                  selectedOptionDirection === "Call" ? "border-t-[1.4px] border-t-gray80" : "border-b-[1.4px] border-b-gray80")}>{"$" + advancedFormatNumber(pairedOption.strikePrice, 0, "")}</p>
                {isSelectableOptionPairsOpen
                  ? <img src={IconSelectedOptionArrowUp} />
                  : <img src={IconSelectedOptionArrowDown} />
                }
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
                      <p>{"$" + advancedFormatNumber(option.strikePrice, 0, "")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Greeks of Selected Option */}
      <div className="flex flex-row w-full h-[34px] mt-[16px]">
        <div
          className={twJoin(
            "w-[3px] h-full bg-black29 rounded-t-[1px] rounded-b-[1px]",
          )}
        />
          <div className="flex flex-row gap-[16px] w-full px-[17px]">
            <div className="flex flex-col w-[56px]">
              <p className="text-[11px] text-gray52">Delta</p>
              <p className="text-[12px] text-gray98 font-semibold">{advancedFormatNumber(greeks.delta || 0, 2, "")}</p>
            </div>
            <div className="flex flex-col w-[76px]">
              <p className="text-[11px] text-gray52">Gamma</p>
              <p className="text-[12px] text-gray98 font-semibold">{advancedFormatNumber(greeks.gamma || 0, 6, "")}</p>
            </div>
            <div className="flex flex-col w-[56px]">
              <p className="text-[11px] text-gray52">Vega</p>
              <p className="text-[12px] text-gray98 font-semibold">{advancedFormatNumber(greeks.vega || 0, 2, "")}</p>
            </div>
            <div className="flex flex-col w-[56px]">
              <p className="text-[11px] text-gray52">Theta</p>
              <p className="text-[12px] text-gray98 font-semibold">{advancedFormatNumber(greeks.theta || 0, 2, "")}</p>
            </div>
          </div>
      </div>
    </div>
  )
}

export default SelectedOptionTitle