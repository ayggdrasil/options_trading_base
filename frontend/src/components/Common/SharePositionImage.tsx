import React, { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber } from "@/utils/helper";
import LogoMoby from "../../assets/logo-moby.svg";
import { isCallStrategy, isSpreadStrategy, Strategy } from "@callput/shared";
import { CARD_CONCEPT_INFO, CardConcept } from "./SharePosition.constant";


export interface SharePositionData {
  mainOptionName: string;
  exitPrice: number;
  entryPrice: number;
  isBuy: boolean;
  pnl: number;
  roi: number;
  strategy: Strategy;
  pairedOptionStrikePrice: number;
}

interface SharePositionImageProps {
  sharedPositionData: SharePositionData;
  cardConcept: CardConcept;
  isIncludePnl: boolean;
}

const SharePositionImage: React.FC<SharePositionImageProps> = ({ sharedPositionData, cardConcept, isIncludePnl }: {
  sharedPositionData: SharePositionData;
  cardConcept: CardConcept;
  isIncludePnl: boolean;
}) => {
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const now = getCurrentTimeFormatted();
    setCurrentDate(now);
  }, [])

  const mainOptionName = sharedPositionData.mainOptionName;
  const exitPrice = sharedPositionData.exitPrice;
  const entryPrice = sharedPositionData.entryPrice;
  const isBuy = sharedPositionData.isBuy;
  const isCall = isCallStrategy(sharedPositionData.strategy);
  const pnl = sharedPositionData.pnl;
  const roi = sharedPositionData.roi;
  const isCombo = isSpreadStrategy(sharedPositionData.strategy);
  const pairedOptionStrikePrice = sharedPositionData.pairedOptionStrikePrice;

  const status = roi > 0 ? "isPlus" : roi < 0 ? "isMinus" : "isZero"

  const imgSrc = roi >= 0 ? CARD_CONCEPT_INFO[cardConcept].imgProfit : CARD_CONCEPT_INFO[cardConcept].imgLoss;

  useEffect(() => {
    const now = getCurrentTimeFormatted();
    setCurrentDate(now);
  }, [])

  return (
    <div className="relative flex flex-col w-full h-full px-[20px] py-[24px] bg-[#040008]">
      <img className="absolute bottom-0 right-0" src={imgSrc} />
      <div className="z-10">
        <div className="flex flex-row justify-between items-center h-[21px]">
          <img className="w-[88px]" src={LogoMoby} alt="Logo" />
          <p className="text-[8px] text-gray52 font-normal">Created {currentDate}</p>
        </div>
        <div className="flex flex-col gap-[4px] mt-[25px]">
          <p className={twJoin(
            "text-[9px] font-normal",
            isBuy ? "text-[#51e064]" : "text-[#e5394b]"
          )}>{isBuy ? "Buy" : "Sell"} {isCall ? "Call" : "Put"} Options</p>
          <div className="flex flex-row items-center gap-[6px] h-[17px]">
            <p className="text-[14px] font-semibold">{mainOptionName}</p>
            {isCombo && (
              <p className={twJoin(
                "text-[11px] text-gray80 font-normal",
                isCall ? "border-t-[1px] border-t-gray80" : "border-b-[1px] border-b-gray80"
              )}>{pairedOptionStrikePrice}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col mt-[4px]">
          <p className={twJoin(
            "flex flex-row items-center h-[48px] text-[40px] font-bold",
            status === "isPlus" ? "text-[#51e064]" : status === "isMinus" ? "text-[#e5394b]" : "text-whitee0"
          )}>{status === "isPlus" && "+"}{advancedFormatNumber(roi, 2, "")}%</p>
          {isIncludePnl && pnl && (<p className={twJoin(
            "h-[14px] text-[12px] font-semibold mt-[3px]",
            status === "isPlus" ? "text-[#51e064]" : status === "isMinus" ? "text-[#e5394b]" : "text-whitee0"
          )}>{status === "isPlus" && "+"}{advancedFormatNumber(pnl, 2, "$")}</p>)}
        </div>
        <div className={twJoin(isIncludePnl ? "mt-[16px] h-[70px]" : "mt-[21px] h-[82px]")}>   
          <p className="h-[11px] text-[9px] text-[#999999] font-normal">Exit Price</p>
          <p className="h-[14px] mt-[4px] text-[12px]">{advancedFormatNumber(exitPrice, 2, "$")}</p>
          <p className="h-[11px] mt-[12px] text-[9px] text-[#999999] font-normal">Entry Price</p>
          <p className="h-[14px] mt-[4px] text-[12px]">{advancedFormatNumber(entryPrice, 2, "$")}</p>
        </div>
        <div className="flex flex-row justify-center items-center w-fit h-[22px] px-[10px] mt-[78px] rounded-[40px] bg-black1a">
          <p className="text-[10px] font-normal">TRADE NOW ON <span className="text-[10px] text-[#e6fc8d] font-bold underline">MOBY.TRADE</span></p>
        </div>
      </div>
    </div>
  );
};

export default SharePositionImage;

const getCurrentTimeFormatted = (): string => {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  return date.toLocaleString('en-GB', options).toUpperCase();
}