import * as PIXI from "pixi.js";

import { ChartDataPoint, OrderSide } from "@/utils/types";
import { useContext, useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import LabelAndValue from "./LabelAndValue";
import { advancedFormatNumber, formatNumber } from "@/utils/helper";
import { ModalContext } from "../../Common/ModalContext";
import { dataToCanvasPosition, getDefaultChartHoverPoint } from "@/utils/misc";
import { drawCircle, drawLine, drawText } from "@/utils/charts";

interface CanvasProps {
  underlyingFutures: number;
  optionPrice: number;
  optionSize: string;
  chartDataPoints: ChartDataPoint[];
  dataMinX: number;
  dataMaxX: number;
  dataMinY: number;
  dataMaxY: number;
  tickInterval: number;
  bepPoints: number[];
  isUnavailableToDraw: boolean;
  selectedOptionName: string;
  selectedOptionDirection: string;
  selectedOrderSide: OrderSide;
  daysToExpiry: number;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 170;
const CHART_START_X = 30;
const CHART_START_Y = 30;

const CHART_END_Y = CANVAS_HEIGHT - CHART_START_Y;

const CHART_WIDTH = CANVAS_WIDTH - CHART_START_X - 20;
const CHART_HEIGHT = CHART_END_Y - CHART_START_Y;

const Canvas: React.FC<CanvasProps> = ({
  underlyingFutures,
  optionPrice,
  optionSize,
  chartDataPoints,
  dataMinX,
  dataMaxX,
  dataMinY,
  dataMaxY,
  tickInterval,
  bepPoints,
  isUnavailableToDraw,
  selectedOptionName,
  selectedOptionDirection,
  selectedOrderSide,
  daysToExpiry,
}) => {
  const { isModalOpen } = useContext(ModalContext);

  // new Bloc in Position Manager
  const [detail, setDetail] = useState<any>(null);
  const [app, setApp] = useState<PIXI.Application | null>(null);
  const [chartContainer, setChartContainer] = useState<PIXI.Container | null>(
    null
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const initChart = () => {
    if (app === null || chartContainer === null) return;
    if (containerRef.current) containerRef.current.appendChild(app.view as any);

    chartContainer.interactive = true;
    chartContainer.position.set(CHART_START_X, CANVAS_HEIGHT - CHART_START_Y);
    chartContainer.scale.set(1, -1);
    chartContainer.hitArea = new PIXI.Rectangle(
      0,
      0,
      CHART_WIDTH,
      CHART_HEIGHT
    );

    chartContainer.on("pointermove", handlePointerMove);
    chartContainer.on("pointerout", handlePointerOut);

    app.stage.addChild(chartContainer);
  };

  const destroyChart = () => {
    if (app === null || chartContainer === null) return;
    if (app?.view?.parentNode) app.view.parentNode.removeChild(app.view);

    chartContainer.off("pointermove", handlePointerMove);
    chartContainer.off("pointerout", handlePointerOut);

    chartContainer.interactive = false;
    chartContainer.removeChildren();
    chartContainer.destroy({
      children: true,
      texture: true,
      baseTexture: true,
    });

    app.stage.removeChild(chartContainer);
    app.stop();
    app.destroy(true);
  };

  const drawChart = () => {
    if (isUnavailableToDraw) return;

    const xRatio = CHART_WIDTH / (dataMaxX - dataMinX);
    const yRatio = CHART_HEIGHT / (dataMaxY - dataMinY);

    drawLine({
      width: 2,
      adjustFunction: ([x, y]: ChartDataPoint) => {
        const adjustedX = (x - dataMinX) * xRatio;
        const adjustedY = (y - dataMinY) * yRatio;
        return [adjustedX, adjustedY] as ChartDataPoint;
      },
      paths: chartDataPoints,
      color: 0xffffff,
      dynamicColor: true,
      callback: addStage,
    });
  };

  const drawBep = () => {
    if (isUnavailableToDraw) {
      drawLine({
        width: 1,
        color: 0x292929,
        paths: [
          [0, 0],
          [CHART_WIDTH, 0],
        ] as ChartDataPoint[],
        callback: addStage,
      });
      drawText({
        text: "Loss",
        color: 0xFF3333,
        x: 0,
        y: -10,
        callback: addStage,
      });
      drawText({
        text: "Profit",
        color: 0x63E073,
        x: CHART_WIDTH - 25,
        y: -10,
        callback: addStage,
      });
      drawText({
        text: "BEP",
        color: 0xF5F5F5,
        x: CHART_WIDTH / 2,
        y: -10,
        callback: addStage,
      });
    }

    const xRatio = CHART_WIDTH / (dataMaxX - dataMinX);
    const yRatio = CHART_HEIGHT / (dataMaxY - dataMinY);

    bepPoints.forEach((x, idx) => {
      const adjustedX = (x - dataMinX) * xRatio;
      const adjustedY = (0 - dataMinY) * yRatio;

      // horizontal line
      if (idx == 0) {
        drawLine({
          width: 1,
          color: 0x292929,
          paths: [
            [0, adjustedY],
            [CHART_WIDTH, adjustedY],
          ] as ChartDataPoint[],
          callback: addStage,
        });
      }

      // PNL이 플러스에서 마이너스, 마이너스에서 플러스로 바뀌는 지점
      // 만약 플러스에서 마이너스가 되었다면 그 지점은 Profit에서 Loss로
      // 마이너스에서 플러스가 되었다면 그 지점은 Loss에서 Profit로
      const foundPoint = chartDataPoints.find(([_x, _y]) => {
        return _x > x;
      });

      if (foundPoint) {
        // bepAfterPointX: X축 기준 BEP가 되는 Asset Price
        // bepAfterPointY: Y축 기준 BEP가 되는 PnL
        const [bepAfterPointX, bepAfterPointY] = foundPoint;

        if (bepAfterPointY > 0) {
          // Loss -> Profit
          drawText({
            text: "Loss",
            color: 0xFF3333,
            x: 0,
            y: -10,
            callback: addStage,
          });
          drawText({
            text: "Profit",
            color: 0x63E073,
            x: CHART_WIDTH - 25,
            y: -10,
            callback: addStage,
          });
        } else {
          // Profit -> Loss
          drawText({
            text: "Loss",
            color: 0xFF3333,
            x: CHART_WIDTH - 25,
            y: -10,
            callback: addStage,
          });
          drawText({
            text: "Profit",
            color: 0x63E073,
            x: 0,
            y: -10,
            callback: addStage,
          });
        }

        drawText({
          text: "BEP",
          color: 0xF5F5F5,
          x: adjustedX - 8,
          y: adjustedY - 10,
          callback: addStage,
        });

        drawText({
          text: `${advancedFormatNumber(Number(bepPoints), 0, "$")}`,
          color: 0xffffff,
          x: adjustedX - 23,
          y: adjustedY - 25,
          callback: addStage,
          alpha: 1
        })

        drawCircle({
          width: 1,
          color: 0xffffff,
          radius: 4,
          fill: 0xffffff,
          x: adjustedX,
          y: adjustedY,
          callback: addStage,
        });
      }
    });
  };

  // 그림 그린 후 스테이지에 추가하는 콜백 함수
  const addStage = (graphic: any) => {
    if (chartContainer === null) return;
    chartContainer.addChild(graphic);
  };

  const draw = () => {
    drawChart();
    drawBep();
  };

  useEffect(() => {
    const appInstance = new PIXI.Application({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      antialias: true,
      autoDensity: true,
      resolution: 2,
      backgroundColor: "#1f1f1f",
    });
    setApp(appInstance);

    const chartContainerInstance = new PIXI.Container();
    setChartContainer(chartContainerInstance);

    initChart();
    draw();

    return () => {
      setApp(null);
      setChartContainer(null);
      destroyChart();
    };
  }, [chartDataPoints, isModalOpen]);

  const [chartDataID, setChartDataID] = useState("");
  const [pointerX, setPointerX] = useState(0);
  const [pointerY, setPointerY] = useState(0);

  // default point
  useEffect(() => {
    const bepPoint = bepPoints[0];
    if (chartDataPoints.length == 0) return;

    const { x: xData, y: yData } = getDefaultChartHoverPoint(
      chartDataPoints,
      bepPoint,
      daysToExpiry,
      selectedOptionDirection === "Call",
      selectedOrderSide === "Buy"
    );

    const _chartDataID = chartDataPoints.reduce(
      (acc, [x, y]) => (acc += `${x}${y}`),
      ""
    );

    if (_chartDataID === chartDataID) return;

    setChartDataID(_chartDataID);

    const { xPos, yPos } = dataToCanvasPosition({
      CHART_WIDTH,
      CHART_HEIGHT,
      CHART_START_X,
      CHART_START_Y,
      dataMinX,
      dataMinY,
      dataMaxX,
      dataMaxY,
      xData,
      yData,
    });

    setPointerX(xPos);
    setPointerY(yPos);
    setDetail({
      x: xPos,
      y: yPos,
      assetPrice: xData,
      change: (xData / underlyingFutures - 1) * 100,
      pnl: yData,
    });
  }, []);

  const handlePointerOut = (e: any) => {
    setPointerX(0);
    setPointerY(0);
    setDetail(null);
  };

  const handlePointerMove = (e: any) => {
    if (!chartDataPoints) return;
    if (chartDataPoints.length === 0) return;

    const tick = CHART_WIDTH / chartDataPoints.length;
    const tickIndex = Math.floor((e.data.global.x - CHART_START_X) / tick);

    const xData = chartDataPoints[tickIndex][0];
    const yData = chartDataPoints[tickIndex][1];

    const { xPos, yPos } = dataToCanvasPosition({
      CHART_WIDTH,
      CHART_HEIGHT,
      CHART_START_X,
      CHART_START_Y,
      dataMinX,
      dataMinY,
      dataMaxX,
      dataMaxY,
      xData,
      yData,
    });

    const yExpiryData = chartDataPoints[tickIndex][1];

    setPointerX(xPos);
    setPointerY(yPos);

    setDetail({
      x: xPos,
      y: yPos,
      assetPrice: xData,
      change: (xData / underlyingFutures - 1) * 100,
      pnl: yExpiryData,
    });
  };

  const pnl =
    optionSize === "" ? detail?.pnl : detail?.pnl * Number(optionSize);

  return (
    <div className={twJoin("flex flex-row flex-wrap gap-y-5")}>
      <LabelAndValue
        label="Potential P&L"
        value={detail?.pnl ? advancedFormatNumber(pnl, 2, "$") : "$0.00"}
      />
      <LabelAndValue
        label="Breakeven"
        value={`$${formatNumber(Number(bepPoints), 1, true)}`}
      />

      {selectedOrderSide === "Buy" ? (
        <LabelAndValue label="Max Profit" value="Unlimited" />
      ) : (
        <>
          <LabelAndValue
            label="Max Profit"
            value={`$${formatNumber(optionPrice, 2, true)}`}
          />
        </>
      )}

      <LabelAndValue
        label="Max Loss"
        value={
          detail?.assetPrice
            ? `-${formatNumber(detail?.assetPrice, 2, true)}`
            : "$0"
        }
      />
    </div>
  );
};

export default Canvas;
