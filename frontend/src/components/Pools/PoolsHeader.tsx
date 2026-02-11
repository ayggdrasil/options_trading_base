import React from "react";
import { twJoin } from "tailwind-merge";
import PoolsHeaderStats from "./PoolsHeader/PoolsHeaderStats";
import { OlpKey } from "@/utils/enums";
import PoolsHeaderDescription from "./PoolsHeader/PoolsHeaderDescription";

type Props = {
  olpKey: OlpKey;
  olpDetailData: any;
};

const PoolsHeader: React.FC<Props> = ({ olpKey, olpDetailData }) => {
  return (
    <div className={twJoin("w-full h-[146px]] flex flex-row")}>
      <PoolsHeaderDescription />
      <PoolsHeaderStats olpKey={olpKey} olpDetailData={olpDetailData} />
    </div>
  );
};

export default PoolsHeader;
