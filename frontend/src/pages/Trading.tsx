import { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { OptionDirection, OrderSide, TradeDataMenuType } from "@/utils/types";
import TradeOptionsTableBody from "@/components/Trading/TradeOptionsTableBody";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import TradeOptionsTableHead from "@/components/Trading/TradeOptionsTableHead";

import ToggleButton from "@/components/Common/ToggleButton";
import MyPositionTableHead from "@/components/Trading/MyPositionTableHead";
import MyPositionTableBody from "@/components/Trading/MyPositionTableBody";
import SelectExpiryDropDown from "@/components/Trading/SelectExpiryDropDown";
import PositionDashboard from "@/components/Trading/PositionDashboard";
import SelectedOption from "@/components/Trading/SelectedOption";

import IconCallSelected from "@assets/icon-call-selected.svg";
import IconCallNotSelected from "@assets/icon-call-not-selected.svg";
import IconPutSelected from "@assets/icon-put-selected.svg";
import IconPutNotSelected from "@assets/icon-put-not-selected.svg";

import { advancedFormatNumber, formatNumber, timeSince } from "@/utils/helper";
import { loadAllowanceForController } from "@/store/slices/UserSlice";
import { useAccount } from "wagmi";
import BigNumber from "bignumber.js";
import { CountdownTimer } from "@/components/Common/CountdownTimer";
import TimeRangeSelector from "@/components/Common/TimeRangeSelector";
import HistoryTableHead from "@/components/Trading/HistoryTableHead";
import HistoryTableBody from "@/components/Trading/HistoryTableBody";
import FilterTypeSelector from "@/components/Common/FilterTypeSelector";
import ToggleAsset from "@/components/Trading/ToggleAsset";

import "../customScrollbar.css";

import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { initialOptionDetail } from "@/constants/constants.slices";
import { MIN_MARK_PRICE_FOR_BUY_POSITION } from "@/constants/constants.position";
import WithTooltip from "@/components/Common/WithTooltip";
import { usePositionHistory } from "@/hooks/history";

import { CUSTOM_CSS } from "@/networks/configs";
import {
  calculateUnderlyingFutures,
  FuturesAssetIndexMap,
  NormalizedFuturesAsset,
  RiskFreeRateCollection,
  UnderlyingAsset,
} from "@callput/shared";
import { NetworkState } from "@/networks/types";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface TradingProps {
  announcementsLen: number;
}

function Trading({ announcementsLen }: TradingProps) {
  const dispatch = useAppDispatch();

  const { address } = useAccount();

  // Fetching Data
  const { chain } = useAppSelector((state) => state.network) as NetworkState;
  const optionsInfo = useAppSelector((state: any) => state.market.optionsInfo);
  const market = useAppSelector((state: any) => state.market.market);
  const futuresAssetIndexMap = useAppSelector(
    (state: any) => state.market.futuresAssetIndexMap
  ) as FuturesAssetIndexMap;
  const riskFreeRateCollection = useAppSelector(
    (state: any) => state.market.riskFreeRateCollection
  ) as RiskFreeRateCollection;
  const positionsData = useAppSelector((state: any) => state.positions);
  const positionHistoryData = useAppSelector(
    (state: any) => state.positionHistory
  );

  // State (기초자산, 만기일, 옵션 관련 상태값)
  const [selectedMarket, setSelectedMarket] = useState<IOptionDetail[]>([]);
  const [selectedUnderlyingAsset, setSelectedUnderlyingAsset] =
    useState<UnderlyingAsset>(() => {
      const savedUnderlyingAsset = localStorage.getItem(
        "selectedUnderlyingAsset"
      );
      return savedUnderlyingAsset
        ? (savedUnderlyingAsset as UnderlyingAsset)
        : UnderlyingAsset.BTC;
    });
  const [selectedExpiry, setSelectedExpiry] = useState<number>(() => {
    const savedExpiry = localStorage.getItem("selectedExpiry");
    return savedExpiry ? Number(savedExpiry) : 0;
  });

  const [selectedOption, setSelectedOption] =
    useState<IOptionDetail>(initialOptionDetail);
  const [selectedOptionDirection, setSelectedOptionDirection] =
    useState<OptionDirection>(() => {
      const savedOptionType = localStorage.getItem("selectedOptionDirection");
      return savedOptionType ? (savedOptionType as OptionDirection) : "Call";
    });
  const [selectedOrderSide, setSelectedOrderSide] = useState<OrderSide>(() => {
    const savedTradeType = localStorage.getItem("selectedOrderSide");
    return savedTradeType ? (savedTradeType as OrderSide) : "Buy";
  });
  const [selectedTradeDataMenuType, setSelectedTradeDataMenuType] =
    useState<TradeDataMenuType>("My Positions");

  const {
    selectedHistoryRangeType,
    selectedHistoryTimestamp,
    selectedHistoryFilterType,
    setSelectedHistoryRangeType,
    setSelectedHistoryTimestamp,
    setSelectedHistoryFilterType,
  } = usePositionHistory({ address });

  useEffect(() => {
    localStorage.setItem("selectedExpiry", selectedExpiry.toString());
    localStorage.setItem("selectedUnderlyingAsset", selectedUnderlyingAsset);
    localStorage.setItem("selectedOptionDirection", selectedOptionDirection);
    localStorage.setItem("selectedOrderSide", selectedOrderSide);
  }, [
    selectedExpiry,
    selectedUnderlyingAsset,
    selectedOptionDirection,
    selectedOrderSide,
  ]);

  useEffect(() => {
    dispatch(loadAllowanceForController({ chain, address }));
  }, [address]);

  // Initialization
  useEffect(() => {
    if (market[selectedUnderlyingAsset].expiries.length === 0) return;

    const expiries = market[selectedUnderlyingAsset].expiries;

    // expiries가 존재하는데 selectedExpiry가 비어있을 때
    if (expiries.length !== 0 && selectedExpiry === 0) {
      setSelectedExpiry(expiries[0]);
      setHasInitialScroll(false);

      // const endOfMonth = new Date();
      // endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      // endOfMonth.setDate(0); // set to the last day of the current month

      // const expiryClosestToEndOfMonth = expiries.reduce((closest: number | null, current: number) => {
      //   const currentDate = new Date(current * 1000); // Assuming the expiries are in seconds, convert to milliseconds
      //   return (
      //     currentDate.getMonth() === endOfMonth.getMonth() && currentDate > new Date() && currentDate < endOfMonth && (!closest || currentDate > new Date(closest * 1000))
      //       ? current
      //       : closest
      //   );
      // }, null);

      // if (expiryClosestToEndOfMonth) {
      //   setSelectedExpiry(expiryClosestToEndOfMonth);
      // } else {
      //   setSelectedExpiry(expiries[0]);
      // }

      return;
    }

    // selectedExpiry가 있는데 expiries에 없을 때 (시간이 지나 갑자기 없어진 경우)
    if (selectedExpiry !== 0 && !expiries.includes(selectedExpiry)) {
      setSelectedExpiry(expiries[0]); // Set to the first expiry if selectedExpiry is not in the array
      setHasInitialScroll(false);
      return;
    }

    // selectedExpiry가 있으면 해당 마켓 데이터를 가져옴
    if (selectedExpiry !== 0) {
      const marketToSelect =
        selectedOptionDirection === "Call"
          ? market[selectedUnderlyingAsset].options[selectedExpiry].call
          : market[selectedUnderlyingAsset].options[selectedExpiry].put;

      const filteredSelectedMarket = marketToSelect.filter(
        (option: any) => option.isOptionAvailable
      );

      setSelectedMarket(filteredSelectedMarket);
    }
  }, [
    market,
    selectedUnderlyingAsset,
    selectedExpiry,
    selectedOptionDirection,
  ]);

  // State (선물 가격 상태값)
  const futuresIndex = futuresAssetIndexMap[selectedUnderlyingAsset];

  const [futuresPriceIndex, setFuturesPriceIndex] = useState<number>(0);
  const [underlyingFutures, setUnderlyingFutures] = useState<number>(0);
  const [hasInitialScroll, setHasInitialScroll] = useState<boolean>(false);

  // 현재 Futures Price와 가장 가까운 Strike Price 찾기
  useEffect(() => {
    if (selectedMarket.length === 0) return;

    const underlyingFutures = calculateUnderlyingFutures(
      selectedUnderlyingAsset,
      selectedExpiry,
      futuresAssetIndexMap,
      riskFreeRateCollection
    );
    setUnderlyingFutures(underlyingFutures);

    let closestIndex = selectedMarket.findIndex(
      (option) => Number(option.strikePrice) >= underlyingFutures
    );

    setFuturesPriceIndex(closestIndex);

    const rowHeight = 44; // adjust this to your actual row height

    if (
      tableContainerRef.current &&
      !shouldDisableTrade &&
      !hasInitialScroll &&
      closestIndex !== 0
    ) {
      const halfTableHeight = tableContainerRef.current.offsetHeight / 2 - 132;
      tableContainerRef.current.scrollTop =
        closestIndex * rowHeight - halfTableHeight;
      setHasInitialScroll(true);
    }
  }, [selectedMarket, futuresAssetIndexMap]);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const positionTableRef = useRef<HTMLDivElement | null>(null);

  const shouldDisableTrade =
    new Date().getTime() / 1000 >=
    new Date(selectedExpiry * 1000).getTime() / 1000 - 1800;

  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);

  // @dev
  // If the today's expiry time difference is checked, when it exceeds 30 minutes, select the next expiry
  // it will be checked only once, so if users select the expiry manually, it will not be checked again
  const isTodayExpiryTimeDiffChecked = useRef(false);

  useEffect(() => {
    const expiries = market[selectedUnderlyingAsset].expiries;

    if (isTodayExpiryTimeDiffChecked.current) return;
    if (expiries.length == 0) return;

    if (shouldDisableTrade) {
      setSelectedExpiry(expiries[1]); // select next expiry
    }

    isTodayExpiryTimeDiffChecked.current = true;
  }, [market[selectedUnderlyingAsset]]);

  // Reset Data
  useEffect(() => {
    if (!isFirstLoad) {
      setSelectedOption(initialOptionDetail);
    } else {
      setIsFirstLoad(false);
    }
  }, [selectedUnderlyingAsset, selectedExpiry, selectedOptionDirection]);

  useEffect(() => {
    setSelectedOption(initialOptionDetail);
  }, [chain]);

  // Strike Price Pair
  const [selectableOptionPairs, setSelectableOptionPairs] = useState<
    IOptionDetail[]
  >([]);
  const [maxNotionalVolume, setMaxNotionalVolume] = useState<number>(0);

  useEffect(() => {
    if (selectedMarket.length === 0) return;

    const selectedStrikePrice = selectedOption.strikePrice;
    const selectedMarkPrice = selectedOption.markPrice;

    const selectableOptionPairs: IOptionDetail[] = [];

    let maxNotionalVolume = 1;

    selectedMarket.map((option) => {
      if (!option.isOptionAvailable) return;

      if (option.volume > maxNotionalVolume) {
        maxNotionalVolume = option.volume;
      }

      if (
        (selectedOptionDirection === "Call" &&
          option.strikePrice > selectedStrikePrice) ||
        (selectedOptionDirection === "Put" &&
          option.strikePrice < selectedStrikePrice)
      ) {
        const pairedOptionMarkPrice = option.markPrice;

        if (selectedOrderSide === "Buy") {
          const diffInMarkPrice = Math.abs(
            selectedMarkPrice - pairedOptionMarkPrice
          );
          if (
            diffInMarkPrice <=
            MIN_MARK_PRICE_FOR_BUY_POSITION[selectedUnderlyingAsset]
          )
            return;
        }

        const optionPairDetail = {
          optionId: option.optionId,
          strikePrice: option.strikePrice,
          markIv: option.markIv,
          markPrice: option.markPrice,
          riskPremiumRateForBuy: option.riskPremiumRateForBuy,
          riskPremiumRateForSell: option.riskPremiumRateForSell,
          delta: option.delta,
          gamma: option.gamma,
          vega: option.vega,
          theta: option.theta,
          volume: option.volume,
          isOptionAvailable: option.isOptionAvailable,
        };

        selectableOptionPairs.push(optionPairDetail);
      }
    });

    setMaxNotionalVolume(maxNotionalVolume);
    setSelectableOptionPairs(selectableOptionPairs);
  }, [
    selectedMarket,
    selectedOption,
    selectedOrderSide,
    selectedOptionDirection,
  ]);

  const [topPadding, setTopPadding] = useState(0);

  useEffect(() => {
    setTopPadding(announcementsLen * 46 + 46);
  }, [announcementsLen]);

  return (
    <div
      style={{ paddingTop: `${topPadding}px` }}
      className={twJoin(
        "pb-[75px] w-full h-full",
        "flex flex-row justify-center items-center"
      )}
    >
      <div
        className={twJoin(
          "w-[1280px] max-w-[1280px] min-w-[1280px] min-h-screen pt-[64px]"
        )}
      >
        <div className={twJoin("w-full h-full", "flex flex-col gap-[48px]")}>
          <div
            className={twJoin(
              "w-full",
              "flex flex-row justify-between gap-[24px]"
            )}
          >
            {/* Trade 페이지 상단 왼쪽 영역 */}
            <div
              className={twJoin(
                "flex flex-col gap-[48px]",
                "w-[856px] min-h-[790px]"
              )}
            >
              {/* Trade 페이지 상단 왼쪽 영역 - Dashboard */}
              <div
                className={twJoin(
                  "w-full h-[153px] max-h-[153px] min-h-[153px]",
                  "flex flex-col gap-[21px]"
                )}
              >
                <ToggleAsset
                  selectedUnderlyingAsset={selectedUnderlyingAsset}
                  setSelectedUnderlyingAsset={setSelectedUnderlyingAsset}
                />
                <PositionDashboard
                  selectedUnderlyingAsset={selectedUnderlyingAsset}
                  groupedPosition={positionsData[selectedUnderlyingAsset]}
                />
              </div>

              {/* Trade 페이지 상단 왼쪽 영역 - Trade Options */}
              <div className={twJoin("w-full", "flex flex-col gap-[24px]")}>
                <p className="h-[24px] text-[20px] font-bold">Trade Options</p>
                <div
                  className={twJoin(
                    "flex flex-col",
                    "w-full h-[955px] bg-black1a",
                    "pt-[20px] pb-[11px]",
                    CUSTOM_CSS[chain].outlineClass
                  )}
                >
                  {/* Trade Options 상단 영역 */}
                  <div className="flex flex-row justify-between items-center w-full h-[44px] px-[28px]">
                    {/* Call, Put 선택 영역 */}
                    <ToggleButton
                      id="trading"
                      buttonSize="large"
                      buttonShape="square"
                      items={[
                        {
                          value: "Call",
                          label: "Call",
                          textColor: "text-greenc1",
                          hoverColor: "hover:!bg-black33 hover:!text-greenc1",
                        },
                        {
                          value: "Put",
                          label: "Put",
                          textColor: "text-greenc1",
                          hoverColor: "hover:!bg-black33 hover:!text-greenc1",
                        },
                      ]}
                      selectedItem={selectedOptionDirection}
                      setSelectedItem={setSelectedOptionDirection}
                      firstItemSelectedImgSrc={IconCallSelected}
                      firstItemNotSelectedImgSrc={IconCallNotSelected}
                      secondItemSelectedImgSrc={IconPutSelected}
                      secondItemNotSelectedImgSrc={IconPutNotSelected}
                      imgClassName="w-[24px] h-[24px] min-w-[24px] min-h-[24px] ml-[42px]"
                    />

                    <div className="flex flex-row items-center">
                      <div className="w-[103px] text-[12px] text-gray80 font-semibold">
                        <WithTooltip
                          tooltipContent={
                            <p
                              className={twJoin(
                                "leading-[0.85rem] text-[12px] font-[600]"
                              )}
                            >
                              The forward price for the option's expiry used in
                              the Black 76 model to calculate option mark
                              prices.
                            </p>
                          }
                          tooltipClassName="w-[227px] h-fit"
                        >
                          <span className="border-b-[1px] border-dashed border-b-greenc1">
                            Underlying Futures
                          </span>
                        </WithTooltip>
                        <p>Time to Expiry</p>
                      </div>
                      <div className="ml-[10px] text-[12px] text-whitee0 font-semibold">
                        <p>{advancedFormatNumber(underlyingFutures, 2, "$")}</p>
                        <p>
                          <CountdownTimer
                            className={shouldDisableTrade ? "text-redc7" : ""}
                            targetTimestamp={selectedExpiry}
                            compactFormat={false}
                          />
                        </p>
                      </div>
                    </div>

                    {/* Expiry 드랍다운 영역 */}
                    <div className="z-20">
                      <SelectExpiryDropDown
                        expiries={market[selectedUnderlyingAsset].expiries}
                        selectedExpiry={selectedExpiry}
                        setSelectedExpiry={setSelectedExpiry}
                        setHasInitialScroll={setHasInitialScroll}
                      />
                    </div>
                  </div>

                  <div className="w-full h-[2px] my-[20px] bg-black29" />

                  {/* Trade Options 하단 영역 */}
                  {/* 테이블 헤더 */}
                  <TradeOptionsTableHead />
                  {/* 테이블 바디 */}
                  <div
                    ref={tableContainerRef}
                    className={twJoin(
                      "relative h-full custom-scrollbar",
                      selectedMarket.length >= 11 ? "overflow-y-auto" : ""
                    )}
                  >
                    {selectedMarket.length > 0 ? (
                      <>
                        {shouldDisableTrade && (
                          <div className="absolute flex flex-row justify-center items-center w-full h-full text-center leading-[1.25rem]">
                            To ensure OLP’s stable operation, <br />
                            positions with options expiring within 30 minutes{" "}
                            <br />
                            cannot be opened or closed. <br />
                          </div>
                        )}
                        {selectedMarket.map((option, index) => {
                          const shouldShowAssetPrice =
                            index === futuresPriceIndex &&
                            underlyingFutures !== 0;
                          const isFuturesPriceIndexOutOfRange =
                            futuresPriceIndex === -1 &&
                            index === selectedMarket.length - 1;

                          return (
                            <TradeOptionsTableBody
                              key={index}
                              option={option}
                              underlyingFutures={underlyingFutures}
                              shouldShowAssetPrice={shouldShowAssetPrice}
                              isFuturesPriceIndexOutOfRange={
                                isFuturesPriceIndexOutOfRange
                              }
                              selectedUnderlyingAsset={selectedUnderlyingAsset}
                              selectedOptionDirection={selectedOptionDirection}
                              selectedOption={selectedOption}
                              setSelectedOption={setSelectedOption}
                              selectedOrderSide={selectedOrderSide}
                              setSelectedOrderSide={setSelectedOrderSide}
                              shouldDisableTrade={shouldDisableTrade}
                              maxNotionalVolume={maxNotionalVolume}
                            />
                          );
                        })}
                      </>
                    ) : (
                      <div className="relative flex flex-row justify-center items-center w-full h-full text-[13px] text-gray52 font-semibold">
                        <div
                          className="absolute w-full h-[3px] z-0"
                          style={{
                            background: `linear-gradient(to right, #121212 0%, #1a1a1a 40%, #1a1a1a 60%, #121212 100%)`,
                          }}
                        />
                        <div
                          className={twJoin(
                            "absolute z-0 left-[12px]",
                            "flex flex-row justify-center items-center",
                            "w-[141px] h-[28px] bg-black12 rounded-[14px]"
                          )}
                        >
                          {selectedUnderlyingAsset?.toUpperCase()} &nbsp;{" "}
                          <span className="text-greenc1">
                            ${formatNumber(futuresIndex, 2, true)}
                          </span>
                        </div>

                        <p className="z-10">There’s no options on the list.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trade 페이지 상단 오른쪽 영역 */}
            <div
              className={twJoin(
                "w-[400px] h-fit bg-black1f",
                selectedOption.optionId !== ""
                  ? ""
                  : "bg-cover bg-[url('@assets/bg-option-not-selected.svg')]",
                CUSTOM_CSS[chain].outlineClass
              )}
            >
              <SelectedOption
                underlyingFutures={underlyingFutures}
                selectedUnderlyingAsset={selectedUnderlyingAsset}
                selectedOptionDirection={selectedOptionDirection}
                selectedExpiry={selectedExpiry}
                selectedOption={selectedOption}
                selectedOrderSide={selectedOrderSide}
                selectableOptionPairs={selectableOptionPairs}
              />
            </div>
          </div>

          {/* My Position 영역 */}
          <div className="flex flex-col gap-[22px]">
            <div className="flex flex-row items-center justify-between">
              <div className="group flex flex-row items-center gap-[20px] h-[34px]">
                <p
                  className={twJoin(
                    "cursor-pointer w-[104px] text-[18px] font-bold",
                    selectedTradeDataMenuType === "My Positions"
                      ? "text-whitee0"
                      : "text-gray80 hover:font-semibold hover:text-greenc1"
                  )}
                  onClick={() => setSelectedTradeDataMenuType("My Positions")}
                >
                  My Positions
                </p>
                <p
                  className={twJoin(
                    "cursor-pointer w-[59px] text-[18px] font-bold",
                    selectedTradeDataMenuType === "History"
                      ? "text-whitee0"
                      : "text-gray80 hover:font-semibold hover:text-greenc1"
                  )}
                  onClick={() => setSelectedTradeDataMenuType("History")}
                >
                  History
                </p>
              </div>
              {selectedTradeDataMenuType === "History" && (
                <div className="flex flex-row gap-[24px]">
                  <TimeRangeSelector
                    historyRangeType={selectedHistoryRangeType}
                    setHistoryRangeType={setSelectedHistoryRangeType}
                    setHistoryTimestamp={setSelectedHistoryTimestamp}
                  />
                  <FilterTypeSelector
                    historyFilterType={selectedHistoryFilterType}
                    setHistoryFilterType={setSelectedHistoryFilterType}
                  />
                </div>
              )}
            </div>

            {selectedTradeDataMenuType === "My Positions" && (
              <div
                className={twJoin(
                  "flex flex-col",
                  "w-full h-[360px] bg-black1a",
                  CUSTOM_CSS[chain].outlineClass
                )}
              >
                <MyPositionTableHead />
                <div
                  ref={positionTableRef}
                  className="w-full h-[2px] bg-black29"
                />
                {positionsData[selectedUnderlyingAsset].length > 0 ? (
                  <MyPositionTableBody
                    positionTableRef={positionTableRef}
                    selectedUnderlyingAsset={selectedUnderlyingAsset}
                    optionsInfo={optionsInfo}
                    futuresPrice={futuresIndex}
                    groupedPosition={positionsData[selectedUnderlyingAsset]}
                  />
                ) : (
                  <div className="flex flex-row justify-center items-center w-full h-full text-[13px] font-semibold text-gray52">
                    <p>You don’t have any position yet.</p>
                  </div>
                )}
              </div>
            )}

            {selectedTradeDataMenuType === "History" && (
              <div>
                <div
                  className={twJoin(
                    "flex flex-col",
                    "w-[1280px] h-[360px] bg-black1a",
                    CUSTOM_CSS[chain].outlineClass
                  )}
                >
                  <HistoryTableHead />
                  <div
                    ref={positionTableRef}
                    className="w-full h-[2px] bg-black29"
                  />
                  <HistoryTableBody
                    selectedUnderlyingAsset={selectedUnderlyingAsset}
                    selectedHistoryTimestamp={selectedHistoryTimestamp}
                    selectedHistoryFilterType={selectedHistoryFilterType}
                    positionHistoryData={positionHistoryData}
                  />
                </div>
                <div className="flex justify-end w-full mt-[16px]">
                  <div
                    className={twJoin(
                      "text-[13px] text-gray52 font-semibold",
                      positionHistoryData.lastUpdatedAt === "0" && "hidden"
                    )}
                  >
                    Last updated {timeSince(positionHistoryData.lastUpdatedAt)}{" "}
                    ago
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Trading;
