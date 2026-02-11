import { OptionDirection, OrderSide } from "@/utils/types";
import { twJoin } from "tailwind-merge";
import GuideButton from "@/components/Common/GuideButton";

interface OptionPreviewDefaultProps {
  selectedExpiry: number;
  selectedOptionDirection: OptionDirection;
  selectedOrderSide: OrderSide;
}

function OptionPreviewDefault({
  selectedExpiry: _selectedExpiry,
  selectedOptionDirection: _selectedOptionDirection,
  selectedOrderSide: _selectedOrderSide,
}: OptionPreviewDefaultProps) {
  return (
    <div
      className={twJoin(
        "w-full h-full min-w-[384px] max-w-[384px] min-h-[764px]",
        "flex flex-col items-center justify-center gap-[32px] px-[32px] py-[20px]",
        "bg-black1214"
      )}
    >
      <p className="text-blue278e text-[18px] text-center font-[700] leading-[24px]">
        Choose a price to buy or sell call/put options.
      </p>

      <GuideButton showText={true} />
    </div>
  );
}

export default OptionPreviewDefault;
