import React, { useContext } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'
import { ModalContext } from '../Common/ModalContext'

import IconCloseGreen from "@assets/icon-close-green.svg";
import IconCopyAddressBlack from "@assets/icon-copy-address-black.svg";
import IconSocialTwitterBlack from "@assets/icon-social-twitter-black.svg";
import ReferralLinkGuideImage from "@assets/points/referral-link-guide-image.png"
import { copyToClipboard } from '@/utils/helper';
import { addToastMessage } from '@/utils/toast';

type Props = {
  referralId: string
}

const ReferralShare = ({ referralId }: Props) => {
  const { closeModal } = useContext(ModalContext)

  return (
    <div 
      className={twJoin(
        // "absolute right-0 top-[52px]",
        "flex flex-col w-fit min-w-[540px] h-fit min-h-[252px] px-[23px] py-[27px] bg-black1f rounded-[3px] border-[1px] border-black29"
      )}
      onClick={(e) => { e.stopPropagation()}}
    >
      <div className="flex flex-row items-center justify-between h-[24px]">
        <p className="text-[18px] text-greenc1 font-bold">Your Referral Link</p>
        <img className="cursor-pointer w-[24px] h-[24px]" src={IconCloseGreen} onClick={() => closeModal()} />
      </div>
      <div className="flex flex-col justify-between mt-[12px] text-[15px] font-normal text-[#b8b8b8] leading-[1.2rem]">
        <div className="flex flex-row items-start w-full gap-[6px]">
          <div className="flex flex-row items-center justify-center w-[22px] h-[22px]">
            <div className="w-[5px] h-[5px] rounded-full bg-[#999999]" />
          </div>
          <p className="text-[14px] text-[#999999] font-semibold">Earn up to 30% fee rebates and bonus points based on your tier.</p>
        </div>
        <div className="flex flex-row items-start w-full gap-[6px]">
          <div className="flex flex-row items-center justify-center w-[22px] h-[22px]">
            <div className="w-[5px] h-[5px] rounded-full bg-[#999999]" />
          </div>
          <p className="text-[14px] text-[#999999] font-semibold">Earn bonus for up to Referred² Whales.</p>
        </div>
        <div className="flex flex-row items-start w-full gap-[6px]">
          <div className="flex flex-row items-center justify-center w-[22px] h-[22px]">
            <div className="w-[5px] h-[5px] rounded-full bg-[#999999]" />
          </div>
          <p className="text-[14px] text-[#999999] font-semibold">How to earn extra points for maximize rewards? Recruit more Whales!</p>
        </div>
        <div
          className={twJoin(
            "w-full",
            "flex items-center justify-center",
            "bg-black1a",
            "rounded-[6px]",
            "py-[32px] px-[46px]",
            "mt-[16px]",
          )}
        >
          <img className="w-[492px]" src={ReferralLinkGuideImage} />
        </div>
      </div>
      <div className="flex flex-col gap-[12px] px-[16px] py-[16px] mt-[16px] bg-black29 rounded-[3px] text-[#b8b8b8]">
        <p className="text-[14px] text-gray52 font-semibold">{window.location.protocol}//{window.location.host}/?r=<span className="text-[14px] text-[#F5F5F5] font-semibold">{referralId}</span></p>
      </div>

      <div className="flex flex-row gap-[16px]">
        <button
          className={twJoin(
            "cursor-pointer flex-1 flex flex-row items-center justify-center gap-[8px]",
            "w-full h-[48px] mt-[24px] bg-greenc1 text-[16px] text-black12 font-bold rounded-[4px] whitespace-nowrap",
            "active:scale-95 active:opacity-50"
          )}
          type="submit"
          onClick={() => {
            copyToClipboard(`${window.location.protocol}//${window.location.host}/?r=${referralId}` as string);
            closeModal()
            // setIsReferralsOpen(!isReferralsOpen);
            addToastMessage({
              id: "referral-copied",
              type: "success",
              title: "Your referral link copied to clipboard.",
              message: "",
              duration: 3 * 1000
            })
          }}
        >
          <img className="w-[28px]" src={IconCopyAddressBlack} />
          <p>Copy Link</p>
        </button>
        <button
          className={twJoin(
            "cursor-pointer flex-1 flex flex-row items-center justify-center gap-[8px]",
            "w-full h-[48px] mt-[24px] bg-greenc1 text-[16px] text-black12 font-bold rounded-[4px] whitespace-nowrap",
            "active:scale-95 active:opacity-50"
          )}
          type="submit"
          onClick={() => {
            const tweetContent = `Trade on @Moby_trade with revolutionized options trading experience using my code and enjoy the benefits of lower fees🐋

Join: ${window.location.protocol}//${window.location.host}/?r=${referralId}`;

            const handleTweet = () => {
              const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetContent)}`;
              window.open(tweetUrl, '_blank');
            }

            handleTweet();
            closeModal()
          }}
        >
          <img className="w-[28px]" src={IconSocialTwitterBlack} />
          <p>Tweet Link</p>
        </button>
      </div>
    </div>
  )
}

export default ReferralShare