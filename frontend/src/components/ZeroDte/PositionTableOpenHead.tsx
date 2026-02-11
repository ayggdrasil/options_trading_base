import { twJoin } from "tailwind-merge";

interface PositionTableOpenHeadProps {
}

const PositionTableOpenHead: React.FC<PositionTableOpenHeadProps> = ({}) => {
  return (
    <div
      className={twJoin(
        "grid h-[26px]",
        "grid-cols-[120px_144px_120px_120px_132px_120px_120px_120px_120px_116px]",
        "px-[24px] mt-[25px]",
        "items-center text-[14px] text-gray80 font-semibold"
      )}
    >
      <p className="">Expiry</p>
      <p className="">Instrument</p>
      <p className="">Open Price</p>
      <p className="">Close Price</p>
      <p className="pl-[12px]">Quantity</p>
      <p className="">Invested</p>
      <p className="">Current Value</p>
      <p className="">P&L</p>
      <p className="">ROI</p>
      <div className="flex flex-row justify-end items-center">
        {/* <button className="w-[73px] h-[26px] bg-black29 rounded-[16px] text-[12px] text-[#E6FC8D] font-semibold">Settle All</button> */}
      </div>
    </div>
  );
};

export default PositionTableOpenHead;


