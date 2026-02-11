import React, { useContext } from "react";
import { twJoin } from "tailwind-merge";
import GuidePopup from "./GuidePopup";
import { ModalContext } from "./ModalContext";
import IconGuide from "@assets/img/icon/guidebook.png";

interface GuideButtonProps {
  className?: string;
  showText?: boolean;
}

const GuideButton: React.FC<GuideButtonProps> = ({
  className,
  showText = false,
}) => {
  const { openModal } = useContext(ModalContext);

  const handleClick = () => {
    return
    openModal(<GuidePopup />, {});
  };

  if (showText) {
    return (
      <button
        className={twJoin(
          // "cursor-pointer",
          "h-[40px] flex flex-row justify-center items-center gap-[8px] px-[12px]",
          "rounded-[6px] bg-black2023",
          // "active:opacity-80 active:scale-95",
          "cursor-not-allowed opacity-30",
          className
        )}
        onClick={handleClick}
      >
        <img src={IconGuide} alt="Guide" className="h-[24px] w-[24px]" />
        <span className="text-graybfbf text-[14px] font-[600] leading-[24px]">
          Simple Guide
        </span>
      </button>
    );
  }

  return (
    <img
      className={twJoin(
        // "cursor-pointer",
        "h-[40px] w-[40px] flex flex-row justify-center items-center p-[8px]",
        "rounded-[6px] bg-black2023",
        // "active:opacity-80 active:scale-95",
        "cursor-not-allowed opacity-30",
        className
      )}
      src={IconGuide}
      onClick={handleClick}
      alt="Guide"
    />
  );
};

export default GuideButton;
