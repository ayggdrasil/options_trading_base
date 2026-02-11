import React, { useContext } from "react";
import { twJoin } from "tailwind-merge";
import ReferralPopup from "../Common/ReferralPopup";
import { ModalContext } from "../Common/ModalContext";
import WithTooltip from "../Common/WithTooltip";

import IconReferralOn from "@assets/img/icon/referral-on.png";
import IconReferralOff from "@assets/img/icon/referral-off.png";

interface AddReferralButtonProps {
  disabled?: boolean;
  className?: string;
}

const AddReferralButton: React.FC<AddReferralButtonProps> = ({
  disabled = false,
  className,
}) => {
  const { openModal } = useContext(ModalContext);

  const handleClick = () => {
    if (disabled) return;
    openModal(<ReferralPopup />, {});
  };

  const buttonContent = (
    <img
      className={twJoin(
        "h-[40px] w-[40px] min-w-[40px] flex flex-row justify-center items-center p-[8px]",
        "rounded-[6px]",
        disabled
          ? "bg-black181a cursor-not-allowed"
          : "bg-black2023 cursor-pointer active:opacity-80 active:scale-95`",
        className
      )}
      src={disabled ? IconReferralOff : IconReferralOn}
      onClick={handleClick}
      alt="Referral"
    />
  );

  return (
    <>
      {disabled ? (
        <WithTooltip
          tooltipContent={
            <p className="text-graybfbf whitespace-nowrap">Coming soon</p>
          }
          tooltipClassName="w-max"
        >
          {buttonContent}
        </WithTooltip>
      ) : (
        buttonContent
      )}
    </>
  );
};

export default AddReferralButton;
