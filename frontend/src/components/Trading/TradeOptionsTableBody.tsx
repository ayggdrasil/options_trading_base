import BigNumber from "bignumber.js";
import { useEffect, useState } from 'react';
import { advancedFormatNumber, calculateEstimatedIV, getLeverageText } from '@/utils/helper';
import { OptionDirection, OrderSide } from '@/utils/types';
import { twJoin } from 'tailwind-merge'
import { IOptionDetail } from '@/interfaces/interfaces.marketSlice';
import { MIN_MARK_PRICE_FOR_BUY_POSITION } from "@/constants/constants.position";
import { UnderlyingAsset } from "@callput/shared";

import Tippy from '@tippyjs/react';

import IconArrowOptionSelectedBuyHover from "@assets/icon-arrow-option-selected-long-hover.svg";
import IconArrowOptionSelectedBuyHoverDeactive from "@assets/icon-arrow-option-selected-long-hover-deactive.svg";
import IconArrowOptionSelectedSellHover from "@assets/icon-arrow-option-selected-short-hover.svg";
import IconSpreadZero from "@assets/icon-spread-zero.svg";
import IconSpreadArrowLeftLow from "@assets/icon-spread-arrow-left-low.svg";
import IconSpreadArrowLeftLowGray from "@assets/icon-spread-arrow-left-low-gray.svg";
import IconSpreadArrowLeftModerate from "@assets/icon-spread-arrow-left-moderate.svg";
import IconSpreadArrowLeftModerateGray from "@assets/icon-spread-arrow-left-moderate-gray.svg";
import IconSpreadArrowLeftHigh from "@assets/icon-spread-arrow-left-high.svg";
import IconSpreadArrowLeftHighGray from "@assets/icon-spread-arrow-left-high-gray.svg";
import IconSpreadArrowRightLow from "@assets/icon-spread-arrow-right-low.svg";
import IconSpreadArrowRightLowGray from "@assets/icon-spread-arrow-right-low-gray.svg";
import IconSpreadArrowRightModerate from "@assets/icon-spread-arrow-right-moderate.svg";
import IconSpreadArrowRightModerateGray from "@assets/icon-spread-arrow-right-moderate-gray.svg";
import IconSpreadArrowRightHigh from "@assets/icon-spread-arrow-right-high.svg";
import IconSpreadArrowRightHighGray from "@assets/icon-spread-arrow-right-high-gray.svg";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

const zeroSpread = 0.3; // %
const lowSpread = 2.5; // %
const moderateSpread = 5; // %

interface TradeOptionsTableBodyProps {
  option: IOptionDetail;
  underlyingFutures: number;
  shouldShowAssetPrice: boolean;
  isFuturesPriceIndexOutOfRange: boolean;
  selectedUnderlyingAsset: UnderlyingAsset;
  selectedOptionDirection: OptionDirection;
  selectedOption: IOptionDetail;
  setSelectedOption: (value: any) => void;
  selectedOrderSide: OrderSide;
  setSelectedOrderSide: (value: any) => void;
  shouldDisableTrade: boolean;
  maxNotionalVolume: number;
}

