import { useEffect, useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption, EChartsType } from "echarts";
import { twJoin } from "tailwind-merge";
import type { ChartData, OptionDirection, OrderSide } from "@/utils/types";

interface ProfitSimulationChartProps {
  isUnavailableToDraw: boolean;
  chart: ChartData;
  underlyingFutures: number;
  breakeven: number;
  optionDirection: OptionDirection;
  orderSide: OrderSide;
  onHoverChange: (hover: { assetPrice: number; pnlPer1: number }) => void;
}

function ProfitSimulationChart({
  isUnavailableToDraw,
  chart,
  underlyingFutures,
  breakeven,
  optionDirection,
  orderSide,
  onHoverChange,
}: ProfitSimulationChartProps) {
  const chartInstanceRef = useRef<EChartsType | null>(null);
  const zrCleanupRef = useRef<null | (() => void)>(null);
  const isMouseInsideRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  const xMin = chart.dataMinX;
  const xMax = chart.dataMaxX;
  const yMinRaw = chart.dataMinY;
  const yMaxRaw = chart.dataMaxY;

  const safeSeriesData = useMemo(() => {
    return (chart.list || []).filter(
      ([x, y]) => Number.isFinite(x) && Number.isFinite(y)
    );
  }, [chart.list]);

  const updateHoverFromAssetPrice = (assetPriceValue: number) => {
    if (!chart?.list?.length) return;
    const idx = Math.max(
      0,
      Math.min(
        chart.list.length - 1,
        Math.round((assetPriceValue - xMin) / chart.tickInterval)
      )
    );
    const [assetPrice, pnlPer1] = chart.list[idx];
    onHoverChange({ assetPrice, pnlPer1 });
    return pnlPer1;
  };

  const updateAxisPointerColor = (instance: EChartsType, pnlPer1: number) => {
    // Profit 구간: 초록색 (#71B842), Loss 구간: 빨간색 (#E04A3F)
    const color = pnlPer1 >= 0 ? "#71B842" : "#E04A3F";

    instance.setOption({
      tooltip: {
        axisPointer: {
          lineStyle: {
            color: color,
          },
        },
      },
      xAxis: {
        axisPointer: {
          lineStyle: {
            color: color,
          },
        },
      },
    }, false); // false = not merge, replace only these options
  };

  // BEP에서 두 번째로 가까운 지점 찾기 (Profit 구간 우선)
  const findSecondClosestToBEP = useMemo(() => {
    if (!breakeven || !chart?.list?.length) return null;

    // Buy Call: BEP보다 위쪽(높은 가격)에서 Profit
    // Sell Call: BEP보다 아래쪽(낮은 가격)에서 Profit
    const isBuyCall = optionDirection === "Call" && orderSide === "Buy";
    const isSellCall = optionDirection === "Call" && orderSide === "Sell";

    // Profit 구간에 있는 포인트들만 필터링
    const profitPoints = chart.list
      .map(([x, y], idx) => ({
        idx,
        x,
        y,
        distance: Math.abs(x - breakeven),
        isProfit: y >= 0,
        isAboveBEP: x > breakeven,
        isBelowBEP: x < breakeven,
      }))
      .filter((point) => {
        if (isBuyCall) {
          // Buy Call: BEP보다 위쪽이면서 Profit인 지점
          return point.isAboveBEP && point.isProfit;
        } else if (isSellCall) {
          // Sell Call: BEP보다 아래쪽이면서 Profit인 지점
          return point.isBelowBEP && point.isProfit;
        }
        // Put 옵션이거나 기타 경우: Profit인 지점
        return point.isProfit;
      })
      .sort((a, b) => a.distance - b.distance);

    // Profit 구간에 포인트가 있으면 그 중 두 번째로 가까운 지점 선택
    if (profitPoints.length >= 2) {
      // 첫 번째가 BEP와 매우 가까우면 두 번째를 선택
      if (profitPoints[1].distance < (breakeven * 0.01)) {
        return profitPoints[3];
      }
      return profitPoints[1];
    }

    // Profit 구간에 포인트가 없거나 1개만 있으면, 전체 포인트에서 두 번째로 가까운 지점 선택
    const allDistances = chart.list
      .map(([x, y], idx) => ({
        idx,
        x,
        y,
        distance: Math.abs(x - breakeven),
      }))
      .sort((a, b) => a.distance - b.distance);

    if (allDistances.length < 2) return allDistances[0] || null;

    const first = allDistances[0];
    const second = allDistances[1];

    // BEP와 거의 일치하는 경우 (0.1% 이내) 두 번째를 선택
    if (first.distance < (breakeven * 0.001)) {
      return second;
    }
    return first;
  }, [breakeven, chart.list, optionDirection, orderSide]);

  const option = useMemo((): EChartsOption => {
    const yRange = yMaxRaw - yMinRaw;
    const yPad = yRange === 0 ? 1 : yRange * 0.08;
    const yMin = yMinRaw - yPad;
    const yMax = yMaxRaw + yPad;

    // Split into Loss/Profit series without a visual gap at the zero-crossing.
    // When the sign flips between two points, we linearly interpolate the crossing point (y=0)
    // and inject it into both series.
    const lossSeriesData: Array<[number, number] | null> = [];
    const profitSeriesData: Array<[number, number] | null> = [];

    for (let i = 0; i < safeSeriesData.length; i++) {
      const [x, y] = safeSeriesData[i];

      if (i === 0) {
        lossSeriesData.push(y <= 0 ? [x, y] : null);
        profitSeriesData.push(y >= 0 ? [x, y] : null);
        continue;
      }

      const [px, py] = safeSeriesData[i - 1];
      const signChange = (py < 0 && y > 0) || (py > 0 && y < 0);

      if (signChange && y !== py) {
        const t = (0 - py) / (y - py);
        const xCross = px + t * (x - px);

        if (Number.isFinite(xCross)) {
          // Close previous region at the crossing and start the next region from the crossing.
          lossSeriesData.push([xCross, 0]);
          profitSeriesData.push([xCross, 0]);
        }

        if (y > 0) {
          // Loss -> Profit
          lossSeriesData.push(null);
          profitSeriesData.push([x, y]);
        } else {
          // Profit -> Loss
          profitSeriesData.push(null);
          lossSeriesData.push([x, y]);
        }

        continue;
      }

      lossSeriesData.push(y <= 0 ? [x, y] : null);
      profitSeriesData.push(y >= 0 ? [x, y] : null);
    }

    return {
      animation: false,
      backgroundColor: "transparent",
      // NOTE:
      // We intentionally avoid `visualMap` for this tiny 160x112 line chart.
      // With certain datasets/markers, ECharts can throw `Cannot read properties of undefined (reading 'coord')`
      // from its internal gradient/visual calculation. Splitting Profit/Loss into 2 series is stable.
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        containLabel: false,
      },
      tooltip: {
        trigger: "axis",
        showContent: false,
        triggerOn: "mousemove|click",
        backgroundColor: "transparent",
        borderWidth: 0,
        padding: 0,
        axisPointer: {
          type: "line",
          lineStyle: {
            color: "#278EF5",
            type: "dashed",
            width: 1,
          },
        },
      },
      xAxis: {
        type: "value",
        min: xMin,
        max: xMax,
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
        axisPointer: {
          show: true,
          label: { show: false },
          triggerTooltip: false,
          snap: true,
          lineStyle: {
            color: "#278EF5",
            type: "dashed",
            width: 1,
          },
        },
      },
      yAxis: {
        type: "value",
        min: yMin,
        max: yMax,
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      series: [
        {
          name: "Loss",
          type: "line",
          data: lossSeriesData,
          showSymbol: false,
          symbol: "circle",
          symbolSize: 0,
          itemStyle: {
            color: "#278EF5",
            borderColor: "transparent",
          },
          connectNulls: false,
          silent: true,
          clip: false,
          z: 5,
          lineStyle: { width: 2, color: "#E04A3F" },
          emphasis: { disabled: true },
          markLine: {
            symbol: "none",
            label: { show: false },
            animation: false,
            emphasis: { disabled: true },
            silent: true,
            data: [
              {
                yAxis: 0,
                lineStyle: { color: "#202329", width: 1, type: "solid" },
              },
            ],
          },
        },
        {
          name: "Profit",
          type: "line",
          data: profitSeriesData,
          showSymbol: false,
          symbol: "circle",
          symbolSize: 0,
          itemStyle: {
            color: "#278EF5",
            borderColor: "transparent",
          },
          connectNulls: false,
          silent: true,
          clip: false,
          z: 6,
          lineStyle: { width: 2, color: "#71B842" },
          emphasis: { disabled: true },
        },
        {
          name: "BEP",
          type: "scatter",
          data: breakeven ? [[breakeven, 0]] : [],
          symbol: "circle",
          symbolSize: 4,
          itemStyle: { color: "#FFFFFF" },
          z: 10,
          silent: true,
          emphasis: { disabled: true },
        },
      ],
    };
  }, [breakeven, safeSeriesData, underlyingFutures, xMax, xMin, yMaxRaw, yMinRaw]);

  const resetToDefaultPosition = () => {
    const instance = chartInstanceRef.current;
    if (!instance) return;

    // BEP에서 두 번째로 가까운 지점으로 세로선 고정
    if (findSecondClosestToBEP) {
      const { idx, x, y } = findSecondClosestToBEP;
      const widthPx = instance.getWidth?.() ?? 180;
      const count = chart.list.length;
      const tickPx = count ? widthPx / count : widthPx;
      const xSnapPx = (idx + 0.5) * tickPx;

      // 세로선 표시
      instance.dispatchAction({
        type: "showTip",
        x: xSnapPx,
        y: instance.getHeight?.() ? instance.getHeight() / 2 : 56
      });

      // 색상 업데이트
      if (typeof y === "number" && !Number.isNaN(y)) {
        updateAxisPointerColor(instance, y);
      }

      // hover 상태 업데이트
      updateHoverFromAssetPrice(x);
    } else {
      // fallback: underlyingFutures 위치로
      if (chart?.list?.length) {
        const idx = Math.max(
          0,
          Math.min(
            chart.list.length - 1,
            Math.round((underlyingFutures - xMin) / chart.tickInterval)
          )
        );
        const [, pnlPer1] = chart.list[idx] ?? [];
        if (typeof pnlPer1 === "number" && !Number.isNaN(pnlPer1)) {
          updateAxisPointerColor(instance, pnlPer1);
        }
      }
      updateHoverFromAssetPrice(underlyingFutures);
      instance.dispatchAction({ type: "hideTip" });
    }
  };

  const bindZRenderHover = (instance: EChartsType) => {
    zrCleanupRef.current?.();

    if (!chart?.list?.length) return;
    const zr = instance.getZr();

    // zr이 null이면 early return (차트가 아직 준비되지 않았거나 unmount 중)
    if (!zr) return;

    const onMove = (e: any) => {
      // 마우스가 차트 밖에 있으면 무시
      if (!isMouseInsideRef.current) return;

      const px =
        typeof e?.offsetX === "number"
          ? e.offsetX
          : typeof e?.zrX === "number"
            ? e.zrX
            : typeof e?.event?.offsetX === "number"
              ? e.event.offsetX
              : null;
      const py =
        typeof e?.offsetY === "number"
          ? e.offsetY
          : typeof e?.zrY === "number"
            ? e.zrY
            : typeof e?.event?.offsetY === "number"
              ? e.event.offsetY
              : null;

      if (px == null || py == null) return;

      // Canvas 느낌처럼 "틱틱" 스냅: 픽셀을 데이터 인덱스로 매핑하고, 포인터/좌측 값도 동일 기준으로 업데이트
      const widthPx = instance.getWidth?.() ?? 180;
      const count = chart.list.length;
      const tickPx = count ? widthPx / count : widthPx;
      const idx = count
        ? Math.max(0, Math.min(count - 1, Math.floor(px / tickPx)))
        : 0;

      const [assetPrice, pnlPer1] = chart.list[idx] ?? [];
      if (typeof assetPrice !== "number" || Number.isNaN(assetPrice)) return;

      // Show axisPointer on hover (tooltip content is disabled).
      // IMPORTANT: Use pixel-based showTip so it works in both Loss/Profit regions
      // (series-based showTip fails when the selected series has null at that index).
      const xSnapPx = (idx + 0.5) * tickPx;
      instance.dispatchAction({ type: "showTip", x: xSnapPx, y: py });

      // Update axisPointer color based on profit/loss
      if (typeof pnlPer1 === "number" && !Number.isNaN(pnlPer1)) {
        updateAxisPointerColor(instance, pnlPer1);
      }

      updateHoverFromAssetPrice(assetPrice);
    };

    zr.on("mousemove", onMove);
    zrCleanupRef.current = () => {
      zr.off("mousemove", onMove);
    };
  };

  // 초기 세로선 표시 함수
  const showInitialAxisPointer = (instance: EChartsType) => {
    if (!findSecondClosestToBEP || !chart?.list?.length) return;

    const { idx, x, y } = findSecondClosestToBEP;
    const widthPx = instance.getWidth?.() ?? 180;
    const count = chart.list.length;
    const tickPx = count ? widthPx / count : widthPx;
    const xSnapPx = (idx + 0.5) * tickPx;

    // requestAnimationFrame을 사용하여 차트 렌더링 완료 후 실행
    requestAnimationFrame(() => {
      instance.dispatchAction({
        type: "showTip",
        x: xSnapPx,
        y: instance.getHeight?.() ? instance.getHeight() / 2 : 56
      });

      if (typeof y === "number" && !Number.isNaN(y)) {
        updateAxisPointerColor(instance, y);
      }

      updateHoverFromAssetPrice(x);
    });
  };

  // 차트가 다시 렌더링될 때 초기화 플래그 리셋
  useEffect(() => {
    if (isUnavailableToDraw) {
      hasInitializedRef.current = false;
      chartInstanceRef.current = null;
    }
  }, [isUnavailableToDraw]);

  // Re-bind hover whenever the chart data changes.
  useEffect(() => {
    // 차트가 렌더링되지 않으면 아무것도 하지 않음
    if (isUnavailableToDraw) return;

    const instance = chartInstanceRef.current;
    if (!instance) return;

    bindZRenderHover(instance);

    // 초기 로드 시에만 BEP에서 두 번째로 가까운 지점에 세로선 표시
    // 마우스가 차트 밖에 있고, 아직 초기화되지 않았을 때만 실행
    if (!isMouseInsideRef.current && !hasInitializedRef.current) {
      showInitialAxisPointer(instance);
      hasInitializedRef.current = true;
    }

    return () => {
      zrCleanupRef.current?.();
      zrCleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart.list, underlyingFutures, xMin, chart.tickInterval, findSecondClosestToBEP]);

  const handleMouseEnter = () => {
    isMouseInsideRef.current = true;
  };

  const handleMouseLeave = () => {
    isMouseInsideRef.current = false;
    resetToDefaultPosition();
  };

  return (
    <div
      className={twJoin(
        "w-[180px] h-[112px]",
        "bg-[#181A1F] rounded-[6px]",
        "relative",
        isUnavailableToDraw ? "opacity-50" : ""
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!isUnavailableToDraw ? (
        <ReactECharts
          option={option}
          style={{ width: "100%", height: "100%" }}
          onChartReady={(instance) => {
            chartInstanceRef.current = instance;
            bindZRenderHover(instance);
            // 차트 준비 완료 시 초기 세로선 표시 (최초 1회만)
            if (!hasInitializedRef.current) {
              showInitialAxisPointer(instance);
              hasInitializedRef.current = true;
            }
          }}
        // ZRender binding handles mouse events reliably for this tiny chart.
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-[#6B7280] text-[12px] text-center leading-[18px]">
            No data available<br />
            For selected option and pair
          </p>
        </div>
      )}
    </div>
  );
}

export default ProfitSimulationChart;


