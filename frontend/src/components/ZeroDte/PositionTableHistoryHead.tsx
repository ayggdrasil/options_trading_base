import { twJoin } from "tailwind-merge";

interface PositionTableHistoryHeadProps {}

const PositionTableHistoryHead: React.FC<PositionTableHistoryHeadProps> = ({}) => {
  return (
    <div
      className={twJoin(
        "grid h-[26px]",
        "grid-cols-[108px_64px_64px_144px_118px_118px_118px_118px_118px_118px_118px_26px]",
        "px-[24px] mt-[25px]",
        "items-center text-[14px] text-gray80 font-semibold"
      )}
    >
      <p className="">Time</p>
      <p className="">Type</p>
      <p className="">Expiry</p>
      <p className="">Instrument</p>
      <p className="">Open Price</p>
      <p className="">Close Price</p>
      <p className="">Quantity</p>
      <p className="">Invested</p>
      <p className="">Returned</p>
      <p className="">P&L</p>
      <p className="">ROI</p>
      <p className=""></p>
    </div>
  );
};

export default PositionTableHistoryHead;


