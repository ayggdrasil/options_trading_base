import BigNumber from "bignumber.js";
import { advancedFormatNumber, getPlusMinusColor } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import { PositionStats } from "../TradingV2/utils/calculations";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface PositionSummaryProps {
  positionStats: PositionStats;
}

const PositionSummary: React.FC<PositionSummaryProps> = ({ positionStats }) => {
  return (
    <div className="flex flex-row items-center w-[871px] h-full bg-black1f rounded-[4px] px-[40px] py-[26px]">
      <div className="w-[259px] h-full flex flex-col gap-[4px]">
        <p className="h-[16px] text-[13px] font-semibold text-[#e6fc8d]">0DTE Position Value</p>
        <p className="h-[24px] text-[20px] font-bold">
          {advancedFormatNumber(positionStats.positionsValue, 2, "$")}
        </p>
      </div>
      <div className="w-[128px] h-full flex flex-col gap-[6px]">
        <p className="h-[16px] text-[13px] font-semibold text-gray80">Open Positions</p>
        <p className="h-[18px] text-[15px] font-semibold">
          {advancedFormatNumber(positionStats.openPositions, 0, "")}
        </p>
      </div>
      <div className="w-[144px] h-full flex flex-col gap-[6px]">
        <p className="h-[16px] text-[13px] font-semibold text-gray80">Invested</p>
        <p className="h-[18px] text-[15px] font-semibold">
          {advancedFormatNumber(positionStats.invested, 2, "$")}
        </p>
      </div>
      <div className="w-[144px] h-full flex flex-col gap-[6px]">
        <p className="h-[16px] text-[13px] font-semibold text-gray80">P&L</p>
        <p className={twJoin("h-[18px] text-[15px] font-semibold", getPlusMinusColor(positionStats.pnl))}>
          {advancedFormatNumber(positionStats.pnl, 2, "$")}
        </p>
      </div>
      <div className="w-[128px] h-full flex flex-col gap-[6px]">
        <p className="h-[16px] text-[13px] font-semibold text-gray80">ROI</p>
        <p className={twJoin("h-[18px] text-[15px] font-semibold", getPlusMinusColor(positionStats.pnl))}>
          {advancedFormatNumber(positionStats.roi, 2, "")}%
        </p>
      </div>
    </div>
  );
};

export default PositionSummary;
