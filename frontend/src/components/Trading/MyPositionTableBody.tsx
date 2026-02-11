import BigNumber from "bignumber.js";
import { useContext, useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber, formatDate, formatNumber } from "@/utils/helper";
import { ClosingModal } from "./ClosingModal";
import { ModalContext } from "../Common/ModalContext";
import { SettlementModal } from "./SettlementModal";
import { CountdownTimer } from "../Common/CountdownTimer";
import SharePositionButton from "../Common/SharePosition";
import { IOptionsInfo } from "@/interfaces/interfaces.marketSlice";
import { initialOptionDetail } from "@/constants/constants.slices";
import { TransferModal } from "./TransferModal";
import { useLocation } from "react-router-dom";
import { GroupedPosition } from "@/interfaces/interfaces.positionSlice";
import { UA_TICKER_TO_DECIMAL } from "@/networks/assets";
import { getMainOptionName, getPairedOptionName, getStrategyByOptionTokenId, getStrikePriceByInstrument, isBuyStrategy, isCallStrategy, isSpreadStrategy, isVanillaCallStrategy, UnderlyingAsset } from "@callput/shared";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface MyPositionTableBodyProps {
  positionTableRef: React.RefObject<HTMLDivElement>;
  selectedUnderlyingAsset: UnderlyingAsset;
  optionsInfo: IOptionsInfo;
  futuresPrice: number;
  groupedPosition: GroupedPosition[];
}

interface HighlightInfo {
  id: string;
  timestamp: number;
}

