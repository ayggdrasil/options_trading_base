import { useOLPTotalStat } from "@/hooks/olp";
import { OlpKey } from "@/utils/enums";
import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";

type Props = {
  olpKey: OlpKey;
  olpDetailData: any;
};

const TotalStat = ({ olpKey, olpDetailData }: Props) => {
  const { tvl } = useOLPTotalStat({ olpKey });

  const revenueData = olpDetailData?.[30]?.revenue || {};

  const revenue7day = Object.entries(revenueData)
    .slice(0, 7)
    .reduce((acc, [date, val]: any) => {
      return acc + val.fees + val.risk_premium;
    }, 0);

  return (
    <div className={twJoin("flex flex-row")}>
      <div className="flex flex-col flex-1">
        <p
          className={twJoin(
            "font-semibold text-greene6",
            "text-[12px] leading-[14px] md:text-[14px]"
          )}
        >
          Total Value Locked
        </p>
        <p
          className={twJoin(
            "font-bold text-whitef0",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
        >
          {advancedFormatNumber(tvl, 0, "$", true)}
        </p>
      </div>
      <div className="flex flex-col flex-1">
        <p
          className={twJoin(
            "font-semibold text-greene6",
            "text-[12px] leading-[14px] md:text-[14px]"
          )}
        >
          7-Day Net Revenue
        </p>
        <p
          className={twJoin(
            "font-bold text-whitef0",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
        >
          {advancedFormatNumber(revenue7day, 0, "$", true)}
        </p>
      </div>
    </div>
  );
};

export default TotalStat;
