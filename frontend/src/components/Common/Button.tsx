import React from 'react'
import { twJoin, twMerge } from 'tailwind-merge'

import IconArrowLeft from "@assets/img/icon/arr-back-on.png";
import IconArrowRight from "@assets/img/icon/arr-next-on.png";

type ButtonProps = {
  name: string | JSX.Element;
  color: string;
  disabled?: boolean;
  isError?: boolean;
  onClick: () => void;
  className?: string;
  isLoading?: boolean;
  isMobile?: boolean;
  arrow?: "left" | "right";
}

const buttonColor: {[key: string]: string} = {
  default: "bg-black2023 text-graybfbf active:scale-95 active:opacity-80",
  blue: "bg-blue278e text-whitef2f2 active:scale-95 active:opacity-80",
  green: "bg-green2f3d text-green71b8 hover:bg-green3747 hover:text-green77c2 active:scale-95 active:opacity-80",
  red: "bg-red422c text-rede04a hover:bg-red4d33 hover:text-redeb4d active:scale-95 active:opacity-80",

  // Legacy colors
  greenc1: "bg-greenc1 text-black12 active:opacity-80 active:scale-95",
  greene6: "bg-greene6 text-black12 active:opacity-80 active:scale-95",
  orangef793: "border border-orangef793 bg-transparent text-orangef793 hover:bg-orangef793 hover:text-black1f active:bg-orangef793 active:opacity-80 active:scale-95",
  transparent: "bg-transparent text-whitee6 hover:bg-black29 active:text-whitee6",
}

const Button: React.FC<ButtonProps> = ({
  name, 
  color, 
  disabled = false, 
  isError = false, 
  onClick,
  className = "",
  isLoading,
  isMobile,
  arrow,
}) => {
  const colorClass = isError
    ? isMobile
      ? "cursor-not-allowed bg-black2023 text-red802a"
      : "cursor-not-allowed bg-black2023 text-red802a"
    : disabled
      ? "cursor-not-allowed bg-black2023 text-gray4b50"
      : buttonColor[color];
  
  const handleClick = () => {
    if (!disabled && !isError) {
      onClick();
    }
  };

  const showLeftArrow = arrow === "left";
  const showRightArrow = arrow === "right";

  return (
    <button 
      className={twMerge(
        twJoin(
          "cursor-pointer w-full h-full",
          "rounded-[6px] text-[16px] font-bold",
          "flex items-center justify-center p-[8px]",
          (showLeftArrow || showRightArrow) && "gap-[4px]",
          showLeftArrow && "pr-[16px]",
          showRightArrow && "pl-[16px]",
          `${colorClass}`,
        ),
        className,
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {isLoading ? (
        "..."
      ) : (
        <>
          {showLeftArrow && <img className='w-[24px] h-[24px]' src={IconArrowLeft} alt="arrow left" />}
          <span>{name}</span>
          {showRightArrow && <img className='w-[24px] h-[24px]' src={IconArrowRight} alt="arrow right" />}
        </>
      )}
    </button>
  )
}

export default Button