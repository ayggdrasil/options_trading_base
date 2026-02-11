import React, { useContext, useEffect, useRef, useState } from "react";
import BigNumber from "bignumber.js";
import { toPng } from "html-to-image";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { addressToReferralID } from "@/utils/encoding";
import IconCloseGreen from "../../assets/icon-close-green.svg";
import IconChecked from "../../assets/icon-checked.svg";
import IconUnchecked from "../../assets/icon-unchecked.svg";
import IconSharePositionX from "../../assets/icon-share-position-x.svg";
import IconSharePositionDownload from "../../assets/icon-share-position-download.svg";
import IconSharePositionCopy from "../../assets/icon-share-position-copy.svg";
import { ModalContext } from "../Common/ModalContext";
import { CardConcept } from "@/constants/share";
import ShareConcept from "./ShareConceptSelect";
import ShareImage, { ShareData } from "./ShareImage";

import IconShare from "@/assets/img/icon/share.png";
import IconClose from "@assets/img/icon/close.png";
import IconCheckboxSel from "@assets/img/icon/checkbox-sel.png";
import IconCheckboxUnsel from "@assets/img/icon/checkbox-unsel.png";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface ShareButtonProps {
  shareData: ShareData;
  width?: string;
  height?: string;
}

interface ShareProps {
  shareData: ShareData;
  closeModal: () => void;
}

const ShareButton: React.FC<ShareButtonProps> = ({
  shareData,
  width = "w-[30px]",
  height = "h-[30px]",
}) => {
  const { openModal, closeModal } = useContext(ModalContext);

  return (
    <button
      className={twJoin(
        "cursor-pointer",
        "flex flex-row justify-center items-center",
        "rounded-[6px] border-[1px] border-black2023",
        "hover:bg-black292c active:scale-95 active:opacity-80",
        width,
        height
      )}
      onClick={() =>
        openModal(<Share shareData={shareData} closeModal={closeModal} />, {})
      }
    >
      <img className="w-[24px] h-[24px]" src={IconShare} />
    </button>
  );
};

export default ShareButton;

