import React, { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";

import ReactECharts from "echarts-for-react";
import { DayRange, defaultOption } from "./PerformanceChart.option";
import Selector from "../Common/Selector";
import { useOlpPerformanceChart, useOLPTotalStat } from "@/hooks/olp";
import { OlpKey } from "@/utils/enums";
import { advancedFormatNumber } from "@/utils/helper";

type Props = {
  olpKey: OlpKey;
  data: any;
  className?: string;
};

const PerformanceChart: React.FC<Props> = ({ data, className, olpKey }) => {
  const { tvl } = useOLPTotalStat({ olpKey });
  const {
    detailData,
    setChartInstance,
    echartsRef,
    activeDayRange,
    setDayRange,
    getOptions,
  } = useOlpPerformanceChart({ data, defaultOption });

  const [priceChangeRate, setPriceChangeRate] = useState<number>(0);

  useEffect(() => {
    if (!detailData || !detailData.olpPerformance) return;

    const olpPerformanceData = Object.entries(detailData?.olpPerformance || {})
      .filter(([date, value]: any) => !value.olp_price || value.olp_price !== 0)
      .map(([date, value]: any) => ({ date, ...value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const firstPrice = olpPerformanceData[0].olp_price;
    const lastPrice =
      olpPerformanceData[olpPerformanceData.length - 1].olp_price;

    const priceChangeRate = ((lastPrice - firstPrice) / firstPrice) * 100;
    setPriceChangeRate(priceChangeRate);
  }, [detailData]);

  return (
    <div className={twJoin("relative", "flex flex-col gap-[16px] w-full h-[384px]", className)}>
      <div className={twJoin("w-full h-[48px] flex flex-row items-center")}>
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-[12px]">
            <p className="text-blue278e text-[20px] font-[700] leading-[30px]">
              OLP Token Value
            </p>
            <div className="w-[1px] h-[30px] bg-black2023 mx-[4px]" />
            <Selector
              items={Object.values(DayRange).map((dayKey) => {
                return {
                  value: dayKey + "d",
                  onClick: () => setDayRange(dayKey),
                  isActive: activeDayRange === dayKey,
                };
              })}
            />
          </div>
        </div>

        <div className="w-[299px] h-full flex flex-row items-center gap-[24px]">
          <div className="w-[174px] h-full flex flex-col">
            <p className="text-gray8c8c text-[14px] font-[500] leading-[24px]">
              OLP Total Value Locked
            </p>
            <p className="text-whitef2f2 text-[15px] font-[600] leading-[24px]">
              {advancedFormatNumber(tvl, 2, "$", true)}
            </p>
          </div>

          <div className="w-[105px] flex flex-col">
            <p className="text-gray8c8c text-[14px] font-[500] leading-[24px]">
              {`${activeDayRange}d change`}
            </p>
            <p
              className={twJoin(
                "text-[15px] font-[600] leading-[24px]",
                priceChangeRate > 0
                  ? "text-green71b8"
                  : priceChangeRate < 0
                    ? "text-rede04a"
                    : "text-whitef2f2"
              )}
            >
              {priceChangeRate > 0
                ? `+${advancedFormatNumber(priceChangeRate, 2, "", true)}%`
                : priceChangeRate < 0
                  ? `${advancedFormatNumber(priceChangeRate, 2, "", true)}%`
                  : "0%"}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full h-fit bg-black181a rounded-[6px]">
        <ReactECharts
          ref={echartsRef}
          option={getOptions(detailData)}
          style={{ height: "320px", width: "100%" }}
          onChartReady={(instance) => {
            setChartInstance(instance);
          }}
        />
      </div>
    </div>
  );
};

export default PerformanceChart;
