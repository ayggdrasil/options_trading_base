import OLP from "../components/Pools/OLP";
import { twJoin } from "tailwind-merge";
import { OlpKey } from "@/utils/enums";
import { useEffect, useState } from "react";

import OLPDetailParts from "@/components/Pools/OLPDetailParts";
import PoolsHeader from "@/components/Pools/PoolsHeader";
import { from } from "rxjs";
import { OLP_DETAIL_DATA_API } from "@/networks/apis";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";

interface PoolsProps {
  announcementsLen: number;
}

function Pools({ announcementsLen }: PoolsProps) {
  const { chain } = useAppSelector((state) => state.network) as NetworkState;

  const [topPadding, setTopPadding] = useState(0);
  const [olpDetailData, setOlpDetailData] = useState<any>({});

  useEffect(() => {
    if (announcementsLen > 0) {
      setTopPadding(announcementsLen * 46 + 46);
    }
  }, [announcementsLen]);

  useEffect(() => {
    from(fetch(OLP_DETAIL_DATA_API[chain]).then((res) => res.json())).subscribe(
      (olpDetailDeta) => {
        setOlpDetailData(olpDetailDeta);
      }
    );
  }, [chain]);

  return (
    <div
      style={announcementsLen > 0 ? { paddingTop: `${topPadding}px` } : undefined}
      className={twJoin(
        "relative",
        "flex flex-row justify-center items-center",
        "w-full h-full",
        "pt-[46px]"
      )}
    >
      <div
        className={twJoin(
          "flex flex-col",
          "w-full h-full min-w-[1280px] max-w-[1280px] min-h-screen",
          "pt-[26px]",
          "border-x-[1px] border-solid border-[#292929]"
        )}
      >
        <PoolsHeader olpKey={OlpKey.sOlp} olpDetailData={olpDetailData} />
        <div
          className={twJoin(
            "w-full flex-1 min-h-[1130px]",
            "grid grid-cols-[384px_1fr]",
            "border-t-[1px] border-solid border-[#292929]"
          )}
        >
          <OLP olpKey={OlpKey.sOlp} key={OlpKey.sOlp} />
          <OLPDetailParts olpKey={OlpKey.sOlp} olpDetailData={olpDetailData} />
        </div>
      </div>
    </div>
  );
}

export default Pools;
