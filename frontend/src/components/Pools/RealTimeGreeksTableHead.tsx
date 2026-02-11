import { UA_INFO } from "@/networks/assets";
import { twJoin } from "tailwind-merge";
import { useAppSelector } from "@/store/hooks";
import { NetworkState } from "@/networks/types";

const RealTimeGreeksTableHead: React.FC = () => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  return (
    <div className={twJoin(
      "grid",
      "grid-cols-[56px_144px_144px] mt-[5px] ml-[28px] h-[28px]",
      "align-middle"
    )}
  >
    <div></div>
    <div className="flex flex-row items-center justify-end gap-[8px] pr-[12px]">
      <img src={UA_INFO[chain]["BTC"].src} className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] ml-[8px]"/>
      <p className="text-gray52 text-[13px] hover:text-greenc1 font-bold">BTC</p>
    </div>
    <div className="flex flex-row items-center justify-end gap-[8px] pr-[12px]">
      <img src={UA_INFO[chain]["ETH"].src} className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] ml-[8px]"/>
      <p className="text-gray52 text-[13px] hover:text-greenc1 font-bold">ETH</p>
    </div>
  </div>
  );
};

export default RealTimeGreeksTableHead;
