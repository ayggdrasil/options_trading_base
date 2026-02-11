import { twJoin } from "tailwind-merge";
import WithTooltip from "../Common/WithTooltip";

const HistoryTableHead: React.FC = () => {
  return (
    <div
      className={twJoin(
        "grid",
        "grid-cols-[142px_232px_52px_108px_128px_112px_112px_112px_112px_96px_42px] py-[9px] px-[16px]",
        "items-center align-middle text-[14px] text-gray8b font-semibold"
      )}
    >
      <p className="">Time</p>
      <p className="pl-[22px]">Instrument</p>
      <p className="pl-[12px]">Type</p>
      <p className="pl-[12px] text-right">Option Size</p>
      <p className="pl-[12px] pr-[22px] text-right">Collateral</p>
      <div className="pl-[12px] flex flex-col text-right leading-3">
        <p className="text-gray80 text-[14px] h-[17px]">Avg. Price</p>
        <p className="text-[13px] text-[#525252] font-semibold h-[13px]">
          / Option
        </p>
      </div>
      <div className="pl-[12px] flex flex-col text-right leading-3">
        {/* <p className="text-gray80 text-[14px] h-[17px]">Settle Payoff</p> */}

        <WithTooltip
          tooltipContent={
            <p
              className={twJoin(
                "leading-[0.85rem] text-left text-[12px] font-[600]"
              )}
            >
              When settling Buy (Sell) positions, the amount that trader
              received from (paid to) Moby
            </p>
          }
          tooltipClassName="w-[227px] h-fit"
        >
          <p className="text-[14px] h-[17px] border-b-[1px] border-dashed border-b-greenc1">
            Settle Payoff
          </p>
        </WithTooltip>

        <p className="text-[13px] text-[#525252] font-semibold h-[13px]">
          / Option
        </p>
      </div>

      {/* Current Price */}
      <div className="flex flex-row justify-end pl-[12px]">
        {/* Tooltip */}
        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray80 hover:text-greenc1 ">Cash Flow</p>
          <div
            className={twJoin(
              "w-max h-[40px] z-20",
              "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
              "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
              "group-hover:block"
            )}
          >
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Amount paid or received for the options traded.
            </p>
          </div>
        </div>
      </div>

      <p className="pl-[12px] text-right">P&L</p>
      <p className="pl-[12px] text-right">ROI</p>
    </div>
  );
};

export default HistoryTableHead;
