import React from "react";
import { twJoin, twMerge } from "tailwind-merge";

type Item = {
  value: string;
  label: string;
  textColor: string;
  hoverColor: string;
};

type ToggleButtonProps = {
  id: string;
  buttonSize: string;
  buttonShape: string;
  items: Item[];
  selectedItem: string;
  setSelectedItem: (value: any) => void;
  firstItemSelectedImgSrc?: string;
  firstItemNotSelectedImgSrc?: string;
  secondItemSelectedImgSrc?: string;
  secondItemNotSelectedImgSrc?: string;
  className?: string;
  imgClassName?: string;
};

const buttonSizes: { [key: string]: string } = {
  stretch: "w-full h-full",
  large: "w-[264px] h-[44px]",
  medium: "w-[156px] h-[44px]",
  small: "w-[155px] h-[34px]",
};

const buttonShapes: { [key: string]: string } = {
  square: "rounded-[6px]",
  round: "rounded-[16px]",
};

const ToggleButton: React.FC<ToggleButtonProps> = ({
  id,
  buttonSize,
  buttonShape,
  items,
  selectedItem,
  setSelectedItem,
  firstItemSelectedImgSrc,
  firstItemNotSelectedImgSrc,
  secondItemSelectedImgSrc,
  secondItemNotSelectedImgSrc,
  className,
  imgClassName,
}) => { 
  const sizeClass = buttonSizes[buttonSize];
  const shapeClass = buttonShapes[buttonShape];

  return (
    <div
      className={twMerge(
        twJoin(
          "flex gap-[4px]",
          "text-gray8c8c text-[14px] font-[600] leading-[24px]",
          sizeClass,
          shapeClass
        ),
        className
      )}
    >
      <div
        className={twJoin(
          `group cursor-pointer flex-1 flex justify-center items-center ${shapeClass} ${items[0].hoverColor}`,
          `${selectedItem === items[0].value && "!text-[#121417] !font-[700] !bg-green71b8"}`,
          "active:opacity-80 active:scale-95"
        )}
        onClick={() => setSelectedItem(items[0].value)}
      >
        <label className="cursor-pointer" htmlFor={items[0].value}>{items[0].label}</label>
        {selectedItem === items[0].value && (
          <img className={imgClassName} src={firstItemSelectedImgSrc} />
        )}
        {selectedItem !== items[0].value && (
          <>
            <img
              className={twJoin("hidden group-hover:block", imgClassName)}
              src={firstItemSelectedImgSrc}
            />
            <img
              className={twJoin("block group-hover:hidden", imgClassName)}
              src={firstItemNotSelectedImgSrc}
            />
          </>
        )}
      </div>

      <div
        className={twJoin(
          `group cursor-pointer flex-1 flex justify-center items-center ${shapeClass} ${items[1].hoverColor}`,
          `${selectedItem === items[1].value && "!text-[#121417] !font-[700] !bg-rede04a"}`,
          "active:opacity-80 active:scale-95"
        )}
        onClick={() => setSelectedItem(items[1].value)}
      >
        <label className="cursor-pointer" htmlFor={items[1].value}>{items[1].label}</label>
        {selectedItem === items[1].value && (
          <img className={imgClassName} src={secondItemSelectedImgSrc} />
        )}
        {selectedItem !== items[1].value && (
          <>
            <img
              className={twJoin("hidden group-hover:block", imgClassName)}
              src={secondItemSelectedImgSrc}
            />
            <img
              className={twJoin("block group-hover:hidden", imgClassName)}
              src={secondItemNotSelectedImgSrc}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ToggleButton;
