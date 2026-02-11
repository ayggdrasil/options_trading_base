import { twJoin } from "tailwind-merge";
import {
  OptionStrategy,
  OrderSide,
  PriceUnit,
  OptionDirection,
} from "@/utils/types";
import { UnderlyingAsset } from "@callput/shared";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import React, { useEffect, useState, useMemo } from "react";
import { extractOptions, getBestOptionPair } from "../utils/options";
import OptionChainTableBodyRow from "./OptionChainTableBodyRow";
import { advancedFormatNumber } from "@/utils/helper";
import { MARKET_DAILY_API } from "@/utils/apis";
import { getDateISOString } from "../utils/dates";

interface OptionChainTableBodyProps {
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

function OptionChainTableBody({
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
}: OptionChainTableBodyProps) {
  const [extractedOptions, setExtractedOptions] = useState<{
    [key: string]: IOptionDetail;
  }>({});
  const [maxVolume, setMaxVolume] = useState<number>(0);

  // 옵션 중에서 가장 높은 거래량의 옵션을 찾아서 maxVolume으로 설정
  useEffect(() => {
    if (selectedOptions.length === 0) return setMaxVolume(0);
    const maxVolume = Math.max(
      ...selectedOptions.map((option: IOptionDetail) => option.volume)
    );
    setMaxVolume(maxVolume);
  }, [selectedOptions]);

  useEffect(() => {
    const fetchMarketDaily = async () => {
      const dateISOString = getDateISOString();
      const response = await fetch(`${MARKET_DAILY_API}-${dateISOString}.json`);

      if (!response.ok) {
        throw new Error("Failed to fetch from market daily");
      }

      const data = await response.json();
      const extractedOptions = extractOptions(data.data.market) as {
        [key: string]: IOptionDetail;
      };

      setExtractedOptions(extractedOptions);
    };

    fetchMarketDaily();
  }, []);

  // UnderlyingFuturesRow를 삽입할 위치 찾기
  const insertIndexForUnderlyingFutures = useMemo(() => {
    if (selectedOptions.length === 0) return 0;
    const index = selectedOptions.findIndex(
      (option: IOptionDetail) => option.strikePrice >= underlyingFutures
    );
    return index === -1 ? selectedOptions.length : index;
  }, [selectedOptions, underlyingFutures]);

  return (
    <div
      className={twJoin(
        "w-full min-h-[604px]",
        "py-[8px]",
        "border-t-[1px] border-t-black2023"
      )}
    >
      <div className={twJoin("flex flex-col w-full h-full scrollbar-hide")}>
        {selectedOptions.map((option: IOptionDetail, index: number) => {
          const optionPair = getBestOptionPair(
            selectedOrderSide,
            option,
            selectedOptions
          );

          const shouldRenderOptionRow = !(
            selectedOptionStrategy === "Spread" && optionPair.instrument === ""
          );

          return (
            <React.Fragment key={index}>
              {index === insertIndexForUnderlyingFutures && (
                <UnderlyingFuturesRow underlyingFutures={underlyingFutures} />
              )}
              {shouldRenderOptionRow && (
                <OptionChainTableBodyRow
                  option={option}
                  selectedOption={selectedOption}
                  handleOptionSelection={handleOptionSelection}
                  orderSideForSelectedOption={orderSideForSelectedOption}
                  optionStrategyForSelectedOption={
                    optionStrategyForSelectedOption
                  }
                  selectedUnderlyingAsset={selectedUnderlyingAsset}
                  selectedOptionDirection={selectedOptionDirection}
                  selectedOrderSide={selectedOrderSide}
                  selectedOptionStrategy={selectedOptionStrategy}
                  selectedPriceUnit={selectedPriceUnit}
                  underlyingFutures={underlyingFutures}
                  extractedOptions={extractedOptions}
                  maxVolume={maxVolume}
                  optionPair={optionPair}
                />
              )}
            </React.Fragment>
          );
        })}
        {insertIndexForUnderlyingFutures === selectedOptions.length && (
          <UnderlyingFuturesRow underlyingFutures={underlyingFutures} />
        )}
      </div>
    </div>
  );
}

export default OptionChainTableBody;

function UnderlyingFuturesRow({
  underlyingFutures,
}: {
  underlyingFutures: number;
}) {
  return (
    <div className="relative flex flex-row items-center">
      <div className="absolute w-full h-[1px] bg-blue278e" />
      <div
        className={twJoin(
          "z-0",
          "w-fit h-[28px] flex flex-row justify-center items-center px-[10px] py-[6px]",
          "bg-black2023 rounded-[4px] ml-[20px]",
          "border-[1px] border-solid border-blue278e"
        )}
      >
        <span className="text-blue278e text-[12px] font-[600] leading-normal">
          {advancedFormatNumber(underlyingFutures, 2, "$")}
        </span>
      </div>
    </div>
  );
}
