import {
  ChartData,
  GroupedPosition,
  OptionDirection,
  OptionStrategy,
  OrderSide,
} from "@/utils/types";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnderlyingAsset } from "@callput/shared";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";
import { UA_TICKER_TO_TICKER_INTERVAL } from "@/networks/assets";
import { useDebouncedEffect } from "@/hooks/common";
import { getChartData } from "@/utils/charts";
import { getDaysToLeft, getDefaultChartHoverPoint } from "@/utils/misc";
import ProfitSimulationSummary from "@/components/TradingV2/Options/ProfitSimulationSummary";
import ProfitSimulationChart from "@/components/TradingV2/Options/ProfitSimulationChart";

interface ProfitSimulationProps {
  selectedOption: IOptionDetail;
  underlyingAsset: UnderlyingAsset;
  expiry: number;
  optionDirection: OptionDirection;
  orderSide: OrderSide;
  optionStrategy: OptionStrategy;
  underlyingFutures: number;
  selectedOptionPair: IOptionDetail;
  size: string;
  executionPrice: number;
}

function ProfitSimulation({
  selectedOption,
  underlyingAsset,
  expiry,
  optionDirection,
  orderSide,
  optionStrategy,
  underlyingFutures,
  selectedOptionPair,
  size,
  executionPrice,
}: ProfitSimulationProps) {
  const { chain } = useAppSelector((state) => state.network) as NetworkState;

  const [chart, setChart] = useState<ChartData>({
    list: [],
    dataMinX: 0,
    dataMaxX: 0,
    dataMinY: 0,
    dataMaxY: 0,
    tickInterval: UA_TICKER_TO_TICKER_INTERVAL[chain][underlyingAsset],
    bepPoints: [],
  });

  const [isUnavailableToDraw, setIsUnavailableToDraw] = useState(true);

  const [hover, setHover] = useState<{
    assetPrice: number;
    pnlPer1: number;
  } | null>(null);

  const safeSeriesData = useMemo(() => {
    return (chart.list || []).filter(
      ([x, y]) => Number.isFinite(x) && Number.isFinite(y)
    );
  }, [chart.list]);

  const breakeven = useMemo(() => {
    // Find the first x where pnl crosses 0 (linear interpolation between adjacent points).
    for (let i = 0; i < safeSeriesData.length; i++) {
      const [x, y] = safeSeriesData[i];
      if (y === 0) return x;
      if (i === 0) continue;

      const [px, py] = safeSeriesData[i - 1];
      const signChange = (py < 0 && y > 0) || (py > 0 && y < 0);
      if (!signChange) continue;
      if (y === py) continue;

      const t = (0 - py) / (y - py);
      const xCross = px + t * (x - px);
      if (Number.isFinite(xCross)) return xCross;
    }
    return 0;
  }, [safeSeriesData]);

  const xMin = chart.dataMinX;
  const xMax = chart.dataMaxX;

  useDebouncedEffect(() => {
    const legExecutionPrice =
      orderSide === "Buy"
        ? selectedOption.markPrice * (1 + selectedOption.riskPremiumRateForBuy)
        : selectedOption.markPrice *
          (1 - selectedOption.riskPremiumRateForSell);

    const pairedExecutionPrice =
      orderSide === "Buy"
        ? selectedOptionPair.markPrice *
          (1 - selectedOptionPair.riskPremiumRateForSell)
        : selectedOptionPair.markPrice *
          (1 + selectedOptionPair.riskPremiumRateForBuy);

    const { chart: nextChart } = getChartData({
      groupedPosition: {
        expiry: expiry,
        positions:
          optionStrategy === "Vanilla"
            ? [
                {
                  underlyingAsset: underlyingAsset,
                  strikePrice: String(selectedOption.strikePrice),
                  isCall: optionDirection === "Call",
                  isBuy: orderSide === "Buy",
                  qty: "1",
                  orderPrice: String(legExecutionPrice) || "0",
                  currentIv: selectedOption.markIv || 0,
                },
              ]
            : [
                {
                  underlyingAsset: underlyingAsset,
                  strikePrice: String(selectedOption.strikePrice),
                  isCall: optionDirection === "Call",
                  isBuy: orderSide === "Buy",
                  qty: "1",
                  orderPrice: String(legExecutionPrice) || "0",
                  currentIv: selectedOption.markIv || 0,
                },
                {
                  underlyingAsset: underlyingAsset,
                  strikePrice: String(selectedOptionPair.strikePrice),
                  isCall: optionDirection === "Call",
                  isBuy: orderSide !== "Buy",
                  qty: "1",
                  orderPrice: String(pairedExecutionPrice) || "0",
                  currentIv: selectedOptionPair.markIv || 0,
                },
              ],
      },
      tickInterval: UA_TICKER_TO_TICKER_INTERVAL[chain][underlyingAsset],
      instrument: selectedOption.instrument || "",
      isComboMode: optionStrategy !== "Vanilla",
    });

    setChart(nextChart);
    setIsUnavailableToDraw(nextChart.list.length === 0);
  }, [
    chain,
    underlyingAsset,
    expiry,
    optionDirection,
    orderSide,
    optionStrategy,
    selectedOption,
    selectedOptionPair,
  ]);

  const daysToExpiry = useMemo(() => {
    return getDaysToLeft(String(selectedOption.instrument));
  }, [selectedOption.instrument]);

  // Initialize hover state only when chart data first loads.
  // After that, hover is controlled by chart interaction only.
  useEffect(() => {
    if (!chart?.list?.length) return;

    const clampedUnderlying =
      underlyingFutures >= xMin && underlyingFutures <= xMax
        ? underlyingFutures
        : null;

    if (clampedUnderlying != null) {
      const idx = Math.max(
        0,
        Math.min(
          chart.list.length - 1,
          Math.round((clampedUnderlying - xMin) / chart.tickInterval)
        )
      );
      const [assetPrice, pnlPer1] = chart.list[idx];
      setHover({ assetPrice, pnlPer1 });
      return;
    }

    if (breakeven) {
      const { x, y } = getDefaultChartHoverPoint(
        chart.list,
        breakeven,
        daysToExpiry,
        optionDirection === "Call",
        orderSide === "Buy"
      );
      setHover({ assetPrice: x, pnlPer1: y });
      return;
    }

    const [assetPrice, pnlPer1] = chart.list[Math.floor(chart.list.length / 2)];
    setHover({ assetPrice, pnlPer1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart.list]);

  const effectiveSize = useMemo(() => {
    const n = Number(size);
    const validSize = Number.isFinite(n) ? n : 0;
    // size가 빈 문자열이거나 0이면 1로 설정
    return size === "" || validSize === 0 ? 1 : validSize;
  }, [size]);

  const hoveredAssetPrice = useMemo(
    () => (isUnavailableToDraw ? 0 : hover?.assetPrice ?? 0),
    [hover, isUnavailableToDraw]
  );
  
  const hoveredPnlPer1 = useMemo(
    () => (isUnavailableToDraw ? 0 : hover?.pnlPer1 ?? 0),
    [hover, isUnavailableToDraw]
  );
  
  const expectedPnl = useMemo(
    () => (isUnavailableToDraw ? 0 : hoveredPnlPer1 * effectiveSize),
    [hoveredPnlPer1, effectiveSize, isUnavailableToDraw]
  );
  
  const expectedRoi = useMemo(
    () =>
      isUnavailableToDraw
        ? 0
        : executionPrice && effectiveSize
          ? (expectedPnl / (executionPrice * effectiveSize)) * 100
          : 0,
    [expectedPnl, executionPrice, effectiveSize, isUnavailableToDraw]
  );

  const breakevenChange = useMemo(
    () =>
      breakeven && underlyingFutures
        ? (breakeven / underlyingFutures - 1) * 100
        : 0,
    [breakeven, underlyingFutures]
  );

  return (
    <div className="w-full h-[112px] flex flex-row items-center justify-between">
      <ProfitSimulationSummary
        breakeven={breakeven}
        breakevenChange={breakevenChange}
        underlyingAsset={underlyingAsset}
        hoveredAssetPrice={hoveredAssetPrice}
        expectedPnl={expectedPnl}
        expectedRoi={expectedRoi}
      />
      <ProfitSimulationChart
        isUnavailableToDraw={isUnavailableToDraw}
        chart={chart}
        underlyingFutures={underlyingFutures}
        breakeven={breakeven}
        optionDirection={optionDirection}
        orderSide={orderSide}
        onHoverChange={(next) => setHover(next)}
      />
    </div>
  );
}

export default ProfitSimulation;