const MyPositionTableBody: React.FC<MyPositionTableBodyProps> = ({positionTableRef, selectedUnderlyingAsset, optionsInfo, futuresPrice, groupedPosition }) => {
  if (groupedPosition === undefined) return null;

  const location = useLocation()
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const { openModal, closeModal } = useContext(ModalContext);
  const prevGroupedPositionRef = useRef<GroupedPosition[] | null>(null);
  const positionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [highlightedPositions, setHighlightedPositions] = useState<HighlightInfo[]>([]);
  const [prevSelectedUnderlyingAsset, setPrevSelectedUnderlyingAsset] = useState<UnderlyingAsset | null>(null);

  const smoothScrollTo = (container: HTMLElement, targetScrollTop: number) => {
    const startTime = performance.now();
    const startScrollTop = container.scrollTop;
    const duration = 300; // Duration of the scroll in milliseconds
  
    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        container.scrollTop = startScrollTop + (targetScrollTop - startScrollTop) * progress;
        window.requestAnimationFrame(animateScroll);
      } else {
        container.scrollTop = targetScrollTop; // Ensure it ends up at the desired scroll position
      }
    };
  
    window.requestAnimationFrame(animateScroll);
  };

  const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const scrollToPositionInView = (container: HTMLElement, element: HTMLElement) => {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    let targetScrollTop = container.scrollTop;

    // Check if element is out of view on the top side
    if (elementRect.top < containerRect.top) {
      targetScrollTop -= containerRect.top - elementRect.top;
    }

    // Check if element is out of view on the bottom side
    if (elementRect.bottom > containerRect.bottom) {
      targetScrollTop += elementRect.bottom - containerRect.bottom;
    }

    if (targetScrollTop !== container.scrollTop) {
      smoothScrollTo(container, targetScrollTop);
    }
  };

  useEffect(() => {
      if (prevGroupedPositionRef.current) {
          const prevPositions = prevGroupedPositionRef.current.flatMap(gp => gp.positions);
          const prevIds = new Set(prevPositions.map(p => p.optionTokenId));
          
          const newOrUpdated = groupedPosition.flatMap(gp => gp.positions.filter(p => {
              if (!prevIds.has(p.optionTokenId)) {
                  return true;  // New position
              } else {
                  const prevPosition = prevPositions.find(prevP => prevP.optionTokenId === p.optionTokenId);
                  return prevPosition && prevPosition.size !== p.size;  // Updated size
              }
          }).map(p => ({ id: p.optionTokenId, timestamp: Date.now() })));

          setHighlightedPositions(prevHighlights => [...prevHighlights, ...newOrUpdated]);

          if (prevSelectedUnderlyingAsset !== selectedUnderlyingAsset) {
            setPrevSelectedUnderlyingAsset(selectedUnderlyingAsset);
            setHighlightedPositions([]);
          } else {
            if (positionTableRef.current && newOrUpdated.length > 0) {
              positionTableRef.current.scrollIntoView({ behavior: 'smooth' });
  
              delay(500) // 500ms delay, adjust as needed
                .then(() => {
                    const latestUpdatedPosition = newOrUpdated[newOrUpdated.length - 1];
                    const latestPositionRef = positionRefs.current.get(latestUpdatedPosition?.id);
          
                    if (containerRef && containerRef.current && latestPositionRef) {
                      scrollToPositionInView(containerRef.current, latestPositionRef);
                    }
                });
            }
            
            newOrUpdated.forEach(item => {
                setTimeout(() => {
                    setHighlightedPositions(prevHighlights => prevHighlights.filter(h => h.id !== item.id));
                }, 3000);
            });
          }
      }

      prevGroupedPositionRef.current = groupedPosition;
  }, [groupedPosition]);

  return (
    <div ref={containerRef} className="h-[310px] pb-[16px] overflow-scroll scrollbar-hide">
      {/* 포지션이 없을 때 */}
      <div></div>

      {/* 포지션이 있을 때 */}
      {groupedPosition && groupedPosition.reduce<JSX.Element[]>((acc, gp, index) => {
        const expiry = gp["expiry"];
        const isExpired = expiry && Number(expiry) * 1000 < Date.now();

        // gp 중 사용자가 settle 안한 포지션만 필터링한 후 필요한 정보 계산
        const notSettledPositions = gp.positions
          .map((position) => {
            const optionTokenId = BigInt(position["optionTokenId"]);
            
            const isCombo = Number(position["length"]) > 1;
            const strategy = getStrategyByOptionTokenId(optionTokenId);

            const mainOptionName = getMainOptionName(optionTokenId, position["optionNames"]);
            const pairedOptionName = getPairedOptionName(optionTokenId, position["optionNames"]);
            
            const mainOptionInfo = optionsInfo[mainOptionName] || initialOptionDetail;
            const pairedOptionInfo = optionsInfo[pairedOptionName] || initialOptionDetail;

            const settlePrice = new BigNumber(gp["settlePrice"]).toNumber();

            const parsedSize = new BigNumber(position["size"]).div(10 ** UA_TICKER_TO_DECIMAL[chain][selectedUnderlyingAsset]).toString();
            const parsedExecutionPrice = new BigNumber(position["executionPrice"]).div(10 ** 30).toNumber();
            const parsedMarkPrice = isCombo
              ? Math.max((mainOptionInfo.markPrice - pairedOptionInfo.markPrice) || Number(position["markPrice"]), 0)
              : Math.max(mainOptionInfo.markPrice || Number(position["markPrice"]), 0);

            const closePayoff = position["isBuy"]
              ? new BigNumber(parsedMarkPrice).minus(parsedExecutionPrice).toNumber()
              : new BigNumber(parsedExecutionPrice).minus(parsedMarkPrice).toNumber();

            const isItm = isCallStrategy(strategy)
              ? Number(position["mainOptionStrikePrice"]) < settlePrice
              : Number(position["mainOptionStrikePrice"]) > settlePrice;
            
            const mainOptionStrikePrice = getStrikePriceByInstrument(mainOptionName);
            const pairedOptionStrikePrice = getStrikePriceByInstrument(pairedOptionName);
            
            const settlePayoff = isItm
              ? isCombo
                ? isCallStrategy(strategy)
                  ? Math.min(
                      new BigNumber(settlePrice).minus(mainOptionStrikePrice).toNumber(),
                      new BigNumber(mainOptionStrikePrice).minus(pairedOptionStrikePrice).abs().toNumber()
                    )
                  : Math.min(
                      new BigNumber(mainOptionStrikePrice).minus(settlePrice).toNumber(),
                      new BigNumber(mainOptionStrikePrice).minus(pairedOptionStrikePrice).abs().toNumber()
                  )
                : isCallStrategy(strategy)
                  ? new BigNumber(settlePrice).minus(mainOptionStrikePrice).toNumber()
                  : new BigNumber(mainOptionStrikePrice).minus(settlePrice).toNumber()
              : 0;

            let pnl = 0;
            let roi = 0;

            if (isExpired) {
              const pnlInUnit = isBuyStrategy(strategy)
                ? new BigNumber(settlePayoff).minus(parsedExecutionPrice).toNumber()
                : new BigNumber(parsedExecutionPrice).minus(settlePayoff).toNumber();
              pnl = new BigNumber(pnlInUnit).multipliedBy(parsedSize).toNumber();
              roi = new BigNumber(pnlInUnit).div(parsedExecutionPrice).multipliedBy(100).toNumber();
            } else {
              if (position["isBuy"]) {
                pnl = new BigNumber(closePayoff).multipliedBy(parsedSize).toNumber();
                roi = new BigNumber(closePayoff).div(parsedExecutionPrice).multipliedBy(100).toNumber()  
              } else {
                let maxClosePayoff = 0;
                
                if (isVanillaCallStrategy(strategy)) {  
                  maxClosePayoff = closePayoff < 0
                    ? Math.max(closePayoff, -futuresPrice)
                    : closePayoff
                } else {
                  const collateralUsd = isCombo
                    ? new BigNumber(mainOptionStrikePrice).minus(pairedOptionStrikePrice).abs().toNumber()
                    : new BigNumber(mainOptionStrikePrice).toNumber();
                  
                  maxClosePayoff = closePayoff < 0
                    ? Math.max(closePayoff, -collateralUsd)
                    : closePayoff;
                }

                pnl = new BigNumber(maxClosePayoff).multipliedBy(parsedSize).toNumber();
                roi = new BigNumber(maxClosePayoff).div(parsedExecutionPrice).multipliedBy(100).toNumber()                }
            }

            const metrics = {
              isCombo,
              strategy,
              shouldDisableTrade: new Date().getTime() / 1000 >= new Date(Number(expiry) * 1000).getTime() / 1000 - 1800,
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
            }

            const greeks = isCombo
              ? mainOptionInfo && pairedOptionInfo
                  ? {
                      delta: new BigNumber(mainOptionInfo.delta - pairedOptionInfo.delta).multipliedBy(parsedSize).multipliedBy(position["isBuy"] ? 1 : -1).toNumber(),
                      gamma: new BigNumber(mainOptionInfo.gamma - pairedOptionInfo.gamma).multipliedBy(parsedSize).multipliedBy(position["isBuy"] ? 1 : -1).toNumber(),
                      vega: new BigNumber(mainOptionInfo.vega - pairedOptionInfo.vega).multipliedBy(parsedSize).multipliedBy(position["isBuy"] ? 1 : -1).toNumber(),
                      theta: new BigNumber(mainOptionInfo.theta - pairedOptionInfo.theta).multipliedBy(parsedSize).multipliedBy(position["isBuy"] ? 1 : -1).toNumber()
                    }
                  : {
                      delta: 0,
                      gamma: 0,
                      vega: 0,
                      theta: 0
                    }
              : mainOptionInfo
                  ? {
                      delta: new BigNumber(mainOptionInfo.delta).multipliedBy(parsedSize).multipliedBy(position["isBuy"] ? 1 : -1).toNumber(),
                      gamma: new BigNumber(mainOptionInfo.gamma).multipliedBy(parsedSize).multipliedBy(position["isBuy"] ? 1 : -1).toNumber(),
                      vega: new BigNumber(mainOptionInfo.vega).multipliedBy(parsedSize).multipliedBy(position["isBuy"] ? 1 : -1).toNumber(),
                      theta: new BigNumber(mainOptionInfo.theta).multipliedBy(parsedSize).multipliedBy(position["isBuy"] ? 1 : -1).toNumber()
                    }
                  : {
                      delta: 0,
                      gamma: 0,
                      vega: 0,
                      theta: 0
                    }
                
            return {
              ...position,
              metrics,
              greeks
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

          totalInvestment = new BigNumber(totalInvestment).plus(new BigNumber(position["metrics"].parsedExecutionPrice).multipliedBy(position["metrics"].parsedSize)).toString();
          totalPnl = new BigNumber(totalPnl).plus(position["metrics"].pnl).toNumber();
        })

        totalRoi = new BigNumber(totalPnl).div(totalInvestment).multipliedBy(100).toNumber();

        if (notSettledPositions.length > 0) {
          acc.push(
            <div key={index}>

              {/* Header - Expiry 구분자 */}
              <div
                key={index}
                className={twJoin(
                  "grid",
                  "grid-cols-[229px_115px_96px_96px_118px_98px_88px_116px_88px_88px_120px] pl-[16px] pr-[12px]",
                  "h-[37px] text-[14px] text-whitee0 font-normal"
                )}
              >
                {/* Positions */}
                <div className="flex flex-row items-center">
                  <div>{formatDate(String(expiry))}</div>
                </div>
                
                {!isExpired && notSettledPositions.length > 1 && (
                  <>
                    <div className="flex flex-row items-center"/>
                    <div className="flex flex-row items-center justify-end"/>
                    <div className="flex flex-row items-center justify-end"/>
                    
                    {/* P&L */}
                    <div className="flex flex-row items-center justify-end">
                      {
                        totalPnl === 0
                          ? <p>$0</p>
                          : <p className={totalPnl > 0 ? "text-green4c" : "text-redc7"}>{advancedFormatNumber(totalPnl, 2, "$")}</p>
                      }
                    </div>

                    {/* ROI */}
                    <div className="flex flex-row items-center justify-end">
                      {
                        totalRoi === 0
                          ? <p>0%</p>
                          : <p className={totalRoi > 0 ? "text-green4c" : "text-redc7"}>{advancedFormatNumber(totalRoi, 2, "")}%</p>
                      }
                    </div>

                    {/* Delta */}
                    <div className="flex flex-row items-center justify-end">
                      <p>{advancedFormatNumber(totalDelta, 2, "")}</p>
                    </div>

                    {/* Gamma */}
                    <div className="flex flex-row items-center justify-end">
                      <p>{advancedFormatNumber(totalGamma, 6, "")}</p>
                    </div>

                    {/* Vega */}
                    <div className="flex flex-row items-center justify-end">
                      <p>{advancedFormatNumber(totalVega, 2, "")}</p>
                    </div>

                    {/* Theta */}
                    <div className="flex flex-row items-center justify-end">
                      <p>{advancedFormatNumber(totalTheta, 2, "")}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Body - 특정 Expiry에 존재하는 포지션에 대한 정보 */}
              {notSettledPositions.map((position, index) => {
                const isVaultSettled = position["metrics"].settlePrice !== 0;

                const shouldHighlight = highlightedPositions.some(h => h.id === position.optionTokenId);
                const positionClass = shouldHighlight ? "border-[rgba(193,209,130)] border-opacity-70 border-[1px]" : "border-transparent border-[unset]";

                const mainOptionName = getMainOptionName(BigInt(position.optionTokenId), position.optionNames);

                return (
                  <div
                    ref={(element) => {
                      if (element) {
                        positionRefs.current.set(position.optionTokenId, element);
                      }
                    }}
                    key={position.optionTokenId}
                    className={twJoin(
                      `${positionClass} transition duration-3000`,
                      "grid",
                      "grid-cols-[229px_115px_96px_96px_118px_98px_88px_116px_88px_88px_120px] pl-[16px] pr-[12px]",
                      "h-[37px] text-[14px] text-whitee0 font-normal",
                      "hover:bg-black29 hover:bg-opacity-50"
                    )}
                  >
                    {/* Positions */}
                    <div className="flex flex-row items-center">
                      <div
                        className={twJoin(
                          "w-[2px] h-full bg-black29",
                          `${
                            index === 0
                              ? "rounded-t-[3px]"
                              : index === gp.positions.length - 1
                                ? "rounded-b-[3px]"
                                : ""
                          }`
                        )}
                      />
                      <div className="pl-[12px] flex flex-row items-center gap-[6px]">
                        <p>{mainOptionName}</p>
                        {isSpreadStrategy(position["metrics"].strategy) && (
                          <p className={twJoin(
                            "text-[10px] text-gray8b",
                            isCallStrategy(position["metrics"].strategy) ? "border-t-[1.4px] border-t-gray80" : "border-b-[1.4px] border-b-gray80"
                          )}>{position.pairedOptionStrikePrice}</p>
                        )}      
                      </div>
                    </div>

                    {/* Qty. */}
                    <div className="flex flex-row items-center justify-end">
                      {position["isBuy"] === true ? (
                        <p className="text-green4c">{advancedFormatNumber(Number(position["metrics"].parsedSize), 4, "")}</p>
                      ) : (
                        <p className="text-redc7">{advancedFormatNumber(-Number(position["metrics"].parsedSize), 4, "")}</p>
                      )}
                    </div>
                    
                    {/* 포지션 정보 부분 */}
                    {
                      isExpired
                        ? <>
                            {/* Order Price */}
                            <div className="flex flex-row items-center justify-end">
                              <p>${formatNumber(position["metrics"].parsedExecutionPrice, 2, false)}</p>
                            </div>

                            {/* Current Price */} 
                            <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>

                            {/* P&L */}
                            <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>

                            {/* ROI */}
                            <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>

                            {/* Delta */}
                            <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>
                            {/* Gamma */}
                            <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>
                            {/* Vega */}
                            <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>
                            {/* Theta */}
                            <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>
                          </>
                        : <>
                            {/* Order Price */}
                            <div className="flex flex-row items-center justify-end">
                              <p>{advancedFormatNumber(position["metrics"].parsedExecutionPrice, 2, "$")}</p>
                            </div>

                            {/* Current Price */}
                            <div className="flex flex-row items-center justify-end">
                              <p>{advancedFormatNumber(position["metrics"].parsedMarkPrice, 2, "$")}</p>
                            </div>

                            {/* P&L */}
                            <div className="flex flex-row items-center justify-end">
                              {
                                position["metrics"].pnl === 0
                                  ? <p>$0</p>
                                  : <p className={position["metrics"].pnl > 0 ? "text-green4c" : "text-redc7"}>{advancedFormatNumber(position["metrics"].pnl, 2, "$")}</p>
                              }
                            </div>

                            {/* ROI */}
                            <div className="flex flex-row items-center justify-end">
                              {
                                position["metrics"].roi === 0
                                  ? <p>$0</p>
                                  : <p className={position["metrics"].roi > 0 ? "text-green4c" : "text-redc7"}>{advancedFormatNumber(position["metrics"].roi, 2, "")}%</p>
                              }
                            </div>

                            {
                              position.greeks === null
                                ? <>
                                    {/* Delta */}
                                    <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>
                                    {/* Gamma */}
                                    <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>
                                    {/* Vega */}
                                    <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>
                                    {/* Theta */}
                                    <div className="flex flex-row items-center justify-end text-gray52"><p>-</p></div>
                                  </>
                                : <>
                                    {/* Delta */}
                                    <div className="flex flex-row items-center justify-end">
                                      <p>{advancedFormatNumber(position["greeks"].delta, 2, "")}</p>
                                    </div>

                                    {/* Gamma */}
                                    <div className="flex flex-row items-center justify-end">
                                      <p>{advancedFormatNumber(position["greeks"].gamma, 6, "")}</p>
                                    </div>

                                    {/* Vega */}
                                    <div className="flex flex-row items-center justify-end">
                                      <p>{advancedFormatNumber(position["greeks"].vega, 2, "")}</p>
                                    </div>

                                    {/* Theta */}
                                    <div className="flex flex-row items-center justify-end">
                                      <p>{advancedFormatNumber(position["greeks"].theta, 2, "")}</p>
                                    </div>
                                  </>
                            }
                          </>
                    }
                    
                    {/* 버튼 부분 */}
                    {
                      !isExpired
                        ? !position["metrics"].shouldDisableTrade
                            ? <>
                                <div className="flex flex-row items-center justify-end gap-[12px]">
                                  <SharePositionButton
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
                                  />
                                  <button className="w-[60px] h-[26px] bg-black29 rounded-[16px] text-[12px] text-redc7 font-semibold"
                                  onClick={() => openModal(
                                    <ClosingModal 
                                      closeModal={closeModal}
                                      data={{
                                        optionsInfo: optionsInfo,
                                        selectedUnderlyingAsset: selectedUnderlyingAsset,
                                        futuresPrice: futuresPrice,
                                        position: position,
                                        metrics: position["metrics"],
                                        expiry: expiry
                                      }}
                                    />, {}
                                  )}>
                                    Close
                                  </button>
                                  {location.search == "?transferMode=true" && (
                                    <button
                                      className="w-[60px] h-[26px] bg-black29 rounded-[16px] text-[12px] text-redc7 font-semibold"
                                      onClick={() => openModal(
                                        <TransferModal 
                                          closeModal={closeModal}
                                          data={{
                                            optionsInfo: optionsInfo,
                                            selectedUnderlyingAsset: selectedUnderlyingAsset,
                                            futuresPrice: futuresPrice,
                                            position: position,
                                            metrics: position["metrics"],
                                            expiry: expiry
                                          }}
                                        />, {
                                            modalClassName: [
                                              "backdrop-blur-none",
                                              "bg-[#121212] bg-opacity-80",
                                            ]
                                          }
                                       )}>
                                      Transfer
                                    </button>
                                  )}
                                </div>
                              </>
                            : <>
                                <div className="group relative flex flex-row items-center justify-end gap-[12px]">
                                  <SharePositionButton
                                    sharedPositionData={{
                                      mainOptionName: position["metrics"].mainOptionName,
                                      exitPrice: position["metrics"].parsedMarkPrice,
                                      entryPrice: position["metrics"].parsedExecutionPrice,
                                      isBuy: position["isBuy"],
                                      pnl: position["metrics"].pnl,
                                      roi: position["metrics"].roi,
                                      strategy: position["metrics"].strategy,
                                      pairedOptionStrikePrice: position["pairedOptionStrikePrice"] || 0
                                    }}
                                  />
                                  <button className="w-[60px] h-[26px] bg-black29 rounded-[16px] text-[12px] text-gray52 font-semibold">
                                    <CountdownTimer className="text-gray52" targetTimestamp={Number(expiry)} compactFormat={true} />
                                  </button>
                                  <div className={twJoin(
                                    "w-max h-[37px] z-20",
                                    "absolute hidden px-[11px] py-[6px] right-[70px]",
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
                              </>
                        : !isVaultSettled
                            ? <>
                                <div className="flex flex-row items-center justify-end">
                                  <button className="cursor-not-allowed w-[60px] h-[26px] bg-black29 rounded-[16px] text-[12px] text-gray8b font-semibold" onClick={() => {return;}}>
                                    Settling
                                  </button>
                                </div>
                              </>
                            : <>
                                <div className="flex flex-row items-center justify-end gap-[12px]">
                                  <SharePositionButton
                                    sharedPositionData={{
                                      mainOptionName: position["metrics"].mainOptionName,
                                      exitPrice: position["metrics"].settlePayoff,
                                      entryPrice: position["metrics"].parsedExecutionPrice,
                                      isBuy: position["isBuy"],
                                      pnl: position["metrics"].pnl,
                                      roi: position["metrics"].roi,
                                      strategy: position["metrics"].strategy,
                                      pairedOptionStrikePrice: position["pairedOptionStrikePrice"] || 0
                                    }}
                                  />
                                  <button className="w-[60px] h-[26px] bg-black29 rounded-[16px] text-[12px] text-greenc1 font-semibold"
                                  onClick={() => openModal(
                                    <SettlementModal 
                                      closeModal={closeModal}
                                      data={{
                                        selectedUnderlyingAsset: selectedUnderlyingAsset,
                                        futuresPrice: futuresPrice,
                                        position: position,
                                        metrics: position["metrics"]
                                      }}
                                    />, {}
                                  )}>
                                    Settle
                                  </button>
                                </div>
                              </>
                    }
                  </div>
                  )
                })
              }
            </div>
          );
        }

        return acc;
      }, [])}
    </div>
  );
};

export default MyPositionTableBody;
