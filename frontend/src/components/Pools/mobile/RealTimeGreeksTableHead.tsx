import { UA_INFO } from "@/networks/assets";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";
import { twJoin } from "tailwind-merge";

const RealTimeGreeksTableHead: React.FC = () => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  return (
    <div className="flex flex-col mt-3">
      <div
        className={twJoin(
          "flex-shrink-0 h-[1px] w-full opacity-10",
          "bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"
        )}
      ></div>
      <div className="flex flex-row gap-x-[60px] justify-end py-3">
        <div className="flex flex-row items-center gap-x-[6px]">
          <img src={UA_INFO[chain]["BTC"].src} className="w-5 h-5 object-cover" />
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[12px] leading-[14px] md:text-[14px]"
            )}
          >
            BTC
          </p>
        </div>
        <div className="flex flex-row items-center gap-x-[6px]">
          <img src={UA_INFO[chain]["ETH"].src} className="w-5 h-5 object-cover" />
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[12px] leading-[14px] md:text-[14px]"
            )}
          >
            ETH
          </p>
        </div>
      </div>
      <div
        className={twJoin(
          "flex-shrink-0 h-[1px] w-full opacity-10",
          "bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"
        )}
      ></div>
    </div>
  );
};

export default RealTimeGreeksTableHead;
