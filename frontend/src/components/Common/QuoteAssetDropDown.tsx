import { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import IconSelectedZeroDteArrowUp from "@assets/icon-selected-zero-dte-arrow-up.svg";
import IconSelectedZeroDteArrowDown from "@assets/icon-selected-zero-dte-arrow-down.svg";
import { QA_LIST, QA_TICKER_TO_IMG, QA_TICKER_TO_NAME } from "@/networks/assets";
import { NetworkQuoteAsset } from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { useAppSelector } from "@/store/hooks";
import { NetworkState } from "@/networks/types";

type ScaleType = "small" | "medium" | "large";

interface QuoteAssetDropDownProps {
selectedQuoteAsset: any;
  setSelectedQuoteAsset: (value: NetworkQuoteAsset<SupportedChains>) => void;
  scale: ScaleType;
  defaultQuoteAsset?: string | NetworkQuoteAsset<SupportedChains>;
}

const QuoteAssetDropDown: React.FC<QuoteAssetDropDownProps> = ({
  selectedQuoteAsset,
  setSelectedQuoteAsset,
  scale,
  defaultQuoteAsset,
}) => {
  const [quoteTokenList, setQuoteTokenList] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropDownRef = useRef<HTMLDivElement>(null);

  const { chain } = useAppSelector(state => state.network) as NetworkState;

  useEffect(() => {
    const quoteTokenList = QA_LIST[chain];
    const usdcIndex = quoteTokenList.indexOf(NetworkQuoteAsset[chain].USDC);
    setQuoteTokenList(quoteTokenList);

    if (!defaultQuoteAsset) {
      setSelectedQuoteAsset(quoteTokenList[usdcIndex] as NetworkQuoteAsset<SupportedChains>);
    }
  }, [chain])

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
            "cursor-pointer flex flex-row justify-end items-center",
            "w-fit h-full rounded-[4px]",
            "bg-black17",
            "hover:bg-black1f active:bg-black1f active:opacity-80 active:scale-95",
            scale === "small" ? "px-[4px] gap-[6px]" : "pl-[12px] pr-[8px] gap-[9px]"
        )}
        ref={dropDownRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <p className={twJoin(
          "text-whitee0 font-semibold",
          scale === "small" ? "text-[13px]" : "text-[16px]",
        )}>{selectedQuoteAsset}</p>
        <img
          className={twJoin(
            "cursor-pointer",
            scale === "small" ? "w-[16px] h-[16px] min-w-[16px] min-h-[16px]" : "w-[18px] h-[18px] min-w-[18px] min-h-[18px]"
          )}
          src={!isDropdownOpen ? IconSelectedZeroDteArrowDown : IconSelectedZeroDteArrowUp}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        />
      </div>
      {isDropdownOpen && (
        <div
          className={twJoin(
            "absolute top-[38px] right-0 z-10",
            "w-[216px] h-fit p-[4px] overflow-scroll scrollbar-hide",
            "bg-black1f rounded-[4px] shadow-[0px_0px_36px_0_rgba(10,10,10,0.72)]",
            scale === "small" ? "top-[24px] w-[194px]" : "top-[38px] w-[216px]"
          )}
        > 
          { 
            quoteTokenList.map((quoteAsset: any) => {
              return (
                <button 
                  key={quoteAsset}
                  className={twJoin(
                    "cursor-pointer flex flex-row items-center",
                    "w-full h-[36px] px-[6px]",
                    "text-whitee0",
                    "hover:bg-black29 hover:rounded-[3px] hover:text-greenc1",
                    "active:bg-black1f active:opacity-80 active:scale-95"
                  )}
                  type="submit"
                  onClick={() => {
                    setSelectedQuoteAsset(quoteAsset);
                  }}
                >
                  <div key={quoteAsset} className="flex flex-row items-center">
                    <img
                      className={twJoin(
                        scale === "small" ? "w-[16px]" : "w-[24px]",
                      )} 
                      src={QA_TICKER_TO_IMG[chain][quoteAsset as keyof typeof QA_TICKER_TO_IMG[typeof chain]]}
                    />
                    <p className={twJoin(
                      "pl-[10px] whitespace-nowrap font-semibold",
                      scale === "small" ? "text-[13px]" : "text-[15px]"
                    )}>{QA_TICKER_TO_NAME[chain][quoteAsset as keyof typeof QA_TICKER_TO_NAME[typeof chain]]}</p>
                    <p className={twJoin(
                      "pl-[6px] whitespace-nowrap text-gray80 font-semibold",
                      scale === "small" ? "text-[11px]" : "text-[13px]"
                    )}>{quoteAsset}</p>
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

export default QuoteAssetDropDown;