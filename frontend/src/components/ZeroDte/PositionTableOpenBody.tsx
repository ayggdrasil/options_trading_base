import BigNumber from "bignumber.js";
import { advancedFormatNumber, formatReadableDate, getOlpKeyByVaultIndex, getPlusMinusColor } from "@/utils/helper";
import { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { writeCreateClosePosition, writeSettlePosition } from "@/utils/contract";
import { loadAllowanceForController, loadBalance } from "@/store/slices/UserSlice";
import { useAccount } from "wagmi";
import { CountdownTimer } from "../Common/CountdownTimer";
import { FlattenedPosition, NewPosition, SettlePosition } from "@/interfaces/interfaces.positionSlice";
import SharePositionButton from "../Common/SharePosition";
import { NetworkState } from "@/networks/types";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { BaseQuoteAsset, BN, calculateRiskPremiumRate, calculateUnderlyingFutures, FuturesAssetIndexMap, generateOptionTokenData, getMainOptionName, getMainOptionStrikePrice, getPairedOptionName, getPairedOptionStrikePrice, isBuyStrategy, isVanillaCallStrategy, OrderSide, parseOptionTokenId, RiskFreeRateCollection, SpotAssetIndexMap, UA_INDEX_TO_TICKER, UnderlyingAsset, VolatilityScore } from "@callput/shared";
import { getMainAndPairedOptionData } from "../TradingV2/utils/options";
import { UA_TICKER_TO_ADDRESS, UA_TICKER_TO_QA_TICKER } from "../../networks/assets";
import { getUnderlyingAssetIndexByTicker } from "../../networks/helpers";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

type ButtonStatus = "Close" | "Settling" | "Settle" | "Disable" | "Unavailable";

interface PositionTableOpenBodyProps {
  flattenedPositions: FlattenedPosition[];
}

const PositionTableOpenBody: React.FC<PositionTableOpenBodyProps> = ({
  flattenedPositions
}) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const dispatch = useAppDispatch();
  const { address } = useAccount();

  useEffect(() => {
    dispatch(loadAllowanceForController({ chain, address }));
  }, [address])

  if (flattenedPositions.length === 0 || address === undefined) {
    return (
      <div className="flex flex-row justify-center items-center w-full h-full text-[13px] font-semibold text-gray52">
        <p>You don’t have any position yet.</p>
      </div>
    )
  }

  return (
    <div className="h-[222px] px-[24px] py-[4px] overflow-scroll scrollbar-hide">
      {flattenedPositions.map((flattenedPosition: FlattenedPosition, index: number) => {
        const settlePrice = new BigNumber(flattenedPosition.metadata.settlePrice).toNumber();
        return (
          <PositionTableOpenBodyRow
            key={index}
            address={address}
            settlePrice={settlePrice}
            flattenedPosition={flattenedPosition}
          />
        )
      })} 
    </div>
  );
};

interface PositionTableOpenBodyRowProps {
  address: `0x${string}`;
  settlePrice: number;
  flattenedPosition: FlattenedPosition;
} 

