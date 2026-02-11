import { useEffect, useState } from "react";
import { advancedFormatNumber, formatReadableDate } from "@/utils/helper";
import { CountdownTimer } from "../Common/CountdownTimer";
import { twJoin } from "tailwind-merge";
import SelectUnderlyingAssetDropDown from "../Trading/SelectUnderlyingAssetDropDown";
import SocialTradingTipsButton from "./SocialTradingTipsButton";
import { UnderlyingAsset } from "@callput/shared";

interface MainTitleProps {
  underlyingAsset: UnderlyingAsset;
  setUnderlyingAsset: (asset: UnderlyingAsset) => void;
  expiry: number;
  futuresIndex: number;
  forbiddenMinMaxPrices: number[];
  hoveredPrice: number;
  estimatedPrice: number;
}

const descriptions = {
  default: "Select your prediction price on the chart below.",
  invalid: "Try farther price range to get product suggestion.",
  disable: "Opening & closing position will resume soon.",
  unavailable: "There is no product to recommend at this moment.",
  waiting: "Calculation in progress..."
}

const subDescriptions = {
  default: "Try to place your mouse above and below the current price, and click to select.",
  invalid: "Try to place your mouse above and below the current price, and click to select.",
  disable: "To ensure OLP's stability, options expiring within 30 minutes cannot be traded.",
  unavailable: "Please check back later if any recommended products appear",
  waiting: "Next round is about to start in few seconds."
}

const MainTitle: React.FC<MainTitleProps> = ({
  underlyingAsset,
  setUnderlyingAsset,
  expiry,
  futuresIndex,
  forbiddenMinMaxPrices,
  hoveredPrice,
  estimatedPrice
}) => {
  const [description, setDescription] = useState<string>(descriptions.default);
  const [descriptionColor, setDescriptionColor] = useState<string>("text-[#E6FC8D]");
  const [subDescription, setSubDescription] = useState<string>(subDescriptions.default);
  const [isAbove, setIsAbove] = useState<boolean | null>(null);

  useEffect(() => {
    if (futuresIndex === 0 || hoveredPrice === 0 || futuresIndex === hoveredPrice) {
      setIsAbove(null);
    }
    setIsAbove(futuresIndex < hoveredPrice);
  }, [futuresIndex, hoveredPrice])

  useEffect(() => {
    const currentTime = Date.now() / 1000;

    if (expiry === 0 || currentTime >= expiry) {
      setDescription(descriptions.waiting);
      setDescriptionColor("text-[#E6FC8D]");
      setSubDescription(subDescriptions.waiting);
      return;
    }

    // 30 minutes before expiry
    if(currentTime >= (expiry - 1800)) {
      setDescription(descriptions.disable);
      setDescriptionColor("text-[#F5731D]");
      setSubDescription(subDescriptions.disable);
      return;
    }

    if (forbiddenMinMaxPrices[0] <= 0 && forbiddenMinMaxPrices[1] >= 999999) {
      setDescription(descriptions.unavailable);
      setDescriptionColor("text-[#F5731D]");
      setSubDescription(subDescriptions.unavailable);
      return;
    }

    if (estimatedPrice > forbiddenMinMaxPrices[0] && estimatedPrice < forbiddenMinMaxPrices[1]) {
      setDescription(descriptions.invalid);
      setDescriptionColor("text-[#F5731D]");
      setSubDescription(subDescriptions.invalid);
      return;
    }

    setDescription(descriptions.default);
    setDescriptionColor("text-[#E6FC8D]");
    setSubDescription(subDescriptions.default);
  }, [forbiddenMinMaxPrices, estimatedPrice])

  const getText = () => {
    if (isAbove === null) return "at";
    return isAbove ? "above" : "below";
  };

  const getTextColorClass = () => {
    if (isAbove === null) return "text-[#F5F5F5]";
    return isAbove ? "text-green63" : "text-[#E03F3F]";
  };

  return (
    <div className="flex flex-row justify-between w-full h-[48px]">
      <div className="flex flex-row items-center gap-[12px]">
        <SelectUnderlyingAssetDropDown
          futuresPrice={futuresIndex}
          selectedUnderlyingAsset={underlyingAsset}
          setSelectedUnderlyingAsset={setUnderlyingAsset}
          isAbbreviated={false}
        />

        <p className="text-[24px] text-center min-w-[260px] font-bold">will be <span className={getTextColorClass()}>{getText()} {advancedFormatNumber(hoveredPrice, 0, "$")}</span></p>
        
        <div className="flex flex-col gap-[1px] h-[38px]">
          <p className="h-[22px] text-[18px] font-bold ll">in {<CountdownTimer className={""} targetTimestamp={expiry} compactFormat={false} />}</p>
          <p className="h-[13px] text-gray80 text-[11px] font-semibold">by {formatReadableDate(String(expiry), true)}</p>
        </div>
      </div>
      
        <div className="flex flex-row justify-between gap-[13px] h-[64px] bg-black1f rounded-[3px] border-[1px] border-black33 pl-[20px] pr-[12px] ">
          <div className="flex flex-col justify-center">
            <p className={twJoin(
              "h-[22px] text-[17px] font-bold leading-[22px]",
              descriptionColor
            )}>{description}</p>
            <p className="h-[13px] text-gray80 text-[11px] font-semibold leading-[12px]">{subDescription}</p>
          </div>
          <div className="flex flex-col justify-center"><SocialTradingTipsButton></SocialTradingTipsButton></div>
          
        </div>
    </div>
  );
};

export default MainTitle;