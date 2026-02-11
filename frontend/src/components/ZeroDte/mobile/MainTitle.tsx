import { useEffect, useMemo, useState } from "react";
import { advancedFormatNumber, formatReadableDate } from "@/utils/helper";
import { CountdownTimer } from "../../Common/CountdownTimer";
import { twJoin } from "tailwind-merge";
import SelectUnderlyingAssetDropDown from "@/components/Trading/Mobile/SelectUnderlyingAssetDropDown";
import { UnderlyingAsset } from "@callput/shared";

interface MainTitleProps {
  underlyingAsset: UnderlyingAsset;
  setUnderlyingAsset: (asset: UnderlyingAsset) => void;
  expiry: number;
  futuresIndex: number;
  hoveredPrice: number;
}

const MainTitle: React.FC<MainTitleProps> = ({
  underlyingAsset,
  setUnderlyingAsset,
  expiry,
  futuresIndex,
  hoveredPrice,
}) => {
  const [isAbove, setIsAbove] = useState<boolean | null>(null);

  useEffect(() => {
    if (
      futuresIndex === 0 ||
      hoveredPrice === 0 ||
      futuresIndex === hoveredPrice
    ) {
      setIsAbove(null);
    }
    setIsAbove(futuresIndex < hoveredPrice);
  }, [futuresIndex, hoveredPrice]);

  const getText = () => {
    if (isAbove === null) return "at";
    return isAbove ? "above" : "below";
  };

  const getTextColorClass = () => {
    if (isAbove === null) return "text-[#E0E0E0]";
    return isAbove ? "text-green63" : "text-[#E03F3F]";
  };

  return (
    <div className="flex flex-col gap-y-3 px-3 md:px-6">
      <SelectUnderlyingAssetDropDown
        futuresPrice={futuresIndex}
        selectedExpiry={expiry}
        selectedUnderlyingAsset={underlyingAsset}
        setSelectedUnderlyingAsset={setUnderlyingAsset}
      />
      <div className={twJoin("flex flex-row gap-x-1 justify-center")}>
        <p
          className={twJoin(
            "font-bold text-whitef0",
            "text-[16px] leading-[19px] md:text-[18px]"
          )}
        >
          will be{" "}
          <span className={getTextColorClass()}>
            {getText()} {advancedFormatNumber(hoveredPrice, 0, "$")}
          </span>
        </p>
        <div className="flex flex-row gap-x-1 items-end">
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[10px] leading-[15px] md:text-[12px]"
            )}
          >
            in{" "}
            {
              <CountdownTimer
                className={""}
                targetTimestamp={expiry}
                compactFormat={false}
              />
            }
          </p>
          <p
            className={twJoin(
              "font-semibold text-gray9D",
              "text-[10px] leading-[15px] md:text-[12px] md:leading-[16px]"
            )}
          >
            {`by ${formatReadableDate(String(expiry), true)}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainTitle;
