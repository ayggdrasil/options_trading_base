import React, { useEffect, useState } from "react";

import { twJoin, twMerge } from "tailwind-merge";
import { useUAPriceChangeRate } from "@/hooks/market";
import { advancedFormatNumber } from "@/utils/helper";

import IconArrowPriceDown from "@assets/icon-arrow-price-down.svg";
import IconArrowPriceUp from "@assets/icon-arrow-price-up.svg";
import { useHasPosition } from "@/hooks/user";
import { useAppSelector } from "@/store/hooks";

import { UA_INFO } from "@/networks/assets";
import { FuturesAssetIndexMap, UnderlyingAsset } from "@callput/shared";
import { NetworkState } from "@/networks/types";

interface ToggleAssetProps {
  selectedUnderlyingAsset: string;
  setSelectedUnderlyingAsset: (value: any) => void;
}

const ToggleAsset: React.FC<ToggleAssetProps> = ({ selectedUnderlyingAsset, setSelectedUnderlyingAsset }) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;

  const hasPosition = useHasPosition();

  return (
    <div
      className={twJoin("flex flex-row items-center h-[72px] rounded-[4px] p-[10px] bg-black1a gap-[12px]")}
    >
      {Object.keys(UA_INFO[chain]).map((asset) => {
        const typedAsset = asset as UnderlyingAsset;
        const isSelected = selectedUnderlyingAsset === UA_INFO[chain][typedAsset].symbol;
        const futuresPrice = futuresAssetIndexMap[typedAsset];
        const { diff, changeRate } = useUAPriceChangeRate({
          futuresPrice,
          underlyingAsset: UA_INFO[chain][typedAsset].symbol,
        });

        return (
          <button
            key={asset}
            className={twMerge(
              twJoin(
                "cursor-pointer flex items-center",
                "h-[52px]",
                "px-[16px] py-[7px]",
                "active:bg-black1f active:opacity-80 active:scale-95",
                "rounded-[6px]",
                isSelected && ["bg-black29"],
                !isSelected && "hover:bg-white/10"
              )
            )}
            onClick={() => {
              setSelectedUnderlyingAsset(UA_INFO[chain][asset as UnderlyingAsset].symbol);
            }}
          >
            <div className="relative">
              <img src={UA_INFO[chain][asset as UnderlyingAsset].src} className="w-[28px] h-[28px]" />
              {!isSelected && hasPosition[asset] && (
                <div
                  className={twJoin(
                    "absolute top-[-1px] right-[-2px]",
                    "w-[9px] h-[9px] bg-[#F74143] rounded-full",
                    "border-[1px] border-black29"
                  )}
                />
              )}
            </div>

            <div className="flex flex-col items-baseline w-fit ml-[12px]">
              <span className={twJoin(
                "text-[16px]",
                isSelected ? "font-bold text-[#f5f5f5]" : "font-semibold text-grayb3"
              )}>
                {UA_INFO[chain][asset as UnderlyingAsset].symbol} Options
              </span>
              <div className={twJoin("flex items-center ml-[8px]")}>
                <div className="text-gray80 text-[11px] font-semibold">
                  {advancedFormatNumber(futuresPrice, 2, "$")}
                </div>
                <div className="flex flex-row items-center ml-[4px]">
                  {diff === 0 ? (
                    <p></p>
                  ) : diff > 0 ? (
                    <img src={IconArrowPriceUp} className="w-[12px] h-[12px]" />
                  ) : (
                    <img src={IconArrowPriceDown} className="w-[12px] h-[12px]" />
                  )}

                  <div
                    className={twJoin(
                      diff === 0 ? "text-gray80" : diff > 0 ? "text-green63" : "text-[#E03F3F]",
                      "flex flex-row justify-center items-center ml-[2px]",
                      "text-[11px] font-semibold"
                    )}
                  >
                    {advancedFormatNumber(changeRate, 2)}%
                  </div>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ToggleAsset;
