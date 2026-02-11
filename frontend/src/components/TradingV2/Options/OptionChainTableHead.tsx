import { twJoin } from "tailwind-merge";
import DisplayWithTooltip from "../DisplayWithToolTip";
import { OrderSide } from "@callput/shared";

interface OptionChainTableHeadProps {
  selectedOrderSide: OrderSide;
}

function OptionChainTableHead({ selectedOrderSide }: OptionChainTableHeadProps) {
  return (
    <div
      className={twJoin(
        "sticky top-0 z-10 h-[36px]",
        "px-[20px] py-[6px]",
        "border-t-[1px] border-t-black2023"
      )}
    >
      <div className="w-full h-full flex items-center gap-[10px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
        {/* Strike Price */}
        <div className="flex flex-row justify-start w-full min-w-[148px] max-w-[234px]">
          <DisplayWithTooltip
            title="Strike Price"
            tooltipContent={
              <p>
                The fixed price at which an option can be exercised to buy (call) or sell (put) the underlying asset.
              </p>
            }
          />
        </div>

        {/* Break Even */}
        <div className="flex flex-row justify-end w-full min-w-[96px] max-w-[180px]">
          <DisplayWithTooltip
            title="Break Even"
            tooltipContent={
              <p>
                The underlying asset price at which profit begins after covering the option premium.
              </p>
            }
            textAlign="right"
          />
        </div>

        {/* To Break Even */}
        <div className="flex flex-row justify-end w-full min-w-[96px] max-w-[180px]">
          <DisplayWithTooltip
            title="To Break Even"
            tooltipContent={
              <p>
                The percentage price movement required in the underlying asset for the option to reach breakeven.
              </p>
            }
            textAlign="right"
          />
        </div>

        {/* Max ROI / Max APR */}
        <div className="w-full min-w-[96px] max-w-[180px]">
          <p className="w-full text-right">
            <span>{selectedOrderSide === "Buy" ? "Max ROI" : "Max APR"}</span>
          </p>
        </div>

        {/* Spacer */}
        <div className="w-full min-w-[8px] max-w-[24px]"></div>

        {/* Price & IV */}
        <div className="flex flex-row justify-center w-full min-w-[148px] max-w-[234px]">
          <DisplayWithTooltip
            title="Price"
            tooltipContent={
              <p>
                Option prices for traders, adjusted by subtracting (mark price - risk premium) or adding (mark price + risk premium), for selling and buying respectively.
              </p>
            }
          />
          <span className="mx-1"> / </span>
          <DisplayWithTooltip
            title="IV"
            tooltipContent={
              <p>
                The expected volatility of the underlying asset, adjusted by subtracting (market - bid) or adding (ask - market) divided by Vega, for selling and buying respectively.
              </p>
            }
          />
        </div>

        {/* 24H Change */}
        <div className="flex flex-row justify-end w-full min-w-[96px] max-w-[180px]">
          <DisplayWithTooltip
            title="24H Change"
            tooltipContent={
              <p>
                Shows the 24h price change of the related vanilla option.
              </p>
            }
            textAlign="right"
          />
        </div>

        {/* Spacer */}
        <div className="w-full min-w-[8px] max-w-[24px]"></div>

        {/* Volume */}
        <div className="w-full min-w-[96px] max-w-[180px]">
          <p className="w-full">
            <span>Volume</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default OptionChainTableHead;
