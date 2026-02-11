import { twJoin } from "tailwind-merge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useContext, useEffect, useState } from "react";
import { ModalContext } from "@/components/Common/ModalContext";

import { setSlippage, setIsScrollToSlippage } from "@/store/slices/SelectedOption";

interface SlippageTolerancePopupProps {}

const SlippageTolerancePopup: React.FC<SlippageTolerancePopupProps> = ({}) => {
  const { closeModal } = useContext(ModalContext);
  const dispatch = useAppDispatch();
  const slippageValues = [3, 5, 10];
  const [slippageInputValue, setSlippageInputValue] = useState<string>("");
  const slippage = useAppSelector((state: any) => state.selectedOption.slippage);
  useEffect(() => {
    dispatch(setIsScrollToSlippage(true));
  }, []);
  return (
    <div className="flex flex-col gap-y-4 px-3">
      <div className="flex flex-col gap-y-5">
        {slippageValues.map((value, index) => (
          <>
            <div
              key={value}
              className={twJoin(
                "font-semibold text-center text-[16px] leading-[24px] md:text-[18px]",
                slippage === value ? "text-[#E6FC8D]" : "text-[#F0EBE5]"
              )}
              onClick={() => {
                setSlippageInputValue("");
                dispatch(setSlippage(value));
                closeModal();
              }}
            >
              {value} %
            </div>
            {index < slippageValues.length - 1 && (
              <div className="w-full h-[1px] flex-shrink-0 opacity-10 bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"></div>
            )}
          </>
        ))}
      </div>
      <div className="w-full py-[10px]">
        <div
          className={twJoin(
            "flex flex-row gap-x-2 items-center",
            "w-full h-[42px] px-3 rounded-[6px] bg-[#FFFFFF1A]",
            "border border-solid border-[#FFFFFF4D]",
            "shadow-[0px_8px_12px_0px_#00000005]"
          )}
        >
          <input
            value={slippageInputValue}
            placeholder="Custom"
            className={twJoin(
              "w-[calc(100%-20px)]",
              "text-[14px] md:text-[16px] leading-[21px] text-whitef0 font-medium bg-transparent",
              "focus:outline-none",
              "placeholder:text-[14px] md:placeholder:text-[16px] placeholder-whitef0 placeholder:font-medium"
            )}
            onChange={(e) => {
              if (e.target.value.includes(" ")) return;
              if (isNaN(Number(e.target.value))) return;
              if (e.target.value === "") {
                setSlippageInputValue("");
                dispatch(setSlippage(5));
                return;
              }

              const targetValue = e.target.value.replace(/^0+(?=\d)/, "");

              if (Number(targetValue) >= 100) {
                setSlippageInputValue("100");
                dispatch(setSlippage(100));
                return;
              }

              setSlippageInputValue(targetValue);
              dispatch(setSlippage(Number(targetValue)));
            }}
          />
          <p className={twJoin("font-medium text-whitef0", "text-[14px] leading-[21px] md:text-[16px]")}>%</p>
        </div>
      </div>
    </div>
  );
};
export default SlippageTolerancePopup;
