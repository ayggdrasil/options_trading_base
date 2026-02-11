import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useContext, useEffect, useRef, useState } from "react";
import { ModalContext } from "@/components/Common/ModalContext";

import { setPairedOption } from "@/store/slices/SelectedOption";

interface PairedOptionPopupProps {}

const PairedOptionPopup: React.FC<PairedOptionPopupProps> = ({}) => {
  const { closeModal } = useContext(ModalContext);
  const dispatch = useAppDispatch();
  const pairedOption = useAppSelector((state: any) => state.selectedOption.pairedOption);
  const selectableOptionPairs = useAppSelector((state: any) => state.selectedOption.selectableOptionPairs);
  const parentRef = useRef<HTMLDivElement>(null);
  const selectedChildRef = useRef<HTMLDivElement>(null);
  const [isLastOptionPairs, setIsLastOptionPairs] = useState(false);

  useEffect(() => {
    if (parentRef.current && selectedChildRef.current) {
      const parent = parentRef.current;
      const childOffsetTop = selectedChildRef.current.offsetTop;
      const top = childOffsetTop > 150 ? childOffsetTop - 150 : childOffsetTop;
      parent.scrollTo({
        top: top,
        behavior: "smooth",
      });
    }
    const pairedOptionIndex = selectableOptionPairs.findIndex(
      (selectableOptionPair: IOptionDetail) => selectableOptionPair.strikePrice === pairedOption.strikePrice
    );
    if (pairedOptionIndex === selectableOptionPairs.length - 1) setIsLastOptionPairs(true);
  }, []);
  return (
    <div className="relative">
      <div ref={parentRef} className={twJoin("max-h-[344px] overflow-auto", "flex flex-col px-3 gap-y-5")}>
        {selectableOptionPairs.map((option: IOptionDetail, index: number) => (
          <>
            <div
              key={index}
              ref={pairedOption.strikePrice === option.strikePrice ? selectedChildRef : null}
              className={twJoin(
                "font-semibold text-center",
                "text-[16px] leading-[24px] md:text-[18px]",
                pairedOption.strikePrice === option.strikePrice ? "text-whitef0" : "text-gray9D"
              )}
              onClick={() => {
                dispatch(setPairedOption(selectableOptionPairs[index]));
                closeModal();
              }}
            >
              {"$" + advancedFormatNumber(option.strikePrice, 0, "")}
            </div>
            {index < selectableOptionPairs.length - 1 && (
              <div className="w-full h-[1px] flex-shrink-0 opacity-10 bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"></div>
            )}
          </>
        ))}
      </div>
      <div
        className={twJoin(
          "absolute bottom-0 w-full h-[90px] pointer-events-none",
          "bg-[linear-gradient(180deg,rgba(3,10,6,0)_0%,#030A06_100%)]",
          isLastOptionPairs ? "hidden" : ""
        )}
      ></div>
    </div>
  );
};
export default PairedOptionPopup;
