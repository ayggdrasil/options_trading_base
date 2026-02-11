import { twJoin } from "tailwind-merge";
import WithTooltip from "../Common/WithTooltip";

const TradeOptionsTableHead: React.FC = () => {
  return (
    <div
      className={twJoin(
        "grid",
        "grid-cols-[190px_128px_230px_128px_141px] mt-[8px] mb-[14px]",
        "align-middle text-[14px] text-gray8b font-semibold"
      )}
    >
      <span className="pl-[40px]">
        <WithTooltip
          tooltipContent={
            <p className={twJoin("leading-[0.85rem] text-[12px] font-[600]")}>
              The fixed price at which an option can be exercised to buy (call)
              or sell (put) the underlying asset.
            </p>
          }
          tooltipClassName="w-[227px] h-fit"
        >
          <span className="border-b-[1px] border-dashed border-b-greenc1">
            Strike Price
          </span>
        </WithTooltip>
      </span>

      <div className="flex flex-row justify-center">
        <div className="flex flex-row justify-center">
          {/* Tooltip 1 */}
          <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
            <p className="text-gray80 text-[14px] hover:text-greenc1 ">
              Bid Price
            </p>
            <div
              className={twJoin(
                "w-max h-[42px] z-20",
                "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                "group-hover:block"
              )}
            >
              <p className="text-[12px] text-gray80 leading-[0.85rem]">
                Option's sell price for traders.
              </p>
              <p className="text-[11px] text-[#666] font-normal">
                Mark Price - Risk Premium
              </p>
            </div>
          </div>

          <div>
            <p className="mx-[5px]">/</p>
          </div>

          {/* Tooltip 2 */}
          <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
            <p className="text-gray80 text-[14px] hover:text-greenc1 ">IV</p>{" "}
            <p></p>
            <div
              className={twJoin(
                "w-max h-[42px] z-20",
                "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                "group-hover:block"
              )}
            >
              <p className="text-[12px] text-gray80 leading-[0.85rem]">
                Implied volatility of option's sell price for traders.
              </p>
              <p className="text-[11px] text-[#666] font-normal">
                IV of Mark Price - ((Mark Price - Bid Price) / Vega)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-row justify-center">
        {/* Tooltip 3 */}
        <WithTooltip
          tooltipContent={
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Model Price of options calculated using Black-76 fomula
            </p>
          }
          tooltipClassName="w-[227px] h-fit"
        >
          <span
            className={twJoin(
              "text-gray80 text-[14px] hover:text-greenc1",
              "border-b-[1px] border-dashed border-b-greenc1"
            )}
          >
            Mark Price
          </span>
        </WithTooltip>
      </div>

      <div className="flex flex-row justify-center">
        <div className="flex flex-row justify-center">
          {/* Tooltip 4 */}
          <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
            <p className="text-gray80 text-[14px] hover:text-greenc1 ">
              Ask Price
            </p>
            <div
              className={twJoin(
                "w-max h-[42px] z-20",
                "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                "group-hover:block"
              )}
            >
              <p className="text-[12px] text-gray80 leading-[0.85rem]">
                Option's buy price for traders.
              </p>
              <p className="text-[11px] text-[#666] font-normal">
                Mark Price + Risk Premium
              </p>
            </div>
          </div>

          <div>
            <p className="mx-[5px]">/</p>
          </div>

          {/* Tooltip 5 */}
          <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
            <p className="text-gray80 text-[14px] hover:text-greenc1 ">IV</p>
            <div
              className={twJoin(
                "w-max h-[42px] z-20",
                "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                "group-hover:block"
              )}
            >
              <p className="text-[12px] text-gray80 leading-[0.85rem]">
                Implied volatility of option's buy price for traders.
              </p>
              <p className="text-[11px] text-[#666] font-normal">
                IV of Mark Price + ((Ask Price - Mark Price) / Vega)
              </p>
            </div>
          </div>
        </div>
      </div>

      <span className="pl-[62px]">Volume</span>
    </div>
  );
};

export default TradeOptionsTableHead;
