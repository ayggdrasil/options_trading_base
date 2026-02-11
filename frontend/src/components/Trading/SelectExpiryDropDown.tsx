import { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { formatDate } from "@/utils/helper";

import IconDropdownDown from "@assets/icon-dropdown-down.svg";
import IconDropdownUp from "@assets/icon-dropdown-up.svg";
import IconDropdownDisabled from "@assets/icon-dropdown-disabled.svg";

type SelectedExpiryDropDownProps = {
  expiries: number[];
  selectedExpiry: number;
  setSelectedExpiry: (value: any) => void;
  setHasInitialScroll: (value: boolean) => void;
}

const SelectExpiryDropDown: React.FC<SelectedExpiryDropDownProps> = ({ expiries, selectedExpiry, setSelectedExpiry, setHasInitialScroll }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropDownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropDownRef.current && !dropDownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.body.addEventListener("click", handleClickOutside);
    return () => {
      document.body.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-[264px]">
      <div ref={dropDownRef}>
        {
          expiries.length > 0
            ? <div
                className={twJoin(
                  "cursor-pointer flex flex-row items-center",
                  "w-full h-[44px] px-[16px] py-[13px]",
                  "bg-black17 rounded-[6px]",
                  "hover:bg-black21 active:bg-black12 active:opacity-80 active:scale-95"
                )}
                onClick={() => {
                  if (expiries.length === 0) return;
                  setIsDropdownOpen(!isDropdownOpen);
                }}
              >
                <p className="whitespace-nowrap text-[15px] text-whitee0 font-semibold ">Expiry</p>
                <div className="w-[1px] h-[20px] mx-[16px] bg-black29" />
                <div className="flex flex-row justify-between items-center w-full">
                  <div className="flex flex-row justify-center items-center text-[13px]">
                    <div className="text-[15px] text-greenc1 font-semibold">{formatDate(selectedExpiry.toString())}</div>
                  </div>
                  {!isDropdownOpen ? (
                    <img 
                      className="cursor-pointer w-[18px] h-[18px] min-w-[18px] min-h-[18px]" 
                      src={IconDropdownDown} 
                      onClick={() => {
                        if (expiries.length === 0) return;
                        setIsDropdownOpen(!isDropdownOpen);
                      }} 
                    />
                  ) : (
                    <img 
                      className="cursor-pointer w-[18px] h-[18px] min-w-[18px] min-h-[18px]" 
                      src={IconDropdownUp} 
                      onClick={() => {
                        if (expiries.length === 0) return;
                        setIsDropdownOpen(!isDropdownOpen);
                      }} 
                    />
                  )}
                </div>
              </div>
            : <div
                className={twJoin(
                  "cursor-not-allowed flex flex-row items-center",
                  "w-full h-[44px] pl-[20px] pr-[16px] py-[12px]",
                  "bg-black17 rounded-[6px] text-gray52 font-semibold",
                )}
              >
                <p className="whitespace-nowrap text-[15px]  ">Expiry</p>
                <div className="w-[1px] h-[20px] mx-[16px] bg-black29" />
                <div className="flex flex-row justify-between items-center w-full">
                  <div className="flex flex-row justify-center items-center text-[13px]">
                    <div className="text-[15px]">-</div>
                  </div>
                  <img 
                      className="w-[18px] h-[18px] min-w-[18px] min-h-[18px]" 
                      src={IconDropdownDisabled} 
                    />
                </div>
              </div>
        }
      </div>
      {isDropdownOpen && (
        <div
          className={twJoin(
            "absolute top-[50px]",
            "w-full max-h-[279px] p-[4px] overflow-scroll scrollbar-hide",
            "bg-black1f rounded-[4px] shadow-[0px_0px_36px_0_rgba(10,10,10,0.72)]"
          )}
        >
          {
            expiries.map((expiry: number) => (
              <button 
                key={expiry}
                className={twJoin(
                  "cursor-pointer flex flex-row items-center",
                  "w-full h-[36px] px-[16px]",
                  "text-whitee0",
                  "hover:bg-black29 hover:rounded-[3px] hover:text-greenc1",
                  "active:bg-black1f active:opacity-80 active:scale-95"
                )}
                type="submit"
                onClick={() => {
                  setSelectedExpiry(expiry)
                  setHasInitialScroll(false)
                }}
              >
                <p className="whitespace-nowrap text-[15px] font-semibold ">{formatDate(expiry.toString())}</p>
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
};

export default SelectExpiryDropDown;