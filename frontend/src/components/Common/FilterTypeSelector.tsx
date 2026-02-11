import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { HistoryFilterType } from "@/utils/types";

import IconDropdownSelected from "@assets/icon-dropdown-selected.svg";
import IconDropdownDownGray from "@assets/icon-dropdown-down-gray.svg";
import IconDropdownUpGray from "@assets/icon-dropdown-up-gray.svg";

interface FilterTypeSelectorProps {
  historyFilterType: HistoryFilterType;
  setHistoryFilterType: Dispatch<SetStateAction<HistoryFilterType>>;
}

const FilterTypeSelector: React.FC<FilterTypeSelectorProps> = ({
  historyFilterType,
  setHistoryFilterType
}) => {
  const types: HistoryFilterType[] = ['All Types', 'Open', 'Close', 'Settle', 'Transfer'];

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropDownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.addEventListener("click", event => {
      if (dropDownRef.current?.contains(event.target as Node)) return;
      setIsDropdownOpen(false);
    })
  }, []);

  return (
    <div className="relative">
      <div
        className={twJoin(
            "cursor-pointer flex flex-row justify-between items-center",
            "w-fit min-w-[99px] h-[34px] rounded-[4px] pl-[12px] pr-[8px]",
            "bg-black17",
            "hover:bg-black1f active:bg-black1f active:opacity-80 active:scale-95"
        )}
        ref={dropDownRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <p className="text-[12px] text-gray80 font-semibold">{historyFilterType}</p>
        {!isDropdownOpen ? (
          <img className="cursor-pointer w-[18px] h-[18px] min-w-[18px] min-h-[18px] ml-[3px]" src={IconDropdownDownGray} onClick={() => setIsDropdownOpen(!isDropdownOpen)}/>
        ) : (
          <img className="cursor-pointer w-[18px] h-[18px] min-w-[18px] min-h-[18px] ml-[3px]" src={IconDropdownUpGray} onClick={() => setIsDropdownOpen(!isDropdownOpen)}/>
        )}
      </div>
      {isDropdownOpen && (
        <div
          className={twJoin(
            "absolute top-[50px] right-0 z-10",
            "w-[128px] max-h-[170px] p-[4px] overflow-scroll scrollbar-hide",
            "bg-black1f rounded-[4px] shadow-[0px_0px_36px_0_rgba(10,10,10,0.72)]"
          )}
        > 
          { 
            types.map((type, idx) => {
              return (
                <button 
                  key={type}
                  className={twJoin(
                    "cursor-pointer flex flex-row items-center",
                    "w-full h-[32px] px-[6px]",
                    "text-whitee0",
                    "hover:bg-black29 hover:rounded-[3px] hover:text-greenc1",
                    "active:bg-black1f active:opacity-80 active:scale-95"
                  )}
                  type="submit"
                  onClick={() => {
                    setHistoryFilterType(type);
                  }}
                >
                  <div key={type} className="flex flex-row items-center">
                    {historyFilterType === type
                      ? <img className="w-[18px]" src={IconDropdownSelected} />
                      : <div className="w-[18px]"/>
                    } 
                    <p className="pl-[6px] whitespace-nowrap text-[15px] font-semibold">{type}</p>
                  </div>
                </button>
              );
            })
          }
        </div>
      )}
    </div>
  );
};

export default FilterTypeSelector;