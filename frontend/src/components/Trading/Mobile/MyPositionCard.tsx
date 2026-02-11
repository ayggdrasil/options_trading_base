import BigNumber from "bignumber.js";
import SharePositionButtonForMobile from "../../Common/Mobile/SharePositionForMobile";
import { useContext, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { GroupedPosition } from "@/interfaces/interfaces.positionSlice";
import { advancedFormatNumber, formatDate, formatNumber } from "@/utils/helper";
import { ModalContext } from "@/components/Common/ModalContext";
import { CountdownTimer } from "../../Common/CountdownTimer";
import { IOptionsInfo } from "@/interfaces/interfaces.marketSlice";
import { initialOptionDetail } from "@/constants/constants.slices";
import { ClosingModal } from "./ClosingModal";
import { SettlementModal } from "./SettlementModal";
import { setCollapseMyPositions } from "@/store/slices/CollapseSlice";
import { DropdownDownIconMedium, DropdownUpIconMedium, NoteIcon } from "@/assets/mobile/icon";
import { calculateClosePayoff, calculateSettlePayoff } from "@/utils/calculation";
import { UA_TICKER_TO_DECIMAL } from "@/networks/assets";
import { getMainOptionName, getPairedOptionName, getStrategyByOptionTokenId, getStrikePriceByInstrument, isCallStrategy, isSpreadStrategy, UnderlyingAssetWithAll } from "@callput/shared";
import { CUSTOM_CSS } from "@/networks/configs";
import { SupportedChains } from "@callput/shared";
import { NetworkState } from "@/networks/types";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface MyPositionTableBodyProps {
  positionTableRef: React.RefObject<HTMLDivElement>;
  selectedUnderlyingAsset: UnderlyingAssetWithAll;
  optionsInfo: IOptionsInfo;
  futuresPrice: number;
  groupedPosition: GroupedPosition[];
}

const MyPositionCard: React.FC<MyPositionTableBodyProps> = ({
  selectedUnderlyingAsset,
  optionsInfo,
  futuresPrice,
  groupedPosition,
}) => {
  if (groupedPosition === undefined) return null;
  const dispatch = useAppDispatch();
  const { openModal, closeModal } = useContext(ModalContext);
  const positionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const { isCollapseMyPositions } = useAppSelector((state: any) => state.collapse);
  const [isCollapseItem, setIsCollapseItem] = useState<string[]>([]);

  const handleCollapse = (id: number) => {
    dispatch(setCollapseMyPositions({ isCollapseMyPositions: id }));
  };
  const handleCollapseItem = (id: string) => {
    setIsCollapseItem((prev) => {
      const isExits = prev.includes(id);
      if (isExits) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  return (
    <div ref={containerRef} className="scrollbar-hide">
      {/* 포지션이 없을 때 */}
      <div></div>

      {/* 포지션이 있을 때 */}
      {groupedPosition &&
        groupedPosition.reduce<JSX.Element[]>((acc, gp, index) => {
          const expiry = gp["expiry"];
          const isExpired = expiry && Number(expiry) * 1000 < Date.now();

          const settlePrice = new BigNumber(gp.settlePrice).toNumber();

          // gp 중 사용자가 settle 안한 포지션만 필터링한 후 필요한 정보 계산
          const notSettledPositions = gp.positions
            .map((position) => {
              const optionTokenId = BigInt(position["optionTokenId"]);

              const isCombo = Number(position["length"]) > 1;
              const strategy = getStrategyByOptionTokenId(optionTokenId);

              const mainOptionName = getMainOptionName(optionTokenId, position["optionNames"]);
              const pairedOptionName = getPairedOptionName(optionTokenId, position["optionNames"]);

              const typePositions =
                selectedUnderlyingAsset === UnderlyingAssetWithAll.ALL
                  ? (position.optionNames.split("-")[0]) as UnderlyingAssetWithAll
                  : selectedUnderlyingAsset;

              const mainOptionInfo = optionsInfo[mainOptionName] || initialOptionDetail;
              const pairedOptionInfo = optionsInfo[pairedOptionName] || initialOptionDetail;
              
              const parsedSize = new BigNumber(position["size"])
                .div(10 ** UA_TICKER_TO_DECIMAL[chain][typePositions as keyof typeof UA_TICKER_TO_DECIMAL[SupportedChains]])
                .toNumber();
              const parsedExecutionPrice = new BigNumber(position["executionPrice"]).div(10 ** 30).toNumber();
              const parsedMarkPrice = isCombo
                ? Math.max(
                    mainOptionInfo.markPrice - pairedOptionInfo.markPrice || Number(position["markPrice"]),
                    0
                  )
                : Math.max(mainOptionInfo.markPrice || Number(position["markPrice"]), 0);

              const mainOptionStrikePrice = getStrikePriceByInstrument(mainOptionName);
              const pairedOptionStrikePrice = getStrikePriceByInstrument(pairedOptionName);
              
              let settlePayoff = 0;
              let closePayoff = 0;
              let pnl = 0;
              let roi = 0;

              if (isExpired) {
                const { settlePayoff: calculatedSettlePayoff, pnl: calculatedPnl, roi: calculatedRoi } = calculateSettlePayoff({
                  strategy,
                  mainOptionStrikePrice,
                  settlePrice,
                  pairedOptionStrikePrice,
                  parsedExecutionPrice,
                  parsedSize,
                });

                settlePayoff = calculatedSettlePayoff;
                pnl = calculatedPnl;
                roi = calculatedRoi;
              } else {
                const { closePayoff: calculatedClosePayoff, pnl: calculatedPnl, roi: calculatedRoi } = calculateClosePayoff({
                  strategy,
                  mainOptionStrikePrice,
                  parsedMarkPrice,
                  pairedOptionStrikePrice,
                  parsedExecutionPrice,
                  parsedSize,
                  futuresPrice,
                });

                closePayoff = calculatedClosePayoff;
                pnl = calculatedPnl;
                roi = calculatedRoi;
              }

              const metrics = {
                isCombo,
                strategy,
                shouldDisableTrade:
                  new Date().getTime() / 1000 >= new Date(Number(expiry) * 1000).getTime() / 1000 - 1800,
                mainOptionName,
                pairedOptionName,
                settlePrice,
                settlePayoff,
                size: position["size"],
                parsedSize,
                parsedExecutionPrice,
                parsedMarkPrice,
                closePayoff,
                pnl,
                roi,
              };

              const greeks = isCombo
                ? mainOptionInfo && pairedOptionInfo
                  ? {
                      delta: new BigNumber(mainOptionInfo.delta - pairedOptionInfo.delta)
                        .multipliedBy(parsedSize)
                        .multipliedBy(position["isBuy"] ? 1 : -1)
                        .toNumber(),
                      gamma: new BigNumber(mainOptionInfo.gamma - pairedOptionInfo.gamma)
                        .multipliedBy(parsedSize)
                        .multipliedBy(position["isBuy"] ? 1 : -1)
                        .toNumber(),
                      vega: new BigNumber(mainOptionInfo.vega - pairedOptionInfo.vega)
                        .multipliedBy(parsedSize)
                        .multipliedBy(position["isBuy"] ? 1 : -1)
                        .toNumber(),
                      theta: new BigNumber(mainOptionInfo.theta - pairedOptionInfo.theta)
                        .multipliedBy(parsedSize)
                        .multipliedBy(position["isBuy"] ? 1 : -1)
                        .toNumber(),
                    }
                  : {
                      delta: 0,
                      gamma: 0,
                      vega: 0,
                      theta: 0,
                    }
                : mainOptionInfo
                ? {
                    delta: new BigNumber(mainOptionInfo.delta)
                      .multipliedBy(parsedSize)
                      .multipliedBy(position["isBuy"] ? 1 : -1)
                      .toNumber(),
                    gamma: new BigNumber(mainOptionInfo.gamma)
                      .multipliedBy(parsedSize)
                      .multipliedBy(position["isBuy"] ? 1 : -1)
                      .toNumber(),
                    vega: new BigNumber(mainOptionInfo.vega)
                      .multipliedBy(parsedSize)
                      .multipliedBy(position["isBuy"] ? 1 : -1)
                      .toNumber(),
                    theta: new BigNumber(mainOptionInfo.theta)
                      .multipliedBy(parsedSize)
                      .multipliedBy(position["isBuy"] ? 1 : -1)
                      .toNumber(),
                  }
                : {
                    delta: 0,
                    gamma: 0,
                    vega: 0,
                    theta: 0,
                  };

              return {
                ...position,
                metrics,
                greeks,
              };
            });

          let totalInvestment = "0";
          let totalPnl = 0;
          let totalRoi = 0;

          let totalDelta = 0;
          let totalGamma = 0;
          let totalVega = 0;
          let totalTheta = 0;

          notSettledPositions.forEach((position) => {
            totalDelta = new BigNumber(totalDelta).plus(position.greeks.delta).toNumber();
            totalGamma = new BigNumber(totalGamma).plus(position.greeks.gamma).toNumber();
            totalVega = new BigNumber(totalVega).plus(position.greeks.vega).toNumber();
            totalTheta = new BigNumber(totalTheta).plus(position.greeks.theta).toNumber();

            totalInvestment = new BigNumber(totalInvestment)
              .plus(
                new BigNumber(position["metrics"].parsedExecutionPrice).multipliedBy(
                  position["metrics"].parsedSize
                )
              )
              .toString();
            totalPnl = new BigNumber(totalPnl).plus(position["metrics"].pnl).toNumber();
          });

          totalRoi = new BigNumber(totalPnl).div(totalInvestment).multipliedBy(100).toNumber();

          if (notSettledPositions.length > 0) {
            const isCollapse = isCollapseMyPositions.includes(expiry);
            acc.push(
              <div key={index} className="flex flex-col mt-6">
                {/* Header - Expiry 구분자 */}
                <div className="flex gap-3">
                  <div
                    className="flex-1 h-[40px] flex justify-center items-center gap-2 text-sm md:text-base text-contentBright font-bold bg-[#FFFFFF14] py-[10px] px-4 rounded"
                    onClick={() => handleCollapse(expiry)}
                  >
                    <p>{formatDate(String(expiry))}</p>
                    {isCollapse ? (
                      <DropdownDownIconMedium size={18} className="text-contentBright" />
                    ) : (
                      <DropdownUpIconMedium size={18} className="text-contentBright" />
                    )}
                  </div>
                  <div
                    className="flex items-center justify-center w-[40px] h-[40px] bg-[#FFFFFF14] rounded p-1"
                    onClick={() => {
                      openModal(
                        <div className="flex flex-col gap-1 px-3">
                          <div className="flex text-sm md:text-base w-full">
                            <div className="flex-1 flex justify-start items-center font-normal text-gray9D">
                              P&L USD
                            </div>
                            <div className="flex-1 flex justify-end items-center font-medium">
                              {totalPnl === 0 ? (
                                <p>$0</p>
                              ) : (
                                <p className={totalPnl > 0 ? "text-green63" : "text-redE0"}>
                                  {advancedFormatNumber(totalPnl, 2, "$")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex text-sm md:text-base w-full">
                            <div className="flex-1 flex justify-start items-center font-normal text-gray9D">
                              ROI
                            </div>
                            <div className="flex-1 flex justify-end items-center font-medium">
                              {totalRoi === 0 ? (
                                <p>0%</p>
                              ) : (
                                <p className={totalRoi > 0 ? "text-green63" : "text-redE0"}>
                                  {advancedFormatNumber(totalRoi, 2, "")}%
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <div className="flex flex-col gap-2 ">
                              <div className="flex-1 flex justify-start items-center font-medium text-gray9D text-[11px] md:text-[13px] leading-[17px]">
                                Delta
                              </div>
                              <div className="flex-1 flex items-center font-medium text-sm md:text-base">
                                {advancedFormatNumber(totalDelta, 2, "")}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ">
                              <div className="flex-1 flex justify-start items-center font-medium text-gray9D text-[11px] md:text-[13px] leading-[17px]">
                                Gamma
                              </div>
                              <div className="flex-1 flex items-center font-medium text-sm md:text-base">
                                {advancedFormatNumber(totalGamma, 6, "")}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ">
                              <div className="flex-1 flex justify-start items-center font-medium text-gray9D text-[11px] md:text-[13px] leading-[17px]">
                                Vega
                              </div>
                              <div className="flex-1 flex items-center font-medium text-sm md:text-base">
                                {advancedFormatNumber(totalVega, 2, "")}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ">
                              <div className="flex-1 flex justify-start items-center font-medium text-gray9D text-[11px] md:text-[13px] leading-[17px]">
                                Theta
                              </div>
                              <div className="flex-1 flex items-center font-medium text-sm md:text-base">
                                {advancedFormatNumber(totalTheta, 2, "")}
                              </div>
                            </div>
                          </div>
                        </div>,
                        {}
                      );
                    }}
                  >
                    <NoteIcon size={24} />
                  </div>
                </div>
                {/* Body - 특정 Expiry에 존재하는 포지션에 대한 정보 */}
                <div
                  className="flex flex-col gap-3"
                  style={{
                    maxHeight: isCollapse ? 0 : notSettledPositions.length * 450 + "px",
                    transition: "max-height 0.5s ease",
                    overflow: "hidden",
                  }}
                >
                  {notSettledPositions.map((position, index) => {
                    const isVaultSettled = position["metrics"].settlePrice !== 0;

                    const mainOptionName = getMainOptionName(
                      BigInt(position.optionTokenId),
                      position.optionNames
                    );

                    const typePositions =
                      selectedUnderlyingAsset === UnderlyingAssetWithAll.ALL
                        ? (position.optionNames.split("-")[0] as UnderlyingAssetWithAll)
                        : selectedUnderlyingAsset;

                    return (
                      <div
                        ref={(element) => {
                          if (element) {
                            positionRefs.current.set(position.optionTokenId, element);
                          }
                        }}
                        key={position.optionTokenId}
                        className={twJoin(
                          `transition duration-3000`,
                          "flex flex-col gap-2 p-3 md:p-6 rounded-[8px] bg-[#111613D9]",
                          CUSTOM_CSS[chain].outlineClass,
                          index === 0 ? "mt-6" : ""
                        )}
                      >
                        <div className="flex gap-1 text-contentBright font-bold text-sm md:text-base mb-1">
                          <p>{mainOptionName}</p>
                          {isSpreadStrategy(position["metrics"].strategy) && (
                            <p
                              className={twJoin(
                                "text-[10px] text-gray8b",
                                isCallStrategy(position["metrics"].strategy)
                                  ? "border-t-[1.4px] border-t-gray80"
                                  : "border-b-[1.4px] border-b-gray80"
                              )}
                            >
                              {position.pairedOptionStrikePrice}
                            </p>
                          )}
                        </div>
                        <div className="flex">
                          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
                            Option Size
                          </div>
                          <div className="flex-1 flex justify-end text-sm md:text-base">
                            {position["isBuy"] === true ? (
                              <p className="text-green63">
                                {advancedFormatNumber(Number(position["metrics"].parsedSize), 4, "")}
                              </p>
                            ) : (
                              <p className="text-redE0">
                                {advancedFormatNumber(-Number(position["metrics"].parsedSize), 4, "")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
                            Avg. Price <span className="text-[#5F5E5C]">&nbsp;/ Option</span>
                          </div>
                          <div className="flex-1 flex justify-end text-contentBright text-sm">
                            {isExpired ? (
                              <>${formatNumber(position["metrics"].parsedExecutionPrice, 2, false)}</>
                            ) : (
                              advancedFormatNumber(position["metrics"].parsedExecutionPrice, 2, "$")
                            )}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
                            Mark Price <span className="text-[#5F5E5C]">&nbsp;/ Option</span>
                          </div>
                          <div className="flex-1 flex justify-end text-contentBright text-sm">
                            {isExpired
                              ? "-"
                              : advancedFormatNumber(position["metrics"].parsedMarkPrice, 2, "$")}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
                            <p>P&L</p>
                          </div>
                          <div className="flex-1 flex justify-end text-sm md:text-base">
                            {isExpired ? (
                              "-"
                            ) : position["metrics"].pnl === 0 ? (
                              <p>$0</p>
                            ) : (
                              <p className={position["metrics"].pnl > 0 ? "text-green63" : "text-redE0"}>
                                {advancedFormatNumber(position["metrics"].pnl, 2, "$")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
                            <p>ROI</p>
                          </div>
                          <div className="flex-1 flex justify-end text-sm md:text-base">
                            {isExpired ? (
                              "-"
                            ) : position["metrics"].roi === 0 ? (
                              <p>$0</p>
                            ) : (
                              <p className={position["metrics"].roi > 0 ? "text-green63" : "text-redE0"}>
                                {advancedFormatNumber(position["metrics"].roi, 2, "")}%
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex mt-1" onClick={() => handleCollapseItem(mainOptionName)}>
                          <div className="flex-1 flex justify-start font-medium text-sm md:text-base text-gray9D">
                            Greeks
                          </div>
                          <div className="flex-1 flex justify-end text-sm md:text-base">
                            {isCollapseItem.includes(mainOptionName) ? (
                              <DropdownUpIconMedium size={18} />
                            ) : (
                              <DropdownDownIconMedium size={18} />
                            )}
                          </div>
                        </div>

                        {isCollapseItem.includes(mainOptionName) && (
                          <div className="flex justify-between">
                            <div className="flex flex-col gap-2">
                              <div className="flex-1 flex justify-start font-medium text-[11px] md:text-[13px] leading-[13.2px] text-gray9D">
                                <p>Delta</p>
                              </div>
                              <div className="flex-1 flex justify-end text-contentBright text-sm md:text-base">
                                {isExpired
                                  ? "-"
                                  : position.greeks === null
                                  ? "-"
                                  : advancedFormatNumber(position["greeks"].delta, 2, "")}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex-1 flex justify-start font-medium text-[11px] md:text-[13px] leading-[13.2px] text-gray9D">
                                <p>Gamma</p>
                              </div>
                              <div className="flex-1 flex justify-end text-contentBright text-sm md:text-base">
                                {isExpired
                                  ? "-"
                                  : position.greeks === null
                                  ? "-"
                                  : advancedFormatNumber(position["greeks"].gamma, 6, "")}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex-1 flex justify-start font-medium text-[11px] md:text-[13px] leading-[13.2px] text-gray9D">
                                <p>Vega</p>
                              </div>
                              <div className="flex-1 flex justify-end text-contentBright text-sm md:text-base">
                                {isExpired
                                  ? "-"
                                  : position.greeks === null
                                  ? "-"
                                  : advancedFormatNumber(position["greeks"].vega, 2, "")}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex-1 flex justify-start font-medium text-[11px] md:text-[13px] leading-[13.2px] text-gray9D">
                                <p>Theta</p>
                              </div>
                              <div className="flex-1 flex justify-end text-contentBright text-sm md:text-base">
                                {isExpired
                                  ? "-"
                                  : position.greeks === null
                                  ? "-"
                                  : advancedFormatNumber(position["greeks"].theta, 2, "")}
                              </div>
                            </div>
                          </div>
                        )}
                        {!isExpired ? (
                          !position["metrics"].shouldDisableTrade ? (
                            <>
                              <div className="flex flex-row items-center justify-end gap-[12px]">
                                <SharePositionButtonForMobile
                                  sharedPositionData={{
                                    mainOptionName: position["metrics"].mainOptionName,
                                    exitPrice: position["metrics"].parsedMarkPrice,
                                    entryPrice: position["metrics"].parsedExecutionPrice,
                                    isBuy: position["isBuy"],
                                    pnl: position["metrics"].pnl,
                                    roi: position["metrics"].roi,
                                    strategy: position["metrics"].strategy,
                                    pairedOptionStrikePrice: position["pairedOptionStrikePrice"] || 0,
                                  }}
                                  classNames="w-[28%] rounded-[4px] h-[40px] !bg-[#FFFFFF0A]"
                                  classNamesTitle="font-semibold text-sm md:text-base text-contentBright"
                                  classNamesIcon="text-contentBright"
                                  title="Share"
                                />
                                <button
                                  className="flex-1 py-[6px] px-3 rounded-[4px] bg-[#FFFFFF0A] h-[40px] text-sm md:text-base font-bold "
                                  onClick={() =>
                                    openModal(
                                      <ClosingModal
                                        closeModal={closeModal}
                                        data={{
                                          optionsInfo: optionsInfo,
                                          selectedUnderlyingAsset: typePositions,
                                          futuresPrice: futuresPrice,
                                          position: position,
                                          metrics: position["metrics"],
                                          expiry: expiry,
                                        }}
                                      />,
                                      {
                                        contentClassName: "flex flex-col min-h-[150px]",
                                      }
                                    )
                                  }
                                >
                                  <span className="text-redE0">Close</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="group relative flex flex-row items-center justify-between gap-[12px]">
                                <SharePositionButtonForMobile
                                  sharedPositionData={{
                                    mainOptionName: position["metrics"].mainOptionName,
                                    exitPrice: position["metrics"].parsedMarkPrice,
                                    entryPrice: position["metrics"].parsedExecutionPrice,
                                    isBuy: position["isBuy"],
                                    pnl: position["metrics"].pnl,
                                    roi: position["metrics"].roi,
                                    strategy: position["metrics"].strategy,
                                    pairedOptionStrikePrice: position["pairedOptionStrikePrice"] || 0,
                                  }}
                                  classNames="w-[92px] rounded-[4px] h-[40px] !bg-[#FFFFFF0A]"
                                  classNamesTitle="font-semibold text-sm md:text-base text-contentBright"
                                  classNamesIcon="text-contentBright"
                                  title="Share"
                                />
                                <button className="w-fit h-[27px] py-[6px] px-[10px] rounded-[20px] text-[10px] md:text-[12px] text-gray9D font-semibold border-[0.5px] border-gray9D">
                                  <CountdownTimer
                                    className="text-gray9D"
                                    targetTimestamp={Number(expiry)}
                                    compactFormat={true}
                                  />
                                </button>
                              </div>
                            </>
                          )
                        ) : !isVaultSettled ? (
                          <>
                            <div className="flex flex-row items-center justify-end">
                              <button
                                className="h-[27px] py-[6px] px-[10px] rounded-[20px] text-[10px] md:text-[12px] text-gray9D font-semibold border-[0.5px] border-gray9D"
                                onClick={() => {
                                  return;
                                }}
                              >
                                Settling
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-row items-center justify-end gap-[12px]">
                              <SharePositionButtonForMobile
                                sharedPositionData={{
                                  mainOptionName: position["metrics"].mainOptionName,
                                  exitPrice: position["metrics"].settlePayoff,
                                  entryPrice: position["metrics"].parsedExecutionPrice,
                                  isBuy: position["isBuy"],
                                  pnl: position["metrics"].pnl,
                                  roi: position["metrics"].roi,
                                  strategy: position["metrics"].strategy,
                                  pairedOptionStrikePrice: position["pairedOptionStrikePrice"] || 0,
                                }}
                                classNames="w-[28%] rounded-[4px] h-[40px] !bg-[#FFFFFF0A]"
                                classNamesTitle="font-semibold text-sm md:text-base text-contentBright"
                                classNamesIcon="text-contentBright"
                                title="Share"
                              />
                              <button
                                className="flex-1 h-[40px] py-[6px] px-3 bg-[#E6FC8D1A] rounded text-sm md:text-base text-greene6 font-bold"
                                onClick={() =>
                                  openModal(
                                    <SettlementModal
                                      closeModal={closeModal}
                                      data={{
                                        selectedUnderlyingAsset: typePositions,
                                        futuresPrice: futuresPrice,
                                        position: position,
                                        metrics: position["metrics"],
                                      }}
                                    />,
                                    {
                                      contentClassName: "flex flex-col min-h-[150px]",
                                    }
                                  )
                                }
                              >
                                Settle
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          return acc;
        }, [])}
    </div>
  );
};

export default MyPositionCard;