const TradeOptionsTableBody: React.FC<TradeOptionsTableBodyProps> = ({
  option,
  underlyingFutures,
  shouldShowAssetPrice,
  isFuturesPriceIndexOutOfRange,
  selectedUnderlyingAsset,
  selectedOptionDirection,
  selectedOption,
  setSelectedOption,
  selectedOrderSide,
  setSelectedOrderSide,
  shouldDisableTrade,
  maxNotionalVolume
}) => {
  // Common Data Between Call and Put
  const strikePrice = option.strikePrice;
  const markIv = option.markIv;

  // Specific Data
  const parsedTheta = -Math.min(Math.abs(option.theta), option.markPrice);
  
  const priceForBuy = Math.max(option.markPrice * (1 + option.riskPremiumRateForBuy), 0); // Ask Price
  const priceForSell = Math.max(option.markPrice * (1 - option.riskPremiumRateForSell), 0); // Bid Price

  const estimatedIvForBuy = calculateEstimatedIV(markIv, option.markPrice, priceForBuy, option.vega, true);
  const estimatedIvForSell = calculateEstimatedIV(markIv, option.markPrice, priceForSell, option.vega, false);

  const spreadForSell = (option.markPrice - priceForSell) / option.markPrice * 100; // %
  const spreadForBuy = (priceForBuy - option.markPrice) / option.markPrice * 100; // %
  const leverage = underlyingFutures / option.markPrice;

  const minMarkPriceForBuy = MIN_MARK_PRICE_FOR_BUY_POSITION[selectedUnderlyingAsset];
  const isBuyEnable = priceForBuy >= minMarkPriceForBuy;

  const [isHovered, setIsHovered] = useState(false);
  const [volumeBarWidth, setVolumeBarWidth] = useState(1);

  const isSelected = option.optionId === selectedOption.optionId

  useEffect(() => {
    if (isSelected) {
      setSelectedOption({
        ...option,
        markPrice: option.markPrice,
        executionPrice: selectedOrderSide === 'Buy' ? priceForBuy : priceForSell,
        delta: option.delta,
        gamma: option.gamma,
        vega: option.vega,
        theta: parsedTheta,
        instrument: option.instrument,
      });
    }
  }, [option, underlyingFutures])

  useEffect(() => {
    let volumeBarWidth;

    if(option.volume === 0 || maxNotionalVolume === 0) volumeBarWidth = 1;
    else volumeBarWidth = Math.max((option.volume / maxNotionalVolume) * 100, 3);
    
    setVolumeBarWidth(volumeBarWidth);
  }, [option, maxNotionalVolume])

  const TooltipContent = () => {
    return (
      <div className={twJoin(
        "flex flex-col gap-[8px] w-[349px] h-[68px] py-[12px] px-[16px]",
        "bg-[#292929] rounded-[4px] shadow-[0px_0px_36px_0px_rgba(18,18,18,0.72)]",
        "text-[14px] text-whitee0 font-semibold",
        shouldDisableTrade && "hidden"
      )}>
        <div className='flex flex-row gap-[16px]'>
          <div className='flex flex-row gap-[4px] w-[132px]'>
            <p className='w-[50px] h-[18px] text-[13px] text-gray8b'>Delta</p>
            <p className='w-[78px] h-[18px]'>{advancedFormatNumber(option.delta, 2, "")}</p>
          </div>
          <div className='flex flex-row gap-[4px] w-[169px]'>
            <p className='w-[50px] h-[18px] text-[13px] text-gray8b'>Gamma</p>
            <p className='w-[115px] h-[18px]'>{advancedFormatNumber(option.gamma, 6, "")}</p>
          </div>
        </div>
        <div className='flex flex-row gap-[16px]'>
          <div className='flex flex-row gap-[4px] w-[132px]'>
            <p className='w-[50px] h-[18px] text-[13px] text-gray8b'>Vega</p>
            <p className='w-[78px] h-[18px]'>{advancedFormatNumber(option.vega, 2, "")}</p>
          </div>
          <div className='flex flex-row gap-[4px] w-[169px]'>
            <p className='w-[50px] h-[18px] text-[13px] text-gray8b'>Theta</p>
            <p className='w-[115px] h-[18px]'>{advancedFormatNumber(parsedTheta, 2, "")}</p>
          </div>
        </div>
      </div>
  )};

  const BuyEnableContent = () => {
    return (
      <div className={twJoin(
        "w-[184px] h-[40px] px-[12px] py-[6px] bottom-[40px] -left-[12px]",
        "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
        isBuyEnable 
          ? "hidden"
          : "block"
      )}>
        <p className='text-[12px] text-gray80 font-semibold leading-[0.75rem]'>{`Option Price is less than minimum order price, $${minMarkPriceForBuy}`}</p>
      </div>
    )
  }

  const SpreadIcon = (isLeft: boolean, spread: number, isHovered: boolean) => {
    
    const getLeftIcon = () => {
        if (spread < zeroSpread) {
            return IconSpreadZero;
        } else if (spread < lowSpread) {
            return isHovered ? IconSpreadArrowLeftLow : IconSpreadArrowLeftLowGray;
        } else if (spread < moderateSpread) {
            return isHovered ? IconSpreadArrowLeftModerate : IconSpreadArrowLeftModerateGray;
        } else {
            return isHovered ? IconSpreadArrowLeftHigh : IconSpreadArrowLeftHighGray;
        }
    };

    const getRightIcon = () => {
        if (spread < zeroSpread) {
            return IconSpreadZero;
        } else if (spread < lowSpread) {
            return isHovered ? IconSpreadArrowRightLow : IconSpreadArrowRightLowGray;
        } else if (spread < moderateSpread) {
          return isHovered ? IconSpreadArrowRightModerate : IconSpreadArrowRightModerateGray;
        } else {
          return isHovered ? IconSpreadArrowRightHigh : IconSpreadArrowRightHighGray;
        }
    }

    const getSpread = (isHovered: boolean) => {
      if (!isHovered) return <p></p>;

      if (spread < zeroSpread) {
        return (<p style={{
          background: `linear-gradient(95deg, #E6FC8D 0%, #3388B8 126.65%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>0 Spread</p>)
      } else if (spread < lowSpread) {
        return (<p className='text-greenc1'>{advancedFormatNumber(spread, 2, "") + "%"}</p>)
      } else if (spread < moderateSpread) {
        return (<p className='text-[#78805C]'>{advancedFormatNumber(spread, 2, "") + "%"}</p>)
      } else if (spread >= moderateSpread) {
        return (<p className='text-[#575C42]'>{advancedFormatNumber(spread, 2, "") + "%"}</p>)
      }
    }

    return (
      <div className={twJoin(
        'flex flex-col w-[44px] gap-[2px]',
        isLeft ? 'items-end' : 'items-start'
      )}>
        <div className='flex flex-row items-center h-[21px]'>
          <img src={isLeft ? getLeftIcon() : getRightIcon()} />
        </div>
        <div className='h-[18px] text-[10px] font-bold'>
          {getSpread(isHovered)}
        </div>
      </div>
    )
  }  

  return (
    <div
      className={twJoin(
        shouldDisableTrade && "opacity-10"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* futuresPrice를 전달 받았을 때 */}
      {shouldShowAssetPrice && !isFuturesPriceIndexOutOfRange && (
        <div className={twJoin(
          "relative flex flex-row items-center",
          "text-[14px] text-gray8b font-semibold",
        )}>
          <div className='absolute w-full h-[3px] bg-black12 z-0'/>
          <div className={twJoin(
            "z-0",
            "flex flex-row justify-center items-center",
            "w-[141px] h-[28px] bg-black12 rounded-[14px] ml-[28px]"
          )}>{selectedUnderlyingAsset?.toUpperCase()} &nbsp; <span className='text-greenc1'>{advancedFormatNumber(underlyingFutures, 2, "$")}</span></div>
        </div>
      )}

      <Tippy content={<BuyEnableContent />} animation={false} offset={[185, 2]} hideOnClick={false}>
        <Tippy content={<TooltipContent />} animation={false} offset={[580, -62]} hideOnClick={false}>
          {/* Table Body */}
          <div className={twJoin(
            "grid grid-cols-[190px_128px_230px_128px_141px] py-[5px]",
            "h-[54px] text-[16px] text-whitee0 font-normal",
            "hover:bg-black29 hover:bg-opacity-50 hover:rounded-[4px]",
            `${isSelected ? 'bg-black29 bg-opacity-50 rounded-[4px]' : ''}`,
          )}>
            {/* Strike */}
            <div className="flex flex-row items-center pl-[40px] text-whitee0 font-semibold"><p>{strikePrice} <span className='text-[13px] '>{selectedOptionDirection}</span></p></div>
            
            {/* Bid */}
            <div 
              className={twJoin(
                "flex flex-row items-center",
                "hover:w-[144px]",
                (isSelected && selectedOrderSide === 'Sell')
                  ? "w-[144px]"
                  : "w-full h-full"
              )}
            >
              <div
                className={twJoin(
                  "relative group cursor-pointer",
                  "flex flex-col justify-center items-center",
                  "w-full h-full rounded-[4px] bg-[rgba(46,46,46,.5)]",
                  "hover:bg-redc7 hover:text-black12 hover:pl-[50px] active:opacity-80 active:scale-95",
                  isSelected && selectedOrderSide === 'Sell' && "!bg-redc7 !text-black12 !pl-[50px]"
                )}
                onClick={() => {
                  setSelectedOption({
                    ...option,
                    markPrice:option.markPrice,
                    executionPrice: priceForSell,
                    delta: option.delta,
                    gamma: option.gamma,
                    vega: option.vega,
                    theta: parsedTheta,
                    instrument: option.instrument,
                  });
                  setSelectedOrderSide('Sell');
                }}
              >
                <p className={twJoin(
                  "text-[14px] text-green4c text-center font-bold",
                  "group-hover:text-black12",
                  isSelected && selectedOrderSide === 'Sell' && "!text-black12"
                )}>{advancedFormatNumber(priceForSell, 2, "$")}</p>

                <p className={twJoin(
                  "text-[10px] text-gray80 text-center font-normal",
                  "group-hover:text-black12",
                  isSelected && selectedOrderSide === 'Sell' && "!text-black12"
                )}>{estimatedIvForSell <= 0 || estimatedIvForSell >= 3 ? "-" : advancedFormatNumber(estimatedIvForSell * 100, 1 , "") + "%"}</p>

                <div className={twJoin(
                  'hidden group-hover:flex flex-row items-center justify-end absolute -left-[8px]',
                  "h-full rounded-[4px] bg-redc7",
                  "pl-[18px] text-[14px] text-black12 font-bold",
                  isSelected && selectedOrderSide === 'Sell' && "!flex"
                )}>
                  <p>Sell</p>
                  <img className="w-[18px] h-[18px] min-w-[18px] min-h-[18px]" src={IconArrowOptionSelectedSellHover}/>
                </div>
              </div>
            </div>
            {/* Mark Price */}
            <div className='flex flex-row items-center justify-center gap-[16px]'>
              {SpreadIcon(true, spreadForSell, isHovered)}
              <div className='flex flex-col items-center justify-center gap-[2px] w-[70px]'>
                <p className='text-[14px] text-gray80 text-center font-semibold'>{advancedFormatNumber(option.markPrice, 1, "$")}</p>
                <p className={twJoin(
                  "min-w-[35px] h-[18px] px-[8px] border-[1px] border-solid border-[#333333] rounded-[9px]",
                  "text-[10px] text-greenc1 text-center font-semibold"
                )}>x
                  {getLeverageText(leverage)}
                </p>
              </div>
              {SpreadIcon(false, spreadForBuy, isHovered)}
            </div>
            
            
            {/* Ask */}
            <div 
              className={twJoin(
                "flex flex-row items-center",
                "hover:w-[144px]",
                (isSelected && selectedOrderSide === 'Buy')
                  ? "w-[144px]"
                  : "w-full h-full"
              )}
            >
              <div
                className={twJoin(
                  "relative group",
                  "flex flex-col justify-center items-center",
                  "w-full h-full rounded-[4px] bg-[rgba(46,46,46,.5)]",
                  "hover:cursor-pointer hover:bg-green4c hover:text-black12 hover:pr-[50px] active:opacity-80 active:scale-95",
                  isBuyEnable
                    ? isSelected && selectedOrderSide === 'Buy' && "!bg-green4c !text-black12 !pr-[50px]"
                    : "hover:!cursor-not-allowed hover:!bg-[#2e2e2e] hover:!text-gray52",
                )}
                onClick={() => {
                  if (!isBuyEnable) return;

                  setSelectedOption({
                    ...option,
                    markPrice:option.markPrice,
                    executionPrice: priceForBuy,
                    delta: option.delta,
                    gamma: option.gamma,
                    vega: option.vega,
                    theta: parsedTheta,
                    instrument: option.instrument
                  });
                  setSelectedOrderSide('Buy');
                }}
              >
                <p className={twJoin(
                  "text-[14px] text-redc7 text-center font-bold",
                  "group-hover:text-black12",
                  isBuyEnable
                    ? isSelected && selectedOrderSide === 'Buy' && "!text-black12"
                    : "group-hover:!text-gray52"
                )}>{advancedFormatNumber(priceForBuy, 2, "$")}</p>

                <p className={twJoin(
                  "text-[10px] text-gray80 text-center font-normal",
                  "group-hover:text-black12",
                  isBuyEnable
                    ? isSelected && selectedOrderSide === 'Buy' && "!text-black12"
                    : "group-hover:!text-gray52"
                )}>{estimatedIvForBuy <= 0 || estimatedIvForBuy >= 3 ? "-" : advancedFormatNumber(BigNumber(estimatedIvForBuy).multipliedBy(100).toNumber(), 1 , "") + "%"}</p>

                <div className={twJoin(
                  'hidden group-hover:flex flex-row items-center absolute -right-[8px]',
                  "h-full rounded-[4px] bg-green4c",
                  "pr-[18px] text-[14px] text-black12 font-bold",
                  isBuyEnable
                    ? isSelected && selectedOrderSide === 'Buy' && "!flex"
                    : "group-hover:!bg-[#2e2e2e] group-hover:!text-gray52",
                )}>
                  <img src={isBuyEnable ? IconArrowOptionSelectedBuyHover : IconArrowOptionSelectedBuyHoverDeactive} />
                  <p>Buy</p>
                </div>
              </div>  
            </div>

            {/* Volume */}
            <div className="flex flex-col justify-center gap-[9px] pl-[42px]">
              <div
                className='h-[6px] rounded-[2px] bg-greenc1 bg-opacity-40'
                style={{ width: `${volumeBarWidth}%` }}
              />
              <p className='h-[12px] text-[10px] text-gray80 font-normal'>{advancedFormatNumber(option.volume / 1000, 2, "$")}K</p>
            </div>
          </div>
        </Tippy>
      </Tippy>

      {!shouldShowAssetPrice && isFuturesPriceIndexOutOfRange && (
        <div className={twJoin(
          "relative flex flex-row items-center",
          "text-[14px] text-gray8b font-semibold",
        )}>
          <div className='absolute w-full h-[3px] bg-black12 z-0'/>
          <div className={twJoin(
            "z-0",
            "flex flex-row justify-center items-center",
            "w-[141px] h-[28px] bg-black12 rounded-[14px] ml-[28px]"
          )}>{selectedUnderlyingAsset?.toUpperCase()} &nbsp; <span className='text-greenc1'>{advancedFormatNumber(underlyingFutures, 2, "$")}</span></div>
        </div>
      )}
    </div>
  )
}

export default TradeOptionsTableBody