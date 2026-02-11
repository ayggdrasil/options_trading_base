import BigNumber from "bignumber.js";
import { advancedFormatNumber, capitalizeFirstLetter, formatReadableDate, getPlusMinusColor } from "@/utils/helper";
import { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { generateOptionTokenData, getMainOptionName, getMainOptionStrikePrice, getPairedOptionStrikePrice, isCallStrategy, parseOptionTokenId } from "@callput/shared";
import { HistoryFilterType } from "@/utils/types";
import { useAppSelector } from "@/store/hooks";
import SharePositionButton from "../Common/SharePosition";
import { NetworkState } from "@/networks/types";
import { getUnderlyingAssetTickerByIndex } from "@/networks/helpers";
import { UA_TICKER_TO_DECIMAL } from "@/networks/assets";
import { UnderlyingAsset } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface PositionTableHistoryBodyProps {
  underlyingAsset: UnderlyingAsset;
  historyTimestamp: number;
  historyFilterType: HistoryFilterType;
}

const PositionTableHistoryBody: React.FC<PositionTableHistoryBodyProps> = ({
  underlyingAsset,
  historyTimestamp,
  historyFilterType
}) => {
  const [historyData, setHistoryData] = useState<any[]>([]);

  const positionHistoryData = useAppSelector((state: any) => state.positionHistory);

  useEffect(() => {
    const filteredHistoryData = positionHistoryData[underlyingAsset]
      .filter((data: any) => {{
        const { strategy } = parseOptionTokenId(BigInt(data.optionTokenId))
        return strategy === "BuyCallSpread" || strategy === "BuyPutSpread";
      }})
      .filter((data: any) => {
        if (historyFilterType === "All Types") return Number(data.processBlockTime) >= historyTimestamp;
        if (data.type === "transferIn" || data.type === "transferOut") return historyFilterType === "Transfer" && Number(data.processBlockTime) >= historyTimestamp;
        return data.type === historyFilterType.toLowerCase() && Number(data.processBlockTime) >= historyTimestamp;
      });
    setHistoryData(filteredHistoryData);
  }, [underlyingAsset, historyTimestamp, historyFilterType, positionHistoryData]);

  if (historyData.length === 0) {
    return (
      <div className="flex flex-row justify-center items-center w-full h-[222px] text-[13px] font-semibold text-gray52">
        <p>You don’t have any trade history.</p>
      </div>
    )
  }

  return (
    <div className="h-[222px] px-[24px] py-[4px] overflow-scroll scrollbar-hide">
      {historyData.map((data: any, index: number) => (
        <PositionTableHistoryBodyRow key={index} data={data} />
      ))}
    </div>
  );
};

const PositionTableHistoryBodyRow: React.FC<{ data: any }> = ({ data }) => {
  const optionTokenId = BigInt(data.optionTokenId);
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  
  const { underlyingAssetIndex, expiry, strategy } = parseOptionTokenId(optionTokenId);
  
  const underlyingAssetTicker = getUnderlyingAssetTickerByIndex(chain, underlyingAssetIndex)

  const mainStrikePrice = getMainOptionStrikePrice(optionTokenId)
  const pairedStrikePrice = getPairedOptionStrikePrice(optionTokenId)
  const { optionNames } = generateOptionTokenData(chain, optionTokenId)
  const mainOptionName = getMainOptionName(optionTokenId, optionNames)

  const time = formatReadableDate(data.processBlockTime, true, false);
  const type = capitalizeFirstLetter(data.type);
  const product = `${underlyingAssetTicker} ${mainStrikePrice}`;
  const isCall = isCallStrategy(strategy);
  const parsedExpiry = formatReadableDate(String(expiry), false);
  const quantity = new BigNumber(data.size).dividedBy(10 ** UA_TICKER_TO_DECIMAL[chain][underlyingAssetTicker]).toNumber();

  const executionPrice = new BigNumber(data.executionPrice).dividedBy(10 ** 30).toNumber();
  const avgExecutionPrice = new BigNumber(data.avgExecutionPrice).dividedBy(10 ** 30).toNumber();
  const settlePayoff = new BigNumber(data.settlePayoff).dividedBy(10 ** 30).toNumber();

  const entryPrice = data.type === 'open'
    ? executionPrice
    : null

  const entryPriceForCloseAndSettle = data.type === 'open'
    ? null
    : avgExecutionPrice

  const currentPrice = data.type === 'open'
    ? null
    : data.type === 'close'
      ? executionPrice
      : settlePayoff

  const invested = data.type === 'open'
    ? new BigNumber(entryPrice || 0).multipliedBy(quantity).toNumber()
    : null;
  const returned = data.type === 'open'
    ? null
    : new BigNumber(currentPrice || 0).multipliedBy(quantity).toNumber()
  const pnl = data.type === 'open' ? null : new BigNumber(data.pnl).dividedBy(10 ** 30).toNumber();
  const roi = data.type === 'open' ? null : new BigNumber(data.roi).toNumber();

  return (
    <div
      className={twJoin(
        "grid h-[37px]",
        "grid-cols-[108px_64px_64px_144px_118px_118px_118px_118px_118px_118px_118px_26px]",
        "items-center text-[14px] text-whitee0"
      )}
    >
      {/* Time */}
      <p className="">{time}</p>

      {/* Type */}
      <p className="">{type}</p>

      {/* Expiry */}
      <p className="">{parsedExpiry}</p>

      {/* Produnct Name */}
      <p className="">{product} <span className={isCall ? "text-green63" : "text-[#E03F3F]"}>{isCall ? "Call" : "Put"}</span></p>

      {/* Entry Price */}
      <p className="">{
        entryPrice === null 
          ? "-"
          : advancedFormatNumber(entryPrice, 2, "$")
      }</p>

      {/* Current Price */}
      <p className="">{
        currentPrice === null 
          ? "-"
          : advancedFormatNumber(currentPrice, 2, "$")
      }</p>

      {/* Quantity */}
      <p className="">{advancedFormatNumber(quantity, 4, "", true)}</p>

      {/* Invested */}
      <p className="">{
        invested === null 
          ? "-"
          : advancedFormatNumber(invested, 2, "$")
      }</p>

      {/* Returned */}
      <p className={twJoin(getPlusMinusColor(returned))}>{
        returned === null 
          ? "-"
          : advancedFormatNumber(returned, 2, "$")
      }</p>

      {/* P&L */}
      <p className={twJoin(getPlusMinusColor(pnl))}>{
        pnl === null 
          ? "-"
          : advancedFormatNumber(pnl, 2, "$")
      }</p>

      {/* ROI */}
      <p className={twJoin(getPlusMinusColor(roi))}>{
        roi === null 
          ? "-"
          : advancedFormatNumber(roi, 2, "") + "%"
      }</p>

      {data.type !== 'open' && (
        <div className="flex flex-row justify-end items-center gap-[12px]">
          <SharePositionButton
            sharedPositionData={{
              mainOptionName: mainOptionName,
              entryPrice: entryPriceForCloseAndSettle || 0,
              exitPrice: currentPrice || 0,
              isBuy: true,
              pnl: pnl || 0,
              roi: roi || 0,
              strategy: strategy,
              pairedOptionStrikePrice: pairedStrikePrice
            }}
          />
        </div>
      )}
    </div>
  )
}

export default PositionTableHistoryBody;


