import BigNumber from "bignumber.js";
import { advancedFormatNumber, formatDateWithTime } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import { useEffect, useState } from "react";
import IconSelectedOptionBtcBlackwhite from "@assets/icon-selected-option-btc-blackwhite.svg";
import IconSelectedOptionEthBlackwhite from "@assets/icon-selected-option-eth-blackwhite.svg";
import IconSelectedOptionUsdcBgGray from "@assets/icon-selected-option-usdc-bg-gray.svg";
import { HistoryFilterType } from "@/utils/types";
import SharePositionButton from "../Common/SharePosition";
import { getUnderlyingAssetTickerByIndex } from "@/networks/helpers";
import { QA_ADDRESS_TO_TICKER, QA_TICKER_TO_DECIMAL, UA_TICKER_TO_DECIMAL } from "@/networks/assets";
import { generateOptionTokenData, getMainOptionName, getPairedOptionStrikePrice, isBuyStrategy, isCallStrategy, isSellStrategy, isSpreadStrategy, isVanillaCallStrategy, parseOptionTokenId, UnderlyingAsset } from "@callput/shared";
import { useAppSelector } from "@/store/hooks";
import { NetworkState } from "@/networks/types";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface HistoryTableBodyProps {
  selectedUnderlyingAsset: UnderlyingAsset;
  selectedHistoryTimestamp: number;
  selectedHistoryFilterType: HistoryFilterType;
  positionHistoryData: any;
}

const HistoryTableBody: React.FC<HistoryTableBodyProps> = ({ selectedUnderlyingAsset, selectedHistoryTimestamp, selectedHistoryFilterType, positionHistoryData }) => {
  const [historyData, setHistoryData] = useState<any>([]);
  
  useEffect(() => {
    const filteredHistoryData = positionHistoryData[selectedUnderlyingAsset].filter((data: any) => {
      if (selectedHistoryFilterType === "All Types") return Number(data.processBlockTime) >= selectedHistoryTimestamp;
      if (data.type === "transferIn" || data.type === "transferOut") return selectedHistoryFilterType === "Transfer" && Number(data.processBlockTime) >= selectedHistoryTimestamp;
      return data.type === selectedHistoryFilterType.toLowerCase() && Number(data.processBlockTime) >= selectedHistoryTimestamp;
    });
    setHistoryData(filteredHistoryData);
  }, [selectedUnderlyingAsset, selectedHistoryTimestamp, selectedHistoryFilterType, positionHistoryData]);

  if (historyData.length === 0) {
    return <div className="flex flex-row justify-center items-center w-full h-full text-[13px] font-semibold text-gray52"><p>You don’t have any trade history.</p></div>
  }

  return (
    <div className="h-[310px] pt-[10px] pb-[10px] overflow-scroll scrollbar-hide">
      {historyData.map((data: any, index: number) => (
        <HistoryTableBodyRow key={index} data={data} />
      ))}
    </div>
  );
};

