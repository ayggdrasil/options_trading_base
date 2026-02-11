import React, { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { advancedFormatNumber } from "@/utils/helper";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadBalance } from "@/store/slices/UserSlice";
import { writeSettlePosition } from "@/utils/contract";
import { FlattenedPosition, SettlePosition } from "@/interfaces/interfaces.positionSlice";
import { NetworkState } from "@/networks/types";
import { QA_INFO, UA_TICKER_TO_ADDRESS, UA_TICKER_TO_QA_TICKER } from "@/networks/assets";
import { getUnderlyingAssetIndexByTicker, getUnderlyingAssetTickerByIndex } from "@/networks/helpers";
import { FEE_RATES, getPairedOptionName, isCallStrategy, isVanillaCallStrategy, NetworkQuoteAsset, parseOptionTokenId, SETTLE_FEE_CALCULATION_LIMIT_RATE, SpotAssetIndexMap, UnderlyingAsset } from "@callput/shared";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { BN } from "@/utils/bn";
import IconClose from "@assets/img/icon/close.png";
import Button from "@/components/Common/Button";
import DisplayWithTooltip from "../DisplayWithToolTip";

interface SettlePositionModalProps {
  position: FlattenedPosition;
  closeModal: () => void;
}

export const SettlePositionModal: React.FC<SettlePositionModalProps> = ({ position, closeModal }) => {
  const dispatch = useAppDispatch();
  const { address } = useAccount();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;

  const optionTokenId = BigInt(position.optionTokenId);
  const { underlyingAssetIndex, strategy, strikePrices, vaultIndex } = parseOptionTokenId(optionTokenId);
  const underlyingAsset = getUnderlyingAssetTickerByIndex(chain, underlyingAssetIndex);

  const spotIndex = spotAssetIndexMap[underlyingAsset];
  const usdcSpotIndex = spotAssetIndexMap.usdc;

  const instrument = position.metadata.instrument;
  const optionPairInstrument = getPairedOptionName(BigInt(position.optionTokenId), position.optionNames);

  const expiry = position.metadata.expiry;
  const isVanilla = position.metadata.optionStrategy === "Vanilla";
  const isCall = position.metadata.optionDirection === "Call";
  const isBuy = position.metadata.optionOrderSide === "Buy";
  const settlePrice = position.metadata.settlePrice;

  const [collateralAmount, setCollateralAmount] = useState<number>(0); // Call 일 때는 IndexToken, Put 일 때는 USDC
  const [collateralUsd, setCollateralUsd] = useState<number>(0); // Call 일 때는 IndexToken * AssetPrice, Put 일 때는 USDC

  const [getAmount, setGetAmount] = useState<number>(0);
  const [settlePayoffUsd, setSettlePayoffUsd] = useState<number>(0);

  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  useEffect(() => {
    const isITM = isCall
      ? Number(position.mainOptionStrikePrice) < settlePrice
      : Number(position.mainOptionStrikePrice) > settlePrice;

    const settlePayoffUsd = isITM
      ? isVanilla
        ? isCall
          ? new BN(settlePrice).minus(position.mainOptionStrikePrice).toNumber()
          : new BN(position.mainOptionStrikePrice).minus(settlePrice).toNumber()
        : isCall
        ? Math.min(
            new BN(settlePrice).minus(position.mainOptionStrikePrice).toNumber(),
            new BN(position.mainOptionStrikePrice).minus(position.pairedOptionStrikePrice).abs().toNumber()
          )
        : Math.min(
            new BN(position.mainOptionStrikePrice).minus(settlePrice).toNumber(),
            new BN(position.mainOptionStrikePrice).minus(position.pairedOptionStrikePrice).abs().toNumber()
          )
      : 0;

    setSettlePayoffUsd(settlePayoffUsd);

    const settlePayoffUsdWithSize = new BN(position.metadata.size).multipliedBy(settlePayoffUsd).toNumber();

    const settlePayoffAmountWithSize = isVanillaCallStrategy(strategy)
      ? new BN(settlePayoffUsdWithSize).dividedBy(spotIndex).toNumber() // Buy Call, Sell Call
      : new BN(settlePayoffUsdWithSize).dividedBy(usdcSpotIndex).toNumber(); // Buy Put, Sell Put, Buy CallSpread, Sell CallSpread, Buy PutSpread, Sell PutSpread

    let beforeFeePaidGetAmount = 0;

    if (isBuy) {
      if (isITM) {
        beforeFeePaidGetAmount = settlePayoffAmountWithSize;
      }
    } else {
      const collateralAmount = isVanilla
        ? isVanillaCallStrategy(strategy)
          ? Number(position.metadata.size)
          : new BN(position.mainOptionStrikePrice).multipliedBy(position.metadata.size).toNumber()
        : new BN(position.mainOptionStrikePrice)
            .minus(position.pairedOptionStrikePrice)
            .abs()
            .multipliedBy(position.metadata.size)
            .toNumber();
      const collateralUsd = isVanillaCallStrategy(strategy)
        ? collateralAmount * spotIndex
        : collateralAmount * usdcSpotIndex;

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
      const feeUsd = new BN(position.metadata.size)
        .multipliedBy(spotIndex)
        .multipliedBy(FEE_RATES.SETTLE_POSITION)
        .toNumber();

      const feeAmount = isVanillaCallStrategy(strategy)
        ? new BN(feeUsd).div(spotIndex).toNumber()
        : new BN(feeUsd).div(usdcSpotIndex).toNumber();

      const maxFeeAmount = new BN(beforeFeePaidGetAmount)
        .multipliedBy(SETTLE_FEE_CALCULATION_LIMIT_RATE)
        .toNumber();

      const appliedFeeAmount = Math.min(feeAmount, maxFeeAmount);

      getAmount = appliedFeeAmount >= beforeFeePaidGetAmount ? 0 : beforeFeePaidGetAmount - appliedFeeAmount;
    }

    setGetAmount(getAmount);
  }, []);

  const pnlInUnit = isBuy
    ? new BN(settlePayoffUsd).minus(position.metadata.avgPrice).toNumber()
    : new BN(position.metadata.avgPrice).minus(settlePayoffUsd).toNumber();

  const pnl = new BN(pnlInUnit).multipliedBy(position.metadata.size).toNumber();

  const roi = new BN(pnlInUnit).div(position.metadata.avgPrice).multipliedBy(100).toNumber();

  const handleSettlePosition = async () => {
    setIsButtonLoading(true);

    const newPendingTxInfo: SettlePosition = {
      underlyingAssetTicker: underlyingAsset,
      optionTokenId: String(optionTokenId),
      expiry: expiry,
      strategy: strategy,
      mainOptionName: instrument,
      pairedOptionName: optionPairInstrument,
      mainOptionStrikePrice: String(position.mainOptionStrikePrice),
      pairedOptionStrikePrice: String(position.pairedOptionStrikePrice),
      isBuy: isBuy,
      size: position.size,
      settlePrice: String(settlePrice),
      processBlockTime: (Date.now() / 1000).toFixed(0),
    };

    const result = await writeSettlePosition(
      isVanillaCallStrategy(strategy)
        ? [UA_TICKER_TO_ADDRESS[chain][underlyingAsset as UnderlyingAsset]]
        : [CONTRACT_ADDRESSES[chain].USDC],
      getUnderlyingAssetIndexByTicker(chain, underlyingAsset),
      String(optionTokenId),
      0,
      false,
      newPendingTxInfo,
      chain
    );

    if (result && address) {
      dispatch(
        loadBalance({ chain, address })
      );
      closeModal();
    }

    setIsButtonLoading(false);
  };

  const renderButton = () => {
    if (isButtonLoading)
      return <Button name="..." color="default" disabled onClick={() => {}} />;

    const buttonName = isBuy ? "Settle Position" : "Settle & Redeem Collateral";

    const isButtonDisabled = !address;

    return (
      <Button
        name={buttonName}
        color="blue"
        disabled={isButtonDisabled}
        onClick={handleSettlePosition}
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
          Settle Position
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

        {/* Settlement Details */}
        <div
          className={twJoin(
            "w-full h-fit flex flex-col gap-[4px] px-[20px] py-[12px]",
            "rounded-[4px] bg-black2023",
            "text-[14px] font-[500] leading-[24px]"
          )}
        >
          {/* Collateral */}
          <div className="flex flex-row justify-between items-center h-[24px]">
            <div className="text-gray8c8c">Collateral</div>
            <div className="text-whitef2f2 font-[600]">
              {isBuy ? (
                <p>-</p>
              ) : (
                <div className="flex flex-col items-end">
                  <p>
                    {advancedFormatNumber(collateralAmount, 4, "")}{" "}
                    {isVanillaCallStrategy(strategy)
                      ? getUnderlyingAssetTickerByIndex(chain, underlyingAssetIndex)
                      : "USDC"}
                  </p>
                  <p className="text-[12px] text-gray8c8c font-[500] leading-[14px]">
                    {advancedFormatNumber(collateralUsd, 2, "$")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Price */}
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

          {/* Settle Price */}
          <div className="flex flex-row justify-between items-center h-[24px]">
            <DisplayWithTooltip
              title="Settle Price"
              tooltipContent={
                <p>
                  TWAP of Futures Index <br />
                  during 30 minutes to expiry
                </p>
              }
              className="text-gray8c8c"
            />
            <div className="text-whitef2f2 font-[600]">
              <p>{advancedFormatNumber(settlePrice, 2, "$")}</p>
            </div>
          </div>

          {/* Settle Payoff */}
          <div className="flex flex-row justify-between items-center h-[24px]">
            <DisplayWithTooltip
              title="Settle Payoff"
              tooltipContent={
                <p>
                  {isCall && isBuy && (
                    <>
                      Greater of the two values: <br />
                      Settle Price - Strike Price or 0.
                    </>
                  )}
                  {isCall && !isBuy && (
                    <>
                      Smaller of the two values: <br />
                      Strike Price - Settle Price or 0.
                    </>
                  )}
                  {!isCall && isBuy && (
                    <>
                      Greater of the two values: <br />
                      Strike Price - Settle Price or 0.
                    </>
                  )}
                  {!isCall && !isBuy && (
                    <>
                      Smaller of the two values: <br />
                      Settle Price - Strike Price or 0.
                    </>
                  )}
                </p>
              }
              className="text-gray8c8c"
            />
            <div className="text-whitef2f2 font-[600]">
              {settlePayoffUsd === 0 ? (
                <p>$0.00</p>
              ) : (
                <p
                  className={
                    isBuy
                      ? settlePayoffUsd > 0
                        ? "text-green71b8"
                        : "text-rede04a"
                      : settlePayoffUsd > 0
                        ? "text-rede04a"
                        : "text-green71b8"
                  }
                >
                  {advancedFormatNumber(isBuy ? settlePayoffUsd : -settlePayoffUsd, 2, "$")}
                </p>
              )}
            </div>
          </div>

          <div className="my-[6px] w-full h-[1px] bg-black292c" />

          {/* Quantity */}
          <div className="flex flex-row justify-between items-center h-[24px]">
            <div className="text-gray8c8c">Quantity</div>
            <div className="text-whitef2f2 font-[600]">
              {advancedFormatNumber(position.metadata.size, 4, "")}
            </div>
          </div>

          {/* P&L */}
          <div className="flex flex-row justify-between items-center h-[24px]">
            <DisplayWithTooltip
              title="Position P&L"
              tooltipContent={
                <p>
                  {isBuy
                    ? "(Settle Payoff - Order Price) × Option Size"
                    : "(Order Price - Settle Payoff) × Option Size"}
                </p>
              }
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

          {/* ROI */}
          <div className="flex flex-row justify-between items-center h-[24px]">
            <DisplayWithTooltip
              title="ROI"
              tooltipContent={<p>P&L / Order Price × 100</p>}
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

        <div className="flex flex-col gap-[5px] px-[20px]">
          {/* You'll get */}
          <div className="h-[40px] flex flex-row justify-between items-start">
            <DisplayWithTooltip
              title="You'll get"
              tooltipContent={
                isBuy ? (
                  <>
                    <p className="text-[12px] text-gray80 leading-[0.85rem]">
                      Estimated token amount to get after settlement fee.
                    </p>
                    <p className="text-[11px] text-[#666] font-normal">
                      Settle Payoff × Qty. - Total Settlement Fee
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] text-gray80 leading-[0.85rem]">
                      Estimated token amount to get after settlement fee.
                    </p>
                    <p className="text-[11px] text-[#666] font-normal">
                      (Collateral per Option - Settle Payoff) × Qty. - Total Settlement Fee
                    </p>
                  </>
                )
              }
              className="text-gray8c8c text-[14px] font-[500] leading-[24px]"
            />

            <div className="flex flex-col gap-[2px]">
              <div className="flex flex-row items-center gap-[4px]">
                {isVanillaCallStrategy(strategy) ? (
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
                  {advancedFormatNumber(getAmount, 4, "")}
                </p>
              </div>
              <div
                className={twJoin(
                  "flex flex-row justify-end",
                  "text-gray8c8c text-[12px] font-[500] leading-[14px]"
                )}
              >
                {isVanillaCallStrategy(strategy) ? (
                  <p>
                    {advancedFormatNumber(
                      new BN(getAmount).multipliedBy(spotIndex).toNumber(),
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
        </div>
      </div>

      <div className="w-full h-[48px]">{renderButton()}</div>
    </div>
  );
};
