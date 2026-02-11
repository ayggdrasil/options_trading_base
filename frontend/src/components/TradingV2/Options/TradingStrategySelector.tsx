import {
  OptionDirection,
  OptionStrategy,
  OrderSide,
  PriceUnit,
} from "@/utils/types";
import OptionDirectionSelector from "./OptionDirectionSelector";
import OrderSideSelector from "./OrderSideSelector";
import PriceUnitSelector from "./PriceUnitSelector";
import ExpiryInfoDisplay from "./ExpiryInfoDisplay";
import { UnderlyingAsset } from "@callput/shared";

interface TradingStrategySelectorProps {
  selectedUnderlyingAsset: UnderlyingAsset;
  selectedExpiry: number;
  selectedOptionDirection: OptionDirection;
  setSelectedOptionDirection: (optionDirection: OptionDirection) => void;
  selectedOrderSide: OrderSide;
  setSelectedOrderSide: (orderSide: OrderSide) => void;
  selectedPriceUnit: PriceUnit;
  setSelectedPriceUnit: (priceUnit: PriceUnit) => void;
  underlyingFutures: number;
}

function TradingStrategySelector({
  selectedUnderlyingAsset,
  selectedExpiry,
  selectedOptionDirection,
  setSelectedOptionDirection,
  selectedOrderSide,
  setSelectedOrderSide,
  selectedPriceUnit,
  setSelectedPriceUnit,
  underlyingFutures,
}: TradingStrategySelectorProps) {
  return (
    <div className="h-[60px] flex flex-row items-center justify-between bg-black181a px-[20px] py-[12px] border-t-[1px] border-t-black2023">
      <div className="flex flex-row items-center gap-[16px]">
        <OptionDirectionSelector
          selectedOptionDirection={selectedOptionDirection}
          setSelectedOptionDirection={setSelectedOptionDirection}
        />
        <OrderSideSelector
          selectedOrderSide={selectedOrderSide}
          setSelectedOrderSide={setSelectedOrderSide}
        />
      </div>
      <div className="flex flex-row items-center gap-[20px]">
        <PriceUnitSelector
          selectedUnderlyingAsset={selectedUnderlyingAsset}
          selectedPriceUnit={selectedPriceUnit}
          setSelectedPriceUnit={setSelectedPriceUnit}
        />
        <div className="w-[1px] h-[28px] mx-[4px] bg-black2023" />
        <ExpiryInfoDisplay
          selectedExpiry={selectedExpiry}
          underlyingFutures={underlyingFutures}
        />
      </div>
    </div>
  );
}

export default TradingStrategySelector;
