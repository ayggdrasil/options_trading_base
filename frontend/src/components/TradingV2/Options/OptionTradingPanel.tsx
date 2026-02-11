import OptionSelectionPanel from "./OptionSelectionPanel";
import OptionPreview from "./OptionPreview";
import { useEffect, useMemo, useState } from "react";
import { UnderlyingAsset } from "@callput/shared";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { initialOptionDetail } from "@/constants/constants.slices";
import { OptionDirection, OptionStrategy, OrderSide } from "@/utils/types";
import OptionPreviewDefault from "./OptionPreviewDefault";

function OptionTradingPanel() {
  const [selectedOption, setSelectedOption] =
    useState<IOptionDetail>(initialOptionDetail);
  const [orderSideForSelectedOption, setOrderSideForSelectedOption] =
    useState<OrderSide | null>(null);
  const [optionStrategyForSelectedOption, setOptionStrategyForSelectedOption] =
    useState<OptionStrategy>("Spread");

  const [selectedUnderlyingAsset, setSelectedUnderlyingAsset] =
    useState<UnderlyingAsset>(() => {
      const savedUnderlyingAsset = localStorage.getItem(
        "tradingV2:underlyingAsset"
      );
      return savedUnderlyingAsset
        ? (savedUnderlyingAsset as UnderlyingAsset)
        : UnderlyingAsset.BTC;
    });

  const [selectedExpiry, setSelectedExpiry] = useState<number>(() => {
    const savedExpiry = localStorage.getItem("tradingV2:expiry");
    return savedExpiry ? Number(savedExpiry) : 0;
  });

  const [selectedOptionDirection, setSelectedOptionDirection] =
    useState<OptionDirection>(() => {
      const savedOptionDirection = localStorage.getItem(
        "tradingV2:optionDirection"
      );
      return savedOptionDirection
        ? (savedOptionDirection as OptionDirection)
        : "Call";
    });

  const [selectedOrderSide, setSelectedOrderSide] = useState<OrderSide>(() => {
    const savedOrderSide = localStorage.getItem("tradingV2:orderSide");
    return savedOrderSide ? (savedOrderSide as OrderSide) : "Buy";
  });

  const [selectedOptionStrategy, setSelectedOptionStrategy] =
    useState<OptionStrategy>("Spread");

  const handleOptionSelection = (option: IOptionDetail) => {
    setSelectedOption(option);

    if (!option.instrument) {
      setOrderSideForSelectedOption(null);
      setOptionStrategyForSelectedOption("Spread");
      return;
    }

    setOrderSideForSelectedOption(selectedOrderSide);
    setOptionStrategyForSelectedOption("Spread");
  };

  const optionPeviewSnapshot = useMemo(() => {
    return {
      underlyingAsset: selectedUnderlyingAsset,
      expiry: selectedExpiry,
      optionDirection: selectedOptionDirection,
    };
  }, [selectedUnderlyingAsset, selectedExpiry, selectedOptionDirection]);

  return (
    <div className="flex flex-row h-fit w-full">
      <OptionSelectionPanel
        selectedOption={selectedOption}
        handleOptionSelection={handleOptionSelection}
        orderSideForSelectedOption={orderSideForSelectedOption}
        optionStrategyForSelectedOption={optionStrategyForSelectedOption}
        selectedUnderlyingAsset={selectedUnderlyingAsset}
        setSelectedUnderlyingAsset={setSelectedUnderlyingAsset}
        selectedExpiry={selectedExpiry}
        setSelectedExpiry={setSelectedExpiry}
        selectedOptionDirection={selectedOptionDirection}
        setSelectedOptionDirection={setSelectedOptionDirection}
        selectedOrderSide={selectedOrderSide}
        setSelectedOrderSide={setSelectedOrderSide}
        selectedOptionStrategy={selectedOptionStrategy}
      />
      {selectedOption.instrument &&
      optionStrategyForSelectedOption &&
      orderSideForSelectedOption ? (
        <OptionPreview
          selectedOption={selectedOption}
          orderSideForSelectedOption={orderSideForSelectedOption}
          optionStrategyForSelectedOption={optionStrategyForSelectedOption}
          snapshot={optionPeviewSnapshot}
        />
      ) : (
        <OptionPreviewDefault
          selectedExpiry={selectedExpiry}
          selectedOptionDirection={selectedOptionDirection}
          selectedOrderSide={selectedOrderSide}
        />
      )}
    </div>
  );
}

export default OptionTradingPanel;