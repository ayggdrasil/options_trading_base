import React from "react";
import { twJoin } from "tailwind-merge";
import { useMyOlpData } from "@/hooks/olp";
import { advancedFormatNumber } from "@/utils/helper";

type Props = {
  olpKey: string;
};

const MyOLPV2: React.FC<Props> = ({ olpKey }) => {
  const { stakedOlp, stakedOlpUsd, unrealizedPnl, unrealizedRoi } =
    useMyOlpData({ olpKey });

  return (
    <div className="flex flex-col gap-[12px] px-[24px]">
      <p className="h-[32px] text-blue278e text-[20px] font-[700] leading-[32px]">
        My OLP
      </p>
      <div className="grid grid-cols-[1fr_1fr] gap-[20px] pb-[12px]">
        {/* OLP Balance */}
        <div className={twJoin("flex flex-col gap-[6px]")}>
          <p className="text-gray8c8c text-[14px] font-[500] leading-[24px]">
            OLP Balance
          </p>
          <div className="flex flex-col gap-[2px]">
            <div className="h-[24px] text-whitef2f2 text-[16px] font-[600] leading-[24px]">
              {advancedFormatNumber(Number(stakedOlp), 4, "", true)} OLP
            </div>
            <div className="text-[13px] font-[600] text-gray80 leading-[18px]">
              {advancedFormatNumber(stakedOlpUsd, 2, "$", true)}
            </div>
          </div>
        </div>
        {/* P&L */}
        <div className={twJoin("flex flex-col gap-[6px]")}>
          <div className="text-gray8c8c text-[14px] font-[500] leading-[24px]">
            P&L
          </div>
          <div className="flex flex-col gap-[2px]">
            <p
              className={twJoin(
                "text-[15px] font-[600] leading-[24px]",
                unrealizedPnl > 0
                  ? "text-green71b8"
                  : unrealizedPnl < 0
                    ? "text-rede04a"
                    : "text-whitef2f2"
              )}
            >
              {unrealizedPnl > 0
                ? `+${advancedFormatNumber(unrealizedPnl, 2, "$", true)}`
                : unrealizedPnl < 0
                  ? `${advancedFormatNumber(unrealizedPnl, 2, "$", true)}`
                  : "$0.00"}
            </p>
            <p
              className={twJoin(
                "text-[15px] font-[600] leading-[24px]",
                unrealizedRoi > 0
                  ? "text-green71b8"
                  : unrealizedRoi < 0
                    ? "text-rede04a"
                    : "text-whitef2f2"
              )}
            >
              {unrealizedRoi > 0
                ? `+${advancedFormatNumber(unrealizedRoi, 2, "", true)}%`
                : unrealizedRoi < 0
                  ? `${advancedFormatNumber(unrealizedRoi, 2, "", true)}%`
                  : "0%"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyOLPV2;
