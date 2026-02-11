import { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber } from "@/utils/helper";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import IconBalanceArrowUp from "@assets/mobile/icon-balance-arrow-up.svg";
import IconBalance from "@assets/mobile/icon-balance.svg";
import { setSelectedQuoteAsset } from "@/store/slices/SelectedOption";
import { QA_LIST, QA_TICKER_TO_IMG } from "@/networks/assets";
import { NetworkState } from "@/networks/types";

interface QuoteAssetDropDownProps {
  quoteAsset: any;
}

const QuoteAssetDropDown: React.FC<QuoteAssetDropDownProps> = ({ quoteAsset }) => {
  const dispatch = useAppDispatch();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const [quoteTokenList, setQuoteTokenList] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropDownRef = useRef<HTMLDivElement>(null);
  const selectedQuoteAsset = useAppSelector((state: any) => state.selectedOption.selectedQuoteAsset);

  useEffect(() => {
    const quoteTokenList = QA_LIST[chain];
    const reorderedQuoteTokenList = [
      selectedQuoteAsset,
      ...quoteTokenList.filter((item) => item !== selectedQuoteAsset),
    ];

    setQuoteTokenList(reorderedQuoteTokenList);
  }, [selectedQuoteAsset, chain]);

  useEffect(() => {
    document.body.addEventListener("click", (event) => {
      if (dropDownRef.current?.contains(event.target as Node)) return;
      setIsDropdownOpen(false);
    });
  }, []);

  return (
    <div
      className={twJoin(
        "w-full rounded-t-lg bg-[#1A1A19] pt-[12px] pb-[24px] ",
        "flex items-center justify-center transition-all duration-500",
        "shadow-[0px_-0.5px_0px_0px_#333331] overflow-hidden"
      )}
    >
      <div
        className={twJoin("flex flex-row", isDropdownOpen ? "" : "items-center")}
        ref={dropDownRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <div className={twJoin("h-fit flex flex-row gap-x-2 items-center")}>
          <img className={twJoin("w-[18px] h-[18px] object-cover")} src={IconBalance} />
          <p
            className={twJoin(
              "font-medium text-[#9D9B98]",
              "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
            )}
          >
            Balance
          </p>
        </div>
        <div
          className={twJoin(
            "w-[1px] bg-[#333331] mx-3 transition-all duration-300",
            isDropdownOpen ? "h-[116px]" : "h-4"
          )}
        ></div>
        <div className={twJoin("flex flex-row gap-x-2")}>
          <div
            className={twJoin(
              "flex flex-col gap-y-3 transition-all duration-300",
              isDropdownOpen ? "h-[116px]" : "h-5 overflow-hidden"
            )}
          >
            {quoteTokenList.map((quoteToken: any) => {
              return (
                <button
                  key={quoteToken}
                  className={twJoin("flex flex-row gap-x-2 items-center")}
                  onClick={() => {
                    dispatch(setSelectedQuoteAsset(quoteToken));
                  }}
                >
                  <img className={twJoin("h-5 w-5 object-cover")} src={QA_TICKER_TO_IMG[chain][quoteToken as keyof typeof QA_TICKER_TO_IMG[typeof chain]  ]} />
                  <p
                    className={twJoin(
                      "font-medium text-[#F0EBE5]",
                      "text-[12px] leading-[14px] md:text-[14px] md:leading-[16px]"
                    )}
                  >
                    {`${
                      quoteAsset[quoteToken] > 0
                        ? advancedFormatNumber(quoteAsset[quoteToken], 2, "")
                        : quoteAsset[quoteToken]
                    } ${quoteToken}`}
                  </p>
                </button>
              );
            })}
          </div>
          <img
            className={twJoin("w-[14px] h-[14px] object-cover mt-[2px]", isDropdownOpen ? "rotate-180" : "")}
            src={IconBalanceArrowUp}
          />
        </div>
      </div>
    </div>
  );
};

export default QuoteAssetDropDown;
