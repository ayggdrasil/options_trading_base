import React, { memo } from "react";
import { twJoin } from "tailwind-merge";

const intervalList = ["1m", "5m", "15m"];

type IntervalSelectorProps = {
  interval: string;
  setChartInterval: (value: string) => void;
};

const IntervalSelector: React.FC<IntervalSelectorProps> = memo(
  ({ interval: chartInterval, setChartInterval }) => {
    return (
      <div className="flex items-center gap-x-3">
        <p className="text-[12px] md:text-[14px] leading-[18px] font-semibold mr-[2px] text-whitef0">
          Time
        </p>
        {intervalList.map((item) => {
          return (
            <p
              key={item}
              className={twJoin(
                "text-[12px] md:text-[14px] leading-[18px",
                "py-[2px] px-1 cursor-pointer",
                item === chartInterval
                  ? "font-semibold text-greene6"
                  : "font-normal text-gray9D"
              )}
              onClick={() => {
                setChartInterval(item);
              }}
            >
              {item}
            </p>
          );
        })}
      </div>
    );
  }
);

export default IntervalSelector;
