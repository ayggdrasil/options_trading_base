import { CountdownTimer } from "@/components/Common/CountdownTimer";
import { advancedFormatNumber } from "@/utils/helper";

interface ExpiryInfoDisplayProps {
  selectedExpiry: number;
  underlyingFutures: number;
}

function ExpiryInfoDisplay({
  selectedExpiry,
  underlyingFutures,
}: ExpiryInfoDisplayProps) {
  return (
    <div className="w-fit h-[36px] flex flex-row items-center gap-[12px]">
      <div className="w-[115px] flex flex-col">
        <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
          Underlying Futures
        </p>
        <p className="h-[20px] text-whitef2f2 text-[12px] font-[600] leading-[20px]">
          {advancedFormatNumber(underlyingFutures, 2, "$")}
        </p>
      </div>
      <div className="w-[92px] flex flex-col">
        <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
          Time to Expiry
        </p>
        <p className="h-[20px] text-whitef2f2 text-[12px] font-[600] leading-[20px]">
          <CountdownTimer
            className=""
            targetTimestamp={selectedExpiry}
            compactFormat={false}
          />
        </p>
      </div>
    </div>
  );
}

export default ExpiryInfoDisplay;
