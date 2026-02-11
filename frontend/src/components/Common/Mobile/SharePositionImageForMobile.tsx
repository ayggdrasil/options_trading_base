import React, { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber } from "@/utils/helper";
import { isCallStrategy, isSpreadStrategy, Strategy } from "@callput/shared";
import { CARD_CONCEPT_INFO, CardConcept } from "../SharePosition.constant";
import LogoMoby from "@/assets/logo-moby.svg";

export interface SharePositionDataForMobile {
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
  sharedPositionData: SharePositionDataForMobile;
  cardConcept: CardConcept;
  isIncludePnl: boolean;
}

const SharePositionImageForMobile: React.FC<SharePositionImageProps> = ({
  sharedPositionData,
  cardConcept,
  isIncludePnl,
}: {
  sharedPositionData: SharePositionDataForMobile;
  cardConcept: CardConcept;
  isIncludePnl: boolean;
}) => {
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const now = getCurrentTimeFormatted();
    setCurrentDate(now);
  }, []);

  const mainOptionName = sharedPositionData.mainOptionName;
  const exitPrice = sharedPositionData.exitPrice;
  const entryPrice = sharedPositionData.entryPrice;
  const isBuy = sharedPositionData.isBuy;
  const isCall = isCallStrategy(sharedPositionData.strategy);
  const pnl = sharedPositionData.pnl;
  const roi = sharedPositionData.roi;
  const isCombo = isSpreadStrategy(sharedPositionData.strategy);
  const pairedOptionStrikePrice = sharedPositionData.pairedOptionStrikePrice;

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
    <div className="relative flex flex-col w-full max-w-[450px] h-fit bg-[#040008]">
      <img className=" w-full h-auto" src={imgSrc} />
      <div className="absolute top-0 left-0 z-10 w-full h-full p-4">
        <div className="flex flex-row justify-between items-center h-[21px]">
          <img className="w-[88px]" src={LogoMoby} alt="Logo" />
          <p className="text-[10px] text-gray9D font-normal">
            Created {currentDate}
          </p>
        </div>
        <div className="flex flex-col gap-[4px] mt-5">
          <p
            className={twJoin(
              "text-[12px] font-normal",
              isBuy ? "text-green63" : "text-redE0"
            )}
          >
            {isBuy ? "Buy" : "Sell"} {isCall ? "Call" : "Put"} Options
          </p>
          <div className="flex flex-row items-center gap-[6px] h-[17px]">
            <p className="text-base font-bold">{mainOptionName}</p>
            {isCombo && (
              <p
                className={twJoin(
                  "text-xs text-gray9D font-normal",
                  isCall
                    ? "border-t-[1px] border-t-gray80"
                    : "border-b-[1px] border-b-gray80"
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
              "flex flex-row items-center h-[48px] text-[40px] font-bold",
              status === "isPlus"
                ? "text-green63"
                : status === "isMinus"
                ? "text-redE0"
                : "text-[#F5F5F5]"
            )}
          >
            {status === "isPlus" && "+"}
            {advancedFormatNumber(roi, 2, "")}%
          </p>
          {isIncludePnl && pnl && (
            <p
              className={twJoin(
                "h-[14px] text-[12px] font-semibold mt-[3px]",
                status === "isPlus"
                  ? "text-green63"
                  : status === "isMinus"
                  ? "text-redE0"
                  : "text-[#F5F5F5]"
              )}
            >
              {status === "isPlus" && "+"}
              {advancedFormatNumber(pnl, 2, "$")}
            </p>
          )}
        </div>
        <div className="mt-[20px]">
          <p className="text-xs text-gray9D font-normal">Exit Price</p>
          <p className="mt-[4px] text-base">
            {advancedFormatNumber(exitPrice, 2, "$")}
          </p>
          <p className="mt-[12px] text-xs text-gray9D font-normal">
            Entry Price
          </p>
          <p className="mt-[4px] text-base">
            {advancedFormatNumber(entryPrice, 2, "$")}
          </p>
        </div>
        <div className="flex flex-row justify-center items-center px-4 py-3 w-fit rounded-[24px] bg-[#FFFFFF14] absolute bottom-6 left-0">
          <p className="text-[10px] font-normal">
            TRADE NOW ON{" "}
            <span className="text-[10px] text-[#e6fc8d] font-bold underline">
              MOBY.TRADE
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharePositionImageForMobile;

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
