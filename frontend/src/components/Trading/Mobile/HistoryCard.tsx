import BigNumber from "bignumber.js";
import { advancedFormatNumber, formatDateWithTime } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import { useEffect } from "react";
import IconSelectedOptionBtcBlackwhite from "@assets/icon-selected-option-btc-blackwhite.svg";
import IconSelectedOptionEthBlackwhite from "@assets/icon-selected-option-eth-blackwhite.svg";
import IconSelectedOptionUsdcBgGray from "@assets/icon-selected-option-usdc-bg-gray.svg";
import { HistoryFilterType } from "@/utils/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import SharePositionButtonForMobile from "../../Common/Mobile/SharePositionForMobile";
import { setCollapseHistory } from "@/store/slices/CollapseSlice";
import { DropdownDownIconMedium, DropdownUpIconMedium } from "@/assets/mobile/icon";
import { getUnderlyingAssetTickerByIndex } from "@/networks/helpers";
import { QA_ADDRESS_TO_TICKER, QA_TICKER_TO_DECIMAL, UA_TICKER_TO_DECIMAL } from "@/networks/assets";
import { CUSTOM_CSS } from "@/networks/configs";
import { generateOptionTokenData, getMainOptionName, getPairedOptionStrikePrice, isBuyStrategy, isCallStrategy, isSellStrategy, isSpreadStrategy, isVanillaCallStrategy, parseOptionTokenId, UnderlyingAssetWithAll } from "@callput/shared";
import { NetworkState } from "@/networks/types";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface HistoryCardProps {
  selectedUnderlyingAsset: UnderlyingAssetWithAll;
  selectedHistoryTimestamp: number;
  selectedHistoryFilterType: HistoryFilterType;
  positionHistoryData: any;
  historyData: any;
  setHistoryData: (data: any[]) => void;
}

