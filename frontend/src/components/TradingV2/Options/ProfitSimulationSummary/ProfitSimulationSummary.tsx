import { UnderlyingAsset } from "@callput/shared";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber } from "@/utils/helper";

interface ProfitSimulationSummaryProps {
  breakeven: number;
  breakevenChange: number;
  underlyingAsset: UnderlyingAsset;
  hoveredAssetPrice: number;
  expectedPnl: number;
  expectedRoi: number;
}

function ProfitSimulationSummary({
  breakeven,
  breakevenChange,
  underlyingAsset,
  hoveredAssetPrice,
  expectedPnl,
  expectedRoi,
}: ProfitSimulationSummaryProps) {
  return (
    <div className="w-[156px] min-w-[156px] flex flex-col">
      <div className="flex flex-col">
        <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
          Breakeven
        </p>
        <div className="h-[20px] flex flex-row items-center gap-[4px]">
          <span className="text-whitef2f2 text-[12px] font-[600] leading-[20px]">
            {breakeven ? advancedFormatNumber(breakeven, 2, "$") : "$0.00"}
          </span>
          <span
            className={twJoin(
              "text-[12px] font-[600] leading-[20px]",
              breakevenChange > 0
                ? "text-green63"
                : breakevenChange < 0
                  ? "text-redff33"
                  : "text-whitee0"
            )}
          >
            {breakevenChange
              ? `${breakevenChange > 0 ? "+" : ""}${advancedFormatNumber(
                  breakevenChange,
                  2
                )}%`
              : "0.00%"}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
          {String(underlyingAsset)} Price
        </p>
        <div className="h-[20px] flex flex-row items-center gap-[4px]">
          <span className="text-whitef2f2 text-[12px] font-[600] leading-[20px]">
            {advancedFormatNumber(hoveredAssetPrice, 2, "$")}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
          Expected P&L/ROI
        </p>
        <div className="h-[20px] flex flex-row items-center gap-[4px]">
          <span className="text-whitef2f2 text-[12px] font-[600] leading-[20px]">
            {expectedPnl ? advancedFormatNumber(expectedPnl, 2, "$") : "$0.00"}
          </span>
          <span
            className={twJoin(
              "text-[12px] font-[600] leading-[20px]",
              expectedRoi > 0
                ? "text-green63"
                : expectedRoi < 0
                  ? "text-redff33"
                  : "text-whitee0"
            )}
          >
            {expectedRoi
              ? `${expectedRoi > 0 ? "+" : ""}${advancedFormatNumber(
                  expectedRoi,
                  2
                )}%`
              : "0.00%"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ProfitSimulationSummary;


