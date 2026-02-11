import BigNumber from "bignumber.js";
import { useContext, useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { OptionDirection, OrderSide } from "@/utils/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadAllowanceForController } from "@/store/slices/UserSlice";
import { useAccount } from "wagmi";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { initialOptionDetail } from "@/constants/constants.slices";
import { MIN_MARK_PRICE_FOR_BUY_POSITION } from "@/constants/constants.position";
import { ModalContext } from "@/components/Common/ModalContext";
import { formatDateDDMMM } from "@/utils/helper";
import "../customScrollbar.css";

import {
  ModalName,
  setModalNameList,
  removeLastModalName,
  setSelectableOptionPairs,
} from "@/store/slices/SelectedOption";

import { TradeOptionType } from "@/components/Trading/Mobile/constant";
import QuoteAssetDropDown from "@/components/Trading/Mobile/QuoteAssetDropDown";
import PairedOptionPopup from "@/components/Trading/Mobile/PairedOptionPopup";
import PayQuoteAssetDropDown from "@/components/Trading/Mobile/PayQuoteAssetDropDown";
import SlippageTolerancePopup from "@/components/Trading/Mobile/SlippageTolerancePopup";
import CallIcon from "@/components/Trading/Mobile/CallIcon";
import PutIcon from "@/components/Trading/Mobile/PutIcon";
import TradeOptionsTableBody from "@/components/Trading/Mobile/TradeOptionsTableBody";
import SelectUnderlyingAssetDropDown from "@/components/Trading/Mobile/SelectUnderlyingAssetDropDown";
import SelectedOption from "@/components/Trading/Mobile/SelectedOption";
import SelectedOptionHighLevel from "@/components/Trading/Mobile/SelectedOptionHighLevel";
import { NetworkState } from "@/networks/types";
import { CUSTOM_CSS } from "@/networks/configs";
import { calculateUnderlyingFutures, FuturesAssetIndexMap, RiskFreeRateCollection, UnderlyingAsset } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

function TradingForMobile() {
  const dispatch = useAppDispatch();

  const { address } = useAccount();
  const { openModal, isModalOpen } = useContext(ModalContext);

  // Fetching Data
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const market = useAppSelector((state: any) => state.market.market);

  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;
  const riskFreeRateCollection = useAppSelector((state: any) => state.market.riskFreeRateCollection) as RiskFreeRateCollection;
  const modalNameList = useAppSelector(
    (state: any) => state.selectedOption.modalNameList
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
  const [selectedOptionDirection, setSelectedOptionDirection] = useState<OptionDirection>(
    () => {
      const savedOptionType = localStorage.getItem("selectedOptionDirection");
      return savedOptionType ? (savedOptionType as OptionDirection) : "Call";
    }
  );
  const [selectedOrderSide, setSelectedOrderSide] = useState<OrderSide>(() => {
    const savedTradeType = localStorage.getItem("selectedOrderSide");
    return savedTradeType ? (savedTradeType as OrderSide) : "Buy";
  });

  const [showSelectedOption, setShowSelectedOption] = useState(false);
  const [showSelectedOptionHighLevel, setShowSelectedOptionHighLevel] =
    useState(false);
  const [showPairedOptionPopup, setShowPairedOptionPopup] = useState(false);
  const [showQuoteAssetPopup, setShowQuoteAssetPopup] = useState(false);
  const [showSlippageTolerancePopup, setShowSlippageTolerancePopup] =
    useState(false);
  const quoteAsset = useAppSelector(
    (state: any) => state.user.balance.quoteAsset
  );

  const tradeOptionsTableRef = useRef<HTMLDivElement | null>(null);

  const scrollToAssetPrice = (top: number) => {
    if (shouldDisableTrade) {
      return;
    }

    tradeOptionsTableRef.current?.scrollTo({
      top:
        top - tradeOptionsTableRef.current?.getBoundingClientRect()?.height / 2,
      behavior: "smooth",
    });
  };

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
    dispatch(
      loadAllowanceForController({ chain, address })
    );
  }, [address]);

  // Initialization
  useEffect(() => {
    if (market[selectedUnderlyingAsset].expiries.length === 0) return;

    const expiries = market[selectedUnderlyingAsset].expiries;

    // expiries가 존재하는데 selectedExpiry가 비어있을 때
    if (expiries.length !== 0 && selectedExpiry === 0) {
      setSelectedExpiry(expiries[0]);

      return;
    }

    // selectedExpiry가 있는데 expiries에 없을 때 (시간이 지나 갑자기 없어진 경우)
    if (selectedExpiry !== 0 && !expiries.includes(selectedExpiry)) {
      setSelectedExpiry(expiries[0]); // Set to the first expiry if selectedExpiry is not in the array
      return;
    }

    // selectedExpiry가 있으면 해당 마켓 데이터를 가져옴
    if (selectedExpiry !== 0) {
      const marketToSelect =
        selectedOptionDirection === "Call"
          ? market[selectedUnderlyingAsset].options[selectedExpiry].call
          : market[selectedUnderlyingAsset].options[selectedExpiry].put;
      setSelectedMarket(marketToSelect);
    }
  }, [market, selectedUnderlyingAsset, selectedExpiry, selectedOptionDirection]);

  // State (선물 가격 상태값)
  const futuresIndex = futuresAssetIndexMap[selectedUnderlyingAsset]
  const [futuresPriceIndex, setFuturesPriceIndex] = useState<number>(0);
  const [underlyingFutures, setUnderlyingFutures] = useState<number>(0);

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
    const closestIndex = selectedMarket
      .filter((option) => option.isOptionAvailable)
      .findIndex((option) => Number(option.strikePrice) >= underlyingFutures);

    setFuturesPriceIndex(closestIndex);
  }, [selectedMarket, futuresIndex]);

  const shouldDisableTrade =
    new Date().getTime() / 1000 >=
    new Date(selectedExpiry * 1000).getTime() / 1000 - 1800;

  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);

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
          instrument: option.instrument,
        };

        selectableOptionPairs.push(optionPairDetail);
      }
    });

    dispatch(setSelectableOptionPairs(selectableOptionPairs));
  }, [selectedMarket, selectedOption, selectedOrderSide, selectedOptionDirection]);

  useEffect(() => {
    if (showSelectedOption) {
      openModal(
        <SelectedOption
          underlyingFutures={underlyingFutures}
          selectedUnderlyingAsset={selectedUnderlyingAsset}
          selectedOptionDirection={selectedOptionDirection}
          selectedExpiry={selectedExpiry}
          selectedOption={selectedOption}
          selectedOrderSide={selectedOrderSide}
          setShowSelectedOptionHighLevel={setShowSelectedOptionHighLevel}
        />,
        {
          contentClassName: "flex flex-col min-h-[150px]",
        }
      );
      setShowSelectedOption(false);
    }
  }, [showSelectedOption]);
  useEffect(() => {
    if (showSelectedOptionHighLevel) {
      openModal(
        <SelectedOptionHighLevel
          underlyingFutures={underlyingFutures}
          selectedUnderlyingAsset={selectedUnderlyingAsset}
          selectedOptionDirection={selectedOptionDirection}
          selectedExpiry={selectedExpiry}
          selectedOption={selectedOption}
          selectedOrderSide={selectedOrderSide}
          setShowPairedOptionPopup={setShowPairedOptionPopup}
          setShowQuoteAssetPopup={setShowQuoteAssetPopup}
          setShowSlippageTolerancePopup={setShowSlippageTolerancePopup}
        />,
        {
          contentClassName: "flex flex-col min-h-[150px]",
        }
      );
      setShowSelectedOptionHighLevel(false);
    }
  }, [showSelectedOptionHighLevel]);
  useEffect(() => {
    if (showPairedOptionPopup) {
      openModal(<PairedOptionPopup />, {
        contentClassName: "min-h-[100px]",
      });
      setShowPairedOptionPopup(false);
      dispatch(
        setModalNameList([
          ...modalNameList,
          ModalName.SELECTED_OPTION_HIGH_LEVEL,
        ])
      );
    }
  }, [showPairedOptionPopup]);
  useEffect(() => {
    if (showQuoteAssetPopup) {
      openModal(<PayQuoteAssetDropDown />, {
        contentClassName: "min-h-[150px]",
      });
      setShowQuoteAssetPopup(false);
      dispatch(
        setModalNameList([
          ...modalNameList,
          ModalName.SELECTED_OPTION_HIGH_LEVEL,
        ])
      );
    }
  }, [showQuoteAssetPopup]);
  useEffect(() => {
    if (showSlippageTolerancePopup) {
      openModal(<SlippageTolerancePopup />, {
        contentClassName: "min-h-[150px]",
      });
      setShowSlippageTolerancePopup(false);
      dispatch(
        setModalNameList([
          ...modalNameList,
          ModalName.SELECTED_OPTION_HIGH_LEVEL,
        ])
      );
    }
  }, [showSlippageTolerancePopup]);

  useEffect(() => {
    setShowSelectedOptionHighLevel(false);
    setShowSelectedOption(false);
    setShowPairedOptionPopup(false);
    setShowSlippageTolerancePopup(false);
    setShowQuoteAssetPopup(false);
    if (!isModalOpen && modalNameList.length) {
      if (
        ModalName.SELECTED_OPTION_HIGH_LEVEL ===
        modalNameList[modalNameList.length - 1]
      ) {
        dispatch(removeLastModalName());
        setShowSelectedOptionHighLevel(true);
      } else if (
        ModalName.SELECTED_OPTION === modalNameList[modalNameList.length - 1]
      ) {
        dispatch(removeLastModalName());
        setShowSelectedOption(true);
      }
    }
  }, [isModalOpen]);

  return (
    <div
      className={twJoin(
        "absolute z-[1] top-0 bottom-0 left-0 w-full pb-[68px]",
        "flex flex-row justify-center items-center"
      )}
    >
      <div className={twJoin("w-full flex flex-col h-full")}>
        {/* Trade 페이지 상단 왼쪽 영역 - Dashboard */}
        <div className="w-full p-3 md:p-6">
          <SelectUnderlyingAssetDropDown
            futuresPrice={futuresIndex}
            selectedExpiry={selectedExpiry}
            selectedUnderlyingAsset={selectedUnderlyingAsset}
            setSelectedUnderlyingAsset={setSelectedUnderlyingAsset}
          />
        </div>
        {/* Trade 페이지 상단 왼쪽 영역 - Trade Options */}
        <div className={twJoin("w-full", "flex flex-col flex-1 overflow-auto")}>
          <div
            className={twJoin(
              "flex flex-col gap-y-[14px] px-3 pt-2 pb-3 md:px-6 md:pt-3 md:pb-6 md:gap-y-4",
              "bg-[#111613B2] backdrop-filter backdrop-blur-[30px]",
              "!border-t-0 !border-l-0 !border-r-0",
              CUSTOM_CSS[chain].outlineClassForMobile
            )}
          >
            <div
              className={twJoin(
                "relative h-[30px]",
                "flex flex-row gap-x-[18px] items-center"
              )}
            >
              <p
                className={twJoin(
                  "font-semibold text-[12px] leading-[16px]",
                  "md:text-[14px] md:leading-[18px] text-green63 mt-[-2px]"
                )}
              >
                Expiry
              </p>
              <div
                className={twJoin(
                  "absolute top-0 left-[50px] md:left-[68px]",
                  "flex flex-row gap-x-[5px]",
                  "w-[calc(100%-38px)] md:w-[calc(100%-46px)] py-[1px] overflow-auto"
                )}
              >
                {market[selectedUnderlyingAsset].expiries.map(
                  (expiry: number) => (
                    <div
                      key={expiry}
                      className={twJoin(
                        "px-3 py-[6px] rounded-[3px]",
                        "font-semibold text-[12px] leading-[16px]",
                        "md:text-[14px] md:leading-[18px]",
                        "text-nowrap transition duration-300 ease-in-out",
                        selectedExpiry === expiry
                          ? "bg-green63 text-black0a12"
                          : "text-green63"
                      )}
                      onClick={() => setSelectedExpiry(expiry)}
                    >
                      {formatDateDDMMM(expiry.toString())}
                    </div>
                  )
                )}
              </div>
            </div>
            <div
              className={twJoin(
                "flex flex-row justify-between",
                "gap-x-[22px] h-[32px] md:gap-x-10 md:h-[40px]"
              )}
            >
              {/* Call, Put 선택 영역 */}
              <div
                className={twJoin(
                  "flex flex-row rounded-[32px]",
                  "w-[calc(50%-11px)] bg-[#1A1A19]"
                )}
              >
                <button
                  className={twJoin(
                    "flex flex-row gap-[6px] justify-center items-center",
                    "w-[50%] rounded-[32px] transition duration-300 ease-in-out",
                    selectedOptionDirection === "Call"
                      ? "bg-[#333331] text-greene6"
                      : "text-[#9D9B98]"
                  )}
                  onClick={() => setSelectedOptionDirection("Call")}
                >
                  <p
                    className={twJoin(
                      "font-medium text-[13px] leading-[20px]",
                      "md:text-[15px] md:leading-[22px]"
                    )}
                  >
                    Call
                  </p>
                  <CallIcon />
                </button>
                <button
                  className={twJoin(
                    "flex flex-row gap-[6px] justify-center items-center",
                    "w-[50%] rounded-[32px] transition duration-300 ease-in-out",
                    selectedOptionDirection === "Put"
                      ? "bg-[#333331] text-greene6"
                      : "text-[#9D9B98]"
                  )}
                  onClick={() => setSelectedOptionDirection("Put")}
                >
                  <p
                    className={twJoin(
                      "font-medium text-[13px] leading-[20px]",
                      "md:text-[15px] md:leading-[22px]"
                    )}
                  >
                    Put
                  </p>
                  <PutIcon />
                </button>
              </div>
              <div
                className={twJoin(
                  "flex flex-row rounded-[32px]",
                  "w-[calc(50%-11px)] bg-[#1A1A19]"
                )}
              >
                <div
                  className={twJoin(
                    "flex flex-row justify-center items-center",
                    "w-[50%] rounded-[32px] transition duration-300 ease-in-out",
                    "font-medium text-[13px] leading-[20px]",
                    "md:text-[15px] md:leading-[22px]",
                    selectedOrderSide === TradeOptionType.BUY
                      ? "text-black0a12 bg-green63"
                      : "text-[#9D9B98]"
                  )}
                  onClick={() => {
                    setSelectedOrderSide(TradeOptionType.BUY);
                  }}
                >
                  Buy
                </div>
                <div
                  className={twJoin(
                    "flex flex-row justify-center items-center",
                    "w-[50%] rounded-[32px] transition duration-300 ease-in-out",
                    "font-medium text-[13px] leading-[20px]",
                    "md:text-[15px] md:leading-[22px]",
                    selectedOrderSide === TradeOptionType.SELL
                      ? "text-black0a12 bg-redE0"
                      : "text-[#9D9B98]"
                  )}
                  onClick={() => {
                    setSelectedOrderSide(TradeOptionType.SELL);
                  }}
                >
                  Sell
                </div>
              </div>
            </div>
          </div>
          <div className={twJoin("relative flex-1 overflow-auto")}>
            {selectedMarket.length > 0 ? (
              <>
                {shouldDisableTrade && (
                  <div
                    className={twJoin(
                      "absolute top-0 left-0 w-full h-full px-3",
                      "flex justify-center items-center",
                      "bg-[#030A06B2] backdrop-filter backdrop-blur-[2px]"
                    )}
                  >
                    <p
                      className={twJoin(
                        "font-medium text-[#F0EBE5] text-center h-fit",
                        "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
                      )}
                    >
                      To ensure OLP’s stable operation,
                      <br />
                      positions with options expiring within 30
                      <br />
                      minutes cannot be opened or closed.
                    </p>
                  </div>
                )}
                <div
                  ref={tradeOptionsTableRef}
                  className={twJoin(
                    "h-full",
                    shouldDisableTrade ? "overflow-hidden" : "overflow-auto"
                  )}
                >
                  {selectedMarket
                    .filter((option) => option.isOptionAvailable)
                    .map((option, index) => {
                      const shouldShowAssetPrice =
                        index === futuresPriceIndex && underlyingFutures !== 0;
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
                          shouldDisableTrade={shouldDisableTrade}
                          setSelectedOrderSide={setSelectedOrderSide}
                          setShowSelectedOption={setShowSelectedOption}
                          setShowSelectedOptionHighLevel={
                            setShowSelectedOptionHighLevel
                          }
                          scrollToAssetPrice={scrollToAssetPrice}
                          selectedExpiry={selectedExpiry}
                        />
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="flex flex-row justify-center items-center w-full h-full">
                <p
                  className={twJoin(
                    "font-medium text-[#F0EBE5] text-center",
                    "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
                  )}
                >
                  There’s no options on the list.
                </p>
              </div>
            )}
          </div>
        </div>
        <QuoteAssetDropDown quoteAsset={quoteAsset} />
      </div>
      {/* Trade 페이지 상단 오른쪽 영역 */}
    </div>
  );
}

export default TradingForMobile;