const PositionTableOpenBodyRow: React.FC<PositionTableOpenBodyRowProps> = ({
  address,
  settlePrice,
  flattenedPosition
}) => {
  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const optionsInfo = useAppSelector((state: any) => state.market.optionsInfo);
  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;
  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;
  const riskFreeRateCollection = useAppSelector((state: any) => state.market.riskFreeRateCollection) as RiskFreeRateCollection;
  const olpStats = useAppSelector((state: any) => state.market.olpStats)
  const volatilityScore = useAppSelector((state: any) => state.market.volatilityScore) as VolatilityScore;

  const optionTokenId = BigInt(flattenedPosition.optionTokenId);
  const { underlyingAssetIndex, expiry, strategy, vaultIndex } = parseOptionTokenId(optionTokenId);
  const parsedExpiry = formatReadableDate(String(expiry), true)

  const isExpired = Number(expiry) * 1000 < Date.now();
  const shouldDisableTrade = (Date.now() / 1000) >= ((new Date(Number(expiry) * 1000).getTime() / 1000) - 1800);
  let status: ButtonStatus = isExpired
    ? settlePrice === 0 ? "Settling" : "Settle"
    : shouldDisableTrade ? "Disable" : "Close"

  const underlyingAsset = UA_INDEX_TO_TICKER[chain as keyof typeof UA_INDEX_TO_TICKER][underlyingAssetIndex];
  const mainStrikePrice = getMainOptionStrikePrice(optionTokenId)
  const product = `${underlyingAsset} ${mainStrikePrice}`;
  const isCall = flattenedPosition.metadata.optionDirection === "Call";
  const isBuy = flattenedPosition.metadata.optionOrderSide === "Buy";
  const entryPrice = new BN(flattenedPosition.metadata.avgPrice).toNumber();
  const currentPrice = new BN(flattenedPosition.metadata.lastPrice).toNumber();
  const quantity = new BN(flattenedPosition.metadata.size).toNumber();
  const invested = new BN(flattenedPosition.metadata.avgPrice).multipliedBy(flattenedPosition.metadata.size).multipliedBy(isBuy ? -1 : 1).toNumber();
  const currentValue = new BN(flattenedPosition.metadata.lastPrice).multipliedBy(flattenedPosition.metadata.size).multipliedBy(isBuy ? 1 : -1).toNumber()
  const pnl = flattenedPosition.metadata.pnl;
  const roi = flattenedPosition.metadata.roi;

  const { optionNames } = generateOptionTokenData(chain, optionTokenId)
  const mainOptionName = getMainOptionName(optionTokenId, optionNames)
  const pairedStrikePrice = getPairedOptionStrikePrice(optionTokenId)
  
  let available = 0;

  if (status === "Close") {
    const underlyingAssetSpotIndex = spotAssetIndexMap[underlyingAsset];
    const usdcSpotIndex = spotAssetIndexMap.usdc;
    const underlyingAssetVolatilityScore = volatilityScore[underlyingAsset];

    const isVanilla = flattenedPosition.metadata.optionStrategy === "Vanilla";

    const { mainOption, pairedOption } = getMainAndPairedOptionData({
      position: flattenedPosition,
      strategy,
      optionsInfo,
    });

    const olpKey = getOlpKeyByVaultIndex(vaultIndex)
    const olpGreeks = olpStats[olpKey].greeks[underlyingAsset];
    const olpUtilityRatio = {
      sOlp: {
        utilizedUsd: olpStats.sOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.sOlp.utilityRatio.depositedUsd
      },
      mOlp: {
        utilizedUsd: olpStats.mOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.mOlp.utilityRatio.depositedUsd
      },
      lOlp: {
        utilizedUsd: olpStats.lOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.lOlp.utilityRatio.depositedUsd
      }
    }
  
    const underlyingFutures = calculateUnderlyingFutures(
      underlyingAsset,
      expiry,
      futuresAssetIndexMap,
      riskFreeRateCollection
    );

    const { RP_rate: rpRateForCloseZeroDte } = calculateRiskPremiumRate({
      underlyingAsset: underlyingAsset,
      expiry: expiry,
      isOpen: false,
      orderSide: flattenedPosition.metadata.optionOrderSide,
      optionDirection: flattenedPosition.metadata.optionDirection,
      mainOption: mainOption,
      pairedOption: isVanilla ? null : pairedOption,
      size: quantity,
      underlyingFutures,
      underlyingAssetSpotIndex,
      underlyingAssetVolatilityScore,
      olpKey,
      olpGreeks,
      olpUtilityRatio
    })

    const closingPrice = isBuy
      ? flattenedPosition.metadata.lastPrice * (1 - rpRateForCloseZeroDte)
      : flattenedPosition.metadata.lastPrice * (1 + rpRateForCloseZeroDte)

    const olpAssetAmounts = olpStats[olpKey].assetAmounts;

    if (isBuy) {
      // Buy Call, Buy Put, Buy CallSpread, Buy PutSpread
      const usdcAvailableAmounts = new BN(olpAssetAmounts.usdc.availableAmount).toNumber();
      available = new BN(usdcAvailableAmounts)
        .multipliedBy(usdcSpotIndex)
        .div(closingPrice)
        .toNumber();

      if (available <= quantity) {
        status = "Unavailable";
      }
    } else if (!isBuy && isVanillaCallStrategy(strategy)) {
      // Sell Call
      const underlyingAssetAvailableAmounts = new BN(
        underlyingAsset === "BTC"
          ? olpAssetAmounts.wbtc.availableAmount
          : olpAssetAmounts.weth.availableAmount
      ).toNumber();
      const paybackValue = new BN(underlyingAssetSpotIndex).minus(closingPrice).toNumber();

      if (paybackValue <= 0) {
        available = 0;
        status = "Unavailable";
      } else {
        available = new BN(underlyingAssetAvailableAmounts)
          .multipliedBy(underlyingAssetSpotIndex)
          .div(paybackValue)
          .toNumber();
      }
    } else {
      // Sell Put, Sell CallSpread, Sell PutSpread
      const usdcAvailableAmounts = new BN(olpAssetAmounts.usdc.availableAmount).toNumber();
      const collateralUsd = isVanilla
        ? new BN(flattenedPosition.mainOptionStrikePrice).toNumber()
        : new BN(flattenedPosition.mainOptionStrikePrice).minus(flattenedPosition.pairedOptionStrikePrice).abs().toNumber();
      const paybackValue = new BN(collateralUsd).minus(closingPrice).toNumber();

      if (paybackValue <= 0) {
        available = 0;
        status = "Unavailable";
      } else {
        available = new BN(usdcAvailableAmounts)
          .multipliedBy(usdcSpotIndex)
          .div(paybackValue)
          .toNumber();
      }
    }
  }
  
  return (
    <div
      className={twJoin(
        "grid h-[37px]",
        "grid-cols-[120px_144px_120px_120px_132px_120px_120px_120px_120px_116px]",
        "py-[5px]",
        "items-center text-[14px] text-whitee0"
      )}
    >
      {/* Expiry */}
      <p className="">{parsedExpiry}</p>

      {/* Produnct Name */}
      <p className="">{product} <span className={isCall ? "text-green63" : "text-[#E03F3F]"}>{flattenedPosition.metadata.optionDirection}</span></p>

      {/* Entry Price */}
      <p className="">{advancedFormatNumber(entryPrice, 2, "$")}</p>

      {/* Current Price */}
      <p className="">{
        currentPrice === null
          ? "-"
          : advancedFormatNumber(currentPrice, 2, "$")
      }</p>

      {/* Quantity */}
      <p className="pl-[12px]">{advancedFormatNumber(isBuyStrategy(strategy) ? quantity : -quantity, 4, "", true)}</p>

      {/* Invested */}
      <p className="">{advancedFormatNumber(invested, 2, "$")}</p>

      {/* Current Value */}
      <p className={twJoin(getPlusMinusColor(currentValue))}>{
        currentValue === null
          ? "-"
          : advancedFormatNumber(currentValue, 2, "$")
      }</p>

      {/* P&L */}
      <p className={twJoin(getPlusMinusColor(pnl))}>{
        pnl === null
          ? "..."
          : advancedFormatNumber(pnl, 2, "$")
      }</p>

      {/* ROI */}
      <p className={twJoin(getPlusMinusColor(pnl))}>{
        roi === null
          ? "..."
          : advancedFormatNumber(roi, 2, "") + "%"
      }</p>

      <div className="flex flex-row justify-end items-center gap-[12px]">
        {status !== "Settling" &&
          <SharePositionButton
            sharedPositionData={{
              mainOptionName: mainOptionName,
              entryPrice: entryPrice,
              exitPrice: currentPrice || 0,
              isBuy: isBuy,
              pnl: pnl || 0,
              roi: roi || 0,
              strategy: strategy,
              pairedOptionStrikePrice: pairedStrikePrice
            }}
          />
        }
        {address && renderCloseSettleButton(
          address,
          underlyingAsset,
          flattenedPosition,
          settlePrice,
          status,
          available,
          isButtonLoading,
          setIsButtonLoading
        )}
      </div>
    </div>
  )
}

