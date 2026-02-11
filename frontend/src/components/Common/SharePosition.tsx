import React, { ReactElement, useContext, useEffect, useRef, useState } from "react";
import BigNumber from "bignumber.js";
import { toPng } from 'html-to-image';
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import SharePositionConcept from "./SharePositionConceptSelect";
import SharePositionImage, { SharePositionData } from "./SharePositionImage";
import { addressToReferralID } from "@/utils/encoding";
import IconCloseGreen from "../../assets/icon-close-green.svg"
import IconChecked from "../../assets/icon-checked.svg"
import IconUnchecked from "../../assets/icon-unchecked.svg"
import IconSharePositionX from "../../assets/icon-share-position-x.svg"
import IconSharePositionDownload from "../../assets/icon-share-position-download.svg"
import IconSharePositionCopy from "../../assets/icon-share-position-copy.svg"
import IconShare from "@/assets/icon-share.svg";
import { ModalContext } from "./ModalContext";
import { CardConcept } from "./SharePosition.constant";
import { isSpreadStrategy } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface SharePositionButtonProps {
  sharedPositionData: SharePositionData;
}

interface SharePositionProps {
  sharedPositionData: SharePositionData;
  closeModal: () => void;
}

const SharePositionButton: React.FC<SharePositionButtonProps> = ({ sharedPositionData }) => {
  const { openModal, closeModal } = useContext(ModalContext);

  return (
    <button
      className="flex flex-row justify-center items-center w-[26px] h-[26px] bg-black29 rounded-[16px]"
      onClick={() => openModal((
          <SharePosition
            sharedPositionData={sharedPositionData}
            closeModal={closeModal}
          />
        ),
        {
          modalClassName: [
            "backdrop-blur-none",
            "bg-[#121212] bg-opacity-80",
          ]
        }
      )}
    >
      <img className="w-[24px]" src={IconShare} />
    </button>
  )
}

