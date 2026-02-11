import { twJoin } from "tailwind-merge";
import DisplayWithTooltip from "../DisplayWithToolTip";

function OpenPositionsTableHead() {
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
        <div className="w-full min-w-[228px] max-w-[228px]">
          <p className="w-full">Instrument</p>
        </div>
        <div className="w-full min-w-[82px] max-w-[128px] text-right">
          <p className="w-full">Price</p>
        </div>
        <div className="w-full min-w-[114px] max-w-[228px] text-right">
          <p className="w-full">Option Size</p>
        </div>
        <div className="w-full min-w-[82px] max-w-[128px] text-right">
          <p className="w-full">Avg. Price</p>
        </div>
        <div className="w-full min-w-[114px] max-w-[228px] flex flex-row justify-end">
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
        <div className="w-full min-w-[114px] max-w-[228px] flex flex-row justify-end ">
          <DisplayWithTooltip
            title="P&L (ROI)"
            tooltipContent={
              <p>
                Profit or loss calculated as price difference (price - average price for buy, average price - price for sell) multiplied by size, with ROI expressed as (P&L/price × 100).
              </p>
            }
            tooltipClassName="w-[260px] h-fit mt-[4px]"
            textAlign="right"
          />
        </div>
        <div className="w-full min-w-[72px] max-w-[120px] flex flex-row justify-end">
          <DisplayWithTooltip
            title="Delta"
            tooltipContent={
              <p>
                Changes in options price due to $1 increase in underlying asset's price per quantity.
              </p>
            }
            tooltipClassName="w-[260px] h-fit mt-[4px]"
            textAlign="right"
          />
        </div>
        <div className="w-full min-w-[72px] max-w-[134px] flex flex-row justify-end">
          <DisplayWithTooltip
            title="Gamma"
            tooltipContent={
              <p>
                Changes in Delta due to $1 increase in underlying asset's price per quantity.
              </p>
            }
            tooltipClassName="w-[260px] h-fit mt-[4px]"
            textAlign="right"
          />
        </div>
        <div className="w-full min-w-[72px] max-w-[120px] flex flex-row justify-end">
          <DisplayWithTooltip
            title="Vega"
            tooltipContent={
              <p>
                Changes in options price due to 1% increase in underlying asset's IV per quantity.
              </p>
            }
            tooltipClassName="w-[260px] h-fit mt-[4px]"
            textAlign="right"
          />
        </div>
        <div className="w-full min-w-[72px] max-w-[120px] flex flex-row justify-end">
          <DisplayWithTooltip
            title="Theta"
            tooltipContent={
              <p>
                Changes in options price per day closer to expiry per quantity.
              </p>
            }
            tooltipClassName="w-[260px] h-fit mt-[4px]"
            textAlign="right"
          />
        </div>
        <div className="w-full min-w-[86px] max-w-[86px] text-right">
          <p className="w-full">Actions</p>
        </div>
      </div>
    </div>
  );
}

export default OpenPositionsTableHead;
