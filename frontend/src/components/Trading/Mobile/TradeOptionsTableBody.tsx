import BigNumber from "bignumber.js";
import { useEffect, useRef } from "react";
import { advancedFormatNumber, calculateEstimatedIV, getLeverageText } from "@/utils/helper";
import { OptionDirection, OrderSide } from "@/utils/types";
import { twJoin } from "tailwind-merge";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { MIN_MARK_PRICE_FOR_BUY_POSITION } from "@/constants/constants.position";
import { TradeOptionType } from "./constant";
import { useAppDispatch } from "@/store/hooks";

import { resetPairedOption, resetSlippage, resetComboMode } from "@/store/slices/SelectedOption";
import { UnderlyingAsset } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});
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
  shouldDisableTrade: boolean;
  selectedExpiry: number;
  setSelectedOrderSide: (value: any) => void;
  setShowSelectedOption: (value: any) => void;
  setShowSelectedOptionHighLevel: (value: any) => void;
  scrollToAssetPrice: (top: number) => void;
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
  shouldDisableTrade,
  selectedExpiry,
  setSelectedOrderSide,
  setShowSelectedOption,
  setShowSelectedOptionHighLevel,
  scrollToAssetPrice,
}) => {
  const dispatch = useAppDispatch();
  // Common Data Between Call and Put
  const strikePrice = option.strikePrice;
  const markIv = option.markIv;

  // Specific Data
  const parsedTheta = -Math.min(Math.abs(option.theta), option.markPrice);

  const priceForBuy = Math.max(option.markPrice * (1 + option.riskPremiumRateForBuy), 0); // Ask Price
  const priceForSell = Math.max(option.markPrice * (1 - option.riskPremiumRateForSell), 0); // Bid Price

  const estimatedIvForBuy = calculateEstimatedIV(markIv, option.markPrice, priceForBuy, option.vega, true);
  const estimatedIvForSell = calculateEstimatedIV(markIv, option.markPrice, priceForSell, option.vega, false);

  const spreadForSell = ((option.markPrice - priceForSell) / option.markPrice) * 100; // %
  const spreadForBuy = ((priceForBuy - option.markPrice) / option.markPrice) * 100; // %

  const leverage = underlyingFutures / option.markPrice;

  const minMarkPriceForBuy = MIN_MARK_PRICE_FOR_BUY_POSITION[selectedUnderlyingAsset];
  const isBuyEnable = priceForBuy >= minMarkPriceForBuy;

  const topAssetPrice = useRef<HTMLDivElement | null>(null);
  const bottomAssetPrice = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (option.optionId === selectedOption.optionId) {
      setSelectedOption({
        ...option,
        markPrice: option.markPrice,
        executionPrice: selectedOrderSide === "Buy" ? priceForBuy : priceForSell,
        delta: option.delta,
        gamma: option.gamma,
        vega: option.vega,
        theta: parsedTheta,
        instrument: option.instrument,
      });
    }
  }, [option, underlyingFutures]);

  useEffect(() => {
    if (shouldShowAssetPrice && !isFuturesPriceIndexOutOfRange && topAssetPrice.current) {
      scrollToAssetPrice(topAssetPrice.current?.offsetTop);

      return;
    }

    if (!shouldShowAssetPrice && isFuturesPriceIndexOutOfRange && bottomAssetPrice.current) {
      scrollToAssetPrice(bottomAssetPrice.current?.offsetTop);
    }
  }, [shouldShowAssetPrice, isFuturesPriceIndexOutOfRange, topAssetPrice, bottomAssetPrice, selectedExpiry]);

  return (
    <>
      {/* futuresPrice를 전달 받았을 때 */}
      {shouldShowAssetPrice && !isFuturesPriceIndexOutOfRange && (
        <div
          ref={topAssetPrice}
          className={twJoin(
            "flex justify-center items-center gap-x-1",
            "px-[6px] py-[7px] bg-[#232322] mt-[-1px]"
          )}
        >
          <p
            className={twJoin(
              "font-semibold text-[#E6FC8D]",
              "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
            )}
          >
            {`Underlying Futures: ${selectedUnderlyingAsset?.toUpperCase()}`}
          </p>
          <span
            className={twJoin(
              "font-semibold text-[#E6FC8D]",
              "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
            )}
          >
            {advancedFormatNumber(underlyingFutures, 2, "$")}
          </span>
        </div>
      )}

      {/* Table Body */}
      <div
        className={twJoin(
          "flex flex-row justify-between px-3 pt-3 pb-4 md:px-6",
          "border-b border-solid border-[#333331] last:border-b-0"
        )}
        onClick={() => {
          if (!isBuyEnable) return;
          setSelectedOption({
            ...option,
            markPrice: option.markPrice,
            executionPrice: selectedOrderSide === TradeOptionType.BUY ? priceForBuy : priceForSell,
            delta: option.delta,
            gamma: option.gamma,
            vega: option.vega,
            theta: parsedTheta,
            instrument: option.instrument,
          });
          setSelectedOrderSide(selectedOrderSide);
          setShowSelectedOption(true);
          dispatch(resetComboMode());
          dispatch(resetPairedOption());
        }}
      >
        <div className={twJoin("flex flex-col gap-y-2 flex-1")}>
          <div className={twJoin("flex flex-row gap-x-1 items-center h-10")}>
            <p
              className={twJoin(
                "font-semibold text-[#F0EBE5]",
                "text-[18px] leading-[27px] md:text-[20px] md:leading-[28px]"
              )}
            >
              {`${strikePrice} ${selectedOptionDirection}`}
            </p>
            <p
              className={twJoin(
                "font-normal text-[#E6FC8D]",
                "text-[11px] leading-[14px] md:text-[13px] md:leading-[17px]",
                "px-2 py-1 rounded-xl border border-solid border-[#333331]"
              )}
            >
              x
              {getLeverageText(leverage)}
            </p>
          </div>
          <div className={twJoin("flex flex-row gap-x-3")}>
            {/* Mark Price */}
            <div className={twJoin("flex flex-row gap-x-1 items-center")}>
              <p
                className={twJoin(
                  "font-medium text-[#9D9B98]",
                  "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]",
                  shouldDisableTrade ? "" : "opacity-[0.64]"
                )}
              >
                Mark Price
              </p>
              <p
                className={twJoin(
                  "font-medium text-[#F0EBE5]",
                  "text-[13px] leading-[18px] md:text-[15px] md:leading-[20px]"
                )}
              >
                {advancedFormatNumber(option.markPrice, 1, "$")}
              </p>
            </div>
            {/* Spread */}
            <div className={twJoin("flex flex-row gap-x-1 items-center")}>
              <p
                className={twJoin(
                  "font-medium text-[#9D9B98]",
                  "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]",
                  shouldDisableTrade ? "" : "opacity-[0.64]"
                )}
              >
                RP
              </p>
              <p
                className={twJoin(
                  "font-medium text-[#F0EBE5]",
                  "text-[13px] leading-[18px] md:text-[15px] md:leading-[20px]"
                )}
              >
                {selectedOrderSide === TradeOptionType.BUY
                  ? advancedFormatNumber(spreadForBuy, 2, "") + "%"
                  : advancedFormatNumber(spreadForSell, 2, "") + "%"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-y-[7px] justify-center items-center">
          {selectedOrderSide === TradeOptionType.BUY ? (
            <>
              <div
                className={twJoin(
                  "flex flex-col justify-center",
                  "min-w-[100px] p-[9px]",
                  "rounded border border-solid border-green63"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isBuyEnable) return;
                  setSelectedOption({
                    ...option,
                    markPrice: option.markPrice,
                    executionPrice: priceForBuy,
                    delta: option.delta,
                    gamma: option.gamma,
                    vega: option.vega,
                    theta: parsedTheta,
                    instrument: option.instrument,
                  });
                  dispatch(resetPairedOption());
                  dispatch(resetSlippage());
                  dispatch(resetComboMode());
                  setSelectedOrderSide(TradeOptionType.BUY);
                  setShowSelectedOptionHighLevel(true);
                }}
              >
                <p
                  className={twJoin(
                    "font-semibold",
                    "text-[13px] leading-[20px] md:text-[15px]",
                    "text-center text-green63"
                  )}
                >
                  {advancedFormatNumber(priceForBuy, 2, "$")}
                </p>
              </div>
              <div className={twJoin("flex flex-row gap-x-1 items-center")}>
                <p
                  className={twJoin(
                    "font-medium text-[#9D9B98]",
                    "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]",
                    shouldDisableTrade ? "" : "opacity-[0.64]"
                  )}
                >
                  Ask IV
                </p>
                <p
                  className={twJoin(
                    "font-medium text-[#F0EBE5]",
                    "text-[13px] leading-[18px] md:text-[15px] md:leading-[20px]"
                  )}
                >
                  {estimatedIvForBuy <= 0 || estimatedIvForBuy >= 3
                    ? "-"
                    : advancedFormatNumber(BigNumber(estimatedIvForBuy).multipliedBy(100).toNumber(), 1, "") +
                      "%"}
                </p>
              </div>
            </>
          ) : (
            <>
              <div
                className={twJoin(
                  "flex flex-col justify-center",
                  "min-w-[100px] p-[9px]",
                  "rounded border border-solid border-[#E03F3F]"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOption({
                    ...option,
                    markPrice: option.markPrice,
                    executionPrice: priceForSell,
                    delta: option.delta,
                    gamma: option.gamma,
                    vega: option.vega,
                    theta: parsedTheta,
                    instrument: option.instrument,
                  });
                  dispatch(resetComboMode());
                  dispatch(resetPairedOption());
                  dispatch(resetSlippage());
                  setSelectedOrderSide(TradeOptionType.SELL);
                  setShowSelectedOptionHighLevel(true);
                }}
              >
                <p
                  className={twJoin(
                    "font-semibold",
                    "text-[13px] leading-[20px] md:text-[15px]",
                    "text-center text-[#E03F3F]"
                  )}
                >
                  {advancedFormatNumber(priceForSell, 2, "$")}
                </p>
              </div>
              <div className={twJoin("flex flex-row gap-x-1 items-center")}>
                <p
                  className={twJoin(
                    "font-medium text-[#9D9B98]",
                    "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]",
                    shouldDisableTrade ? "" : "opacity-[0.64]"
                  )}
                >
                  Bid IV
                </p>
                <p
                  className={twJoin(
                    "font-medium text-[#F0EBE5]",
                    "text-[13px] leading-[18px] md:text-[15px] md:leading-[20px]"
                  )}
                >
                  {estimatedIvForSell <= 0 || estimatedIvForSell >= 3
                    ? "-"
                    : advancedFormatNumber(estimatedIvForSell * 100, 1, "") + "%"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {!shouldShowAssetPrice && isFuturesPriceIndexOutOfRange && (
        <div
          ref={bottomAssetPrice}
          className={twJoin(
            "flex justify-center items-center gap-x-1",
            "px-[6px] py-[7px] bg-[#232322] mt-[-1px]"
          )}
        >
          <p
            className={twJoin(
              "font-semibold text-[#E6FC8D]",
              "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
            )}
          >
            {`Underlying Futures: ${selectedUnderlyingAsset?.toUpperCase()}`}
          </p>
          <span
            className={twJoin(
              "font-semibold text-[#E6FC8D]",
              "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
            )}
          >
            {advancedFormatNumber(underlyingFutures, 2, "$")}
          </span>
        </div>
      )}
    </>
  );
};

export default TradeOptionsTableBody;
