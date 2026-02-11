import React from "react";
import { twJoin } from "tailwind-merge";
import PoolAttributes from "./PoolAttributes";
import { OlpKey } from "@/utils/enums";
import PerformanceChart from "./PerformanceChart";
import RevenueChart from "./RevenueChart";

type Props = {
  olpKey: OlpKey;
  olpDetailData: any;
};

const OLPDetailParts: React.FC<Props> = ({ olpKey, olpDetailData }) => {
  return (
    <div className={twJoin(
      "w-full h-full flex flex-col gap-[16px] p-[24px]",
      "border-l-[1px] border-solid border-[#292929]"
    )}>
      <PerformanceChart data={olpDetailData} olpKey={olpKey} />
      <div className="w-full h-[1px] bg-black2023 my-[6px]" />
      <RevenueChart data={olpDetailData} olpKey={olpKey} />
      <div className="w-full h-[1px] bg-black2023 my-[6px]" />
      <PoolAttributes olpKey={olpKey} />
    </div>
  );
};

export default OLPDetailParts;
