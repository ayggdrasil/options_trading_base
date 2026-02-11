import React, { useEffect, useState } from "react";
import BigNumber from "bignumber.js";

import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";

import { useAccount } from "wagmi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import Button from "../../Common/Button";
import { loadBalance } from "@/store/slices/UserSlice";
import { writeSettlePosition } from "@/utils/contract";
import { SettlePosition } from "@/interfaces/interfaces.positionSlice";
import { NetworkState } from "@/networks/types";
import { MSA_INFO, QA_INFO, UA_INFO, UA_TICKER_TO_ADDRESS, UA_TICKER_TO_QA_TICKER } from "@/networks/assets";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { getUnderlyingAssetIndexByTicker } from "@/networks/helpers";
import { FEE_RATES, isCallStrategy, isVanillaCallStrategy, NetworkQuoteAsset, parseOptionTokenId, SETTLE_FEE_CALCULATION_LIMIT_RATE, SpotAssetIndexMap, UnderlyingAsset } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface ModalProps {
  data: any;
  closeModal: () => void;
}

export const SettlementModal: React.FC<ModalProps> = ({
  data,
  closeModal: _closeModal,
}) => {
  const dispatch = useAppDispatch();
  const { address } = useAccount();
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;
  // Position Information
  const selectedUnderlyingAsset = data.selectedUnderlyingAsset as UnderlyingAsset;
  const underlyingAssetSpotIndex = spotAssetIndexMap[selectedUnderlyingAsset];
  const stableAssetSpotIndex = spotAssetIndexMap.usdc;
  const isBuy = data["position"].isBuy;
  const isCall = isCallStrategy(data["metrics"].strategy);
  const settlePrice = data["metrics"].settlePrice;

  const [collateralAmount, setCollateralAmount] = useState<number>(0); // Call 일 때는 IndexToken, Put 일 때는 USDC
  const [collateralUsd, setCollateralUsd] = useState<number>(0); // Call 일 때는 IndexToken * AssetPrice, Put 일 때는 USDC

  const [getAmount, setGetAmount] = useState<number>(0);
  const [settlePayoffUsd, setSettlePayoffUsd] = useState<number>(0);

  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  useEffect(() => {
    const isITM = isCall
      ? Number(data["position"].mainOptionStrikePrice) < settlePrice
      : Number(data["position"].mainOptionStrikePrice) > settlePrice;

    const settlePayoffUsd = isITM
      ? data["metrics"].isCombo
        ? isCall
          ? Math.min(
              new BigNumber(settlePrice)
                .minus(data["position"].mainOptionStrikePrice)
                .toNumber(),
              new BigNumber(data["position"].mainOptionStrikePrice)
                .minus(data["position"].pairedOptionStrikePrice)
                .abs()
                .toNumber()
            )
          : Math.min(
              new BigNumber(data["position"].mainOptionStrikePrice)
                .minus(settlePrice)
                .toNumber(),
              new BigNumber(data["position"].mainOptionStrikePrice)
                .minus(data["position"].pairedOptionStrikePrice)
                .abs()
                .toNumber()
            )
        : isCall
        ? new BigNumber(settlePrice)
            .minus(data["position"].mainOptionStrikePrice)
            .toNumber()
        : new BigNumber(data["position"].mainOptionStrikePrice)
            .minus(settlePrice)
            .toNumber()
      : 0;

    setSettlePayoffUsd(settlePayoffUsd);

    const settlePayoffUsdWithSize = new BigNumber(data["metrics"].parsedSize)
      .multipliedBy(settlePayoffUsd)
      .toNumber();

    const settlePayoffAmountWithSize = isVanillaCallStrategy(data["metrics"].strategy)
      ? new BigNumber(settlePayoffUsdWithSize)
          .dividedBy(underlyingAssetSpotIndex)
          .toNumber() // Buy Call, Sell Call
      : new BigNumber(settlePayoffUsdWithSize)
          .dividedBy(stableAssetSpotIndex)
          .toNumber(); // Buy Put, Sell Put, Buy CallSpread, Sell CallSpread, Buy PutSpread, Sell PutSpread

    let beforeFeePaidGetAmount = 0;

    if (isBuy) {
      if (isITM) {
        beforeFeePaidGetAmount = settlePayoffAmountWithSize;
      }
    } else {
      const collateralAmount = data["metrics"].isCombo
        ? new BigNumber(data["position"].mainOptionStrikePrice)
            .minus(data["position"].pairedOptionStrikePrice)
            .abs()
            .multipliedBy(data["metrics"].parsedSize)
            .toNumber()
        : isVanillaCallStrategy(data["metrics"].strategy)
        ? Number(data["metrics"].parsedSize)
        : new BigNumber(data["position"].mainOptionStrikePrice)
            .multipliedBy(data["metrics"].parsedSize)
            .toNumber();
      const collateralUsd = isVanillaCallStrategy(data["metrics"].strategy)
        ? collateralAmount * underlyingAssetSpotIndex
        : collateralAmount * stableAssetSpotIndex;

      if (isITM) {
        beforeFeePaidGetAmount = collateralAmount - settlePayoffAmountWithSize;
      } else {
        beforeFeePaidGetAmount = collateralAmount;
      }

      setCollateralAmount(collateralAmount);
      setCollateralUsd(collateralUsd);
    }

    let getAmount = beforeFeePaidGetAmount;

    if (isITM) {
      const feeUsd = new BigNumber(data["metrics"].parsedSize)
        .multipliedBy(underlyingAssetSpotIndex)
        .multipliedBy(FEE_RATES.SETTLE_POSITION)
        .toNumber();

    const feeAmount = isVanillaCallStrategy(data["metrics"].strategy)
      ? new BigNumber(feeUsd).div(underlyingAssetSpotIndex).toNumber()
      : new BigNumber(feeUsd).div(stableAssetSpotIndex).toNumber();

    const maxFeeAmount = new BigNumber(beforeFeePaidGetAmount)
      .multipliedBy(SETTLE_FEE_CALCULATION_LIMIT_RATE)
      .toNumber();

    const appliedFeeAmount = Math.min(feeAmount, maxFeeAmount);

      getAmount =
        appliedFeeAmount >= beforeFeePaidGetAmount
          ? 0
          : beforeFeePaidGetAmount - appliedFeeAmount;
    }

    setGetAmount(getAmount);
  }, []);

  const pnlInUnit = isBuy
    ? new BigNumber(settlePayoffUsd)
        .minus(data["metrics"].parsedExecutionPrice)
        .toNumber()
    : new BigNumber(data["metrics"].parsedExecutionPrice)
        .minus(settlePayoffUsd)
        .toNumber();

  const pnl = new BigNumber(pnlInUnit)
    .multipliedBy(data["metrics"].parsedSize)
    .toNumber();

  const roi = new BigNumber(pnlInUnit)
    .div(data["metrics"].parsedExecutionPrice)
    .multipliedBy(100)
    .toNumber();

  const handleSettlePosition = async () => {
    setIsButtonLoading(true);

    const { expiry, strategy } = parseOptionTokenId(
      BigInt(data.position.optionTokenId)
    );

    const newPendingTxInfo: SettlePosition = {
      underlyingAssetTicker: selectedUnderlyingAsset,
      optionTokenId: data.position.optionTokenId,
      expiry: expiry,
      strategy: strategy,
      mainOptionName: data["metrics"].mainOptionName,
      pairedOptionName: data["metrics"].pairedOptionName,
      mainOptionStrikePrice: data["position"].mainOptionStrikePrice,
      pairedOptionStrikePrice: data["position"].pairedOptionStrikePrice,
      isBuy: isBuy,
      size: data["position"].size,
      settlePrice: settlePrice,
      processBlockTime: (Date.now() / 1000).toFixed(0),
    };

    const result = await writeSettlePosition(
      isVanillaCallStrategy(strategy)
        ? [
            UA_TICKER_TO_ADDRESS[chain][selectedUnderlyingAsset],
          ]
        : [CONTRACT_ADDRESSES[chain].USDC],
      getUnderlyingAssetIndexByTicker(chain, selectedUnderlyingAsset),
      data.position.optionTokenId,
      0,
      false,
      newPendingTxInfo,
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
    if (isButtonLoading)
      return <Button name="..." color="default" disabled onClick={() => {}} />;

    const buttonName = isBuy ? "Settle Position" : "Settle & Redeem Collateral";

    return (
      <Button
        name={buttonName}
        color="default"
        className="bg-greene6 text-black0a12 text-sm md:text-base"
        // disabled={isButtonDisabled}
        onClick={handleSettlePosition}
      />
    );
  };

  return (
    <>
      {data && (
        <div
          className={twJoin("flex flex-col overflow-auto", "rounded-[4px]")}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative flex flex-row justify-center items-center w-full pb-5">
            <div className="text-greene6 leading-6 text-[20px] md:text-[22px] font-bold">
              Settlement
            </div>
          </div>

          <div className="w-full h-[1px] min-h-[1px] bg-text opacity-10" />

          <div
            className={twJoin(
              "mt-[26px] px-[24px] flex flex-row gap-[12px] w-full h-[39px]",
              "text-[13px] text-gray8b font-semibold text-center"
            )}
          >
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-gray9D text-xs md:text-sm">Instrument</div>
              <div className="flex flex-row items-center justify-center gap-[6px]">
                <p className="text-sm md:text-base font-bold text-contentBright">
                  {data["metrics"].mainOptionName}
                </p>
                {data["metrics"].isCombo && (
                  <p
                    className={twJoin(
                      "text-[10px]",
                      isCall
                        ? "border-t-[1.4px] border-t-gray80"
                        : "border-b-[1.4px] border-b-gray80"
                    )}
                  >
                    {data["position"].pairedOptionStrikePrice}
                  </p>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-gray9D text-xs md:text-sm">Position</div>
              {isBuy ? (
                <div className="text-sm md:text-base text-green63">Buy</div>
              ) : (
                <div className="text-sm md:text-base text-redE0">Sell</div>
              )}
            </div>
          </div>

          <div
            className={twJoin(
              "mt-5 mx-3 md:mx-6 p-3 md:p-6 flex flex-col gap-[10px]",
              "rounded-lg bg-[#111613D9]"
            )}
          >
            {/* Collateral */}
            <div className="flex flex-row justify-between items-baseline font-semibold h-fit">
              <div className="text-gray9D text-sm md:text-base">Collateral</div>
              <div className="flex flex-col items-end">
                {isBuy ? (
                  <p className="h-[18px] text-contentBright">-</p>
                ) : (
                  <div className="h-[35px]">
                    <div className="flex flex-row text-xs md:text-sm text-contentBright">
                      {`${advancedFormatNumber(collateralAmount, 4, "")} ${
                        isVanillaCallStrategy(data["metrics"].strategy)
                          ? UA_INFO[chain][selectedUnderlyingAsset as UnderlyingAsset].symbol
                          : MSA_INFO[chain]["USDC"].symbol
                      }`}
                    </div>
                    <div className="text-xs md:text-sm text-contentBright opacity-45 text-right">
                      ${advancedFormatNumber(collateralUsd, 2, "")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Price */}
            <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
              <div>
                <p className="text-gray9D text-sm md:text-base">Order Price</p>
              </div>

              <div className="text-sm md:text-base text-contentBright">
                <p>
                  {advancedFormatNumber(
                    data["metrics"].parsedExecutionPrice,
                    2,
                    "$"
                  )}
                </p>
              </div>
            </div>

            {/* Settle Price */}
            <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
              <div>
                <p className="text-gray9D text-sm md:text-base">Settle Price</p>
              </div>

              <div className="text-sm md:text-base text-contentBright">
                <p>{advancedFormatNumber(settlePrice, 2, "$")}</p>
              </div>
            </div>

            {/* Settle Payoff - Size 1개 기준 */}
            <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
              <div>
                <p className="text-gray9D text-sm md:text-base">
                  Settle Payoff
                </p>
              </div>

              <div className="text-sm md:text-base">
                {settlePayoffUsd === 0 ? (
                  <p className="text">$0.00</p>
                ) : isBuy ? (
                  <p className="text-green63">
                    {advancedFormatNumber(settlePayoffUsd, 2, "$")}
                  </p>
                ) : (
                  <p className="text-redE0">
                    {advancedFormatNumber(-settlePayoffUsd, 2, "$")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-[14px] w-full h-[1px] min-h-[1px] bg-text opacity-10" />

            <div className="flex flex-row items-center justify-between mt-[11px]">
              <div className="text-gray9D text-sm md:text-base font-semibold">
                Quantity
              </div>
              <div className="text-sm md:text-base text-contentBright">
                {advancedFormatNumber(data["metrics"].parsedSize, 4, "")}
              </div>
            </div>

            {/* P&L - Size 반영 */}
            <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
              <div>
                <p className="text-gray9D text-sm md:text-base">P&L</p>
              </div>

              <div className="text-sm md:text-base">
                {pnl === 0 ? (
                  <p className="text">$0.00</p>
                ) : (
                  <p className={pnl > 0 ? "text-green63" : "text-redE0"}>
                    {advancedFormatNumber(pnl, 2, "$")}
                  </p>
                )}
              </div>
            </div>

            {/* ROI - Size 반영 */}
            <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
              <div>
                <p className="text-gray9D text-sm md:text-base">ROI</p>
              </div>

              <div className="text-sm md:text-base">
                {roi === 0 ? (
                  <p className="text">0.00%</p>
                ) : (
                  <p className={roi > 0 ? "text-green63" : "text-redE0"}>
                    {advancedFormatNumber(roi, 2, "")}%
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="w-full h-[1px] min-h-[1px] bg-text opacity-10 my-5"></div>
          <div className="flex flex-col mx-3 md:mx-6 mb-[60px]">
            <div className="flex flex-row justify-between items-center">
              <div>
                <p className="text-gray9D text-[14px] md:text-[16px] font-semibold ">
                  You'll get
                </p>
              </div>
              <div className="flex flex-row items-center text-[18px] md:text-[20px] text-contentBright font-semibold">
                <p>{advancedFormatNumber(getAmount, 4, "")}</p>
                {isVanillaCallStrategy(data["metrics"].strategy) ? (
                  <img
                    src={
                      QA_INFO[chain][UA_TICKER_TO_QA_TICKER[chain][selectedUnderlyingAsset] as keyof (typeof NetworkQuoteAsset)[typeof chain]].src
                    }
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
            <div className="flex flex-row justify-end text-[14px] md:text-[16px] text-contentBright opacity-45 font-normal">
              {isVanillaCallStrategy(data["metrics"].strategy) ? (
                <p>
                  ~
                  {advancedFormatNumber(
                    new BigNumber(getAmount)
                      .multipliedBy(underlyingAssetSpotIndex)
                      .toNumber(),
                    2,
                    "$"
                  )}
                </p>
              ) : (
                <p>
                  ~
                  {advancedFormatNumber(
                    new BigNumber(getAmount)
                      .multipliedBy(stableAssetSpotIndex)
                      .toNumber(),
                    2,
                    "$"
                  )}
                </p>
              )}
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
