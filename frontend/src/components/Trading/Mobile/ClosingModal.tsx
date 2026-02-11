import BigNumber from "bignumber.js";
import React, { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { advancedFormatNumber, getOlpKeyByVaultIndex } from "@/utils/helper";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { writeCreateClosePosition } from "@/utils/contract";
import { loadBalance } from "@/store/slices/UserSlice";
import { NewPosition, Position } from "@/interfaces/interfaces.positionSlice";
import Button from "../../Common/Button";
import { QA_INFO, UA_TICKER_TO_ADDRESS, UA_TICKER_TO_DECIMAL, UA_TICKER_TO_QA_TICKER } from "@/networks/assets";
import { BaseQuoteAsset, calculateRiskPremiumRate, calculateUnderlyingFutures, FEE_RATES, FuturesAssetIndexMap, isCallStrategy, isVanillaCallStrategy, NetworkQuoteAsset, parseOptionTokenId, RiskFreeRateCollection, SpotAssetIndexMap, TRADE_FEE_CALCULATION_LIMIT_RATE, UnderlyingAsset, VolatilityScore } from "@callput/shared";
import { getUnderlyingAssetIndexByTicker } from "@/networks/helpers";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { NetworkState } from "@/networks/types";
import { getMainAndPairedOptionData } from "../../TradingV2/utils/options";
import { IOptionsInfo } from "../../../interfaces/interfaces.marketSlice";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface ModalProps {
  data: any;
  closeModal: () => void;
}

export const ClosingModal: React.FC<ModalProps> = ({ data, closeModal: _closeModal }) => {
  const dispatch = useAppDispatch();
  const { address } = useAccount();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const optionsInfo = useAppSelector((state: any) => state.market.optionsInfo) as IOptionsInfo;
  const olpStats = useAppSelector((state: any) => state.market.olpStats);
  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;
  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;
  const riskFreeRateCollection = useAppSelector((state: any) => state.market.riskFreeRateCollection) as RiskFreeRateCollection;
  const volatilityScore = useAppSelector((state: any) => state.market.volatilityScore) as VolatilityScore;

  const selectedUnderlyingAsset = data.selectedUnderlyingAsset as UnderlyingAsset;
  const underlyingAssetSpotIndex = spotAssetIndexMap[selectedUnderlyingAsset];
  const underlyingAssetVolatilityScore = volatilityScore[selectedUnderlyingAsset];
  const stableAssetSpotIndex = spotAssetIndexMap.usdc;
  const isBuy = data.position.isBuy;

  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  // Token Related
  const [availableOptionSize, setAvailableOptionSize] = useState<number>(0);
  const [closeSize, setCloseSize] = useState<string>(data.metrics.size); // Close 물량
  const [closeSizeParsed, setCloseSizeParsed] = useState<string>(data.metrics.parsedSize); // Close 물량

  const [getAmount, setGetAmount] = useState<number>(0); // Get 물량 (Buy일 때 옵션 가격에 대한 가치를 USDC로 받고, Sell일 때 옵션 가격에 대한 가치를 제외한 Collateral을 받음)
  const [closingPrice, setClosingPrice] = useState<number>(0);
  const [isExceededCollateral, setIsExceededCollateral] = useState<boolean>(false);

  useEffect(() => {
    const position = data.position as Position;
    const optionTokenId = BigInt(data.position.optionTokenId);
    const { strategy, vaultIndex } = parseOptionTokenId(optionTokenId);

    const { mainOption, pairedOption } = getMainAndPairedOptionData({
      position,
      strategy,
      optionsInfo,
    });

    const olpKey = getOlpKeyByVaultIndex(vaultIndex);
    const olpGreeks = olpStats[olpKey].greeks[selectedUnderlyingAsset];
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

    const isCall = isCallStrategy(data.metrics.strategy);

    const underlyingFutures = calculateUnderlyingFutures(
      selectedUnderlyingAsset,
      data.expiry,
      futuresAssetIndexMap,
      riskFreeRateCollection
    );

    const { RP_rate: rpRate } = calculateRiskPremiumRate({
      underlyingAsset: selectedUnderlyingAsset,
      expiry: data.expiry,
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
    })

    const { RP_rate: rpRateAtComboMode } = calculateRiskPremiumRate({
      underlyingAsset: selectedUnderlyingAsset,
      expiry: data.expiry,
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
    })

    const closingPrice = data.metrics.isCombo
      ? isBuy
        ? data.metrics.parsedMarkPrice * (1 - rpRateAtComboMode)
        : data.metrics.parsedMarkPrice * (1 + rpRateAtComboMode)
      : isBuy
      ? data.metrics.parsedMarkPrice * (1 - rpRate)
      : data.metrics.parsedMarkPrice * (1 + rpRate);

    setClosingPrice(closingPrice);

    let availableOptionSize = 0;
    const olpAssetAmounts = olpStats[olpKey].assetAmounts;

    if (isBuy) {
      // Buy Call, Buy Put, Buy CallSpread, Buy PutSpread
      const usdcAvailableAmounts = new BigNumber(olpAssetAmounts.usdc.availableAmount).toNumber();
      availableOptionSize = new BigNumber(usdcAvailableAmounts)
        .multipliedBy(stableAssetSpotIndex)
        .div(closingPrice)
        .toNumber();
    } else if (!isBuy && isVanillaCallStrategy(data.metrics.strategy)) {
      // Sell Call
      const underlyingAssetAvailableAmounts = new BigNumber(
        selectedUnderlyingAsset === "BTC"
          ? olpAssetAmounts.wbtc.availableAmount
          : olpAssetAmounts.weth.availableAmount
      ).toNumber();
      const paybackValue = new BigNumber(underlyingAssetSpotIndex).minus(closingPrice).toNumber();

      if (paybackValue <= 0) {
        availableOptionSize = 0;
        setIsExceededCollateral(true);
      } else {
        availableOptionSize = new BigNumber(underlyingAssetAvailableAmounts)
          .multipliedBy(underlyingAssetSpotIndex)
          .div(paybackValue)
          .toNumber();
        setIsExceededCollateral(false);
      }
    } else {
      // Sell Put, Sell CallSpread, Sell PutSpread
      const usdcAvailableAmounts = new BigNumber(olpAssetAmounts.usdc.availableAmount).toNumber();
      const collateralUsd = data.metrics.isCombo
        ? new BigNumber(data.position.mainOptionStrikePrice)
            .minus(data.position.pairedOptionStrikePrice)
            .abs()
            .toNumber()
        : new BigNumber(data.position.mainOptionStrikePrice).toNumber();
      const paybackValue = new BigNumber(collateralUsd).minus(closingPrice).toNumber();

      if (paybackValue <= 0) {
        availableOptionSize = 0;
        setIsExceededCollateral(true);
      } else {
        availableOptionSize = new BigNumber(usdcAvailableAmounts)
          .multipliedBy(stableAssetSpotIndex)
          .div(paybackValue)
          .toNumber();
        setIsExceededCollateral(false);
      }
    }

    setAvailableOptionSize(availableOptionSize);
  }, [closeSize, data.futuresPrice, data.metrics.parsedMarkPrice]);

  // Slider Related
  const sliderRef = useRef<any>();
  const [sliderValue, setSliderValue] = useState<number>(100);

  // Initializing
  useEffect(() => {
    const closePayoffUsdWithSize = new BigNumber(closeSizeParsed).multipliedBy(closingPrice).toNumber();

    const closePayoffAmountWithSize =
      !isBuy && isVanillaCallStrategy(data.metrics.strategy)
        ? new BigNumber(closePayoffUsdWithSize).dividedBy(underlyingAssetSpotIndex).toNumber() // Sell Call
        : new BigNumber(closePayoffUsdWithSize).dividedBy(stableAssetSpotIndex).toNumber(); // Buy Call, Buy Put, Sell Put, Buy CallSpread, Sell CallSpread, Buy PutSpread, Sell PutSpread

    const feeRate = data.metrics.isCombo ? FEE_RATES.CLOSE_COMBO_POSITION : FEE_RATES.CLOSE_NAKED_POSITION;
    const feeUsd = new BigNumber(closeSizeParsed)
      .multipliedBy(underlyingAssetSpotIndex)
      .multipliedBy(feeRate)
      .toNumber();
    const maxFeeUsd = new BigNumber(closePayoffUsdWithSize)
      .multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE)
      .toNumber();
    const appliedFeeUsd = Math.min(feeUsd, maxFeeUsd);

    const feeAmount =
      !isBuy && isVanillaCallStrategy(data.metrics.strategy)
        ? new BigNumber(appliedFeeUsd).dividedBy(underlyingAssetSpotIndex).toNumber()
        : new BigNumber(appliedFeeUsd).dividedBy(stableAssetSpotIndex).toNumber();

    let getAmount;

    if (isBuy) {
      // Buy Call, Buy Put, Buy CallSpread, Buy PutSpread
      // Close 물량에 대한 가치를 USDC로 계산 (= 받아야 할 돈)
      getAmount = new BigNumber(closePayoffAmountWithSize).minus(feeAmount).toNumber();
    } else {
      // Close 물량에 대한 가치 계산 후 받아야 할 Collateral에서 제외하는 계산 (= 받아야 할 돈)
      const collateralAmount = data.metrics.isCombo
        ? new BigNumber(data.position.mainOptionStrikePrice)
            .minus(data.position.pairedOptionStrikePrice)
            .abs()
            .multipliedBy(closeSizeParsed)
            .toNumber()
        : isVanillaCallStrategy(data.metrics.strategy)
        ? Number(closeSizeParsed)
        : new BigNumber(data.position.mainOptionStrikePrice).multipliedBy(closeSizeParsed).toNumber();
      const collateralMinusClosePayoffAmount = new BigNumber(collateralAmount)
        .minus(closePayoffAmountWithSize)
        .toNumber();

      if (collateralMinusClosePayoffAmount <= 0) {
        getAmount = 0;
      } else {
        getAmount = new BigNumber(collateralMinusClosePayoffAmount).minus(feeAmount).toNumber();
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

    const newCloseSize = new BigNumber(data.metrics.size).multipliedBy(newValue).div(100).toFixed(0);
    const newCloseSizeParsed = BigNumber(data.metrics.parsedSize)
      .multipliedBy(newValue)
      .div(100)
      .toFixed(UA_TICKER_TO_DECIMAL[chain][selectedUnderlyingAsset as UnderlyingAsset]);

    setCloseSize(newCloseSize);
    setCloseSizeParsed(newCloseSizeParsed);
  };

  const closePayoff = isBuy
    ? new BigNumber(closingPrice).minus(data.metrics.parsedExecutionPrice).toNumber()
    : new BigNumber(data.metrics.parsedExecutionPrice).minus(closingPrice).toNumber();

  let pnl = 0;
  let roi = 0;

  if (isBuy) {
    pnl = new BigNumber(closePayoff).multipliedBy(data.metrics.parsedSize).toNumber();
    roi = new BigNumber(closePayoff).div(data.metrics.parsedExecutionPrice).multipliedBy(100).toNumber();
  } else {
    let maxClosePayoff = 0;

    if (isVanillaCallStrategy(data.metrics.strategy)) {
      maxClosePayoff = closePayoff < 0 ? Math.max(closePayoff, -underlyingAssetSpotIndex) : closePayoff;
    } else {
      const collateralUsd = data.metrics.isCombo
        ? new BigNumber(data.position.mainOptionStrikePrice)
            .minus(data.position.pairedOptionStrikePrice)
            .abs()
            .toNumber()
        : new BigNumber(data.position.mainOptionStrikePrice).toNumber();

      maxClosePayoff = closePayoff < 0 ? Math.max(closePayoff, -collateralUsd) : closePayoff;
    }

    pnl = new BigNumber(maxClosePayoff).multipliedBy(data.metrics.parsedSize).toNumber();
    roi = new BigNumber(maxClosePayoff).div(data.metrics.parsedExecutionPrice).multipliedBy(100).toNumber();
  }

  const realizedPnl = BigNumber(pnl).multipliedBy(closeSizeParsed).div(data.metrics.parsedSize).toNumber();

  const handleCreateClosePosition = async () => {
    setIsButtonLoading(true);

    const closedCollateralToken = isBuy
    ? ""
    : isVanillaCallStrategy(data.metrics.strategy)
      ? UA_TICKER_TO_QA_TICKER[chain][selectedUnderlyingAsset]
      : BaseQuoteAsset.USDC;

    const txInfo: NewPosition = {
      isOpen: false,
      underlyingAsset: selectedUnderlyingAsset,
      underlyingAssetAddress: data.position.underlyingAsset,
      expiry: data.expiry,
      optionTokenId: data.position.optionTokenId,
      length: data.position.length,
      mainOptionStrikePrice: data.position.mainOptionStrikePrice,
      pairedOptionStrikePrice: data.position.pairedOptionStrikePrice,
      isBuys: data.position.isBuys,
      strikePrices: data.position.strikePrices,
      isCalls: data.position.isCalls,
      optionNames: data.position.optionNames,
      size: closeSize,
      executionPrice: "0",
      closedCollateralToken: closedCollateralToken,
      closedCollateralAmount: "0",
      lastProcessBlockTime: "0",
    };

    const quoteToken =
      !isBuy && isVanillaCallStrategy(data.metrics.strategy)
        ? UA_TICKER_TO_ADDRESS[chain][selectedUnderlyingAsset]
        : CONTRACT_ADDRESSES[chain].USDC;

    const result = await writeCreateClosePosition(
      getUnderlyingAssetIndexByTicker(chain, selectedUnderlyingAsset),
      data.position.optionTokenId,
      BigInt(closeSize),
      [quoteToken],
      BigInt(0),
      BigInt(0),
      false,
      txInfo,
      chain
    );

    if (result && address) {
      dispatch(
        loadBalance({ chain, address })
      );
      _closeModal();
    }

    setIsButtonLoading(false);
  };

  const renderButton = () => {
    if (isButtonLoading) return <Button name="..." color="default" disabled onClick={() => {}} />;

    let buttonName = isBuy ? "Close Buy Position" : "Close Sell Position";

    const isButtonDisabled =
      !address || !closeSize || BigNumber(closeSize).lte(0) || BigNumber(closeSize).gt(data.metrics.size);

    const isAvaialbleExceeded = new BigNumber(closeSize).gt(
      new BigNumber(availableOptionSize).multipliedBy(10 ** UA_TICKER_TO_DECIMAL[chain][selectedUnderlyingAsset as UnderlyingAsset])
    );
    const isInsufficientBalance = new BigNumber(closeSize).gt(data.metrics.size);
    const isButtonError = isExceededCollateral || isAvaialbleExceeded || isInsufficientBalance;

    if (isButtonError) {
      if (isExceededCollateral) {
        buttonName = `Closing Premium Exceeds Collateral`;
      } else if (isAvaialbleExceeded) {
        buttonName = `Exceeded Available Option Size`;
      } else if (isInsufficientBalance) {
        buttonName = `Insufficient Option Token Balance`;
      }
    } else if (!closeSize || Number(closeSize) === 0) {
      buttonName = `Enter or Increase Amount to Close`;
    }

    return (
      <Button
        name={buttonName}
        color="default"
        className="text-[14px] md:text-[16px]"
        isError={isButtonError}
        disabled={isButtonDisabled}
        onClick={handleCreateClosePosition}
      />
    );
  };

  return (
    <>
      {data && (
        <div className={twJoin("flex flex-col overflow-auto")} onClick={(e) => e.stopPropagation()}>
          <div className="relative flex flex-row justify-center items-center w-full mb-5">
            <div className="text-greene6 text-[20px] md:text-[22px] leading-6 font-bold">Closing</div>
          </div>

          <div className="w-full h-[1px] bg-black29" />

          <div
            className={twJoin(
              "mt-[26px] px-[24px] flex flex-row gap-[4px] w-full h-[39px]",
              "text-[13px] text-gray8b font-semibold text-center"
            )}
          >
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-gray9D text-xs md:text-sm">Instrument</div>
              <div className="flex flex-row items-center justify-center gap-[6px]">
                <p className="text-sm md:text-base font-bold text-contentBright">
                  {data.metrics.mainOptionName}
                </p>
                {data.metrics.isCombo && (
                  <p
                    className={twJoin(
                      "text-[10px]",
                      isCallStrategy(data.metrics.strategy)
                        ? "border-t-[1.4px] border-t-gray80"
                        : "border-b-[1.4px] border-b-gray80"
                    )}
                  >
                    {data.position.pairedOptionStrikePrice}
                  </p>
                )}
              </div>
            </div>
            <div className="w-[35%] flex flex-col justify-center">
              <div className="text-gray9D text-xs md:text-sm">Position</div>
              {isBuy ? (
                <div className="text-sm md:text-base font-bold text-green63">Buy</div>
              ) : (
                <div className="text-sm md:text-base font-bold text-redE0">Sell</div>
              )}
            </div>
          </div>

          <div className="px-3 md:px-6 mt-5">
            <div
              className={twJoin(
                "p-3 md:p-6 flex flex-col gap-[10px]",
                "rounded-lg bg-[#111613D9] text-sm md:text-base"
              )}
            >
              <div className="flex flex-row justify-between items-center font-semibold h-[18px]">
                <div>
                  <p className="text-gray9D text-sm md:text-base">Order Price</p>
                </div>

                <div className="text-sm md:text-base text-contentBright">
                  <p>{advancedFormatNumber(data.metrics.parsedExecutionPrice, 2, "$")}</p>
                </div>
              </div>
              <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
                <div className="text-gray9D">Closing Price</div>
                <div className="text-sm md:text-base text-contentBright">
                  <p>{advancedFormatNumber(closingPrice, 2, "$")}</p>
                </div>
              </div>
              <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
                <div>
                  <p className="text-gray9D text-sm md:text-base">Closing Payoff</p>
                </div>

                <div className="text-sm md:text-base">
                  {closePayoff === 0 ? (
                    <p className="text">$0.00</p>
                  ) : (
                    <p className={closePayoff > 0 ? "text-green63" : "text-redE0"}>
                      {advancedFormatNumber(closePayoff, 2, "$")}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-[14px] w-full h-[1px] bg-black29" />

              <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[11px]">
                <div className="text-gray9D">Quantity</div>
                <div className="text-sm md:text-base text-contentBright">
                  {advancedFormatNumber(data.metrics.parsedSize, 4, "")}
                </div>
              </div>
              <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
                <div>
                  <p className="text-gray9D text-sm md:text-base">Position P&L</p>
                </div>

                <div className="text-sm md:text-base">
                  {pnl === 0 ? (
                    <p>$0.00</p>
                  ) : (
                    <p className={pnl > 0 ? "text-green63" : "text-redE0"}>
                      {advancedFormatNumber(pnl, 2, "$")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
                <div>
                  <p className="text-gray9D text-sm md:text-base">ROI</p>
                </div>

                <div className="text-sm md:text-base">
                  {roi === 0 ? (
                    <p>0.00%</p>
                  ) : (
                    <p className={roi > 0 ? "text-green63" : "text-redE0"}>
                      {advancedFormatNumber(roi, 2, "")}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-3 md:px-6 mt-5">
            <div
              className={twJoin(
                "flex flex-col",
                "w-full h-[157px]",
                "rounded-lg bg-[#111613D9]",
                "px-3 md:px-6 pt-5 pb-6"
              )}
            >
              <div className="flex flex-row justify-between items-center h-[20px]">
                <p className="text-sm md:text-base text-gray9D font-semibold">
                  <span>Closing Quantity</span>
                </p>
                <div className="flex flex-row justify-end">
                  <div
                    className={twJoin(
                      "flex flex-row justify-center items-center",
                      "text-sm md:text-base text-contentBright font-semibold"
                    )}
                  >
                    <p>Available: </p>
                    {isExceededCollateral ? (
                      <p className="ml-[6px]">-</p>
                    ) : (
                      <p className="ml-[6px]">{advancedFormatNumber(availableOptionSize, 4, "")}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-row justify-center items-center mt-[20px] h-[24px]">
                <input
                  value={closeSizeParsed}
                  placeholder="0"
                  className={twJoin(
                    "w-full",
                    "text-lg md:text-xl text-greene6 font-bold bg-transparent",
                    "focus:outline-none",
                    "placeholder:text-[20px] placeholder-gray80 placeholder:font-bold"
                  )}
                  onChange={(e) => {
                    if (e.target.value.includes(" ")) return;
                    if (isNaN(Number(e.target.value))) return;

                    const closeSizeParsed = e.target.value.replace(/^0+(?=\d)/, "");
                    const closeSize = new BigNumber(closeSizeParsed)
                      .multipliedBy(10 ** UA_TICKER_TO_DECIMAL[chain][selectedUnderlyingAsset as UnderlyingAsset])
                      .toFixed(0);

                    setCloseSizeParsed(e.target.value.replace(/^0+(?=\d)/, ""));
                    setCloseSize(closeSize);

                    // calculate slider value
                    let newSliderValue = BigNumber(e.target.value)
                      .div(data.metrics.parsedSize)
                      .multipliedBy(100)
                      .toNumber();
                    if (BigNumber(newSliderValue).isGreaterThan(100)) newSliderValue = 100;
                    if (isNaN(newSliderValue)) newSliderValue = 0;

                    setSliderValue(Math.round(newSliderValue));
                  }}
                  onFocus={handleFocus}
                />
                <div>
                  <p className="ml-[16px] text-sm md:text-base text-gray9D font-semibold">Contracts</p>
                </div>
              </div>

              <div className="relative mt-[32px] flex flex-row justify-between items-center text-[12px] text-contentBright font-semibold">
                <div className="w-[17px]">0%</div>
                <div className="relative">
                  <input
                    type="range"
                    ref={sliderRef}
                    min="0"
                    max="100"
                    value={sliderValue}
                    className="slider w-[250px]"
                    id="myRange"
                    onChange={handleSliderChange}
                    style={{
                      background: `linear-gradient(90deg, #c1d182 ${sliderValue}%, #3d3d3b ${sliderValue}%)`,
                    }}
                  />
                  <div
                    style={{
                      left: `calc(${sliderValue}% - 30px)`,
                    }}
                    className="absolute top-[25px] w-[58px] h-[28px]"
                  >
                    <div
                      style={{}}
                      className={twJoin(
                        "relative",
                        "w-full h-full bg-black03 border-[1px] border-black1c",
                        "flex flex-row justify-center items-center text-xs md:text-sm text-greene6 font-semibold rounded-[4px]"
                      )}
                    >
                      {sliderValue}%
                      <div className="absolute top-0 left-1/2 w-0 h-0 border-[6px] border-solid border-transparent border-b-black33  border-t-0 ml-[-6px] mt-[-6px]"></div>
                      <div className="absolute top-0 left-1/2 w-0 h-0 border-[4px] border-solid border-transparent border-b-black21  border-t-0 ml-[-4px] mt-[-4px]"></div>
                    </div>
                  </div>
                </div>
                <div className="w-[33px]">100%</div>
              </div>
            </div>
          </div>

          <div className="mt-[24px] w-full h-[1px] bg-black29" />

          <div className="flex flex-col px-3 md:px-6 mt-5 mb-[60px]">
            <>
              <div className="flex flex-row justify-between items-center h-[18px]">
                <div>
                  <p className="text-gray9D text-sm md:text-base">You'll get</p>
                </div>

                <div className="flex flex-row items-center text-lg md:text-xl text-contentBright font-semibold">
                  <div>
                    {isExceededCollateral ? "-" : advancedFormatNumber(getAmount, 4, "")}
                  </div>
                  {!isBuy && isVanillaCallStrategy(data.metrics.strategy) ? (
                    <img
                      src={QA_INFO[chain][UA_TICKER_TO_QA_TICKER[chain][selectedUnderlyingAsset] as keyof (typeof NetworkQuoteAsset)[typeof chain]].src}
                      className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] ml-[8px]"
                    />
                  ) : (
                    <img
                      src={QA_INFO[chain][NetworkQuoteAsset[chain].USDC].src}
                      className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] ml-[8px]"
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-row justify-end text-sm md:text-base text-contentBright opacity-45 font-normal mt-[3px]">
                {isExceededCollateral ? (
                  <p>-</p>
                ) : !isBuy && isVanillaCallStrategy(data.metrics.strategy) ? (
                  <p>
                    ~
                    {advancedFormatNumber(
                      new BigNumber(getAmount).multipliedBy(underlyingAssetSpotIndex).toNumber(),
                      2,
                      "$"
                    )}
                  </p>
                ) : (
                  <p>
                    ~
                    {advancedFormatNumber(
                      new BigNumber(getAmount).multipliedBy(stableAssetSpotIndex).toNumber(),
                      2,
                      "$"
                    )}
                  </p>
                )}
              </div>
            </>

            <div className="mt-3">
              <div className="flex flex-row justify-between items-center h-[18px]">
                <div>
                  <p className="text-gray9D text-sm md:text-base">Realized P&L</p>
                </div>
                <div className="flex flex-row justify-end text-sm md:text-base text-contentBright opacity-45 font-normal">
                  {isExceededCollateral ? (
                    <p>-</p>
                  ) : realizedPnl === 0 ? (
                    <p>$0.00</p>
                  ) : (
                    <p>
                      {advancedFormatNumber(
                        BigNumber(realizedPnl)
                          .multipliedBy(closeSizeParsed)
                          .div(data.metrics.parsedSize)
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
          <div className="bottom-0 absolute pb-[35px] bg-[#030A06]">
            <div
              className="h-[40px] mt-5 mx-3 md:mx-6"
              style={{
                width: "calc(100vw - 24px)",
              }}
            >
              {renderButton()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
