import { twJoin } from "tailwind-merge";

const MyPositionTableHead: React.FC = () => {
  return (
    <div
      className={twJoin(
        "grid",
        "grid-cols-[229px_115px_96px_96px_118px_98px_88px_116px_88px_88px_120px] py-[9px] px-[16px]",
        "items-center align-middle text-[14px] text-gray8b font-semibold"
      )}
    >
      <p className="">Instrument</p>
      <p className="pl-[15px] text-right">Option Size</p>

      {/* Avg. Price */}
      <div className="pl-[12px] flex flex-col text-right leading-3">
        <p className="text-gray80 text-[14px] h-[17px]">Avg. Price</p>
        <p className="text-[13px] text-[#525252] font-semibold h-[13px]">/ Option</p>
      </div>

      {/* Mark Price */}
      <div className="pl-[12px] flex flex-col text-right leading-3">
        <p className="text-gray80 text-[14px] h-[17px]">Mark Price</p>
        <p className="text-[13px] text-[#525252] font-semibold h-[13px]">/ Option</p>
      </div>

      {/* P&L */}
      <div className="flex flex-row justify-end">
        {/* Tooltip */}
        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray80 text-[14px] hover:text-greenc1 ">P&L <span className="text-[12px]">USD</span></p>
          <div className={twJoin(
            "w-max h-[40px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Buy: (Current Price - Order Price) x Option Size <br/>
              Sell: (Order Price - Current Price) x Option Size
            </p>
          </div>
        </div>
      </div>
      
      {/* ROI */}
      <div className="flex flex-row justify-end">
        {/* Tooltip */}
        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray80 text-[14px] hover:text-greenc1 ">ROI</p>
          <div className={twJoin(
            "w-[155px] h-[26px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              P&L / Order Price × 100
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-row justify-end">
        {/* Tooltip */}
        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray80 text-[14px] hover:text-greenc1 ">Delta</p>
          <div className={twJoin(
            "w-[258px] h-[40px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Changes in options price due to $1 increase <br/>
              in underlying asset's price per quantity.
            </p>
          </div>
        </div>
      </div>
      
      {/* Gamma */}
      <div className="flex flex-row justify-end">
        {/* Tooltip */}
        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray80 text-[14px] hover:text-greenc1 ">Gamma</p>
          <div className={twJoin(
            "w-max h-[40px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Changes in Delta due to $1 increase <br/>
              in underlying asset's price per quantity.
            </p>
          </div>
        </div>
      </div>

      {/* Vega */}
      <div className="flex flex-row justify-end">
        {/* Tooltip */}
        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray80 text-[14px] hover:text-greenc1 ">Vega</p>
          <div className={twJoin(
            "w-max h-[40px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Changes in options price due to 1% increase <br/>
              in underlying asset's IV per quantity.
            </p>
          </div>
        </div>
      </div>

      {/* Theta */}
      <div className="flex flex-row justify-end">
        {/* Tooltip */}
        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray80 text-[14px] hover:text-greenc1 ">Theta</p>
          <div className={twJoin(
            "w-max h-[40px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Changes in options price per day <br/>
              closer to expiry per quantity.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MyPositionTableHead;
