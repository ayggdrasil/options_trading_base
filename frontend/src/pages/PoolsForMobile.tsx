import OLP from "../components/Pools/mobile/OLP";
import { twJoin } from "tailwind-merge";
import { OlpKey } from "@/utils/enums";
import { useEffect, useState } from "react";

import { from } from "rxjs";
import PoolsHeader from "@/components/Pools/mobile/PoolsHeader";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";
import { OLP_DETAIL_DATA_API } from "@/networks/apis";

function Pools() {
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const [olpDetailData, setOlpDetailData] = useState<any>({});

  useEffect(() => {
    from(
      fetch(OLP_DETAIL_DATA_API[chain]).then((res) => res.json())
    ).subscribe((olpDetailDeta) => {
      setOlpDetailData(olpDetailDeta);
    });
  }, []);

  return (
    <div
      className={twJoin(
        "flex flex-col gap-y-5",
        "absolute top-0 left-0 bottom-0"
      )}
    >
      <PoolsHeader olpKey={OlpKey.sOlp} olpDetailData={olpDetailData} />
      <div
        className={twJoin(
          "flex-shrink-0 h-[1px] w-full opacity-10",
          "bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"
        )}
      ></div>
      <OLP olpKey={OlpKey.sOlp} />
    </div>
  );
}

export default Pools;
