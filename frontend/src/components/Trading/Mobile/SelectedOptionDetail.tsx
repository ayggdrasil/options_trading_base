import React, { useState } from 'react'
import { advancedFormatNumber } from '@/utils/helper'
import { twJoin } from 'tailwind-merge'
import { OrderSide } from '@/utils/types';

import IconSelectedOptionDetailPlus from "@assets/icon-selected-option-detail-plus.svg";
import IconSelectedOptionDetailMinus from "@assets/icon-selected-option-detail-minus.svg";
import IconSelectedOptionArrowUp from "@assets/icon-selected-option-arrow-up.svg";
import IconSelectedOptionArrowDown from "@assets/icon-selected-option-arrow-down.svg";
import { FEE_RATES } from '@callput/shared';

interface SelectedOptionDetail {
  isComboMode: boolean;
  selectedOrderSide: OrderSide;
  markPrice: number;
  markPriceAtComboMode: number;
  riskPremium: number;
  riskPremiumAtComboMode: number;
  tradeFeeUsd: number;
  tradeFeeUsdAtComboMode: number;
  size: string;
  sizeAtComboMode: string;
  slippage: number;
  setSlippage: (value: number) => void;
}

const SelectedOptionDetail: React.FC<SelectedOptionDetail>  = ({
  isComboMode,
  selectedOrderSide,
  markPrice,
  markPriceAtComboMode,
  riskPremium,
  riskPremiumAtComboMode,
  tradeFeeUsd,
  tradeFeeUsdAtComboMode,
  size,
  sizeAtComboMode,
  slippage,
  setSlippage
}) => {
  const slippageValues = [3, 5, 10];

  const [isSlippageDetailsOpen, setIsSlippageDetailsOpen] = useState<boolean>(false);
  const [slippageInputValue, setSlippageInputValue] = useState<string>("");

  const renderRiskPremiumDiffBadge = () => {
    const isRiskPremiumHigher = isComboMode
      ? Math.abs(riskPremiumAtComboMode) > Math.abs(riskPremium)
      : Math.abs(riskPremium) > Math.abs(riskPremiumAtComboMode)

    let riskPremiumDiffInPercentage = 0;
    
    if (isComboMode && riskPremium !== 0) {
      riskPremiumDiffInPercentage = Math.abs(riskPremiumAtComboMode - riskPremium) / riskPremium * 100;
    } else if (!isComboMode && riskPremiumAtComboMode !== 0) {
      riskPremiumDiffInPercentage = Math.abs(riskPremium - riskPremiumAtComboMode) / riskPremiumAtComboMode * 100;
    }

    if (selectedOrderSide === "Sell") riskPremiumDiffInPercentage = -riskPremiumDiffInPercentage;

    if (riskPremiumDiffInPercentage === 0) return null;
    if (isComboMode && sizeAtComboMode === "0") return null;
    if (!isComboMode && size === "0") return null;

    const backgroundImage = isRiskPremiumHigher
      ? riskPremiumDiffInPercentage > 50
        ? "linear-gradient(90deg, #F40 0%, #FFB700 100%)"
        : "linear-gradient(90deg, #FFB700 0%, #FFB700 100%)"
      : riskPremiumDiffInPercentage > 50
        ? "linear-gradient(90deg, #0AF 0%, #CF0 100%)"
        : "linear-gradient(90deg, #CF0 0%, #CF0 100%)"

    return (
      <div
        className={twJoin(
          "flex flex-row items-center justify-center text-[12px] font-semibold",
          "h-[22px] px-[8px] rounded-[9px] bg-[#292929]",
        )}
      >
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage: backgroundImage,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          {advancedFormatNumber(Math.abs(riskPremiumDiffInPercentage), 0)}% {isRiskPremiumHigher ? "Higher" : "Lower"}
        </span>
      </div>
    );
  };

  const isBuy = selectedOrderSide === "Buy";
  const executionPrice = isBuy
    ? markPrice + riskPremium
    : markPrice - riskPremium
  const executionPriceAtComboMode = isBuy
    ? markPriceAtComboMode + riskPremiumAtComboMode
    : markPriceAtComboMode - riskPremiumAtComboMode

  return (
    <div className="mt-[24px] h-fit min-h-[96px]">
      <div className={twJoin(
        "flex flex-col gap-[8px]",
        "w-[344px] h-full py-[12px] border-[1px] border-solid border-black33 rounded-[9px]",
        "text-[13px] text-gray80 font-semibold leading-[1rem]"
      )}>
        <div className="flex flex-col w-full px-[18px] ">
          <div className="flex flex-row justify-between w-full h-[18px]">
            <p>Price per Option</p>
            <div className="flex flex-row gap-[8px]">
              {
                isComboMode
                  ? <p className="text-[14px] text-whitee0 font-semibold">{advancedFormatNumber(executionPriceAtComboMode || 0, 2, "$")}</p>
                  : <p className="text-[14px] text-whitee0 font-semibold">{advancedFormatNumber(executionPrice || 0, 2, "$")}</p>
              }
            </div>
          </div>
          <div className="flex flex-col mt-[8px] pb-[12px] h-[38px]">    
            <div className="flex flex-row items-center justify-between h-[14px] w-full">
              <div className="flex flex-row items-center gap-[8px]">
                <img className="w-[14px] h-[14px]" src={IconSelectedOptionDetailPlus}/>
                <p className="h-[14px] text-[12px] text-gray80 font-semibold leading-3">Mark Price</p>
              </div>
              <div>
                {
                  isComboMode
                    ? <p className="text-[12px] text-gray80 font-semibold">{advancedFormatNumber(markPriceAtComboMode || 0, 2, "$")}</p>
                    : <p className="text-[12px] text-gray80 font-semibold">{advancedFormatNumber(markPrice || 0, 2, "$")}</p>
                }
              </div>
            </div>    
            <div className="flex flex-row items-center justify-between h-[22px] min-h-[22px] w-full mt-[2px]">
              <div className="flex flex-row items-center gap-[8px]">
                {selectedOrderSide === "Buy"
                  ? <img className="w-[14px] h-[14px]" src={IconSelectedOptionDetailPlus}/>
                  : <img className="w-[14px] h-[14px]" src={IconSelectedOptionDetailMinus}/>}
                <p className="h-[14px] text-[12px] text-gray80 font-semibold leading-3">Risk Premium</p>
                {renderRiskPremiumDiffBadge()}
              </div>
              <div>
                {
                  isComboMode
                    ? <p className="text-[12px] text-gray80 font-semibold">{advancedFormatNumber(riskPremiumAtComboMode || 0, 2, "$")}</p>
                    : <p className="text-[12px] text-gray80 font-semibold">{advancedFormatNumber(riskPremium || 0, 2, "$")}</p>
                }
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-row justify-between w-full h-[22px] px-[18px] ">
          <div className="relative group cursor-help w-fit h-full font-semibold">
            <div className='flex flex-row items-center h-full gap-[8px]'>
              <p className="text-gray80 border-b-[1px] border-dashed border-b-greenc1 hover:text-greenc1 ">Trade Fee</p>
              {selectedOrderSide === "Buy" && isComboMode && (
                <div
                  className={twJoin(
                    "flex flex-row items-center justify-center text-[12px] font-semibold",
                    "h-[22px] px-[8px] rounded-[11px] bg-[#292929]",
                  )}
                >
                  <p className='text-[12px] text-whitee0 font-semibold'>{Math.abs(FEE_RATES.OPEN_BUY_NAKED_POSITION-FEE_RATES.OPEN_COMBO_POSITION)/FEE_RATES.OPEN_BUY_NAKED_POSITION*100}% Discount</p>
                </div>
              )}
            </div>
            <div className={twJoin(
              "w-max h-[56px] z-20",
              "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[34px]",
              "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
              "group-hover:block"
            )}>
              <p className="text-[12px] text-gray80 leading-[0.85rem]">
                Trade Fee is <span className="text-gray98 font-bold">0.03%</span> of the notional volume for all trades,<br/>
                except <span className="text-gray98 font-bold">0.06%</span> for buying naked options, not exceeding<br/>
                <span className="text-gray98 font-bold">12.5%</span> of execution price * size.
              </p>
            </div>
          </div>
          <p className="text-[14px] text-whitee0 font-semibold">{advancedFormatNumber(isComboMode ? tradeFeeUsdAtComboMode : tradeFeeUsd || 0, 2, "$")}</p>
        </div>
        
        <div className='w-full h-[1px] bg-black33' />

        <div
          className="cursor-pointer flex flex-row justify-between w-full h-[18px] px-[18px]"
          onClick={() => setIsSlippageDetailsOpen(!isSlippageDetailsOpen)}
        >
          <div className="relative group cursor-help flex flex-row items-center w-fit h-full font-semibold">
            <p className="text-gray80">Slippage Tolerance</p>
          </div>
          <div className='flex flex-row justify-end items-center gap-[4px]'>
            <p className="text-[14px] text-gray80 font-semibold">{advancedFormatNumber(slippage, 1, "")}%</p>
            {isSlippageDetailsOpen
              ? <img src={IconSelectedOptionArrowUp} />
              : <img src={IconSelectedOptionArrowDown} />
            }
          </div>
        </div>
        {isSlippageDetailsOpen && (
          <div className="flex flex-row justify-between items-center h-fit px-[18px]">
            <div className="flex flex-row justify-between items-center h-[22px] rounded-[3px] border-[1px] border-[#333]">
              {slippageValues.map((value, index) => (
                <button
                  key={value}
                  className={twJoin(
                    "w-[48px] h-full text-[10px] text-whitee0 text-center font-semibold",
                    slippage === value ? "bg-black29 text-[#E6FC8D]" : ""
                  )}
                  onClick={() => {
                    setSlippageInputValue("");
                    setSlippage(value)
                  }}
                >{value}%</button>
              ))}
            </div>
            <div className="flex flex-row justify-between items-center w-[84px] h-[22px] px-[8px] py-[4px] rounded-[3px] bg-black17">
              <input
                value={slippageInputValue}
                placeholder="Custom"
                className={twJoin(
                  "w-full h-full",
                  "text-[10px] text-greenc1 font-bold bg-transparent",
                  "focus:outline-none",
                  "placeholder:text-[10px] placeholder-gray80 placeholder:font-semibold")}
                onChange={(e) => {
                  if (e.target.value.includes(" ")) return;
                  if (isNaN(Number(e.target.value))) return;
                  if (e.target.value === "") {
                    setSlippageInputValue("");
                    setSlippage(5);
                    return;
                  }

                  const targetValue = e.target.value.replace(/^0+(?=\d)/, '')

                  if (Number(targetValue) >= 100) {
                    setSlippageInputValue("100");
                    setSlippage(100);
                    return;
                  }

                  setSlippageInputValue(targetValue);
                  setSlippage(Number(targetValue));
                }}
              />
              <div>
                <p className="ml-[4px] text-[10px] text-[#525252] font-semibold">%</p>
              </div>
              
            </div>
        </div>
        )}
        
      </div>
    </div>
  )
}

export default SelectedOptionDetail