const renderCloseSettleButton = (
  address: `0x${string}`,
  underlyingAsset: UnderlyingAsset,
  flattenedPosition: FlattenedPosition,
  settlePrice: number,
  status: ButtonStatus,
  available: number,
  isButtonLoading: boolean,
  setIsButtonLoading: (value: React.SetStateAction<boolean>) => void,
) => {
  const dispatch = useAppDispatch();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  if (isButtonLoading) {
    return (
      <button
        className={twJoin(
          "w-[63px] h-[26px] bg-black29 rounded-[16px] text-[12px] font-semibold",
          "text-[#525252]"
        )}
        disabled={true}
      >...</button>
    )
  }

  const optionTokenId = BigInt(flattenedPosition.optionTokenId);
  const { expiry, strategy } = parseOptionTokenId(optionTokenId);
  const { optionNames } = generateOptionTokenData(chain, optionTokenId)
  const mainOptionName = getMainOptionName(optionTokenId, optionNames)
  const isBuy = flattenedPosition.metadata.optionOrderSide === "Buy";

  if (status === "Disable") {
    return (
      <div className="group relative flex flex-row items-center justify-center">
        <button
          className={twJoin(
            "w-[63px] h-[26px] bg-black29 rounded-[16px] text-[12px] font-semibold",
            "text-[#525252]"
          )}
        >
          <CountdownTimer className="text-gray52" targetTimestamp={Number(expiry)} compactFormat={true} />
        </button>
        <div className={twJoin(
          "w-max h-[36px] z-20",
          "absolute hidden px-[11px] py-[6px] right-[73px]",
          "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
          "group-hover:block"
        )}>
          <p className="text-[11px] text-gray80 leading-[0.55rem]">
            You will be able to
          </p>
          <div className="flex flex-row text-[12px] text-gray80 font-normal">
            <p>settle this option in&nbsp;</p>
            <CountdownTimer className="text-[12px] text-primaryc1" targetTimestamp={Number(expiry)} compactFormat={true} />
          </div>
        </div>
      </div>
    )
  }

  if (status === "Unavailable") {
    return (
      <div className="group relative flex flex-row items-center justify-center">
        <button
          className={twJoin(
            "w-[63px] h-[26px] bg-black29 rounded-[16px] text-[12px] font-semibold",
            "text-[#525252]"
          )}
          disabled={true}
        >{status}</button>
        <div className={twJoin(
          "w-max h-[36px] z-20",
          "absolute hidden px-[11px] py-[6px] right-[73px]",
          "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
          "group-hover:block"
        )}>
          <p className="text-[11px] text-gray80 leading-[0.55rem]">Closing limited by liquidity:</p>
          <div>
          <p className="text-[11px] text-gray80"><span className="text-primaryc1">{advancedFormatNumber(available, 4, "")}</span> available now </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === "Settling") {
    return (
      <div className="group relative flex flex-row items-center justify-center">
        <button
          className={twJoin(
            "w-[63px] h-[26px] bg-black29 rounded-[16px] text-[12px] font-semibold",
            "text-[#525252]"
          )}
          disabled={true}
        >{status}</button>
        <div className={twJoin(
          "w-max h-[36px] z-20",
          "absolute hidden px-[11px] py-[6px] right-[73px]",
          "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
          "group-hover:block"
        )}>
          <p className="text-[11px] text-gray80 leading-[0.55rem]">
            You will be able to
          </p>
          <div className="flex flex-row text-[12px] text-gray80 font-normal">
            <p>settle this option in&nbsp;</p>
            <CountdownTimer className="text-[12px] text-primaryc1" targetTimestamp={Number(expiry)} compactFormat={true} />
          </div>
        </div>
      </div>
    )
  }

  // close
  if (status === "Close") {
    return (
      <button
        className={twJoin(
          "w-[63px] h-[26px] bg-black29 rounded-[16px] text-[12px] font-semibold",
          "text-[#E03F3F]"
        )}
        onClick={async () => {
          setIsButtonLoading(true);

          const closedCollateralToken = isBuy
            ? ""
            : isVanillaCallStrategy(strategy)
              ? UA_TICKER_TO_QA_TICKER[chain][underlyingAsset]
              : BaseQuoteAsset.USDC;

          const newPendingTxInfo: NewPosition = {
            isOpen: false,
            underlyingAsset: underlyingAsset,
            underlyingAssetAddress: flattenedPosition.underlyingAsset,
            expiry: expiry,
            optionTokenId: String(optionTokenId),
            length: flattenedPosition.length,
            mainOptionStrikePrice: flattenedPosition.mainOptionStrikePrice,
            pairedOptionStrikePrice: flattenedPosition.pairedOptionStrikePrice,
            isBuys: flattenedPosition.isBuys,
            strikePrices: flattenedPosition.strikePrices,
            isCalls: flattenedPosition.isCalls,
            optionNames: flattenedPosition.optionNames,
            size: flattenedPosition.size,
            executionPrice: "0",
            closedCollateralToken: closedCollateralToken,
            closedCollateralAmount: "0",
            lastProcessBlockTime: "0"
          }

          const quoteToken =
            !isBuy && isVanillaCallStrategy(strategy)
              ? UA_TICKER_TO_ADDRESS[chain][underlyingAsset]
              : CONTRACT_ADDRESSES[chain].USDC;

          const result = await writeCreateClosePosition(
            getUnderlyingAssetIndexByTicker(chain, underlyingAsset),
            String(optionTokenId),
            BigInt(flattenedPosition.size),
            [quoteToken],
            BigInt(0),
            BigInt(0),
            false,
            newPendingTxInfo,
            chain
          )

          if (result) {
            dispatch(loadBalance({ chain, address }))
          }

          setIsButtonLoading(false);
        }}
      >{status}</button>
    )
  }

  // settle
  if (status === "Settle") {
    return (
      <button
        className={twJoin(
          "w-[63px] h-[26px] bg-black29 rounded-[16px] text-[12px] font-semibold",
          "text-[#E6FC8D]"
        )}
        onClick={async () => {
          setIsButtonLoading(true);

          const newPendingTxInfo: SettlePosition = {
            underlyingAssetTicker: underlyingAsset,
            optionTokenId: String(optionTokenId),
            expiry: expiry,
            strategy: strategy,
            mainOptionName: mainOptionName,
            pairedOptionName: getPairedOptionName(optionTokenId, flattenedPosition.optionNames),
            mainOptionStrikePrice: String(flattenedPosition.pairedOptionStrikePrice,),
            pairedOptionStrikePrice: String(flattenedPosition.pairedOptionStrikePrice), 
            isBuy: isBuy,
            size: flattenedPosition.size,
            settlePrice: String(settlePrice),
            processBlockTime: (Date.now() / 1000).toFixed(0),
          }

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
          )

          if (result) {
            dispatch(loadBalance({ chain, address }))
          }

          setIsButtonLoading(false);
        }}
      >{status}</button>
    )
  }
}

export default PositionTableOpenBody;


