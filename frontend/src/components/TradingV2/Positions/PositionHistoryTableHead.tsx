import { twJoin } from "tailwind-merge";
import DisplayWithTooltip from "../DisplayWithToolTip";

function PositionHistoryTableHead() {
  return (
    <div
      className={twJoin(
        "sticky top-0 h-[40px]",
        "px-[20px] py-[8px]",
        "border-t-[1px] border-t-black2023"
      )}
    >
      <div
        className={twJoin(
          "w-full flex gap-[12px]",
          "text-gray8c8c text-[12px] font-[500] leading-[24px]"
        )}
      >
        <div className="w-full min-w-[128px] max-w-[200px]">
          <p className="w-full">Type / Time</p>
        </div>
        <div className="w-full min-w-[96px] max-w-[162px]">
          <p className="w-full">UA Price</p>
        </div>
        <div className="w-full min-w-[200px] max-w-[240px]">
          <p className="w-full">Instrument</p>
        </div>
        <div className="w-full min-w-[108px] max-w-[185px] text-right">
          <p className="w-full">Option Size</p>
        </div>
        <div className="w-full min-w-[108px] max-w-[185px] text-right">
          <p className="w-full">Collateral</p>
        </div>
        <div className="w-full min-w-[108px] max-w-[185px] text-right">
          <p className="w-full">Avg. Price</p>
        </div>
        <div className="w-full min-w-[108px] max-w-[185px] flex flex-row justify-end">
          <DisplayWithTooltip
            title="Settle Payoff"
            tooltipContent={
              <p>
                When settling Buy (Sell) positions, the amount that trader received from (paid to) Moby.
              </p>
            }
            tooltipClassName="w-[260px] h-fit mt-[4px]"
            textAlign="right"
          />
        </div>
        <div className="w-full min-w-[108px] max-w-[185px] flex flex-row justify-end">
          <DisplayWithTooltip
            title="Cashflow"
            tooltipContent={
              <p>
                Amount paid or received for the options traded.
              </p>
            }
            tooltipClassName="w-[260px] h-fit mt-[4px]"
            textAlign="right"
          />
        </div>
        <div className="w-full min-w-[108px] max-w-[185px] text-right">
          <p className="w-full">P&L (ROI)</p>
        </div>
        <div className="w-full min-w-[48px] max-w-[48px] text-right">
          <p className="w-full">Share</p>
        </div>
      </div>
    </div>
  );
}

export default PositionHistoryTableHead;
