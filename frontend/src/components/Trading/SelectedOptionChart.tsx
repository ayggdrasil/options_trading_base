import React, { useState } from "react";
import hash from "object-hash";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import {
  ChartData,
  OptionDirection,
  OrderSide,
} from "@/utils/types";
import { getChartData } from "@/utils/charts";

import { useDebouncedEffect } from "@/hooks/common";
import { UA_TICKER_TO_TICKER_INTERVAL } from "@/networks/assets";
import { UnderlyingAsset } from "@callput/shared";
import { useAppSelector } from "@/store/hooks";
import { NetworkState } from "@/networks/types";

interface SelectedOptionChart {
  isComboMode: boolean;
  underlyingFutures: number;
  selectedUnderlyingAsset: UnderlyingAsset;
  selectedOptionDirection: OptionDirection;
  selectedExpiry: number;
  selectedOption: IOptionDetail;
  selectedOrderSide: OrderSide;
  pairedOption: IOptionDetail;
  executionPrice: number;
  executionPriceAtComboMode: number;
  size: string;
  sizeAtComboMode: string;
  isChartSet: boolean;
  setIsChartSet: React.Dispatch<React.SetStateAction<boolean>>;
}

const SelectedOptionChart: React.FC<SelectedOptionChart> = ({
  isComboMode,
  underlyingFutures,
  selectedUnderlyingAsset,
  selectedOptionDirection,
  selectedExpiry,
  selectedOption,
  selectedOrderSide,
  pairedOption,
  executionPrice,
  executionPriceAtComboMode,
  size,
  sizeAtComboMode,
  isChartSet,
  setIsChartSet,
}) => {
  const { chain } = useAppSelector((state) => state.network) as NetworkState;

  const [chart, setChart] = useState<ChartData>({
    list: [],
    dataMinX: 0,
    dataMaxX: 0,
    dataMinY: 0,
    dataMaxY: 0,
    tickInterval: UA_TICKER_TO_TICKER_INTERVAL[chain][selectedUnderlyingAsset],
    bepPoints: [],
  });
  const [boundary, setBoundary] = useState({
    dataMinX: 0,
    dataMaxX: 0,
    dataMinY: 0,
    dataMaxY: 0,
  });
  const [isUnavailableToDraw, setIsUnavailableToDraw] = useState(true);

  useDebouncedEffect(
    () => {
      if (isChartSet) return;

      const executionPrice =
        selectedOrderSide === "Buy"
          ? selectedOption.markPrice *
            (1 + selectedOption.riskPremiumRateForBuy)
          : selectedOption.markPrice *
            (1 - selectedOption.riskPremiumRateForSell);

      const pairedExecutionPrice =
        selectedOrderSide === "Buy"
          ? pairedOption.markPrice * (1 - pairedOption.riskPremiumRateForSell)
          : pairedOption.markPrice * (1 + pairedOption.riskPremiumRateForBuy);

      const chartDataList = [
        getChartData({
          groupedPosition: {
            expiry: selectedExpiry,
            positions: isComboMode
              ? [
                  {
                    underlyingAsset: selectedUnderlyingAsset,
                    strikePrice: String(selectedOption.strikePrice),
                    isCall: selectedOptionDirection === "Call",
                    isBuy: selectedOrderSide === "Buy",
                    qty: "1",
                    orderPrice: String(executionPrice) || "0",
                    currentIv: selectedOption.markIv || 0,
                  },
                  {
                    underlyingAsset: selectedUnderlyingAsset,
                    strikePrice: String(pairedOption.strikePrice),
                    isCall: selectedOptionDirection === "Call",
                    isBuy: selectedOrderSide !== "Buy",
                    qty: "1",
                    orderPrice: String(pairedExecutionPrice) || "0",
                    currentIv: pairedOption.markIv || 0,
                  },
                ]
              : [
                  {
                    underlyingAsset: selectedUnderlyingAsset,
                    strikePrice: String(selectedOption.strikePrice),
                    isCall: selectedOptionDirection === "Call",
                    isBuy: selectedOrderSide === "Buy",
                    qty: "1",
                    orderPrice: String(executionPrice) || "0",
                    currentIv: selectedOption.markIv || 0,
                  },
                ],
          },
          tickInterval:
            UA_TICKER_TO_TICKER_INTERVAL[chain][selectedUnderlyingAsset],
          instrument: selectedOption.instrument || "",
          isComboMode: isComboMode,
        }),
      ];

      const flattenedChartData = chartDataList
        .map(({ chart }) => [chart])
        .flat();
      setChart(flattenedChartData[0]);

      const dataBoundary = getDataBoundary(flattenedChartData);
      setBoundary(dataBoundary);

      const isUnAvailableToDraw = chartDataList.every(
        ({ chart }) => chart.list.length === 0
      );
      setIsUnavailableToDraw(isUnAvailableToDraw);

      setIsChartSet(true);
    },
    [
      selectedOption,
      pairedOption,
      executionPrice,
      executionPriceAtComboMode,
      isComboMode,
    ],
    5
  );


  const getDataBoundary = (chartList: any) => {
    let dataMinX = Math.min(...chartList.map(({ dataMinX }: any) => dataMinX));
    let dataMaxX = Math.max(...chartList.map(({ dataMaxX }: any) => dataMaxX));
    let dataMinY = Math.min(...chartList.map(({ dataMinY }: any) => dataMinY));
    let dataMaxY = Math.max(...chartList.map(({ dataMaxY }: any) => dataMaxY));

    return {
      dataMinX,
      dataMaxX,
      dataMinY,
      dataMaxY,
    };
  };

  const chartDataUniqueID = hash(chart.list.flat());

  return (
    <div className="flex-1 flex flex-col justify-center gap-[12px] overflow-hidden">
      {isComboMode && (
        <div className="flex flex-row items-center justify-between mx-[28px] h-[40px]">
          <div className="w-[3px] h-full rounded-[2px] bg-black33" />
          <p className="w-[324px] h-[39px] text-[11px] text-gray52 font-semibold leading-[0.8rem]">
            You can purchase options at a discounted price. However, in this
            case, if the price of the underlying asset moves outside a specific
            range, the maximum profit may be limited.
          </p>
        </div>
      )}
    </div>
  );
};

export default SelectedOptionChart;
