import React from "react";
import { twJoin, twMerge } from "tailwind-merge";

type Props = {
  items: any[];
  className?: string;
};

const Selector: React.FC<Props> = ({ items, className }) => {
  return (
    <div
      className={twMerge(
        twJoin("flex items-center gap-[4px]", "w-fit h-[30px]"),
        className
      )}
    >
      {items.map(({ value, onClick, isActive }) => {
        return (
          <div
            key={value}
            className={twJoin(
              "cursor-pointer flex flex-1 h-[30px] justify-center items-center px-[10px] py-[6px] rounded-[6px]",
              "text-gray8c8c text-[12px] text-center font-[600] leading-[18px]",
              isActive && "!text-blue278e !font-[700] !bg-black2023"
            )}
            onClick={onClick}
          >
            {value}
          </div>
        );
      })}
    </div>
  );
};

export default Selector;
