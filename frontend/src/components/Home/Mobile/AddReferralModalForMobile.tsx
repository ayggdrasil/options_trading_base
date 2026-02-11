import { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { copyToClipboard } from "@/utils/helper";

import ReferralLinkGuideImage from "@assets/points/referral-link-guide-image.png";
import IconSocialTwitterBlackMobile from "@assets/mobile/icon-social-twitter-black-mobile.svg";
import IconCopyAddressBlackMobile from "@assets/mobile/icon-copy-address-black-mobile.svg";
import IconCopiedRoundMobile from "@assets/mobile/icon-copied-round-mobile.svg";

interface LinkButtonProps {
  label: string;
  icon: string;
  onClick: () => void;
}

const LinkButton: React.FC<LinkButtonProps> = ({ label, icon, onClick }) => {
  return (
    <button
      className={twJoin(
        "flex-1 flex items-center justify-center gap-x-2",
        "p-[10px] rounded backdrop-blur-[10px] bg-greene6"
      )}
      onClick={onClick}
    >
      <img className="w-5" src={icon} />
      <p className="text-[14px] md:text-[16px] leading-[20px] font-bold text-[#0a120d]">
        {label}
      </p>
    </button>
  );
};

interface AddReferralModalProps {
  referralId: string;
}

const modalContents = [
  "Earn up to 30% fee rebates and bonus points based on your tier.",
  "Earn bonus for up to Referred² Whales.",
  "How to earn extra points for maximize rewards? Recruit more Whales!",
];

const AddReferralModalForMobile: React.FC<AddReferralModalProps> = ({
  referralId,
}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCopyLink = () => {
    copyToClipboard(
      `${window.location.protocol}//${window.location.host}/?r=${referralId}`
    );

    setIsCopied(true);
  };

  const handleTweet = () => {
    const tweetContent = `Trade on @Moby_trade with revolutionized options trading experience using my code and enjoy the benefits of lower fees🐋 
    
Join: ${window.location.protocol}//${window.location.host}/?r=${referralId}`;

    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      tweetContent
    )}`;

    window.open(tweetUrl, "_blank");
  };

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsCopied(false);
    }, 1500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isCopied]);

  return (
    <div className="relative flex-1 flex flex-col w-full px-3 md:px-6 overflow-auto">
      {/* Title */}
      <p className="text-[20px] md:text-[22px] leading-[24px] font-bold text-center mb-4 text-greene6">
        Your Referral Link
      </p>
      {/* Content */}
      <div className="pt-2 flex-1 overflow-auto">
        {/* Description */}
        <div className="flex flex-col gap-y-[10px] py-4 px-2 mb-6 rounded-lg bg-[rgba(17,22,19,0.85)]">
          {modalContents.map((content) => {
            return (
              <div className="flex gap-2">
                <div
                  className={twJoin(
                    "flex-shrink-0",
                    "w-1 h-1 mt-[9px] rounded-full",
                    "bg-whitef0"
                  )}
                />
                <p className="text-[14px] md:text-[16px] leading-[21px] font-medium text-whitef0">
                  {content}
                </p>
              </div>
            );
          })}
        </div>

        {/* Image */}
        <div
          className={twJoin(
            "relative p-6 mb-3 rounded-lg",
            "bg-[rgba(17,22,19,0.7)]"
          )}
        >
          <img className="relative z-[2] w-full" src={ReferralLinkGuideImage} />
          <div
            className={twJoin(
              "absolute z-[1] top-0 left-0 w-full h-full rounded-lg",
              "backdrop-blur-[30px] bg-[linear-gradient(149.27deg,_rgba(17,22,19,0.85)_3.25%,_rgba(3,11,6,0.85)_81.41%)]"
            )}
          />
        </div>

        {/* Link */}
        <div className="px-3 py-4 rounded-lg bg-[rgba(17,22,19,0.85)]">
          <p className="text-[14px] md:text-[16px] leading-[21px] font-normal">
            <span className="text-gray9D">
              {window.location.protocol}//{window.location.host}/?r=
            </span>
            <span className="text-whitef0">{referralId}</span>
          </p>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="flex gap-x-3 pt-6">
        <LinkButton
          label="Copy Link"
          icon={IconCopyAddressBlackMobile}
          onClick={handleCopyLink}
        />
        <LinkButton
          label="Tweet Link"
          icon={IconSocialTwitterBlackMobile}
          onClick={handleTweet}
        />
      </div>

      {/* Copied toast */}
      <div
        className={twJoin(
          "absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[calc(100%-24px)] max-w-[224px] pt-4 pb-6 px-10 md:px-6 rounded-lg",
          "shadow-[0_0_6px_1px_rgb(230,252,141,0.2)] bg-[#030a06]",
          "transition-all duration-300",
          isCopied ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <img className="w-[38px] mb-2 mx-auto" src={IconCopiedRoundMobile} />
        <p className="text-[14px] md:text-[16px] leading-[21px] font-semibold text-center text-whitef0">
          Your referral link copied to clipboard.
        </p>
      </div>
    </div>
  );
};

export default AddReferralModalForMobile;
