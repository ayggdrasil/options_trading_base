import React, { useEffect, useMemo, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { advancedFormatNumber, getOlpKeyByVaultIndex } from "@/utils/helper";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { writeCreateClosePosition } from "@/utils/contract";
import { loadBalance } from "@/store/slices/UserSlice";
import {
  FlattenedPosition,
  NewPosition,
} from "@/interfaces/interfaces.positionSlice";
import { NetworkState } from "@/networks/types";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import {
  getUnderlyingAssetIndexByTicker,
  getUnderlyingAssetTickerByIndex,
} from "@/networks/helpers";
import {
  BaseQuoteAsset,
  calculateRiskPremiumRate,
  calculateUnderlyingFutures,
  FEE_RATES,
  FuturesAssetIndexMap,
  isCallStrategy,
  isVanillaCallStrategy,
  NetworkQuoteAsset,
  parseOptionTokenId,
  RiskFreeRateCollection,
  SpotAssetIndexMap,
  TRADE_FEE_CALCULATION_LIMIT_RATE,
  VolatilityScore,
} from "@callput/shared";
import {
  QA_INFO,
  UA_TICKER_TO_ADDRESS,
  UA_TICKER_TO_DECIMAL,
  UA_TICKER_TO_QA_TICKER,
} from "@/networks/assets";

import IconClose from "@assets/img/icon/close.png";
import Button from "@/components/Common/Button";
import { BN } from "@/utils/bn";
import { getMainAndPairedOptionData } from "../utils/options";
import DisplayWithTooltip from "../DisplayWithToolTip";
import WithTooltip from "@/components/Common/WithTooltip";

interface ClosePositionModalProps {
  position: FlattenedPosition;
  closeModal: () => void;
}

export const ClosePositionModal: React.FC<ClosePositionModalProps> = ({
  position,
  closeModal,
}) => {
  const dispatch = useAppDispatch();
  const { address } = useAccount();
  const { chain } = useAppSelector((state) => state.network) as NetworkState;

  const spotAssetIndexMap = useAppSelector(
    (state: any) => state.market.spotAssetIndexMap
  ) as SpotAssetIndexMap;
  const futuresAssetIndexMap = useAppSelector(
    (state: any) => state.market.futuresAssetIndexMap
  ) as FuturesAssetIndexMap;
  const riskFreeRateCollection = useAppSelector(
    (state: any) => state.market.riskFreeRateCollection
  ) as RiskFreeRateCollection;
  const olpStats = useAppSelector((state: any) => state.market.olpStats);
  const optionsInfo = useAppSelector((state: any) => state.market.optionsInfo);
  const volatilityScore = useAppSelector(
    (state: any) => state.market.volatilityScore
  ) as VolatilityScore;

  const optionTokenId = BigInt(position.optionTokenId);
  const { underlyingAssetIndex, strategy, vaultIndex } =
    parseOptionTokenId(optionTokenId);
  const underlyingAsset = getUnderlyingAssetTickerByIndex(
    chain,
    underlyingAssetIndex
  );

  const underlyingAssetSpotIndex = spotAssetIndexMap[underlyingAsset];
  const underlyingAssetFuturesIndex = futuresAssetIndexMap[underlyingAsset];
  const usdcSpotIndex = spotAssetIndexMap.usdc;
  const underlyingAssetVolatilityScore = volatilityScore[underlyingAsset];

  const instrument = position.metadata.instrument;
  const expiry = position.metadata.expiry;
  const isVanilla = position.metadata.optionStrategy === "Vanilla";
  const isCall = position.metadata.optionDirection === "Call";
  const isBuy = position.metadata.optionOrderSide === "Buy";

  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  // Token Related
  const [availableOptionSize, setAvailableOptionSize] = useState<number>(0);
  const [closeSize, setCloseSize] = useState<string>(position.size); // Close 물량
  const [closeSizeParsed, setCloseSizeParsed] = useState<string>(
    String(position.metadata.size)
  ); // Close 물량

  const [getAmount, setGetAmount] = useState<number>(0); // Get 물량 (Buy일 때 옵션 가격에 대한 가치를 USDC로 받고, Sell일 때 옵션 가격에 대한 가치를 제외한 Collateral을 받음)
  const [closingPrice, setClosingPrice] = useState<number>(0);
  const [isExceededCollateral, setIsExceededCollateral] =
    useState<boolean>(false);

  useEffect(() => {
    const { mainOption, pairedOption } = getMainAndPairedOptionData({
      position,
      strategy,
      optionsInfo,
    });

    const olpKey = getOlpKeyByVaultIndex(vaultIndex);
    const olpGreeks = olpStats[olpKey].greeks[underlyingAsset];
    const olpUtilityRatio = {
      sOlp: {
        utilizedUsd: olpStats.sOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.sOlp.utilityRatio.depositedUsd,
      },
      mOlp: {
        utilizedUsd: olpStats.mOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.mOlp.utilityRatio.depositedUsd,
      },
      lOlp: {
        utilizedUsd: olpStats.lOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.lOlp.utilityRatio.depositedUsd,
      },
    };

    const underlyingFutures = calculateUnderlyingFutures(
      underlyingAsset,
      expiry,
      futuresAssetIndexMap,
      riskFreeRateCollection
    );

    const { RP_rate: rpRateForVanilla } = calculateRiskPremiumRate({
      underlyingAsset: underlyingAsset,
      expiry: expiry,
      isOpen: false,
      orderSide: isBuy ? "Buy" : "Sell",
      optionDirection: isCall ? "Call" : "Put",
      mainOption: mainOption,
      pairedOption: null,
      size: Number(closeSizeParsed),
      underlyingFutures,
      underlyingAssetSpotIndex,
      underlyingAssetVolatilityScore,
      olpKey,
      olpGreeks,
      olpUtilityRatio,
    });

    const { RP_rate: rpRateForSpread } = calculateRiskPremiumRate({
      underlyingAsset: underlyingAsset,
      expiry: expiry,
      isOpen: false,
      orderSide: isBuy ? "Buy" : "Sell",
      optionDirection: isCall ? "Call" : "Put",
      mainOption: mainOption,
      pairedOption: pairedOption,
      size: Number(closeSizeParsed),
      underlyingFutures,
      underlyingAssetSpotIndex,
      underlyingAssetVolatilityScore,
      olpKey,
      olpGreeks,
      olpUtilityRatio,
    });

    const closingPrice = isVanilla
      ? isBuy
        ? position.metadata.lastPrice * (1 - rpRateForVanilla)
        : position.metadata.lastPrice * (1 + rpRateForVanilla)
      : isBuy
        ? position.metadata.lastPrice * (1 - rpRateForSpread)
        : position.metadata.lastPrice * (1 + rpRateForSpread);

    setClosingPrice(closingPrice);

    let availableOptionSize = 0;
    const olpAssetAmounts = olpStats[olpKey].assetAmounts;

    if (isBuy) {
      // Buy Call, Buy Put, Buy CallSpread, Buy PutSpread
      const usdcAvailableAmounts = new BN(
        olpAssetAmounts.usdc.availableAmount
      ).toNumber();
      availableOptionSize = new BN(usdcAvailableAmounts)
        .multipliedBy(usdcSpotIndex)
        .div(closingPrice)
        .toNumber();
    } else if (!isBuy && isVanillaCallStrategy(strategy)) {
      // Sell Call
      const underlyingAssetAvailableAmounts = new BN(
        underlyingAsset === "BTC"
          ? olpAssetAmounts.wbtc.availableAmount
          : olpAssetAmounts.weth.availableAmount
      ).toNumber();
      const paybackValue = new BN(underlyingAssetSpotIndex)
        .minus(closingPrice)
        .toNumber();

      if (paybackValue <= 0) {
        availableOptionSize = 0;
        setIsExceededCollateral(true);
      } else {
        availableOptionSize = new BN(underlyingAssetAvailableAmounts)
          .multipliedBy(underlyingAssetSpotIndex)
          .div(paybackValue)
          .toNumber();
        setIsExceededCollateral(false);
      }
    } else {
      // Sell Put, Sell CallSpread, Sell PutSpread
      const usdcAvailableAmounts = new BN(
        olpAssetAmounts.usdc.availableAmount
      ).toNumber();
      const collateralUsd = isVanilla
        ? new BN(position.mainOptionStrikePrice).toNumber()
        : new BN(position.mainOptionStrikePrice)
            .minus(position.pairedOptionStrikePrice)
            .abs()
            .toNumber();
      const paybackValue = new BN(collateralUsd).minus(closingPrice).toNumber();

      if (paybackValue <= 0) {
        availableOptionSize = 0;
        setIsExceededCollateral(true);
      } else {
        availableOptionSize = new BN(usdcAvailableAmounts)
          .multipliedBy(usdcSpotIndex)
          .div(paybackValue)
          .toNumber();
        setIsExceededCollateral(false);
      }
    }

    setAvailableOptionSize(availableOptionSize);
  }, [closeSize, underlyingAssetFuturesIndex, position.metadata.lastPrice]);

  // Slider Related
  const sliderRef = useRef<any>();
  const [sliderValue, setSliderValue] = useState<number>(100);

  // Initializing
  useEffect(() => {
    const closePayoffUsdWithSize = new BN(closeSizeParsed)
      .multipliedBy(closingPrice)
      .toNumber();

    const closePayoffAmountWithSize =
      !isBuy && isVanillaCallStrategy(strategy)
        ? new BN(closePayoffUsdWithSize)
            .dividedBy(underlyingAssetSpotIndex)
            .toNumber() // Sell Call
        : new BN(closePayoffUsdWithSize).dividedBy(usdcSpotIndex).toNumber(); // Buy Call, Buy Put, Sell Put, Buy CallSpread, Sell CallSpread, Buy PutSpread, Sell PutSpread

    const feeRate = isVanilla
      ? FEE_RATES.CLOSE_NAKED_POSITION
      : FEE_RATES.CLOSE_COMBO_POSITION;
    const feeUsd = new BN(closeSizeParsed)
      .multipliedBy(underlyingAssetSpotIndex)
      .multipliedBy(feeRate)
      .toNumber();
    const maxFeeUsd = new BN(closePayoffUsdWithSize)
      .multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE)
      .toNumber();
    const appliedFeeUsd = Math.min(feeUsd, maxFeeUsd);

    const feeAmount =
      !isBuy && isVanillaCallStrategy(strategy)
        ? new BN(appliedFeeUsd).dividedBy(underlyingAssetSpotIndex).toNumber()
        : new BN(appliedFeeUsd).dividedBy(usdcSpotIndex).toNumber();

    let getAmount;

    if (isBuy) {
      // Buy Call, Buy Put, Buy CallSpread, Buy PutSpread
      // Close 물량에 대한 가치를 USDC로 계산 (= 받아야 할 돈)
      getAmount = new BN(closePayoffAmountWithSize).minus(feeAmount).toNumber();
    } else {
      // Close 물량에 대한 가치 계산 후 받아야 할 Collateral에서 제외하는 계산 (= 받아야 할 돈)
      const collateralAmount = isVanilla
        ? isVanillaCallStrategy(strategy)
          ? Number(closeSizeParsed)
          : new BN(position.mainOptionStrikePrice)
              .multipliedBy(closeSizeParsed)
              .toNumber()
        : new BN(position.mainOptionStrikePrice)
            .minus(position.pairedOptionStrikePrice)
            .abs()
            .multipliedBy(closeSizeParsed)
            .toNumber();
      const collateralMinusClosePayoffAmount = new BN(collateralAmount)
        .minus(closePayoffAmountWithSize)
        .toNumber();

      if (collateralMinusClosePayoffAmount <= 0) {
        getAmount = 0;
      } else {
        getAmount = new BN(collateralMinusClosePayoffAmount)
          .minus(feeAmount)
          .toNumber();
      }
    }

    setGetAmount(getAmount);
  }, [closeSize, closingPrice]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.min(Number(e.target.value), 100);

    setSliderValue(newValue);

    const newCloseSize = new BN(position.size)
      .multipliedBy(newValue)
      .div(100)
      .toFixed(0);
    const newCloseSizeParsed = BN(position.metadata.size)
      .multipliedBy(newValue)
      .div(100)
      .toFixed(UA_TICKER_TO_DECIMAL[chain][underlyingAsset]);

    setCloseSize(newCloseSize);
    setCloseSizeParsed(newCloseSizeParsed);
  };

  const calculateSliderPercentagePosition = () => {
    if (sliderRef.current) {
      const sliderWidth = 200;
      const thumbWidth = sliderWidth / sliderRef.current.max; // Assume the thumb is 1/max of the slider
      const thumbPosition = thumbWidth * sliderValue;

      return thumbPosition - thumbWidth / 2; // Center it
    }

    return 0;
  };

  const [sliderPercentagePosition, setSliderPercentagePosition] = useState(
    calculateSliderPercentagePosition
  );

  // Update position whenever the slider value changes
  useEffect(() => {
    setSliderPercentagePosition(calculateSliderPercentagePosition());
  }, [sliderValue]);

  const closePayoff = isBuy
    ? new BN(closingPrice).minus(position.metadata.avgPrice).toNumber()
    : new BN(position.metadata.avgPrice).minus(closingPrice).toNumber();

  let pnl = 0;
  let roi = 0;

  if (isBuy) {
    pnl = new BN(closePayoff).multipliedBy(position.metadata.size).toNumber();
    roi = new BN(closePayoff)
      .div(position.metadata.avgPrice)
      .multipliedBy(100)
      .toNumber();
  } else {
    let maxClosePayoff = 0;

    if (isVanillaCallStrategy(strategy)) {
      maxClosePayoff =
        closePayoff < 0
          ? Math.max(closePayoff, -underlyingAssetSpotIndex)
          : closePayoff;
    } else {
      const collateralUsd = isVanilla
        ? new BN(position.mainOptionStrikePrice).toNumber()
        : new BN(position.mainOptionStrikePrice)
            .minus(position.pairedOptionStrikePrice)
            .abs()
            .toNumber();

      maxClosePayoff =
        closePayoff < 0 ? Math.max(closePayoff, -collateralUsd) : closePayoff;
    }

    pnl = new BN(maxClosePayoff)
      .multipliedBy(position.metadata.size)
      .toNumber();
    roi = new BN(maxClosePayoff)
      .div(position.metadata.avgPrice)
      .multipliedBy(100)
      .toNumber();
  }

  const realizedPnl = BN(pnl)
    .multipliedBy(closeSizeParsed)
    .div(position.metadata.size)
    .toNumber();

  const handleCreateClosePosition = async () => {
    setIsButtonLoading(true);

    const closedCollateralToken = isBuy
      ? ""
      : isVanillaCallStrategy(strategy)
        ? UA_TICKER_TO_QA_TICKER[chain][underlyingAsset]
        : BaseQuoteAsset.USDC;

    const txInfo: NewPosition = {
      isOpen: false,
      underlyingAsset: underlyingAsset,
      underlyingAssetAddress: position.underlyingAsset,
      expiry: expiry,
      optionTokenId: String(optionTokenId),
      length: position.length,
      mainOptionStrikePrice: position.mainOptionStrikePrice,
      pairedOptionStrikePrice: position.pairedOptionStrikePrice,
      isBuys: position.isBuys,
      strikePrices: position.strikePrices,
      isCalls: position.isCalls,
      optionNames: position.optionNames,
      size: closeSize,
      executionPrice: "0",
      closedCollateralToken: closedCollateralToken,
      closedCollateralAmount: "0",
      lastProcessBlockTime: "0",
    };

    const quoteToken =
      !isBuy && isVanillaCallStrategy(strategy)
        ? UA_TICKER_TO_ADDRESS[chain][underlyingAsset]
        : CONTRACT_ADDRESSES[chain].USDC;

    const result = await writeCreateClosePosition(
      getUnderlyingAssetIndexByTicker(chain, underlyingAsset),
      String(optionTokenId),
      BigInt(closeSize),
      [quoteToken],
      BigInt(0),
      BigInt(0),
      false,
      txInfo,
      chain
    );

    if (result && address) {
      dispatch(loadBalance({ chain, address }));
      closeModal();
    }

    setIsButtonLoading(false);
  };

  const isButtonError = useMemo(() => {
    const isAvaialbleExceeded = new BN(closeSize).gt(
      new BN(availableOptionSize).multipliedBy(
        10 ** UA_TICKER_TO_DECIMAL[chain][underlyingAsset]
      )
    );
    const isInsufficientBalance = new BN(closeSize).gt(position.size);
    return isExceededCollateral || isAvaialbleExceeded || isInsufficientBalance;
  }, [closeSize, availableOptionSize, position.size, isExceededCollateral]);

  const renderButton = () => {
    if (isButtonLoading)
      return <Button name="..." color="default" disabled onClick={() => {}} />;

    let buttonName = isBuy ? "Close Buy Position" : "Close Sell Position";

    const isButtonDisabled =
      !address ||
      !closeSize ||
      BN(closeSize).lte(0) ||
      BN(closeSize).gt(position.size);

    return (
      <Button
        name={buttonName}
        color="blue"
        isError={isButtonError}
        disabled={isButtonDisabled}
        onClick={handleCreateClosePosition}
      />
    );
  };

  return (
    <div
      className={twJoin(
        "w-[368px] h-fit p-[24px] bg-black181a rounded-[10px]",
        "flex flex-col items-start gap-[24px]",
        "border-[1px] border-solid border-black2023",
        "shadow-[0px_6px_36px_0px_rgba(0,0,0,0.2)]"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with title and close button */}
      <div className="w-full h-[32px] flex flex-row items-center justify-between">
        <p className="h-full text-blue278e text-[20px] font-[700] leading-[32px]">
          Close Position
        </p>
        <img
          className="cursor-pointer w-[32px] h-[32px]"
          src={IconClose}
          onClick={closeModal}
          alt="Close"
        />
      </div>

      <div className="w-full h-fit flex flex-col gap-[16px]">
        {/* Instrument and paired option strike price */}
        <div
          className={twJoin(
            "w-full h-[24px] flex flex-row items-center justify-center gap-[5px]",
            "text-[15px] text-center font-[600] leading-[24px]"
          )}
        >
          <p
            className={twJoin(
              "text-[15px] text-center font-[600] leading-[24px]",
              isBuy ? "text-green71b8" : "text-rede04a"
            )}
          >
            {isBuy ? "Buy" : "Sell"} {instrument}
          </p>
          {!isVanilla && (
            <p
              className={twJoin(
                "text-gray8c8c text-[13px] font-[500] leading-[16px]",
                isCallStrategy(strategy)
                  ? "border-t-[1.4px] border-t-gray8c8c"
                  : "border-b-[1.4px] border-b-gray8c8c"
              )}
            >
              {position.pairedOptionStrikePrice}
            </p>
          )}
        </div>

        {/* Closing Details */}
        <div
          className={twJoin(
            "w-full h-fit flex flex-col gap-[4px] px-[20px] py-[12px]",
            "rounded-[4px] bg-black2023",
            "text-[14px] font-[500] leading-[24px]"
          )}
        >
          <div className="flex flex-row justify-between items-center h-[24px]">
            <DisplayWithTooltip
              title="Order Price"
              tooltipContent={<p>Price of options paid in USD</p>}
              className="text-gray8c8c"
            />
            <div className="text-whitef2f2 font-[600]">
              <p>{advancedFormatNumber(position.metadata.avgPrice, 2, "$")}</p>
            </div>
          </div>
          <div className="flex flex-row justify-between items-center h-[24px]">
            <div className="text-gray8c8c">Closing Price</div>
            <div className="text-whitef2f2 font-[600]">
              <p>{advancedFormatNumber(closingPrice, 2, "$")}</p>
            </div>
          </div>
          <div className="flex flex-row justify-between items-center h-[24px]">
            <DisplayWithTooltip
              title="Closing Payoff"
              tooltipContent={
                <p>
                  {isBuy
                    ? "Closing Price - Order Price"
                    : "Order Price - Closing Price"}
                </p>
              }
              className="text-gray8c8c"
            />

            <div className="text-whitef2f2 font-[600]">
              {closePayoff === 0 ? (
                <p>$0.00</p>
              ) : (
                <p
                  className={
                    closePayoff > 0 ? "text-green71b8" : "text-rede04a"
                  }
                >
                  {advancedFormatNumber(closePayoff, 2, "$")}
                </p>
              )}
            </div>
          </div>

          <div className="my-[6px] w-full h-[1px] bg-black292c" />

          <div className="flex flex-row justify-between items-center h-[24px]">
            <div className="text-gray8c8c">Quantity</div>
            <div className="text-whitef2f2 font-[600]">
              {advancedFormatNumber(position.metadata.size, 4, "")}
            </div>
          </div>
          <div className="flex flex-row justify-between items-center h-[24px]">
            <DisplayWithTooltip
              title="Position P&L"
              tooltipContent={<p>Closing Payoff × Qty.</p>}
              className="text-gray8c8c"
            />
            <div className="text-whitef2f2 font-[600]">
              {pnl === 0 ? (
                <p>$0.00</p>
              ) : (
                <p className={pnl > 0 ? "text-green71b8" : "text-rede04a"}>
                  {advancedFormatNumber(pnl, 2, "$")}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-row justify-between items-center h-[24px]">
            <DisplayWithTooltip
              title="ROI"
              tooltipContent={<p>Closing Payoff / Order Price × 100</p>}
              className="text-gray8c8c"
            />

            <div className="text-whitef2f2 font-[600]">
              {roi === 0 ? (
                <p>0.00%</p>
              ) : (
                <p className={roi > 0 ? "text-green71b8" : "text-rede04a"}>
                  {advancedFormatNumber(roi, 2, "")}%
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Closing Quantity */}
        <div
          className={twJoin(
            "flex flex-col gap-[12px]",
            "w-full h-fit",
            "rounded-[4px] bg-black2023",
            "px-[20px] py-[12px]"
          )}
        >
          <div className="flex flex-row justify-between items-center h-[24px]">
            <p className="text-[14px] text-gray8c8c font-[600] leading-[16px]">
              <span>Closing Quantity</span>
            </p>
            <div className="flex flex-row justify-end">
              <DisplayWithTooltip
                title={`${isExceededCollateral ? "-" : advancedFormatNumber(availableOptionSize, 4, "")} Available`}
                tooltipContent={
                  <p>
                    Max Amount OLPs allowed for traders to close positions
                    depending on free liquidity. This amount may be smaller than
                    positions you have opened.
                  </p>
                }
                className="text-[12px] text-gray8c8c font-[500] leading-[16px]"
              />
            </div>
          </div>
          <div
            className={twJoin(
              "h-[44px] flex flex-row justify-center items-center",
              "rounded-[4px] bg-black181a border-[1px] border-solid border-black2023",
              "p-[8px] pl-[18px]",
              isButtonError ? "border-rede04a" : "border-black2023"
            )}
          >
            <input
              value={closeSizeParsed}
              placeholder="0"
              className={twJoin(
                "w-full",
                "text-whitef2f2 text-[16px] font-[700] leading-[28px] bg-transparent",
                "focus:outline-none",
                "placeholder:text-[16px] placeholder-gray8c8c placeholder:font-[700] leading-[28px]"
              )}
              onChange={(e) => {
                if (e.target.value.includes(" ")) return;
                if (isNaN(Number(e.target.value))) return;

                const closeSizeParsed = e.target.value.replace(/^0+(?=\d)/, "");
                let closeSize = new BN(closeSizeParsed)
                  .multipliedBy(
                    10 ** UA_TICKER_TO_DECIMAL[chain][underlyingAsset]
                  )
                  .toFixed(0);

                setCloseSizeParsed(e.target.value.replace(/^0+(?=\d)/, ""));
                setCloseSize(closeSize);

                // calculate slider value
                let newSliderValue = BN(e.target.value)
                  .div(position.metadata.size)
                  .multipliedBy(100)
                  .toNumber();
                if (BN(newSliderValue).isGreaterThan(100)) newSliderValue = 100;
                if (isNaN(newSliderValue)) newSliderValue = 0;

                setSliderValue(Math.round(newSliderValue));
              }}
              onFocus={handleFocus}
            />
            <p className="mx-[8px] text-gray4b50 text-[14px] font-[600] leading-[28px]">
              Contracts
            </p>
          </div>
          <div className="hidden relative mt-[32px] flex flex-row justify-between items-center text-[12px] text-gray8c8c font-[600]">
            <div className="w-[17px]">0%</div>
            <input
              type="range"
              ref={sliderRef}
              min="0"
              max="100"
              value={sliderValue}
              className="slider"
              id="myRange"
              onChange={handleSliderChange}
              style={{
                background: `linear-gradient(90deg, #71B842 ${sliderValue}%, #181a1f ${sliderValue}%)`,
              }}
            />
            <div className="w-[33px]">100%</div>
            <div
              style={{ left: `${sliderPercentagePosition + 8}px` }}
              className="absolute top-[25px] w-[58px] h-[28px]"
            >
              <div
                style={{}}
                className={twJoin(
                  "relative",
                  "w-full h-full bg-black2023 border-[1px] border-black292c",
                  "flex flex-row justify-center items-center text-[12px] text-green71b8 font-[600] rounded-[4px]"
                )}
              >
                {sliderValue}%
                <div className="absolute top-0 left-1/2 w-0 h-0 border-[6px] border-solid border-transparent border-b-black292c border-t-0 ml-[-6px] mt-[-6px]"></div>
                <div className="absolute top-0 left-1/2 w-0 h-0 border-[4px] border-solid border-transparent border-b-black2023 border-t-0 ml-[-4px] mt-[-4px]"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[5px] px-[20px]">
          {/* You'll get */}
          <div className="h-[40px] flex flex-row justify-between items-start">
            <DisplayWithTooltip
              title="You'll get"
              tooltipContent={
                isBuy ? (
                  <>
                    <p className="text-[12px] text-gray80 leading-[0.85rem]">
                      Estimated token amount to get after trade fee.
                    </p>
                    <p className="text-[11px] text-[#666] font-normal">
                      Closing Price × Closing Qty. - Total Trade Fee
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] text-gray80 leading-[0.85rem]">
                      Estimated token amount to get after trade fee.
                    </p>
                    <p className="text-[11px] text-[#666] font-normal">
                      (Collateral per Option - Closing Price) × Closing Qty. -
                      Total Trade Fee
                    </p>
                  </>
                )
              }
              className="text-gray8c8c text-[14px] font-[500] leading-[24px]"
            />

            <div className="flex flex-col gap-[2px]">
              <div className="flex flex-row items-center gap-[4px]">
                {!isBuy && isVanillaCallStrategy(strategy) ? (
                  <img
                    src={
                      QA_INFO[chain][
                        UA_TICKER_TO_QA_TICKER[chain][
                          underlyingAsset
                        ] as keyof (typeof NetworkQuoteAsset)[typeof chain]
                      ].src
                    }
                    className="w-[24px] h-[24px] min-w-[24px] min-h-[24px]"
                  />
                ) : (
                  <img
                    src={QA_INFO[chain][NetworkQuoteAsset[chain].USDC].src}
                    className="w-[24px] h-[24px] min-w-[24px] min-h-[24px]"
                  />
                )}
                <p className="text-whitef2f2 text-[15px] font-[600] leading-[24px]">
                  {isExceededCollateral
                    ? "-"
                    : advancedFormatNumber(getAmount, 4, "")}
                </p>
              </div>
              <div
                className={twJoin(
                  "flex flex-row justify-end",
                  "text-gray8c8c text-[12px] font-[500] leading-[14px]"
                )}
              >
                {isExceededCollateral ? (
                  <p>-</p>
                ) : !isBuy && isVanillaCallStrategy(strategy) ? (
                  <p>
                    {advancedFormatNumber(
                      new BN(getAmount)
                        .multipliedBy(underlyingAssetSpotIndex)
                        .toNumber(),
                      2,
                      "$"
                    )}
                  </p>
                ) : (
                  <p>
                    {advancedFormatNumber(
                      new BN(getAmount).multipliedBy(usdcSpotIndex).toNumber(),
                      2,
                      "$"
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Realized P&L */}
          <div className="h-[24px] flex flex-row justify-between items-center">
            <DisplayWithTooltip
              title="Realized P&L"
              tooltipContent={<p>P&L × Partial Closing Ratio</p>}
              className="text-gray8c8c text-[14px] font-[500] leading-[24px]"
            />
            <div
              className={twJoin(
                "flex flex-row justify-end",
                "text-whitef2f2 text-[15px] font-[600] leading-[24px]"
              )}
            >
              {isExceededCollateral ? (
                <p>-</p>
              ) : realizedPnl === 0 ? (
                <p>$0.00</p>
              ) : (
                <p>
                  {advancedFormatNumber(
                    BN(realizedPnl)
                      .multipliedBy(closeSizeParsed)
                      .div(position.metadata.size)
                      .toNumber(),
                    2,
                    "$"
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-[48px]">{renderButton()}</div>
    </div>
  );
};
