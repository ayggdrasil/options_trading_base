import React, { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";

import ReactECharts from "echarts-for-react";
import { DayRange, defaultOption, Tab } from "./RevenueChart.option";
import Selector from "../Common/Selector";
import { useRevenueChart } from "@/hooks/olp";
import { OlpKey } from "@/utils/enums";
import { advancedFormatNumber } from "@/utils/helper";

type Props = {
  olpKey: OlpKey;
  className?: string;
  data: any;
};

const RevenueChart: React.FC<Props> = ({ className, olpKey, data }) => {
  const {
    detailData,
    setChartInstance,
    echartsRef,
    activeDayRange,
    activeTab,
    setActiveTab,
    setDayRange,
    getOptions,
    getTotalValue,
  } = useRevenueChart({ data, defaultOption });

  return (
    <div className={twJoin("relative", "flex flex-col gap-[16px] w-full h-[384px]", className)}>
      <div className={twJoin("w-full h-[48px] flex flex-row items-center")}>
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-[12px]">
            <p className="text-blue278e text-[20px] font-[700] leading-[30px]">
              Metrics
            </p>
            <div className="w-[1px] h-[30px] bg-black2023 mx-[4px]" />
            <div className="flex items-center gap-[24px]">
              <Selector
                className={twJoin("w-[178px]")}
                items={Object.values(Tab).map((tabTitle) => {
                  return {
                    value: tabTitle,
                    onClick: () => setActiveTab(tabTitle),
                    isActive: activeTab === tabTitle,
                  };
                })}
              />
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
        </div>
        <div className="w-[142px] flex flex-col">
          <p
            className={twJoin(
              "relative",
              "text-gray8c8c text-[14px] font-[500] leading-[24px]"
            )}
          >
            {activeDayRange}d {activeTab}
          </p>
          <p className="text-[15px] font-[600] leading-[24px]">
            {advancedFormatNumber(getTotalValue(), 0, "$", true)}
          </p>
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

export default RevenueChart;
