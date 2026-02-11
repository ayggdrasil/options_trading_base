import { useContext, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { ModalContext } from "./ModalContext";
import { useAccount } from "wagmi";
import { addressToReferralID } from "@/utils/encoding";
import { copyToClipboard } from "@/utils/helper";
import Button from "./Button";

import IconClose from "@assets/img/icon/close.png";

type Props = {};

const Dot = () => {
  return (
    <div className="w-[16px] min-w-[16px] h-full flex flex-row items-center justify-center mt-[6px]">
      <div className="w-[5px] h-[5px] rounded-full bg-graybfbf" />
    </div>
  );
};

const ReferralPopup = ({}: Props) => {
  const { closeModal } = useContext(ModalContext);
  const { address } = useAccount();
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  const referralId = address ? addressToReferralID(address) : "";
  const referralLink = `${window.location.protocol}//${window.location.host}/?r=${referralId}`;

  const handleCopyLink = () => {
    if (isCopied) return;
    copyToClipboard(referralLink as string);
    setIsCopied(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsCopied(false);
      timerRef.current = null;
    }, 3000);
  };

  return (
    <div
      className={twJoin(
        "relative",
        "w-[368px] h-fit p-[24px] bg-black181a rounded-[10px]",
        "flex flex-col items-start gap-[24px]",
        "border-[1px] border-solid border-black2023",
        "shadow-[0px_6px_36px_0px_rgba(0,0,0,0.2)]"
      )}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Header with title and close button */}
      <div className="w-full h-[32px] flex flex-row items-center justify-between">
        <p className="h-full text-blue278e text-[20px] font-[700] leading-[32px]">
          Referral
        </p>
        <img
          className="cursor-pointer w-[32px] h-[32px]"
          src={IconClose}
          onClick={closeModal}
          alt="Close"
        />
      </div>

      {/* Referral benefits */}
      <div className="w-full flex flex-col items-start gap-[12px]">
        {/* Description */}
        <div className="w-full flex flex-col gap-[6px]">
          <div className="flex flex-row items-start gap-[6px]">
            <Dot />
            <p className="text-[14px] text-graybfbf font-[400] leading-[18px]">
              Earn up to 30% fee rebates and bonus points based on your tier.
            </p>
          </div>
          <div className="flex flex-row items-start gap-[6px]">
            <Dot />
            <p className="text-[14px] text-graybfbf font-[400] leading-[18px]">
              Earn bonus for up to friends' friends.
            </p>
          </div>
          <div className="flex flex-row items-start gap-[6px]">
            <Dot />
            <p className="text-[14px] text-graybfbf font-[400] leading-[18px]">
              Recruit more friends to earn extra points to maximize rewards!
            </p>
          </div>
        </div>

        {/* Image area */}
        <img
          className="w-[320px] h-[200px] object-contain"
          src={""}
          alt="Referral guide"
        />

        {/* Divider */}
        <div className="w-full h-[1px] my-[6px] bg-black2023" />

        {/* Referral link and Copy button */}
        <div
          className={twJoin(
            "w-full h-[44px] flex flex-row items-center justify-between gap-[12px]",
            "bg-black181a rounded-[6px] p-[8px] pl-[18px]",
            "border-[1px] border-solid border-blue278e"
          )}
        >
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            <p className="h-full text-[14px] text-gray8c8c font-[500] leading-[28px] whitespace-nowrap">
              {referralLink}
            </p>
          </div>
          <Button
            className={twJoin(
              "h-[28px] w-[84px] px-[12px] py-[7px] text-[13px] flex-shrink-0",
              isCopied && "text-blue278e"
            )}
            name={isCopied ? "Copied!" : "Copy Link"}
            color="blue"
            disabled={isCopied}
            onClick={handleCopyLink}
          />
        </div>
      </div>
    </div>
  );
};

export default ReferralPopup;
