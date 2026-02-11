import React, { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber } from "@/utils/helper";
import LogoMoby from "../../assets/logo-moby.svg";
import { CARD_CONCEPT_INFO, CardConcept } from "@/constants/share";
import { OptionDirection, OptionStrategy, OrderSide } from "@/utils/types";

import LogoCallPut from "@assets/img/logo-callput.png";

export interface ShareData {
  instrument: string;
  optionDirection: OptionDirection;
  optionOrderSide: OrderSide;
  optionStrategy: OptionStrategy;
  pnl: number;
  roi: number;
  entryPrice: number;
  lastPrice: number;
  pairedOptionStrikePrice: number;
}

interface ShareImageProps {
  shareData: ShareData;
  cardConcept: CardConcept;
  isIncludePnl: boolean;
}

const ShareImage: React.FC<ShareImageProps> = ({
  shareData,
  cardConcept,
  isIncludePnl,
}: {
  shareData: ShareData;
  cardConcept: CardConcept;
  isIncludePnl: boolean;
}) => {
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const now = getCurrentTimeFormatted();
    setCurrentDate(now);
  }, []);

  const instrument = shareData.instrument;
  const optionDirection = shareData.optionDirection;
  const optionOrderSide = shareData.optionOrderSide;
  const optionStrategy = shareData.optionStrategy;
  const pnl = shareData.pnl;
  const roi = shareData.roi;
  const entryPrice = shareData.entryPrice;
  const lastPrice = shareData.lastPrice;
  const pairedOptionStrikePrice = shareData.pairedOptionStrikePrice;

  const status = roi > 0 ? "isPlus" : roi < 0 ? "isMinus" : "isZero";

  const imgSrc =
    roi >= 0
      ? CARD_CONCEPT_INFO[cardConcept].imgProfit
      : CARD_CONCEPT_INFO[cardConcept].imgLoss;

  useEffect(() => {
    const now = getCurrentTimeFormatted();
    setCurrentDate(now);
  }, []);

  return (
    <div className="relative flex flex-col w-full h-[378px] px-[20px] py-[24px]">
      <img className="absolute top-0 bottom-0 right-0 h-[378px]" src={imgSrc} />
      <div className="z-10">
        <div className="flex flex-row justify-between items-center h-[21px]">
          <img className="w-[88px]" src={LogoCallPut} alt="Logo" />
          <p className="text-[8px] text-gray8c8c font-[400] leading-[12px]">
            Created {currentDate}
          </p>
        </div>
        <div className="flex flex-col gap-[4px] mt-[25px]">
          <p
            className={twJoin(
              "text-[9px] font-normal",
              optionOrderSide === "Buy" ? "text-green71b8" : "text-redeb4d"
            )}
          >
            {optionOrderSide} {optionDirection} Options
          </p>
          <div className="flex flex-row items-center gap-[6px] h-[17px]">
            <p className="text-[14px] font-[700] leading-[24px]">
              {instrument}
            </p>
            {optionStrategy === "Spread" && (
              <p
                className={twJoin(
                  "text-[11px] text-gray8c8c font-[400] leading-[16px]",
                  optionDirection === "Call"
                    ? "border-t-[1px] border-t-gray8c8c"
                    : "border-b-[1px] border-b-gray8c8c"
                )}
              >
                {pairedOptionStrikePrice}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col mt-[4px]">
          <p
            className={twJoin(
              "flex flex-row items-center h-[48px] text-[40px] font-[700] leading-[48px]",
              status === "isPlus"
                ? "text-green71b8"
                : status === "isMinus"
                  ? "text-redeb4d"
                  : "text-whitef2f2"
            )}
          >
            {status === "isPlus" && "+"}
            {advancedFormatNumber(roi, 2, "")}%
          </p>
          {isIncludePnl && pnl && (
            <p
              className={twJoin(
                "h-[14px] text-[12px] font-[700] leading-[24px] mt-[3px]",
                status === "isPlus"
                  ? "text-green71b8"
                  : status === "isMinus"
                    ? "text-redeb4d"
                    : "text-whitef2f2"
              )}
            >
              {status === "isPlus" && "+"}
              {advancedFormatNumber(pnl, 2, "$")}
            </p>
          )}
        </div>
        <div
          className={twJoin(
            isIncludePnl ? "mt-[16px] h-[70px]" : "mt-[21px] h-[82px]"
          )}
        >
          <p className="h-[11px] text-[9px] text-gray8c8c font-[400] leading-[12px]">
            Exit Price
          </p>
          <p className="h-[14px] mt-[4px] text-whitef2f2 text-[12px] font-[700] leading-[24px]">
            {advancedFormatNumber(lastPrice, 2, "$")}
          </p>
          <p className="h-[11px] mt-[12px] text-gray8c8c text-[9px] font-[400] leading-[12px]">
            Entry Price
          </p>
          <p className="h-[14px] mt-[4px] text-whitef2f2 text-[12px] font-[700] leading-[24px]">
            {advancedFormatNumber(entryPrice, 2, "$")}
          </p>
        </div>
        <div className="flex flex-row justify-center items-center w-fit h-[22px] px-[10px] mt-[78px] rounded-[40px] bg-black1a">
          <p className="text-whitef2f2 text-[10px] font-[400] leading-[12px]">
            TRADE NOW ON{" "}
            <span className="text-[10px] text-blue278e font-[700] leading-[12px] underline">
              CALLPUT.APP
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareImage;

const getCurrentTimeFormatted = (): string => {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  return date.toLocaleString("en-GB", options).toUpperCase();
};
