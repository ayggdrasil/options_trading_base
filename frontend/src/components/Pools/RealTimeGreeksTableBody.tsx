import { useAppSelector } from "@/store/hooks";
import { OlpKey } from "@/utils/enums";
import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";

interface RealTimeGreeksTableBodyProps {
  olpKey: OlpKey;
}

const RealTimeGreeksTableBody: React.FC<RealTimeGreeksTableBodyProps> = ({olpKey}) => {
  const olpStats = useAppSelector((state: any) => state.market.olpStats)
  const olpGreeks = olpStats[olpKey].greeks;
  
  return (
    <div
      className={twJoin(
        "grid",
        "grid-cols-[56px_144px_144px] mt-[12px] ml-[28px]",
        "align-middle h-[18px] text-[13px] text-whitee0 font-semibold"
      )}
    >
      <div className="flex flex-col gap-[10px] text-left">
        <div className="relative group cursor-help w-fit h-[18px] font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray52 text-[13px] hover:text-greenc1 font-bold">Delta</p>
          <div className={twJoin(
            "w-max h-[40px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Changes in OLP's asset value due to $1 <br/>
              increase in underlying asset's price.
            </p>
          </div>
        </div>

        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray52 text-[13px] hover:text-greenc1 font-bold">Gamma</p>
          <div className={twJoin(
            "w-max h-[40px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Changes in OLP's Delta due to $1 <br/>
              increase in underlying asset's price.
            </p>
          </div>
        </div>
        
        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray52 text-[13px] hover:text-greenc1 font-bold">Vega</p>
          <div className={twJoin(
            "w-max h-[40px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Changes in OLP's asset value due to <br/>
              1% increase in underlying asset's IV.
            </p>
          </div>
        </div>

        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray52 text-[13px] hover:text-greenc1 font-bold">Theta</p>
          <div className={twJoin(
            "w-max h-[40px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Changes in OLP's asset value <br/>
              per day closer to expiry.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[10px] text-right pr-[12px]">
        <p>{advancedFormatNumber(olpGreeks["BTC"].delta, 2, "")}</p>
        <p>{advancedFormatNumber(olpGreeks["BTC"].gamma, 6, "")}</p>
        <p>{advancedFormatNumber(olpGreeks["BTC"].vega, 2, "")}</p>
        <p>{advancedFormatNumber(olpGreeks["BTC"].theta, 2, "")}</p>
      </div>

      <div className="flex flex-col gap-[10px] text-right pr-[12px]">
        <p>{advancedFormatNumber(olpGreeks["ETH"].delta, 2, "")}</p>
        <p>{advancedFormatNumber(olpGreeks["ETH"].gamma, 6, "")}</p>
        <p>{advancedFormatNumber(olpGreeks["ETH"].vega, 2, "")}</p>
        <p>{advancedFormatNumber(olpGreeks["ETH"].theta, 2, "")}</p>
      </div>
    </div>
  );
};

export default RealTimeGreeksTableBody;
