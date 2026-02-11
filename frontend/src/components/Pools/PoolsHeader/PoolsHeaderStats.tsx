import { useOLPTotalStat } from "@/hooks/olp";
import { OlpKey } from "@/utils/enums";
import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import DisplayWithTooltip from "@/components/TradingV2/DisplayWithToolTip";

type Props = {
  olpKey: OlpKey;
  olpDetailData: any;
};

const PoolsHeaderStats = ({ olpKey, olpDetailData }: Props) => {
  const { tvl } = useOLPTotalStat({ olpKey });

  const revenueData = olpDetailData?.[30]?.revenue || {};

  const revenue7day = Object.entries(revenueData)
    .slice(0, 7)
    .reduce((acc, [date, val]: any) => {
      return acc + val.fees + val.risk_premium;
    }, 0);

  return (
    <div className={twJoin("w-[507px] h-full", "px-[40px] py-[32px]")}>
      <div className={twJoin("grid grid-cols-[1fr_1fr] gap-[24px]")}>
        <div className="flex flex-col gap-[6px]">
          <p className="h-[24px] text-gray8c8c text-[14px] font-[500] leading-[24px]">
            Total Value Locked
          </p>
          <p
            className={twJoin(
              "h-[28px] text-whitef2f2 text-[24px] font-[700] leading-[28px]"
            )}
          >
            {advancedFormatNumber(tvl, 0, "$", true)}
          </p>
        </div>

        <div className="flex flex-col gap-[6px]">
          <DisplayWithTooltip
            title="7-Day Net Revenue"
            tooltipContent={<p>Net Revenue = Risk Premium + Fees</p>}
            className="h-[24px] text-gray8c8c text-[14px] font-[500] leading-[24px]"
          />
          <p
            className={twJoin(
              "h-[28px] text-whitef2f2 text-[24px] font-[700] leading-[28px]"
            )}
          >
            {advancedFormatNumber(revenue7day, 0, "$", true)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PoolsHeaderStats;
