import { OptionDirection, OrderSide } from "@/utils/types";
import { twJoin } from "tailwind-merge";
import IconStar from "@assets/mobile/icon-star.svg";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { setIsComboMode } from "@/store/slices/SelectedOption";

interface SelectedOptionModeSelector {
  selectedOptionDirection: OptionDirection;
  selectedOrderSide: OrderSide;
}

const SelectedOptionModeSelector: React.FC<SelectedOptionModeSelector> = ({
  selectedOptionDirection,
  selectedOrderSide,
}) => {
  const dispatch = useAppDispatch();
  const isComboMode = useAppSelector((state: any) => state.selectedOption.isComboMode);
  const isComboModePossible = useAppSelector((state: any) => state.selectedOption.isComboModePossible);
  const description = selectedOrderSide === "Buy" ? "Pay less Premium" : "Deposit less collateral";

  return (
    <div className={twJoin("flex flex-col gap-y-2 w-[276px]")}>
      <div className={twJoin("flex flex-row w-full h-8", "bg-[#1A1A19] rounded-[32px] overflow-hidden")}>
        <div
          className={twJoin(
            "h-full flex items-center px-5 rounded-[32px]",
            "font-medium text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]",
            isComboMode ? "bg-[#333331] text-whitef0" : "text-gray9D",
            isComboModePossible ? "" : "opacity-30"
          )}
          onClick={() => {
            if (isComboMode || !isComboModePossible) return;
            dispatch(setIsComboMode(true));
          }}
        >
          {`${selectedOrderSide} ${selectedOptionDirection} Spread`}
        </div>
        <div
          className={twJoin(
            "flex-1 h-full flex justify-center items-center px-5 rounded-[32px]",
            "font-medium text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]",
            isComboMode ? "text-gray9D" : "bg-[#333331] text-whitef0"
          )}
          onClick={() => {
            if (!isComboMode) return;
            dispatch(setIsComboMode(false));
          }}
        >
          {`${selectedOrderSide} ${selectedOptionDirection}`}
        </div>
      </div>
      {isComboMode && (
        <div className={twJoin("flex flex-row justify-center gap-x-1 items-center")}>
          <img className="h-3 w-3 object-cover" src={IconStar} />
          <p
            className={twJoin(
              "font-bold text-purple-gradient",
              "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
            )}
          >
            {description}
          </p>
          <img className="h-3 w-3 object-cover" src={IconStar} />
        </div>
      )}
    </div>
  );
};

export default SelectedOptionModeSelector;
