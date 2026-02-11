import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import OptionChainTableBody from "./OptionChainTableBody";
import OptionChainTableHead from "./OptionChainTableHead";
import { UnderlyingAsset } from "@callput/shared";
import {
  OptionDirection,
  OrderSide,
  OptionStrategy,
  PriceUnit,
} from "@/utils/types";

interface OptionChainTableProps {
  selectedOptions: IOptionDetail[];
  handleOptionSelection: (option: IOptionDetail) => void;
  orderSideForSelectedOption: OrderSide | null;
  optionStrategyForSelectedOption: OptionStrategy;
  selectedUnderlyingAsset: UnderlyingAsset;
  selectedOptionDirection: OptionDirection;
  selectedOrderSide: OrderSide;
  selectedOptionStrategy: OptionStrategy;
  selectedPriceUnit: PriceUnit;
  underlyingFutures: number;
  selectedOption: IOptionDetail;
}
function OptionChainTable({
  selectedOptions,
  handleOptionSelection,
  orderSideForSelectedOption,
  optionStrategyForSelectedOption,
  selectedUnderlyingAsset,
  selectedOptionDirection,
  selectedOrderSide,
  selectedOptionStrategy,
  selectedPriceUnit,
  underlyingFutures,
  selectedOption,
}: OptionChainTableProps) {
  return (
    <div className="flex flex-col w-full overflow-visible">
      <OptionChainTableHead selectedOrderSide={selectedOrderSide} />
      <div className="w-full overflow-auto">
        <OptionChainTableBody
          selectedOptions={selectedOptions}
          handleOptionSelection={handleOptionSelection}
          orderSideForSelectedOption={orderSideForSelectedOption}
          optionStrategyForSelectedOption={optionStrategyForSelectedOption}
          selectedUnderlyingAsset={selectedUnderlyingAsset}
          selectedOptionDirection={selectedOptionDirection}
          selectedOrderSide={selectedOrderSide}
          selectedOptionStrategy={selectedOptionStrategy}
          selectedPriceUnit={selectedPriceUnit}
          underlyingFutures={underlyingFutures}
          selectedOption={selectedOption}
        />
      </div>
    </div>
  );
}

export default OptionChainTable;