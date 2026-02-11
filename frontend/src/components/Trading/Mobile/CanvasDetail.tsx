import { formatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";

interface CanvasDetailProps {
  x: number,
  y: number,
  assetPrice: number,
  change: number,
  pnl: number,
}

const CanvasDetail: React.FC<CanvasDetailProps> = ({
  x,
  y,
  assetPrice,
  change,
  pnl
}) => {
  return (
    <div
      style={{
        left: (x - 235) > 70 
          ? (x - 90)
          : (x + 10),
        bottom: y - 43,
      }}
      className={twJoin(
        "flex flex-col justify-center items-center",
        "absolute",
        "w-[81px] h-[48px]",
        "bg-[#262626] bg-opacity-60 backdrop-blur-[2px]",
        "p-[8px]",
        "border-[1px] rounded-[3px] border-[rgba(254,254,254,0.1)] shadow-[0px 2px 6px rgba(0,0,0,0.12)]",
      )}
    >
      <span className="text-[11px] text-gray8b">Price at Exp.</span>
      <span className="text-[13px] font-semibold mr-[4px]">{formatNumber(assetPrice, 0, true)}</span>
    </div>
  );
};

export default CanvasDetail;
