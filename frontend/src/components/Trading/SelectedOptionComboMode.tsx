import { IOptionDetail } from '@/interfaces/interfaces.marketSlice';
import { QA_TICKER_TO_IMG } from '@/networks/assets';
import { BaseQuoteAsset, SpotAssetIndexMap, UnderlyingAsset } from '@callput/shared';
import { NetworkState } from '@/networks/types';
import { useAppSelector } from '@/store/hooks';
import { advancedFormatBigNumber, advancedFormatNumber } from '@/utils/helper';
import { OptionDirection, OrderSide } from '@/utils/types';
import React, { useEffect, useState } from 'react'
import { twJoin } from 'tailwind-merge';

interface SelectedOptionModeSelector {
  isComboModePossible: boolean;
  isComboMode: boolean
  setIsComboMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedUnderlyingAsset: UnderlyingAsset;
  underlyingFutures: number;
  selectedOptionDirection: OptionDirection;
  selectedOption: IOptionDetail;
  selectedOrderSide: OrderSide;
  pairedOption: IOptionDetail;
}

const SelectedOptionModeSelector: React.FC<SelectedOptionModeSelector> = ({
  isComboModePossible,
  isComboMode,
  setIsComboMode,
  selectedUnderlyingAsset,
  underlyingFutures,
  selectedOptionDirection,
  selectedOption,
  selectedOrderSide,
  pairedOption
}) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;

  const [collateralAmount, setCollateralAmount] = useState<number>(0);
  const [collateralAmountAtComboMode, setCollateralAmountAtComboMode] = useState<number>(0);
  const [markPriceAmount, setMarkPriceAmount] = useState<number>(0);
  const [markPriceAmountAtComboMode, setMarkPriceAmountAtComboMode] = useState<number>(0);
  const [leverage, setLeverage] = useState<number>(0);
  const [leverageAtComboMode, setLeverageAtComboMode] = useState<number>(0);

  useEffect(() => {
    if (!selectedOption.optionId || selectedOption.optionId === "") {
      setCollateralAmount(0);
      setMarkPriceAmount(0);
      setLeverage(0);
      return;
    }
    
    if (selectedOptionDirection === "Call") {
      setCollateralAmount(1);
    } else {
      const collateralAmount = selectedOption.strikePrice / spotAssetIndexMap.usdc;
      setCollateralAmount(collateralAmount);
    }
    
    const markPrice = selectedOption.markPrice;
    const markPriceAmount = markPrice / spotAssetIndexMap.usdc
    setMarkPriceAmount(markPriceAmount);

    setLeverage(underlyingFutures / markPrice);
  }, [selectedOption, selectedOrderSide, underlyingFutures])

  useEffect(() => {
    if (!pairedOption.optionId || pairedOption.optionId === "") {
      setCollateralAmount(0);
      setMarkPriceAmountAtComboMode(0);
      setLeverageAtComboMode(0);
      return;
    }

    const collateralValue = Math.abs(selectedOption.strikePrice - pairedOption.strikePrice)
    const collateralAmountAtComboMode = collateralValue / spotAssetIndexMap.usdc;
    setCollateralAmountAtComboMode(collateralAmountAtComboMode)

    const markPriceAtComboMode = selectedOption.markPrice - pairedOption.markPrice
    const markPriceAmountAtComboMode = markPriceAtComboMode / spotAssetIndexMap.usdc;
    setMarkPriceAmountAtComboMode(markPriceAmountAtComboMode)
    
    setLeverageAtComboMode(underlyingFutures / markPriceAtComboMode);
  }, [pairedOption])

  const description = selectedOrderSide === "Buy" ? "Pay less Premium" : "Deposit less collateral";

  return (
    <div className='flex flex-col justify-center mt-[38px]'>
      
      <div className='relative group'>
        <div
          className={twJoin(
            'relative z-10',
            'flex flex-row items-center justify-between w-full h-[40px] px-[14px] bg-black17',
            'rounded-tl-[4px] rounded-tr-[4px]',
            isComboMode ? "w-[342px] max-w-[342px] ml-[1px] border-none" : "w-[344px] border-[1px] border-b-[0px] border-[#333]",
            isComboModePossible ? "cursor-pointer" : "cursor-not-allowed opacity-30"
          )}
          onClick={() => {
            if (isComboMode || !isComboModePossible) return;
            setIsComboMode(true);
          }}
        > 
          <div className='flex flex-row items-center gap-[8px]'>
            <div className='flex flex-row items-center justify-center bg-[#3D3D3D] w-[16px] h-[16px] rounded-full'>
              {isComboMode && <div className='bg-[#E0E0E0] w-[8px] h-[8px] rounded-full'/>}
            </div>
            <p className='ml-[6px] text-[16px] font-bold'>{selectedOptionDirection} Spread</p>
            <div className='flex flex-row items-center justify-center px-[8px] bg-black29 rounded-[11px]'>
              <p
                className={twJoin(
                  "text-[12px] font-semibold",
                  "text-transparent bg-clip-text"
                )}
                style={{
                  backgroundImage: "linear-gradient(90deg, #DEFF5C 0%, #FFC247 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >x{advancedFormatBigNumber(leverageAtComboMode)}</p>
          </div>
          </div>
          <div className='flex flex-row items-center justify-center gap-[4px]'>
              <img className='w-[18px] h-[18px]' src={QA_TICKER_TO_IMG[chain][BaseQuoteAsset.USDC]} />
              <p
                className='text-[12px] font-semibold text-transparent bg-clip-text'
                style={{
                  backgroundImage: "linear-gradient(90deg, #0AF 0%, #CF0 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >{selectedOrderSide === "Buy"
                  ? advancedFormatNumber(markPriceAmountAtComboMode, 4, "")
                  : advancedFormatNumber(collateralAmountAtComboMode, 4, "")
                }
              </p>
          </div>
        </div>
        {isComboMode && (
          <div
            className={twJoin(
              'absolute bottom-0 left-0 right-0 flex flex-row justify-center p-[2px] w-[344px] h-[62px] rounded-tl-[4px] rounded-tr-[4px]',
              'pointer-events-none'
            )}
            style={{
              backgroundImage: "linear-gradient(90deg, #BF77FF 0%, #485BFF 100%)",
            }}
          >
            <p className='text-[11px] font-bold text-black17'>{description}</p>
          </div>
        )}
        {pairedOption?.optionId == "" && (
          <div className={twJoin(
              "w-max h-[27px] z-20",
              "absolute hidden px-[11px] py-[6px] bottom-[18px] right-[8px]",
              "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
              "group-hover:block"
            )}>
            <p className="text-[12px] text-gray80 leading-[0.85rem]">
              There’s no spread pair to suggest.
            </p>
          </div>
        )}
      </div>

      <div
        className={twJoin(
          'w-full h-[1px]',
          isComboMode ? "" : "bg-grayb3"
        )}
        style={{
          backgroundImage: isComboMode ? "linear-gradient(90deg, #BF77FF 0%, #485BFF 100%)" : "",
        }}
      />

      <div
        className={twJoin(
          'cursor-pointer flex flex-row items-center justify-between w-full h-[40px] px-[14px] bg-black17',
          'border-[1px] border-t-[0px] rounded-bl-[4px] rounded-br-[4px]',
          isComboMode ? "border-[#333]" : "border-grayb3"
        )}
        onClick={() => {
          if (!isComboMode) return;
          setIsComboMode(false);
        }}
      >
        <div className='flex flex-row items-center gap-[8px]'>
          <div className='flex flex-row items-center justify-center bg-[#3D3D3D] w-[16px] h-[16px] rounded-full'>
            {!isComboMode && <div className='bg-[#E0E0E0] w-[8px] h-[8px] rounded-full'/>}
          </div>
          <p className='ml-[6px] text-[16px] font-bold'>{selectedOptionDirection}</p>
          <div className='flex flex-row items-center justify-center px-[8px] bg-black29 rounded-[11px]'>
            <p
              className="text-[12px] font-semibold text-whitee0"
            >x{advancedFormatBigNumber(leverage)}</p>
          </div>
        </div>
        <div className='flex flex-row items-center justify-center gap-[4px]'>
          {
            selectedOrderSide === "Buy"
              ? <>
                  <img className='w-[18px] h-[18px]' src={QA_TICKER_TO_IMG[chain][BaseQuoteAsset.USDC]} />
                  <p
                    className='text-[12px] font-semibold text-whitee0'
                  >{advancedFormatNumber(markPriceAmount, 4, "")}</p>
                </>
              : <>
                  <img
                    className='w-[18px] h-[18px]'
                    src={
                      selectedOptionDirection === "Put"
                        ? QA_TICKER_TO_IMG[chain][BaseQuoteAsset.USDC]
                        : selectedUnderlyingAsset === UnderlyingAsset.BTC
                          ? QA_TICKER_TO_IMG[chain][BaseQuoteAsset.WBTC]
                          : QA_TICKER_TO_IMG[chain][BaseQuoteAsset.WETH]
                    }
                  />
                  <p
                    className='text-[12px] font-semibold text-whitee0'
                  >{advancedFormatNumber(collateralAmount, 4, "")}</p>
                </>
          }
        </div>
      </div>

    </div>
  )
}

export default SelectedOptionModeSelector