import { OptionDirection } from "@/utils/types";
import MainTitle from "./MainTitle";
import { useEffect, useRef, useState } from "react";
import MainSelectedZeroDte from "./MainSelectedZeroDte";
import { useAppSelector } from "@/store/hooks";
import MainChart from "./MainChart";

import GifLoader from "@assets/img/animation/loader.gif"
import { ILeadTrader, IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { initialOptionDetail } from "@/constants/constants.slices";
import MainSelectedCopyTrade from "./MainSelectedCopyTrade";
import { MIN_MARK_PRICE_FOR_BUY_POSITION } from "@/constants/constants.position";
import { Subject } from "rxjs";
import { useSubscription } from "observable-hooks";
import { CallPutData, FuturesAssetIndexMap, UnderlyingAsset } from "@callput/shared";

interface MainProps {
  underlyingAsset: UnderlyingAsset;
  setUnderlyingAsset: (asset: UnderlyingAsset) => void;
}

const modalSize = {
  width: 242,
  height: 246
}

const MIN_ROI = 0.3;

const chartMouseOut$ = new Subject<boolean>()

const Main: React.FC<MainProps> = ({
  underlyingAsset,
  setUnderlyingAsset
}) => { 
  const market = useAppSelector((state: any) => state.market.market);
  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;
  const [expiry, setExpiry] = useState<number>(0);
  const [selectedMarket, setSelectedMarket] = useState<CallPutData>({ call: [], put: [] });
  const [futuresIndex, setFuturesIndex] = useState<number>(0);
  const [availableCallOptionPairs, setAvailableCallOptionPairs] = useState<IOptionDetail[][]>([]); // [buyOption, sellOption] ex. 61000, 62000
  const [availablePutOptionPairs, setAvailablePutOptionPairs] = useState<IOptionDetail[][]>([]); // [sellOption, buyOption] ex. 62000, 61000
  const [forbiddenMinMaxPrices, setForbiddenMinMaxPrices] = useState<[number, number]>([0, 0]); // [forbiddenMinPrice, forbiddenMaxPrice] estimated price can't be in this range

  const [hoveredPrice, setHoveredPrice] = useState<number>(futuresAssetIndexMap[underlyingAsset] || 0);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);

  const [optionDirection, setOptionDirection] = useState<OptionDirection | null>(null);
  const [mainOption, setMainOption] = useState<IOptionDetail>(initialOptionDetail);
  const [pairedOption, setPairedOption] = useState<IOptionDetail>(initialOptionDetail);
  const [markPrice, setMarkPrice] = useState<number>(0);

  const [clientXY, setClientXY] = useState<[number, number]>([0, 0]);
  const [modalXY, setModalXY] = useState<[number, number]>([0, 0]);
  const [isSelectedZeroDteModalOpen, setIsSelectedZeroDteModalOpen] = useState<boolean>(false);
  const [selectedLeadTrader, setSelectedLeadTrader] = useState<ILeadTrader | null>(null);

  const mainChartRef = useRef<any>(null)

  useSubscription(chartMouseOut$, () => {
    setHoveredPrice(futuresAssetIndexMap[underlyingAsset])
  })

  useEffect(() => {
    if (hoveredPrice == 0) {
      setHoveredPrice(futuresAssetIndexMap[underlyingAsset]);
    }
  }, [futuresAssetIndexMap[underlyingAsset]])

  useEffect(() => {
    if (!mainChartRef.current) return;
    const rect = mainChartRef.current.getBoundingClientRect();

    let modalX = clientXY[0] - rect.x + 10;
    let modalY = clientXY[1] - rect.y + 10;

    const rightPoint = modalX + modalSize.width;
    const bottom = modalY + modalSize.height;

    if (rightPoint > rect.width) modalX = modalX - modalSize.width - 20;
    if (bottom > rect.height) modalY = modalY - modalSize.height - 20;

    setSelectedLeadTrader(null);
    setModalXY([modalX, modalY]);
  }, [clientXY])

  // 1) Select expiry and market
  useEffect(() => {
    const expiries = market[underlyingAsset].expiries;

    if (expiries.length === 0) {
      setExpiry(0);
      setSelectedMarket({ call: [], put: [] });
      setIsSelectedZeroDteModalOpen(false);
      return;
    }

    if (
      (expiry === 0) ||
      (expiry !== 0 && !expiries.includes(expiry))
    ) {
      const firstExpiry = expiries[0];
      const now = Date.now() / 1000;

      if (firstExpiry <= now + 86400) {
        setExpiry(firstExpiry);
      } else {
        setExpiry(0);
        setSelectedMarket({ call: [], put: [] });
      }

      return;
    }

    if (expiry !== 0) {
      setSelectedMarket(market[underlyingAsset].options[expiry]);
    }
  }, [market, underlyingAsset, expiry])

  // 2) Find available option pairs for both call and put and forbidden min max prices
  useEffect(() => {
    const callOptions = selectedMarket.call.filter(option => option.isOptionAvailable);
    const availableCallOptionPairs: IOptionDetail[][] = [];
    
    const putOptions = selectedMarket.put.filter(option => option.isOptionAvailable);
    const availablePutOptionPairs: IOptionDetail[][] = [];

    for (let i = 0; i < callOptions.length; i++) {
      const buyOption = callOptions[i];

      if (buyOption.strikePrice <= futuresIndex) continue;

      for (let j = i + 1; j < callOptions.length; j++) {
        const sellOption = callOptions[j];
        const diffInMarkPrice = Math.abs(buyOption.markPrice - sellOption.markPrice);

        if (
          (sellOption.strikePrice > buyOption.strikePrice * 1.001) &&
          diffInMarkPrice > MIN_MARK_PRICE_FOR_BUY_POSITION[underlyingAsset]
        ) {
          availableCallOptionPairs.push([buyOption, sellOption]);
        }
      }
    }

    for (let i = putOptions.length - 1; i >= 0; i--) {
      const buyOption = putOptions[i];

      if (buyOption.strikePrice >= futuresIndex) continue;

      for (let j = putOptions.length - 2; j >= 0; j--) {
        const sellOption = putOptions[j];
        const diffInMarkPrice = Math.abs(buyOption.markPrice - sellOption.markPrice);

        if (
          (buyOption.strikePrice > sellOption.strikePrice * 1.001) &&
          diffInMarkPrice > MIN_MARK_PRICE_FOR_BUY_POSITION[underlyingAsset]
        ) {
          availablePutOptionPairs.push([sellOption, buyOption]);
        }
      }
    }

    let forbiddenMinPrice = 999999;
    let forbiddenMaxPrice = 0;

    for (let i = 0; i < availableCallOptionPairs.length; i++) {
      const [buyOption, sellOption] = availableCallOptionPairs[i];
      const markPrice = buyOption.markPrice - sellOption.markPrice;
      const maxProfit = (sellOption.strikePrice - buyOption.strikePrice) - markPrice;

      if (maxProfit < markPrice * MIN_ROI) continue;

      forbiddenMaxPrice = forbiddenMaxPrice === 0
        ? buyOption.strikePrice + ((1 + MIN_ROI) * markPrice)
        : Math.min(forbiddenMaxPrice, buyOption.strikePrice + ((1 + MIN_ROI) * markPrice));
    }

    for (let i = 0; i < availablePutOptionPairs.length; i++) {
      const [sellOption, buyOption] = availablePutOptionPairs[i];
      const markPrice = buyOption.markPrice - sellOption.markPrice;
      const maxProfit = (buyOption.strikePrice - sellOption.strikePrice) - markPrice;

      if (maxProfit < markPrice * MIN_ROI) continue;

      forbiddenMinPrice = forbiddenMinPrice === 999999
        ? buyOption.strikePrice - ((1 + MIN_ROI) * markPrice)
        : Math.max(forbiddenMinPrice, buyOption.strikePrice - ((1 + MIN_ROI) * markPrice));
    }

    if (forbiddenMinPrice === 999999) forbiddenMinPrice = 0;
    if (forbiddenMaxPrice === 0) forbiddenMaxPrice = 999999;

    if((Date.now() / 1000) >= ((new Date(expiry * 1000).getTime() / 1000) - 1800)) {
      forbiddenMinPrice = 0;
      forbiddenMaxPrice = 999999;
    }

    setAvailableCallOptionPairs(availableCallOptionPairs);
    setAvailablePutOptionPairs(availablePutOptionPairs);
    setForbiddenMinMaxPrices([Math.min(forbiddenMinPrice, futuresIndex), Math.max(forbiddenMaxPrice, futuresIndex)]);
  }, [selectedMarket, expiry, futuresIndex])

  useEffect(() => {
    setFuturesIndex(futuresAssetIndexMap[underlyingAsset]);
  }, [futuresAssetIndexMap, underlyingAsset])

  useEffect(() => {
    if (selectedLeadTrader) {
      setIsSelectedZeroDteModalOpen(false);
    }
  }, [selectedLeadTrader])

  useEffect(() => {
    const handleUnavailability = () => {
      setOptionDirection(null);
      setMainOption(initialOptionDetail);
      setPairedOption(initialOptionDetail);
      setMarkPrice(0);
      setIsSelectedZeroDteModalOpen(false);
    }
    
    if (futuresIndex === 0 || estimatedPrice === 0) {
      return handleUnavailability();
    };

    if (estimatedPrice >= forbiddenMinMaxPrices[0] && estimatedPrice <= forbiddenMinMaxPrices[1]) {
      handleUnavailability();
      return;
    }

    let optionDirection: OptionDirection | null = null;
    let mainOption: IOptionDetail = initialOptionDetail;
    let pairedOption: IOptionDetail = initialOptionDetail;
    let finalMarkPrice = 0;
    let lastMinRoi = 0;

    if (estimatedPrice > futuresIndex && estimatedPrice > forbiddenMinMaxPrices[1]) {
      if (availableCallOptionPairs.length === 0) {
        handleUnavailability();
        return;
      }
      
      optionDirection = "Call";

      for (let i = 0; i < availableCallOptionPairs.length; i++) {
        const [buyOption, sellOption] = availableCallOptionPairs[i];

        if (buyOption.strikePrice >= estimatedPrice) break;

        const markPrice = buyOption.markPrice - sellOption.markPrice;
        const maxRoi = ((sellOption.strikePrice - buyOption.strikePrice) - markPrice) / markPrice;
        const estimatedRoi = ((estimatedPrice - buyOption.strikePrice) - markPrice) / markPrice;
        const minRoi = Math.min(maxRoi, estimatedRoi);

        if (minRoi > 0 && minRoi > lastMinRoi) {
          mainOption = buyOption;
          pairedOption = sellOption;
          finalMarkPrice = markPrice;
          lastMinRoi = minRoi;
        }
      }
    } else if (estimatedPrice < futuresIndex && estimatedPrice < forbiddenMinMaxPrices[0]) {
      if (availablePutOptionPairs.length === 0) {
        handleUnavailability();
        return;
      }

      optionDirection = "Put";

      for (let i = 0; i < availablePutOptionPairs.length; i++) {
        const [sellOption, buyOption] = availablePutOptionPairs[i];

        if (buyOption.strikePrice <= estimatedPrice) break;

        const markPrice = buyOption.markPrice - sellOption.markPrice;
        const maxRoi = ((buyOption.strikePrice - sellOption.strikePrice) - markPrice) / markPrice;
        const estimatedRoi = ((buyOption.strikePrice - estimatedPrice) - markPrice) / markPrice;
        const minRoi = Math.min(maxRoi, estimatedRoi);

        if (minRoi > 0 && minRoi > lastMinRoi) {
          mainOption = buyOption;
          pairedOption = sellOption;
          finalMarkPrice = markPrice;
          lastMinRoi = minRoi;
        }
      }
    }
    
    setOptionDirection(optionDirection);
    setMainOption(mainOption)
    setPairedOption(pairedOption)
    setMarkPrice(finalMarkPrice);
    setIsSelectedZeroDteModalOpen(true);

  }, [underlyingAsset, market, selectedMarket, futuresIndex, estimatedPrice])

  return (
    <div className="relative flex flex-col w-full h-[664px] bg-black1f rounded-[4px] p-[32px]">
      <MainTitle
        underlyingAsset={underlyingAsset}
        setUnderlyingAsset={setUnderlyingAsset}
        expiry={expiry}
        futuresIndex={futuresIndex}
        forbiddenMinMaxPrices={forbiddenMinMaxPrices}
        hoveredPrice={hoveredPrice}
        estimatedPrice={estimatedPrice}
      />      
      {(expiry === 0 || Date.now() / 1000 >= expiry) &&
        <div className="absolute top-[80px] w-[1216px] h-[552px] bg-black1f bg-opacity-80 z-10 flex flex-row justify-center items-center">
          <img width={36} height={36} src={GifLoader} />    
        </div>
      }
      <div
        ref={mainChartRef}
        className="relative h-full"
      >
        <MainChart
          key={underlyingAsset + expiry}
          underlyingAsset={underlyingAsset}
          expiry={expiry}
          forbiddenMinMaxPrices={forbiddenMinMaxPrices}
          setHoveredPrice={setHoveredPrice}
          estimatedPrice={estimatedPrice}
          setEstimatedPrice={setEstimatedPrice}
          setClientXY={setClientXY}
          setSelectedLeadTrader={setSelectedLeadTrader}
          clientXY={clientXY}
          setModalXY={setModalXY}
          chartMouseOut$={chartMouseOut$}
        />
        {isSelectedZeroDteModalOpen && (
          <MainSelectedZeroDte
            underlyingAsset={underlyingAsset}
            expiry={expiry}
            optionDirection={optionDirection}
            mainOption={mainOption}
            pairedOption={pairedOption}
            markPrice={markPrice}
            estimatedPrice={estimatedPrice}
            setEstimatedPrice={setEstimatedPrice}
            modalXY={modalXY}
            selectedLeadTrader={selectedLeadTrader}
            setIsSelectedZeroDteModalOpen={setIsSelectedZeroDteModalOpen}
          />
        )}
        {selectedLeadTrader && !isSelectedZeroDteModalOpen && (
          <MainSelectedCopyTrade
            underlyingAsset={underlyingAsset}
            setEstimatedPrice={setEstimatedPrice}
            leadTrader={selectedLeadTrader}
            setSelectedLeadTrader={setSelectedLeadTrader}
            modalXY={modalXY}
            forbiddenMinMaxPrices={forbiddenMinMaxPrices}
          />
        )}
        
      </div>
    </div>
  );
};

export default Main;