const HistoryCards: React.FC<HistoryCardProps> = ({
  selectedUnderlyingAsset,
  selectedHistoryTimestamp,
  selectedHistoryFilterType,
  positionHistoryData,
  historyData,
  setHistoryData
}) => {
  useEffect(() => {
    if (!positionHistoryData[selectedUnderlyingAsset]) return;
    const filteredHistoryData = positionHistoryData[selectedUnderlyingAsset].filter((data: any) => {
      if (selectedHistoryFilterType === "All Types") return Number(data.processBlockTime) >= selectedHistoryTimestamp;
      if (data.type === "transferIn" || data.type === "transferOut") return selectedHistoryFilterType === "Transfer" && Number(data.processBlockTime) >= selectedHistoryTimestamp;
      return (
        data.type === selectedHistoryFilterType.toLowerCase() &&
        Number(data.processBlockTime) >= selectedHistoryTimestamp
      );
    });
    setHistoryData(filteredHistoryData);
  }, [selectedUnderlyingAsset, selectedHistoryTimestamp, selectedHistoryFilterType, positionHistoryData]);

  if (historyData.length === 0) {
    return (
      <div className="flex flex-row justify-center items-center w-full h-full text-base md:text-lg font-bold text-contentBright opacity-65">
        <p>You don’t have any trade history.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {historyData.map((data: any, index: number) => (
        <HistoryCard key={index} data={data} />
      ))}
    </div>
  );
};

const HistoryCard: React.FC<{ data: any }> = ({ data }) => {
  const dispatch = useAppDispatch();
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const { isCollapseHistory } = useAppSelector((state) => state.collapse);

  const optionTokenId = BigInt(data.optionTokenId);
  const { underlyingAssetIndex, strategy } = parseOptionTokenId(optionTokenId);

  const underlyingAssetTicker = getUnderlyingAssetTickerByIndex(chain, underlyingAssetIndex);

  const parsedTime = formatDateWithTime(data.processBlockTime);
  const { optionNames } = generateOptionTokenData(chain, optionTokenId);
  const mainOptionName = getMainOptionName(optionTokenId, optionNames);
  const pairedOptionStrikePrice = getPairedOptionStrikePrice(optionTokenId);
  const parsedType = data.type === "open" ? "Open" : data.type === "close" ? "Close" : "Settle";
  const parsedSize = new BigNumber(data.size)
    .dividedBy(10 ** UA_TICKER_TO_DECIMAL[chain][underlyingAssetTicker])
    .toNumber();

  const collateralTokenTicker = QA_ADDRESS_TO_TICKER[chain][data.collateralToken];
  const parsedCollateralAmount = new BigNumber(data.collateralAmount)
    .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain][collateralTokenTicker as keyof typeof QA_TICKER_TO_DECIMAL[typeof chain]])
    .toNumber();
  const collateralIcon =
    isSellStrategy(strategy) && isVanillaCallStrategy(strategy)
      ? collateralTokenTicker === "WBTC"
        ? IconSelectedOptionBtcBlackwhite
        : IconSelectedOptionEthBlackwhite
      : IconSelectedOptionUsdcBgGray;

  const parsedExecutionPrice = new BigNumber(data.executionPrice).dividedBy(10 ** 30).toNumber();
  const parsedSettlePayoff = new BigNumber(data.settlePayoff).dividedBy(10 ** 30).toNumber();
  const parsedCashFlow = new BigNumber(data.cashFlow).dividedBy(10 ** 30).toNumber();
  const parsedPnl = new BigNumber(data.pnl).dividedBy(10 ** 30).toNumber();
  const parsedRoi = new BigNumber(data.roi).toNumber();

  const entryPrice = new BigNumber(data.avgExecutionPrice).dividedBy(10 ** 30).toNumber();
  const exitPrice =
    data.type === "open" ? 0 : data.type === "close" ? parsedExecutionPrice : parsedSettlePayoff;

  return (
    <div
      className={twJoin(
        "flex flex-col rounded-lg gap-3 py-3 px-3 md:px-6 bg-[#111613B2] w-full",
        CUSTOM_CSS[chain].outlineClass
      )}
      style={{
        transition: "max-height 0.5s ease",
        overflow: "hidden",
        maxHeight: isCollapseHistory.includes(data.optionTokenId) ? "44px" : `${400}px`,
      }}
    >
      <div
        className="flex justify-between items-center h-[20px]"
        onClick={() => {
          dispatch(setCollapseHistory({ isCollapseHistory: data.optionTokenId }));
        }}
      >
        <div className="flex gap-[6px] items-center font-bold text-sm md:text-base text-contentBright">
          <p>{mainOptionName}</p>
          {isSpreadStrategy(strategy) && (
            <p
              className={twJoin(
                "text-[10px] md:text-xs text-gray8b",
                isCallStrategy(strategy)
                  ? "border-t-[1.4px] border-t-gray80"
                  : "border-b-[1.4px] border-b-gray80"
              )}
            >
              {pairedOptionStrikePrice}
            </p>
          )}
        </div>
        <div className="flex gap-1 items-center text-gray9D font-normal text-xs md:text-sm">
          {parsedTime}
          {isCollapseHistory.includes(data.optionTokenId) ? (
            <DropdownDownIconMedium size={18} className="text-contentBright" />
          ) : (
            <DropdownUpIconMedium size={18} className="text-contentBright" />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex">
          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
            Option Size
          </div>
          <div className="flex-1 flex justify-end text-sm md:text-base">
            {isBuyStrategy(strategy) ? (
              <p className="text-green63">{advancedFormatNumber(parsedSize, 4, "")}</p>
            ) : (
              <p className="text-redE0">{advancedFormatNumber(-parsedSize, 4, "")}</p>
            )}
          </div>
        </div>
        <div className="flex">
          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
            Collateral
          </div>
          <div className="flex-1 flex gap-1 justify-end text-sm md:text-base">
            {isBuyStrategy(strategy) ? (
              <p className="text-contentBright">-</p>
            ) : parsedType === "Open" ? (
              <p className="text-redE0">{advancedFormatNumber(-parsedCollateralAmount, 4, "")}</p>
            ) : (
              <p className="text-green63">{advancedFormatNumber(parsedCollateralAmount, 4, "")}</p>
            )}
            {!isBuyStrategy(strategy) && <img className="w-[18px] h-[18px]" src={collateralIcon} />}
          </div>
        </div>
        <div className="flex">
          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
            Avg. Price <span className="text-[#5F5E5C]">&nbsp;/ Option</span>
          </div>
          <div className="flex-1 flex justify-end text-sm md:text-base">
            {parsedType !== "Settle" ? (
              <p className="text-contentBright">{advancedFormatNumber(parsedExecutionPrice, 2, "$")}</p>
            ) : (
              <p className="text-contentBright">-</p>
            )}
          </div>
        </div>
        <div className="flex">
          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
            Settle Payoff <span className="text-[#5F5E5C]">&nbsp;/ Option</span>
          </div>
          <div className="flex-1 flex justify-end text-sm md:text-base">
            {parsedType === "Settle" ? (
              <p>{advancedFormatNumber(parsedSettlePayoff, 2, "$")}</p>
            ) : (
              <p className="text-contentBright">-</p>
            )}
          </div>
        </div>
        <div className="flex">
          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
            <p>Cash Flow</p>
          </div>
          <div className="flex-1 flex justify-end text-sm md:text-base">
            {parsedCashFlow === 0 ? (
              <p>$0.00</p>
            ) : (
              <p className={parsedCashFlow > 0 ? "text-green63" : "text-redE0"}>
                {advancedFormatNumber(parsedCashFlow, 2, "$")}
              </p>
            )}
          </div>
        </div>
        <div className="flex">
          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">P&L</div>
          <div className="flex-1 flex justify-end text-sm md:text-base">
            {parsedType === "Open" ? (
              <p className="text-contentBright">-</p>
            ) : parsedPnl === 0 ? (
              <p>$0.00</p>
            ) : (
              <p className={parsedPnl > 0 ? "text-green63" : "text-redE0"}>
                {advancedFormatNumber(parsedPnl, 2, "$")}
              </p>
            )}
          </div>
        </div>
        <div className="flex">
          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">ROI</div>
          <div className="flex-1 flex justify-end text-sm md:text-base">
            {parsedType === "Open" ? (
              <p className="text-contentBright">-</p>
            ) : parsedRoi === 0 ? (
              <p>0.00%</p>
            ) : (
              <p className={parsedRoi > 0 ? "text-green63" : "text-redE0"}>
                {advancedFormatNumber(parsedRoi, 2, "")}%
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 justify-between items-center">
          {data.type !== "open" ? (
            <SharePositionButtonForMobile
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
              classNames="w-[92px] rounded-[4px] h-[40px] !bg-[#FFFFFF0A]"
              classNamesTitle="font-semibold text-sm md:text-base text-contentBright"
              classNamesIcon="text-contentBright"
              title="Share"
            />
          ) : (
            <div></div>
          )}
          <p className="flex items-center justify-center text-gray9D font-semibold text-[10px] md:text-[12px] rounded-[20px] border-[1px] border-gray9D opacity-50 px-[10px] py-[6px]">
            {parsedType}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HistoryCards;
