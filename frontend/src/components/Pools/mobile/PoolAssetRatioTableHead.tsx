import { twJoin } from "tailwind-merge";

const PoolAssetRatioTableHead: React.FC = () => {
  return (
    <div className="flex flex-col mt-3">
      <div
        className={twJoin(
          "flex-shrink-0 h-[1px] w-full opacity-10",
          "bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"
        )}
      ></div>
      <div className={twJoin("flex flex-row justify-between py-3")}>
        <p
          className={twJoin(
            "font-medium text-gray9D",
            "text-[12px] leading-[14px] md:text-[14px]"
          )}
        >
          Current/Target Weight
        </p>
        <div className="flex flex-row gap-x-6">
          <p
            className={twJoin(
              "font-medium text-gray9D",
              "text-[12px] leading-[14px] md:text-[14px]"
            )}
          >
            Pool
          </p>
          <p
            className={twJoin(
              "font-medium text-gray9D",
              "text-[12px] leading-[14px] md:text-[14px]"
            )}
          >
            Fee
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

export default PoolAssetRatioTableHead;
