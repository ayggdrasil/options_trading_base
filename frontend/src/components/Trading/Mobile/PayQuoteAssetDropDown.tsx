import { useContext, useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ModalContext } from "@/components/Common/ModalContext";
import { resetInput, setSelectedQuoteAsset } from "@/store/slices/SelectedOption";

import { QA_LIST, QA_TICKER_TO_IMG, QA_TICKER_TO_NAME } from "@/networks/assets";
import { NetworkState } from "@/networks/types";

interface PayQuoteAssetDropDownProps {}

const PayQuoteAssetDropDown: React.FC<PayQuoteAssetDropDownProps> = ({}) => {
  const dispatch = useAppDispatch();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const [quoteTokenList, setQuoteTokenList] = useState<string[]>([]);

  const { closeModal } = useContext(ModalContext);

  useEffect(() => {
    const quoteTokenList = QA_LIST[chain];
    setQuoteTokenList(quoteTokenList);
  }, [chain]);

  return (
    <div className={twJoin("flex flex-col gap-y-[10px] px-[26px]")}>
      {quoteTokenList.map((quoteAsset: any, index) => {
        return (
          <>
            <div
              key={quoteAsset}
              className={twJoin("flex flex-row gap-x-[6px] items-center py-[9px]")}
              onClick={() => {
                dispatch(setSelectedQuoteAsset(quoteAsset));
                dispatch(resetInput());
                closeModal();
              }}
            >
              <div key={quoteAsset} className="flex flex-row gap-x-3 items-center">
                <img
                  className={twJoin("w-6 h-6 object-cover flex-shrink-0")}
                  src={QA_TICKER_TO_IMG[chain][quoteAsset as keyof typeof QA_TICKER_TO_IMG[typeof chain]]}
                />
                <p
                  className={twJoin(
                    "font-semibold text-whitef0",
                    "text-[16px] leading-[24px] md:text-[18px]"
                  )}
                >
                  {QA_TICKER_TO_NAME[chain][quoteAsset as keyof typeof QA_TICKER_TO_NAME[typeof chain]]}
                </p>
              </div>
              <p className={twJoin("font-semibold text-gray9D", "text-[16px] leading-[24px] md:text-[18px]")}>
                {quoteAsset}
              </p>
            </div>
            {index < quoteTokenList.length - 1 && (
              <div className="w-full h-[1px] flex-shrink-0 opacity-10 bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"></div>
            )}
          </>
        );
      })}
    </div>
  );
};

export default PayQuoteAssetDropDown;
