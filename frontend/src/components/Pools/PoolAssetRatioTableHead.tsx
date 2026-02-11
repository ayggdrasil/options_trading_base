import { twJoin } from "tailwind-merge";

const PoolAssetRatioTableHead: React.FC = () => {
  return (
    <div className={twJoin(
        "grid",
        "grid-cols-[141px_135px_68px] mt-[6px] mx-[26px]",
        "align-middle text-[13px] text-gray52 font-bold"
      )}
    >
      <div className="flex flex-row">
        <p>Current&nbsp;/&nbsp;</p>
        <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
          <p className="text-gray52 text-[13px] h-[18px] hover:text-greenc1 ">Target Weight</p>
          <div className={twJoin(
            "w-max h-[40px] z-20",
            "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
            "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
            "group-hover:block"
          )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              Target allocation ratio of underlying assets <br/>
              to be managed by OLP
            </p>
          </div>
        </div>
      </div>

      <span className="text-right">Pool</span>
      <span className="text-right">Fee</span>
    </div>
  );
};

export default PoolAssetRatioTableHead;
