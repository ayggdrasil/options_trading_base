import UnderlyingSelector from "./UnderlyingSelector";
import TradingStrategySelector from "./TradingStrategySelector";
import OptionChainTable from "./OptionChainTable";
import { useEffect, useState } from "react";
import {
  calculateUnderlyingFutures,
  FuturesAssetIndexMap,
  OptionsMarketData,
  RiskFreeRateCollection,
  UnderlyingAsset,
} from "@callput/shared";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import {
  OptionDirection,
  OrderSide,
  OptionStrategy,
  PriceUnit,
} from "@/utils/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getDaysToExpiration } from "../../../utils/helper";
import { twJoin } from "tailwind-merge";
import { setTradingTitle } from "@/store/slices/MarketSlice";

interface OptionSelectionPanelProps {
  selectedOption: IOptionDetail;
  handleOptionSelection: (option: IOptionDetail) => void;
  orderSideForSelectedOption: OrderSide | null;
  optionStrategyForSelectedOption: OptionStrategy;
  selectedUnderlyingAsset: UnderlyingAsset;
  setSelectedUnderlyingAsset: (underlyingAsset: UnderlyingAsset) => void;
  selectedExpiry: number;
  setSelectedExpiry: (expiry: number) => void;
  selectedOptionDirection: OptionDirection;
  setSelectedOptionDirection: (optionDirection: OptionDirection) => void;
  selectedOrderSide: OrderSide;
  setSelectedOrderSide: (orderSide: OrderSide) => void;
  selectedOptionStrategy: OptionStrategy;
}

function OptionSelectionPanel({
  selectedOption,
  handleOptionSelection,
  orderSideForSelectedOption,
  optionStrategyForSelectedOption,
  selectedUnderlyingAsset,
  setSelectedUnderlyingAsset,
  selectedExpiry,
  setSelectedExpiry,
  selectedOptionDirection,
  setSelectedOptionDirection,
  selectedOrderSide,
  setSelectedOrderSide,
  selectedOptionStrategy,
}: OptionSelectionPanelProps) {
  const dispatch = useAppDispatch();
  
  const [selectedOptions, setSelectedOptions] = useState<IOptionDetail[]>([]);

  const [selectedPriceUnit, setSelectedPriceUnit] = useState<PriceUnit>(() => {
    const savedPriceUnit = localStorage.getItem("tradingV2:priceUnit");
    return savedPriceUnit ? (savedPriceUnit as PriceUnit) : "USD";
  });
  const [underlyingFutures, setUnderlyingFutures] = useState<number>(0);

  const market = useAppSelector(
    (state: any) => state.market.market
  ) as OptionsMarketData;
  const futuresAssetIndexMap = useAppSelector(
    (state: any) => state.market.futuresAssetIndexMap
  ) as FuturesAssetIndexMap;
  const riskFreeRateCollection = useAppSelector(
    (state: any) => state.market.riskFreeRateCollection
  ) as RiskFreeRateCollection;

  useEffect(() => {
    if (selectedExpiry === 0) return setSelectedOptions([]);

    const marketExpiries = market[selectedUnderlyingAsset].expiries;

    if (marketExpiries.length === 0) return setSelectedOptions([]);
    if (!marketExpiries.includes(selectedExpiry)) return setSelectedOptions([]);

    const targetOptions =
      selectedOptionDirection === "Call"
        ? market[selectedUnderlyingAsset].options[selectedExpiry].call
        : market[selectedUnderlyingAsset].options[selectedExpiry].put;

    const daysToExpiration = getDaysToExpiration(selectedExpiry);

    const moneynessFilteredTargetOptions = targetOptions.filter(
      (option: IOptionDetail) => {
        if (daysToExpiration <= 2) {
          const moneynessRate =
            option.strikePrice / futuresAssetIndexMap[selectedUnderlyingAsset] -
            1;
          return moneynessRate <= 0.05 && moneynessRate >= -0.05;
        }
        return true;
      }
    );

    const finalFilteredTargetOptions = moneynessFilteredTargetOptions.filter(
      (option: IOptionDetail) => option.isOptionAvailable
    );

    setSelectedOptions(finalFilteredTargetOptions);
  }, [
    market,
    selectedUnderlyingAsset,
    selectedExpiry,
    selectedOptionDirection,
    futuresAssetIndexMap,
  ]);

  useEffect(() => {
    const underlyingFutures = calculateUnderlyingFutures(
      selectedUnderlyingAsset,
      selectedExpiry,
      futuresAssetIndexMap,
      riskFreeRateCollection
    );
    setUnderlyingFutures(underlyingFutures);
  }, [
    selectedUnderlyingAsset,
    selectedExpiry,
    futuresAssetIndexMap,
    riskFreeRateCollection,
  ]);

  useEffect(() => {
    localStorage.setItem("tradingV2:underlyingAsset", selectedUnderlyingAsset);
    localStorage.setItem("tradingV2:expiry", selectedExpiry.toString());
    localStorage.setItem("tradingV2:optionDirection", selectedOptionDirection);
    localStorage.setItem("tradingV2:orderSide", selectedOrderSide);
    localStorage.setItem("tradingV2:optionStrategy", selectedOptionStrategy);
  }, [
    selectedUnderlyingAsset,
    selectedExpiry,
    selectedOptionDirection,
    selectedOrderSide,
    selectedOptionStrategy,
  ]);

  useEffect(() => {
    dispatch(setTradingTitle({
      underlyingAsset: selectedUnderlyingAsset,
      underlyingFutures: underlyingFutures,
    }));
  }, [dispatch, selectedUnderlyingAsset, underlyingFutures]);

  return (
    <div
      className={twJoin(
        "w-full min-w-[896px] min-h-[764px] flex flex-col bg-black1214",
        "border-r-[1px] border-r-solid border-r-black2023"
      )}
    >
      <UnderlyingSelector
        selectedUnderlyingAsset={selectedUnderlyingAsset}
        setSelectedUnderlyingAsset={setSelectedUnderlyingAsset}
        selectedExpiry={selectedExpiry}
        setSelectedExpiry={setSelectedExpiry}
      />
      <TradingStrategySelector
        selectedUnderlyingAsset={selectedUnderlyingAsset}
        selectedExpiry={selectedExpiry}
        selectedOptionDirection={selectedOptionDirection}
        setSelectedOptionDirection={setSelectedOptionDirection}
        selectedOrderSide={selectedOrderSide}
        setSelectedOrderSide={setSelectedOrderSide}
        selectedPriceUnit={selectedPriceUnit}
        setSelectedPriceUnit={setSelectedPriceUnit}
        underlyingFutures={underlyingFutures}
      />
      <OptionChainTable
        selectedOption={selectedOption}
        handleOptionSelection={handleOptionSelection}
        orderSideForSelectedOption={orderSideForSelectedOption}
        optionStrategyForSelectedOption={optionStrategyForSelectedOption}
        selectedOptions={selectedOptions}
        selectedUnderlyingAsset={selectedUnderlyingAsset}
        selectedOptionDirection={selectedOptionDirection}
        selectedOrderSide={selectedOrderSide}
        selectedOptionStrategy={selectedOptionStrategy}
        selectedPriceUnit={selectedPriceUnit}
        underlyingFutures={underlyingFutures}
      />
    </div>
  );
}

export default OptionSelectionPanel;