const HistoryTableBodyRow: React.FC<{ data: any }> = ({ data }) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const optionTokenId = BigInt(data.optionTokenId);
  const { underlyingAssetIndex, strategy } = parseOptionTokenId(optionTokenId);

  const underlyingAssetTicker = getUnderlyingAssetTickerByIndex(chain, underlyingAssetIndex);
  
  const parsedTime = formatDateWithTime(data.processBlockTime);
  const { optionNames } = generateOptionTokenData(chain, optionTokenId);
  const mainOptionName = getMainOptionName(optionTokenId, optionNames);
  const pairedOptionStrikePrice = getPairedOptionStrikePrice(optionTokenId);
  const parsedType = data.type === "open"
    ? "Open"
    : data.type === "close"
      ? "Close"
      : data.type === "settle"
        ? "Settle"
        : "Transfer";
  const parsedSize = new BigNumber(data.size).dividedBy(10 ** UA_TICKER_TO_DECIMAL[chain][underlyingAssetTicker]).toNumber();

  const collateralTokenTicker = QA_ADDRESS_TO_TICKER[chain][data.collateralToken];
  const parsedCollateralAmount = new BigNumber(data.collateralAmount).dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain][collateralTokenTicker as keyof typeof QA_TICKER_TO_DECIMAL[typeof chain]]).toNumber();
  const collateralIcon = isSellStrategy(strategy) && isVanillaCallStrategy(strategy)
    ? collateralTokenTicker === "WBTC" ? IconSelectedOptionBtcBlackwhite : IconSelectedOptionEthBlackwhite
    : IconSelectedOptionUsdcBgGray

  const parsedExecutionPrice = new BigNumber(data.executionPrice).dividedBy(10 ** 30).toNumber();
  const parsedSettlePayoff = new BigNumber(data.settlePayoff).dividedBy(10 ** 30).toNumber();
  const parsedCashFlow = new BigNumber(data.cashFlow).dividedBy(10 ** 30).toNumber();
  const parsedPnl = new BigNumber(data.pnl).dividedBy(10 ** 30).toNumber();
  const parsedRoi = new BigNumber(data.roi).toNumber();

  const entryPrice = new BigNumber(data.avgExecutionPrice).dividedBy(10 ** 30).toNumber();
  const exitPrice = data.type === 'open'
    ? 0
    : data.type === 'close'
      ? parsedExecutionPrice
      : parsedSettlePayoff

  return (
    <div
        className={twJoin(
          "grid",
          "grid-cols-[142px_232px_52px_108px_128px_112px_112px_112px_112px_96px_42px] px-[16px]",
          "h-[37px] text-[14px] text-whitee0 font-normal"
        )}
      >
      <div className="flex flex-row items-center">
        <p>{parsedTime}</p>
      </div>
      <div className="flex flex-row items-center gap-[6px] pl-[22px]">
        <p>{mainOptionName}</p>
        {isSpreadStrategy(strategy) && (
          <p className={twJoin(
            "text-[10px] text-gray8b",
            isCallStrategy(strategy) ? "border-t-[1.4px] border-t-gray80" : "border-b-[1.4px] border-b-gray80"
          )}>{pairedOptionStrikePrice}</p>
        )}      
      </div>
      <div className="flex flex-row items-center pl-[12px]">
        <p>{parsedType}</p>
      </div>
      <div className="flex flex-row items-center justify-end pl-[12px]">
        {isBuyStrategy(strategy)
          ? <p className="text-green4c">{advancedFormatNumber(parsedSize, 4, "")}</p>
          : <p className="text-redc7">{advancedFormatNumber(-parsedSize, 4, "")}</p>
        }
      </div>
      <div className="flex flex-row items-center justify-end pl-[12px] gap-[4px]">
        {isBuyStrategy(strategy)
          ? <p className="text-gray52 pr-[22px]">-</p>
          : parsedType === "Open" || data.type === "transferIn"
            ? <p className="text-redc7">{advancedFormatNumber(-parsedCollateralAmount, 4, "")}</p>
            : <p className="text-green4c">{advancedFormatNumber(parsedCollateralAmount, 4, "")}</p>
        }
        {!isBuyStrategy(strategy) && <img className="w-[18px] h-[18px]" src={collateralIcon}/> }
      </div>
      <div className="flex flex-row items-center justify-end pl-[12px]">
        {parsedType !== "Settle"
          ? <p>{advancedFormatNumber(parsedExecutionPrice, 2, "$")}</p>
          : <p className="text-gray52">-</p>
        }
      </div>
      <div className="flex flex-row items-center justify-end pl-[12px]">
        {parsedType === "Settle"
          ? <p>{advancedFormatNumber(parsedSettlePayoff, 2, "$")}</p>
          : <p className="text-gray52">-</p>
        }
      </div>
      <div className="flex flex-row items-center justify-end pl-[12px]">
        {parsedCashFlow === 0
          ? <p>$0.00</p>
          : <p
              className={parsedCashFlow > 0 ? "text-green4c" : "text-redc7"}
            >{advancedFormatNumber(parsedCashFlow, 2, "$")}</p>
        }
      </div>
      <div className="flex flex-row items-center justify-end pl-[12px]">
        {parsedType === "Open"
          ? <p className="text-gray52">-</p>
          : parsedPnl === 0
            ? <p>$0.00</p>
            : <p
                className={parsedPnl > 0 ? "text-green4c" : "text-redc7"}
              >{advancedFormatNumber(parsedPnl, 2, "$")}</p>
        }
      </div>
      <div className="flex flex-row items-center justify-end pl-[12px]">
        {parsedType === "Open"
          ? <p className="text-gray52">-</p>
          : parsedRoi === 0
            ? <p>0.00%</p>
            : <p
                className={parsedRoi > 0 ? "text-green4c" : "text-redc7"}
              >{advancedFormatNumber(parsedRoi, 2, "")}%</p>
        }
      </div>
      <div className="flex flex-row items-center justify-end">
        {data.type !== "open" && (
          <SharePositionButton
            sharedPositionData={{
              mainOptionName: mainOptionName,
              exitPrice: exitPrice,
              entryPrice: entryPrice,
              isBuy: isBuyStrategy(strategy),
              pnl: parsedPnl,
              roi: parsedRoi,
              strategy: strategy,
              pairedOptionStrikePrice: pairedOptionStrikePrice || 0,
            }}
          />
        )}
      </div>
    </div>
  )
}

export default HistoryTableBody;




