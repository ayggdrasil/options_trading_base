import React, { useState, useEffect, useRef } from "react";
import { twJoin, twMerge } from "tailwind-merge";

type IntervalSelectorProps = {
  interval: string;
  setChartInterval: (value: string) => void;
};

const intervalCss = (isTargetInterval: boolean): string =>
  twJoin(
    "text-center text-[12px]",
    isTargetInterval ? "text-greene6" : "text-gray9D",
    "font-semibold leading-normal"
  );

const blockCss = twJoin(
  "flex items-center justify-center",
  "border-y-[1px] border-solid border-gray5C bg-[rgba(31,31,31,0.80)] backdrop-blur-[6px]"
);

const IntervalSelector: React.FC<IntervalSelectorProps> = ({
  interval: chartInterval,
  setChartInterval,
}) => {
  return (
    <div className="flex flex-row h-[32px]">
      <div
        className={twMerge(
          "w-[38px]",
          "rounded-l-[3px]",
          "border-x-[1px]",
          blockCss
        )}
        onClick={() => {
          setChartInterval("1m");
        }}
      >
        <p className={intervalCss(chartInterval === "1m")}>1m</p>
      </div>
      <div
        className={twMerge("w-[38px]", blockCss)}
        onClick={() => {
          setChartInterval("5m");
        }}
      >
        <p className={intervalCss(chartInterval === "5m")}>5m</p>
      </div>
      <div
        className={twMerge(
          "w-[46px]",
          "rounded-r-[3px]",
          "border-x-[1px]",
          blockCss
        )}
        onClick={() => {
          setChartInterval("15m");
        }}
      >
        <p className={intervalCss(chartInterval === "15m")}>15m</p>
      </div>
    </div>
  );
};

export default IntervalSelector;
