import React, { useEffect, useState } from "react";
import BigNumber from "bignumber.js";

import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";

import IconClose from "@assets/icon-close.svg";
import { useAccount } from "wagmi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import Button from "../Common/Button";
import { loadBalance } from "@/store/slices/UserSlice";
import { writeSettlePosition } from "@/utils/contract";;
import { SettlePosition } from "@/interfaces/interfaces.positionSlice";

import { MSA_INFO, QA_INFO, UA_INFO, UA_TICKER_TO_ADDRESS, UA_TICKER_TO_QA_TICKER } from "@/networks/assets";
import { getUnderlyingAssetIndexByTicker } from "@/networks/helpers";
import { FEE_RATES, isCallStrategy, isVanillaCallStrategy, NetworkQuoteAsset, parseOptionTokenId, SETTLE_FEE_CALCULATION_LIMIT_RATE, SpotAssetIndexMap, UnderlyingAsset } from "@callput/shared";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { NetworkState } from "@/networks/types";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface ModalProps {
  data: any;
  closeModal: () => void;
}

export const SettlementModal: React.FC<ModalProps> = ({ data, closeModal }) => {
  const dispatch = useAppDispatch();
  const { address } = useAccount();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;

  // Position Information
  const selectedUnderlyingAsset = data.selectedUnderlyingAsset as UnderlyingAsset;
  const underlyingAssetSpotIndex = spotAssetIndexMap[selectedUnderlyingAsset];
  const stableAssetSpotIndex = spotAssetIndexMap.usdc;
  const isBuy = data["position"].isBuy;
  const isCall = isCallStrategy(data["metrics"].strategy)
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
              new BigNumber(settlePrice).minus(data["position"].mainOptionStrikePrice).toNumber(),
              new BigNumber(data["position"].mainOptionStrikePrice).minus(data["position"].pairedOptionStrikePrice).abs().toNumber()
            )
          : Math.min(
              new BigNumber(data["position"].mainOptionStrikePrice).minus(settlePrice).toNumber(),
              new BigNumber(data["position"].mainOptionStrikePrice).minus(data["position"].pairedOptionStrikePrice).abs().toNumber()
            )
        : isCall
          ? new BigNumber(settlePrice).minus(data["position"].mainOptionStrikePrice).toNumber()
          : new BigNumber(data["position"].mainOptionStrikePrice).minus(settlePrice).toNumber()
      : 0;

    setSettlePayoffUsd(settlePayoffUsd)

    const settlePayoffUsdWithSize = new BigNumber(data["metrics"].parsedSize).multipliedBy(settlePayoffUsd).toNumber();

    const settlePayoffAmountWithSize = isVanillaCallStrategy(data["metrics"].strategy)
      ? new BigNumber(settlePayoffUsdWithSize).dividedBy(underlyingAssetSpotIndex).toNumber() // Buy Call, Sell Call
      : new BigNumber(settlePayoffUsdWithSize).dividedBy(stableAssetSpotIndex).toNumber() // Buy Put, Sell Put, Buy CallSpread, Sell CallSpread, Buy PutSpread, Sell PutSpread

    let beforeFeePaidGetAmount = 0;

    if (isBuy) {
      if (isITM) {
        beforeFeePaidGetAmount = settlePayoffAmountWithSize
      }
    } else {
      const collateralAmount = data["metrics"].isCombo
        ? new BigNumber(data["position"].mainOptionStrikePrice).minus(data["position"].pairedOptionStrikePrice).abs().multipliedBy(data["metrics"].parsedSize).toNumber()
        : isVanillaCallStrategy(data["metrics"].strategy)
          ? Number(data["metrics"].parsedSize)
          : new BigNumber(data["position"].mainOptionStrikePrice).multipliedBy(data["metrics"].parsedSize).toNumber();
      const collateralUsd = isVanillaCallStrategy(data["metrics"].strategy)
        ? collateralAmount * underlyingAssetSpotIndex
        : collateralAmount * stableAssetSpotIndex;

      if (isITM) {
        beforeFeePaidGetAmount = collateralAmount - settlePayoffAmountWithSize;
      } else {
        beforeFeePaidGetAmount = collateralAmount;
      }

      setCollateralAmount(collateralAmount);
      setCollateralUsd(collateralUsd)
    }

    let getAmount = beforeFeePaidGetAmount;

    if (isITM) {
      const feeUsd = new BigNumber(data["metrics"].parsedSize).multipliedBy(underlyingAssetSpotIndex).multipliedBy(FEE_RATES.SETTLE_POSITION).toNumber();
      
      const feeAmount = isVanillaCallStrategy(data["metrics"].strategy)
        ? new BigNumber(feeUsd).div(underlyingAssetSpotIndex).toNumber()
        : new BigNumber(feeUsd).div(stableAssetSpotIndex).toNumber();

      const maxFeeAmount = new BigNumber(beforeFeePaidGetAmount).multipliedBy(SETTLE_FEE_CALCULATION_LIMIT_RATE).toNumber();

      const appliedFeeAmount = Math.min(feeAmount, maxFeeAmount);

      getAmount = appliedFeeAmount >= beforeFeePaidGetAmount ? 0 : beforeFeePaidGetAmount - appliedFeeAmount;
    }

    setGetAmount(getAmount);
  }, [])

  const pnlInUnit = isBuy
    ? new BigNumber(settlePayoffUsd).minus(data["metrics"].parsedExecutionPrice).toNumber()
    : new BigNumber(data["metrics"].parsedExecutionPrice).minus(settlePayoffUsd).toNumber();
  
  const pnl = new BigNumber(pnlInUnit).multipliedBy(data["metrics"].parsedSize).toNumber();

  const roi = new BigNumber(pnlInUnit).div(data["metrics"].parsedExecutionPrice).multipliedBy(100).toNumber();

  const handleSettlePosition = async () => {
    setIsButtonLoading(true);

    const { expiry, strategy } = parseOptionTokenId(BigInt(data.position.optionTokenId));

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
      processBlockTime: (Date.now() / 1000).toFixed(0)
    }

    const result = await writeSettlePosition(
      isVanillaCallStrategy(strategy) ? [UA_TICKER_TO_ADDRESS[chain][selectedUnderlyingAsset as UnderlyingAsset]] : [CONTRACT_ADDRESSES[chain].USDC],
      getUnderlyingAssetIndexByTicker(chain, selectedUnderlyingAsset),
      data.position.optionTokenId,
      0,
      false,
      newPendingTxInfo,
      chain
    )

    if (result && address) {
      dispatch(loadBalance({ chain, address }));
      closeModal();
    }

    setIsButtonLoading(false);
  }

  const renderButton = () => {
    if (isButtonLoading) return (
      <Button
        name="..."
        color="default"
        disabled
        onClick={() => {}}
      />
    )

    const buttonName = isBuy ? "Settle Position" : "Settle & Redeem Collateral";

    const isButtonDisabled = !address;
      
    return (
      <Button
        name={buttonName}
        color="default"
        disabled={isButtonDisabled}
        onClick={handleSettlePosition}
      />
    )
  }

  return (
    <>
      {data && (
        <div
          className={twJoin(
            "flex flex-col",
            "w-[372px]",
            "rounded-[4px] shadow-[0px_0px_32px_0_rgba(0,0,0,0.5)] bg-black1a",
            isBuy ? "h-[555px]" : "h-[581px]",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative flex flex-row justify-center items-center w-full h-[50px]">
            <div className="text-greenc1 text-[14px] font-bold">Settlement</div>
            <img className="absolute right-[14px] cursor-pointer w-[24px] h-[24px] w-min-[24px] h-min-[24px]" src={IconClose} onClick={closeModal}/>
          </div>

          <div className="w-full h-[1px] bg-black29" />

          <div
            className={twJoin(
              "mt-[26px] px-[24px] flex flex-row gap-[12px] w-full h-[39px]",
              "text-[13px] text-gray8b font-semibold text-center"
            )}
          >
            <div className="w-[232px] flex flex-col justify-center">
              <div>Instrument</div>
              <div className="flex flex-row items-center justify-center gap-[6px]">
                <p className="text-[14px] font-bold text-whitee0 ">{data["metrics"].mainOptionName}</p>
                {data["metrics"].isCombo && <p className={twJoin(
                  "text-[10px]",
                  isCall ? "border-t-[1.4px] border-t-gray80" : "border-b-[1.4px] border-b-gray80"
                )}>{data["position"].pairedOptionStrikePrice}</p>}
              </div>
            </div>
            <div className="w-[80px] flex flex-col justify-center">
              <div>Position</div>
              {
                isBuy ? (
                  <div className="text-[14px] text-green4c">Buy</div>
                ) : (
                  <div className="text-[14px] text-redc7">Sell</div>
                )
              }
            </div>
          </div>
          
          <div
            className={twJoin(
              "mt-[22px] mx-[24px] px-[24px] py-[20px] flex flex-col",
              "w-[324px] rounded-[4px] bg-black1f text-[13px]",
              "border-[1px] border-black29",
              isBuy ? "h-[235px]" : "h-[250px]",
            )}
          >

            {/* Collateral */}
            <div className="flex flex-row justify-between items-baseline font-semibold h-fit">
              <div className="text-gray8b">Collateral</div>
              <div className="flex flex-col items-end">
                {
                  isBuy
                    ? <p className="h-[18px]">-</p>
                    : <div className="h-[35px]">
                        <div className="flex flex-row text-[14px] text-whitee0">
                          {
                            `${advancedFormatNumber(collateralAmount, 4, "")} ${isVanillaCallStrategy(data["metrics"].strategy) ? UA_INFO[chain][selectedUnderlyingAsset as UnderlyingAsset].symbol : MSA_INFO[chain]["USDC"].symbol}`
                          }
                        </div>
                        <div className="text-[12px] text-gray80 text-right">
                          ${advancedFormatNumber(collateralUsd, 2, "")}
                        </div>
                      </div>  
                }
              </div>
            </div>
            
            {/* Order Price */}
            <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
              
              {/* Tooltip */}
              <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
                <p className="text-gray8b text-[13px] hover:text-greenc1 ">Order Price</p>
                <div className={twJoin(
                  "w-max h-[26px] z-20",
                  "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                  "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                  "group-hover:block"
                )}>
                  <p className="text-[12px] text-gray80 leading-[0.85rem]">
                    Price of options paid in USD
                  </p>
                </div>
              </div>

              <div className="text-[14px] text-whitee0">
                <p>{advancedFormatNumber(data["metrics"].parsedExecutionPrice, 2, "$")}</p>
              </div>
            </div>
            
            {/* Settle Price */}
            <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
              
              {/* Tooltip */}
              <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
                <p className="text-gray8b text-[13px] hover:text-greenc1 ">Settle Price</p>
                <div className={twJoin(
                  "w-max h-[40px] z-20",
                  "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                  "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                  "group-hover:block"
                )}>
                  <p className="text-[12px] text-gray80 leading-[0.85rem]">
                    TWAP of Futures Index <br/>
                    during 30 minutes to expiry
                  </p>
                </div>
              </div>

              <div className="text-[14px] text-whitee0">
                <p>{advancedFormatNumber(settlePrice, 2, "$")}</p>
              </div>
            </div>

            {/* Settle Payoff - Size 1개 기준 */}
            <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
              
              {/* Tooltip */}
              <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
                <p className="text-gray8b text-[13px] hover:text-greenc1 ">Settle Payoff</p>
                <div className={twJoin(
                  "w-max h-[40px] z-20",
                  "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                  "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                  "group-hover:block"
                )}>
                  {isCall && isBuy && (
                    <p className="text-[12px] text-gray80 leading-[0.85rem]">
                      Greater of the two values: <br/>
                      Settle Price - Strike Price or 0.
                    </p>
                  )}
                  {isCall && !isBuy && (
                    <p className="text-[12px] text-gray80 leading-[0.85rem]">
                      Smaller of the two values: <br/>
                      Strike Price - Settle Price or 0.
                    </p>
                  )}
                  {!isCall && isBuy && (
                    <p className="text-[12px] text-gray80 leading-[0.85rem]">
                      Greater of the two values: <br/>
                      Strike Price - Settle Price or 0.
                    </p>
                  )}
                  {!isCall && !isBuy && (
                    <p className="text-[12px] text-gray80 leading-[0.85rem]">
                      Smaller of the two values: <br/>
                      Settle Price - Strike Price or 0.
                    </p>
                  )}
                </div>
              </div>

              <div className="text-[14p]">
                {
                  settlePayoffUsd === 0
                    ? <p className="text-whitee0">$0.00</p>
                    : isBuy
                        ? <p className="text-green4c">{advancedFormatNumber(settlePayoffUsd, 2, "$")}</p>
                        : <p className="text-redc7">{advancedFormatNumber(-settlePayoffUsd, 2, "$")}</p>
                }
              </div>
            </div>

            <div className="mt-[14px] w-full h-[1px] bg-black29" />

            <div className="flex flex-row items-center justify-between mt-[11px]">
              <div className="text-gray8b text-[13px] font-semibold">Quantity</div>
              <div className="text-[14px] text-whitee0">{advancedFormatNumber(data["metrics"].parsedSize, 4, "")}</div>
            </div>

            {/* P&L - Size 반영 */}
            <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">
              
              {/* Tooltip */}
              <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
                <p className="text-gray8b text-[13px] hover:text-greenc1 ">P&L</p>
                <div className={twJoin(
                  "w-max h-[26px] z-20",
                  "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                  "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                  "group-hover:block"
                )}>
                  {
                    isBuy
                      ? ( <p className="text-[12px] text-gray80 leading-[0.85rem]">
                            (Settle Payoff - Order Price) × OptionSize
                          </p>)
                      : ( <p className="text-[12px] text-gray80 leading-[0.85rem]">
                            (Order Price - Settle Payoff) × Option Size
                          </p>)
                  }
                </div>
              </div>

              <div className="text-[14px]">
                {
                  pnl === 0
                    ? <p className="text-whitee0">$0.00</p>
                    : <p className={pnl > 0 ? "text-green4c" : "text-redc7"}>{advancedFormatNumber(pnl, 2, "$")}</p>
                }
              </div>
            </div>

            {/* ROI - Size 반영 */}
            <div className="flex flex-row justify-between items-center font-semibold h-[18px] mt-[6px]">

              {/* Tooltip */}
              <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
                <p className="text-gray8b text-[13px] hover:text-greenc1 ">ROI</p>
                <div className={twJoin(
                  "w-max h-[26px] z-20",
                  "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                  "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                  "group-hover:block"
                )}>
                  <p className="text-[12px] text-gray80 leading-[0.85rem]">
                    P&L / Order Price × 100
                  </p>
                </div>
              </div>

              <div className="text-[14px]">
                {
                  roi === 0 
                    ? <p className="text-whitee0">0.00%</p>
                    : <p className={roi > 0 ? "text-green4c" : "text-redc7"}>{advancedFormatNumber(roi, 2, "")}%</p>
                }
              </div>
            </div>
          </div>

          <div className="flex flex-col mt-[24px] mx-[24px]">
            <div className="flex flex-row justify-between items-center">
              <div className="relative group cursor-help border-b-[1px] border-dashed border-b-greenc1">
                <p className="text-gray80 text-[14px] font-semibold hover:text-greenc1 ">You'll get</p>  
                <div className={twJoin(
                  "absolute hidden h-[42px] px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                  "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                  "group-hover:block",
                  isBuy ? "w-[304px]" : "w-[350px]"
                )}>
                  {
                    isBuy
                      ? (<>
                          <p className="text-[12px] text-gray80 leading-[0.85rem]">
                            Estimated token amount to get after settlement fee.
                          </p>
                          <p className='text-[11px] text-[#666] font-normal'>
                            Settle Payoff × Qty. - Total Settlement Fee
                          </p>
                        </>)
                      : (<>
                          <p className="text-[12px] text-gray80 leading-[0.85rem]">
                            Estimated token amount to get after settlement fee.
                          </p>
                          <p className='text-[11px] text-[#666] font-normal'>
                            (Collateral per Option - Settle Payoff) × Qty. - Total Settlement Fee
                          </p>
                        </>)
                  }
                </div>
              </div>
              <div className="flex flex-row items-center text-[18px] text-whitee0 font-semibold">
                <p>{advancedFormatNumber(getAmount, 4, "")}</p>
                {
                  isVanillaCallStrategy(data["metrics"].strategy)
                    ? <img src={QA_INFO[chain][UA_TICKER_TO_QA_TICKER[chain][selectedUnderlyingAsset] as keyof (typeof NetworkQuoteAsset)[typeof chain]].src} className="w-[20px] h-[20px] min-w-[20px] min-h-[20px] ml-[8px]"/>
                    : <img src={QA_INFO[chain][NetworkQuoteAsset[chain].USDC].src} className="w-[20px] h-[20px] min-w-[20px] min-h-[20px] ml-[8px]"/>
                }
              </div>
            </div>
            <div className="flex flex-row justify-end text-[12px] text-gray80 font-normal">
              {
                isVanillaCallStrategy(data["metrics"].strategy)
                  ? <p>~{advancedFormatNumber(new BigNumber(getAmount).multipliedBy(underlyingAssetSpotIndex).toNumber(), 2, "$")}</p>
                  : <p>~{advancedFormatNumber(new BigNumber(getAmount).multipliedBy(stableAssetSpotIndex).toNumber(), 2, "$")}</p>
              } 
            </div>
          </div>
    
          <div className="w-[324px] h-[48px] mt-[36px] mx-[24px]">
            {renderButton()}
          </div>
          
        </div>
      )}
    </>
  );
};