const SharePosition: React.FC<SharePositionProps> = ({ sharedPositionData, closeModal }) => {
  const imageRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();
  
  const [referralId, setReferralId] = useState<string>("");
  const [cardConcept, setCardConcept] = useState<CardConcept>(CardConcept.Pepe);
  const [isIncludePnl, setIsIncludePnl] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (address) {
      const encoded = addressToReferralID(address);
      setReferralId(encoded);
    }
  }, [address])

  const handleTweet = async () => {
    if (!imageRef.current) return;

    try {
      const dataUrl = await toPng(imageRef.current, {
        quality: 1,
        pixelRatio: 4,
      });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);

      const tweetContent = `Join @Moby_trade and enjoy the benefits of lower fees: ${window.location.protocol}//${window.location.host}/?r=${referralId}`;
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetContent)}`;
      window.open(tweetUrl, '_blank');
    } catch (error) {
      console.error('Failed to tweet the image:', error);
    }
  };

  const handleDownload = async () => {
    if (!imageRef.current) return;
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      const dataUrl = await toPng(imageRef.current, {
        quality: 1,
        pixelRatio: 4,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = sharedPositionData.mainOptionName + (isSpreadStrategy(sharedPositionData.strategy) ? "-spread" : "") + ".png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);  
    } catch (error) {
      console.error('Failed to download the image:', error);
    }

    setIsDownloading(false);
  };

  const handleCopy = async () => {
    if (!imageRef.current) return;
    if (isCopied) return;

    try {
      const dataUrl = await toPng(imageRef.current, {
        quality: 1,
        pixelRatio: 4,
      });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);

      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2 * 1000);  // Reset the copied status after 2 seconds
    } catch (error) {
      console.error('Failed to copy the image:', error);
    }
  };

  return (
    <div
      className={twJoin(
        "w-[580px] h-[696px] bg-black1f rounded-[3px]",
        "border-[1px] border-black29 shadow-[0px_0px_24px_0px_rgba(10,10,10,0.75)]",
        "px-[24px] py-[28px]"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-row justify-between items-center w-full h-[24px]">
        <p className="text-[18px] text-greenc1 font-bold">Share Position</p>
        <img
          className="w-[24px] cursor-pointer"
          onClick={closeModal}
          src={IconCloseGreen}
        />
      </div>

      <div className="flex flex-row gap-[16px] w-full h-[380px] mt-[36px]">
        <SharePositionConcept
          roi={sharedPositionData.roi}
          cardConcept={cardConcept}
          setCardConcept={setCardConcept}
        />
        <div className="w-full" ref={imageRef}>
          <SharePositionImage 
            sharedPositionData={sharedPositionData}
            cardConcept={cardConcept}
            isIncludePnl={isIncludePnl}
          />
        </div>
      </div>

      <div className="flex flex-row items-center justify-end w-full h-[18px] mt-[27px]">
        {renderCheckbox(isIncludePnl, setIsIncludePnl)}
      </div>
      
      <div className="flex flex-row justify-between gap-[16px] w-full h-[48px] mt-[31px]">
        {renderButtons(handleTweet, handleDownload, handleCopy, isDownloading, isCopied)}
      </div>

      <div className="flex flex-row items-center w-full h-[64px] px-[16px] mt-[16px] rounded-[3px] border-[1px] border-[#333]">
        <div>
          <p className="text-[12px] text-[#1d98f0] font-semibold">Tweet Instructions</p>
          <p className="text-[12px] font-semibold">Clicking the tweet button will open Twitter<span className="text-[10px] px-[8px]">➔</span> Press Ctrl + V to paste your position card</p>
        </div>
      </div>
    </div>
  );
}

const renderCheckbox = (isIncludePnl: boolean, setIsIncludePnl: React.Dispatch<React.SetStateAction<boolean>>) => {
  return (
    <label className="cursor-pointer flex flex-row items-center gap-[11px]">
      <input
        type="checkbox"
        checked={isIncludePnl}
        onChange={() => setIsIncludePnl(!isIncludePnl)}
        className="hidden"
      />
      <img className="w-[18px]" src={isIncludePnl ? IconChecked : IconUnchecked} />
      <p className="text-[14px] text-[#999999] font-semibold">Include P&L</p>
    </label>
  );
}

const renderButtons = (handleTweet: () => void, handleDownload: () => void, handleCopy: () => void, isDownloading: boolean, isCopied: boolean) => {
  return (
    <>
      <button
        onClick={handleTweet}
        className="flex flex-row justify-center items-center gap-[8px] w-[167px] py-[10px] bg-black33 rounded-[3px]"
      >
        <img className="w-[28px]" src={IconSharePositionX} />
        <p className="text-[15px] text-greenc1 font-bold">Tweet</p>
      </button>
      <button
        onClick={handleDownload}
        className={twJoin(
          "flex flex-row justify-center items-center gap-[8px] w-[167px] py-[10px] bg-black33 rounded-[3px]",
          isDownloading && "cursor-not-allowed"
        )}
      >
        {isDownloading
          ? <p className="text-[15px] text-greenc1 font-bold">...</p>
          : <>
              <img className="w-[28px]" src={IconSharePositionDownload} />
              <p className="text-[15px] text-greenc1 font-bold">Download</p>
            </>
        }
      </button>
      <button
        onClick={handleCopy}
        className={twJoin(
          "flex flex-row justify-center items-center gap-[12px] w-[167px] py-[10px] bg-black33 rounded-[3px]",
          isCopied && "cursor-not-allowed"
        )}
      >
        {isCopied 
          ? <p className={twJoin(
              "flex flex-row justify-center items-center w-[128px] h-[27px] rounded-[4px]",
              "bg-black1f border-[1px] border-[rgba(224,224,224,0.1)] shadow-[0px_0px_8px_0px_rgba(10,10,10,0.75)]",
              "text-[12px] text-greenc1 font-normal"
            )}>Copied to Clipboard</p>
          : <>
              <img className="w-[13px]" src={IconSharePositionCopy} />
              <p className="text-[15px] text-greenc1 font-bold">Copy</p>
            </>
        }
      </button>
    </>
  );
}

export default SharePositionButton