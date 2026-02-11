import React from "react";
import { twJoin } from "tailwind-merge";

const PoolsHeaderDescription: React.FC = () => {
  return (
    <div
      className={twJoin(
        "w-[773px] h-full flex flex-col gap-[12px] px-[40px] py-[32px]"
      )}
    >
      <p
        className={twJoin(
          "h-[48px] text-whitef2f2 text-[32px] font-[700] leading-[48px]"
        )}
      >
        Options Liquidity Pool
      </p>
      <p
        className={twJoin(
          "text-graybfbf text-[16px] font-[400] leading-[22px]"
        )}
      >
        This LP provides options liquidity and earns from price difference,
        P&L, and incentives.
      </p>
    </div>
  );
};

export default PoolsHeaderDescription;

