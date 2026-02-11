import React, {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import BigNumber from "bignumber.js";
import { toPng } from "html-to-image";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { ModalContext } from "../ModalContext";
import { addressToReferralID } from "@/utils/encoding";
import SharePositionConcept from "./SharePositionConceptSelectForMobile";
import CheckboxForMobile from "./CheckboxForMobile";
import SharePositionImageForMobile, { SharePositionDataForMobile } from "./SharePositionImageForMobile";
import { ShareIcon } from "@/assets/mobile/icon/ShareIcon";
import { CopyIcon } from "@/assets/mobile/icon";
import IconSharePositionX from "@/assets/icon-share-position-x.svg";
import IconSharePositionDownload from "@/assets/icon-share-position-download.svg";
import { CardConcept } from "../SharePosition.constant";
import { isSpreadStrategy } from "@callput/shared";


BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface SharePositionButtonProps {
  sharedPositionData: SharePositionDataForMobile;
  classNames?: string;
  classNamesTitle?: string;
  classNamesIcon?: string;
  title?: string;
}

interface SharePositionProps {
  sharedPositionData: SharePositionDataForMobile;
  closeModal: () => void;
}

const SharePositionButtonForMobile: React.FC<SharePositionButtonProps> = ({
  sharedPositionData,
  classNames = "",
  classNamesTitle = "",
  classNamesIcon = "text-gray80",
  title,
}) => {
  const { openModal, closeModal } = useContext(ModalContext);

  return (
    <button
      className={`flex flex-row justify-center items-center w-[26px] h-[26px] bg-black29 rounded-[16px] ${classNames} `}
      onClick={() =>
        openModal(
          <SharePosition
            sharedPositionData={sharedPositionData}
            closeModal={closeModal}
          />,
          {
            modalClassName: [
              "backdrop-blur-none",
              "bg-[#121212] bg-opacity-80",
            ],
            contentClassName: "flex flex-col min-h-[150px]",
          }
        )
      }
    >
      <ShareIcon className={classNamesIcon} size={24} />
      {title && <p className={classNamesTitle}>{title}</p>}
    </button>
  );
};

const SharePosition: React.FC<SharePositionProps> = ({
  sharedPositionData,
}) => {
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
  }, [address]);

  const handleTweet = async () => {
    console.log("click tweet...");

    if (!imageRef.current) return;

    try {
      const dataUrl = await toPng(imageRef.current, {
        quality: 1,
        pixelRatio: 4,
        skipFonts: true,
      });
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      const tweetContent = `Join @Moby_trade and enjoy the benefits of lower fees: ${window.location.protocol}//${window.location.host}/?r=${referralId}`;
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        tweetContent
      )}`;
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
        sharedPositionData.mainOptionName +
        (isSpreadStrategy(sharedPositionData.strategy) ? "-spread" : "") +
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

    try {
      const dataUrl = await toPng(imageRef.current, {
        quality: 1,
        pixelRatio: 4,
        skipFonts: true,
      });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2 * 1000); // Reset the copied status after 2 seconds
    } catch (error) {
      console.error("Failed to copy the image:", error);
    }
  };

  return (
    <div
      className={twJoin("px-3 md:px-6 max-h-[75vh] overflow-auto")}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-row justify-center items-center w-full">
        <p className="text-xl md:text-2xl text-greene6 font-bold">
          Share Position
        </p>
      </div>
      <div>
        <div className="w-full h-[1px] bg-text opacity-10 my-5"></div>
        <div className="flex flex-col justify-center items-center gap-5 w-full">
          <SharePositionConcept
            roi={sharedPositionData.roi}
            cardConcept={cardConcept}
            setCardConcept={setCardConcept}
          />
          <div className="w-fit" ref={imageRef}>
            <SharePositionImageForMobile
              sharedPositionData={sharedPositionData}
              cardConcept={cardConcept}
              isIncludePnl={isIncludePnl}
            />
          </div>
        </div>

        <div className="flex justify-center mt-3">
          <div className="flex flex-row items-center justify-end w-full max-w-[400px] h-[18px]">
            {renderCheckbox(isIncludePnl, setIsIncludePnl)}
          </div>
        </div>
        <div className="w-full h-[1px] bg-text opacity-10 my-5"></div>
        <div className="flex flex-row justify-center gap-[16px] w-full mt-3">
          {renderButtons(
            handleTweet,
            handleDownload,
            handleCopy,
            isDownloading,
            isCopied
          )}
        </div>
        <div className="flex w-full justify-center">
          <div className="flex flex-col gap-3 w-full max-w-[400px] p-3 md:p-6 mt-5 rounded-lg bg-[#111613B2]">
            <p className="text-sm md:text-base text-greene6 font-bold">
              Tweet Instructions
            </p>
            <p className="text-sm md:text-base font-medium">
              Clicking the tweet button will open Twitter
              <span className="text-[12px] px-[8px]">➔</span> Press Ctrl + V to
              paste your position card
            </p>
          </div>
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
      <CheckboxForMobile
        onClick={() => {
          setIsIncludePnl(!isIncludePnl);
        }}
        isChecked={isIncludePnl}
        text="Include P&L"
      />
    </label>
  );
};

const renderButtons = (
  handleTweet: () => void,
  handleDownload: () => void,
  handleCopy: () => void,
  isDownloading: boolean,
  isCopied: boolean
) => {
  return (
    <div className="flex justify-between w-full max-w-[400px] px-10">
      <div>
        <div className="flex justify-center items-center w-[54px] h-[54px] rounded-xl border-[0.8px] border-[#203728]">
          <button
            onClick={handleTweet}
            className="flex flex-row justify-center items-center gap-[8px] py-[10px] rounded-xl border-[0.27px] border-greene6 h-[48.5px] w-[48.5px]"
          >
            <img className="w-[24px]" src={IconSharePositionX} />
          </button>
        </div>
        <p className="text-[10px] md:text-[12px] text-center leading-[15px] text-gray9D font-medium mt-2">
          Tweet
        </p>
      </div>
      <div>
        <div className="flex justify-center items-center w-[54px] h-[54px] rounded-xl border-[0.8px] border-[#203728]">
          <button
            onClick={handleDownload}
            className={twJoin(
              "flex flex-row justify-center items-center gap-[8px] py-[10px] rounded-xl border-[0.27px] border-greene6 h-[48.5px] w-[48.5px]"
            )}
          >
            {isDownloading ? (
              <p className="text-[15px] text-greenc1 font-bold">...</p>
            ) : (
              <img className="w-[28px]" src={IconSharePositionDownload} />
            )}
          </button>
        </div>
        <p className="text-[10px] md:text-[12px] text-center leading-[15px] text-gray9D font-medium mt-2">
          Download
        </p>
      </div>
      <div>
        <div className="flex justify-center items-center w-[54px] h-[54px] rounded-xl border-[0.8px] border-[#203728]">
          <button
            onClick={handleCopy}
            className={twJoin(
              "flex flex-row justify-center items-center gap-[8px] py-[10px] rounded-xl border-[0.27px] border-greene6 h-[48.5px] w-[48.5px]"
            )}
          >
            <CopyIcon className="text-greene6" size={24} />
          </button>
        </div>
        <p className="text-[10px] md:text-[12px] text-center leading-[15px] text-gray9D font-medium mt-2">
          {isCopied ? "Copied to Clipboard" : "Copy"}
        </p>
      </div>
    </div>
  );
};

export default SharePositionButtonForMobile;