const Share: React.FC<ShareProps> = ({ shareData, closeModal }) => {
  const imageRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();

  const [referralId, setReferralId] = useState<string>("");
  const [cardConcept, setCardConcept] = useState<CardConcept>(CardConcept.Pepe);
  const [isIncludePnl, setIsIncludePnl] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (address) {
      const encoded = addressToReferralID(address);
      setReferralId(encoded);
    }
  }, [address]);

  const handleTweet = async () => {
    if (!imageRef.current) return;

    try {
      const dataUrl = await toPng(imageRef.current, {
        quality: 1,
        pixelRatio: 4,
      });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      const tweetContent = `Join @CallPutApp and enjoy the benefits of lower fees: ${window.location.protocol}//${window.location.host}/?r=${referralId}`;
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetContent)}`;
      window.open(tweetUrl, "_blank");
    } catch (error) {
      console.error("Failed to tweet the image:", error);
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
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download =
        shareData.instrument +
        (shareData.optionStrategy === "Spread" ? "-spread" : "") +
        ".png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download the image:", error);
    }

    setIsDownloading(false);
  };

  const handleCopy = async () => {
    if (!imageRef.current) return;
    if (isCopied) return;

    setIsCopying(true);

    try {
      const dataUrl = await toPng(imageRef.current, {
        quality: 1,
        pixelRatio: 4,
      });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      setIsCopying(false);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2 * 1000); // Reset the copied status after 2 seconds
    } catch (error) {
      console.error("Failed to copy the image:", error);
      setIsCopying(false);
    }
  };

  return (
    <div
      className={twJoin(
        "w-[580px] h-fit p-[24px] bg-black181a rounded-[10px]",
        "flex flex-col items-start gap-[24px]",
        "border-[1px] border-solid border-black2023",
        "shadow-[0px_6px_36px_0px_rgba(0,0,0,0.2)]"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with title and close button */}
      <div className="w-full h-[32px] flex flex-row items-center justify-between">
        <p className="h-full text-blue278e text-[20px] font-[700] leading-[32px]">
          Share Position
        </p>
        <img
          className="cursor-pointer w-[32px] h-[32px]"
          src={IconClose}
          onClick={closeModal}
          alt="Close"
        />
      </div>

      <div className="w-full h-fit flex flex-row gap-[16px]">
        <ShareConcept
          roi={shareData.roi}
          cardConcept={cardConcept}
          setCardConcept={setCardConcept}
        />
        <div className="w-full" ref={imageRef}>
          <ShareImage
            shareData={shareData}
            cardConcept={cardConcept}
            isIncludePnl={isIncludePnl}
          />
        </div>
      </div>

      <div className="flex flex-row items-center justify-end w-full h-[18px]">
        {renderCheckbox(isIncludePnl, setIsIncludePnl)}
      </div>

      <div className="flex flex-row justify-between gap-[16px] w-full h-[48px]">
        {renderButtons(
          handleTweet,
          handleDownload,
          handleCopy,
          isDownloading,
          isCopying,
          isCopied
        )}
      </div>

      <div
        className={twJoin(
          "flex flex-row items-center w-full h-[64px] px-[16px]",
          "rounded-[4px] border-[1px] border-black292c"
        )}
      >
        <div>
          <p className="text-blue278e text-[12px] font-[700] leading-[24px]">
            Tweet Instructions
          </p>
          <p className="text-whitef2f2 text-[12px] font-[700] leading-[24px]">
            Clicking the tweet button will open Twitter
            <span className="text-[10px] px-[8px]">➔</span> Press Ctrl + V to
            paste your position card
          </p>
        </div>
      </div>
    </div>
  );
};

const renderCheckbox = (
  isIncludePnl: boolean,
  setIsIncludePnl: React.Dispatch<React.SetStateAction<boolean>>
) => {
  return (
    <label className="cursor-pointer flex flex-row items-center gap-[11px]">
      <input
        type="checkbox"
        checked={isIncludePnl}
        onChange={() => setIsIncludePnl(!isIncludePnl)}
        className="hidden"
      />
      <img
        className="w-[18px]"
        src={isIncludePnl ? IconCheckboxSel : IconCheckboxUnsel}
      />
      <p className="text-gray8c8c text-[14px] font-[700] leading-[24px]">
        Include P&L
      </p>
    </label>
  );
};

const renderButtons = (
  handleTweet: () => void,
  handleDownload: () => void,
  handleCopy: () => void,
  isDownloading: boolean,
  isCopying: boolean,
  isCopied: boolean
) => {
  return (
    <>
      <button
        onClick={handleTweet}
        className={twJoin(
          "cursor-pointer",
          "w-[167px] flex flex-row justify-center items-center",
          "py-[10px] bg-blue278e rounded-[6px]",
          "active:scale-95 active:opacity-80"
        )}
      >
        <p className="text-whitef2f2 text-[14px] font-[700] leading-[24px]">
          Tweet
        </p>
      </button>
      <button
        onClick={handleDownload}
        className={twJoin(
          "w-[167px] flex flex-row justify-center items-center",
          "py-[10px] bg-black2023 rounded-[6px]",
          isDownloading
            ? "cursor-not-allowed"
            : "cursor-pointer hover:bg-black292c active:scale-95 active:opacity-80"
        )}
      >
        <p className="text-blue278e text-[14px] font-[700] leading-[24px]">
          {isDownloading ? "..." : "Download"}
        </p>
      </button>
      <button
        onClick={handleCopy}
        className={twJoin(
          "w-[167px] flex flex-row justify-center items-center",
          "py-[10px] bg-black2023 rounded-[6px]",
          isCopying || isCopied
            ? "cursor-not-allowed"
            : "cursor-pointer hover:bg-black292c active:scale-95 active:opacity-80"
        )}
      >
        <p className="text-blue278e text-[14px] font-[700] leading-[24px]">
          {isCopying ? "..." : isCopied ? "Copied!" : "Copy"}
        </p>
      </button>
    </>
  );
};
