import { Graphics, Text } from "pixi.js";
import {
  ChartData,
  ChartDataPoint,
  GenerateChartDataArg,
  GroupedPosition,
  Position,
} from "./types";
import { calculateBlackScholesProfit } from "@callput/shared";
import { getDaysToLeft } from "./misc";
import {
  BEP_POINT_BOUNDARY_COMBO_MAX_RATIO,
  BEP_POINT_BOUNDARY_COMBO_MIN_RATIO,
  BEP_POINT_BOUNDARY_NAKED_MAX_RATIO,
  BEP_POINT_BOUNDARY_NAKED_MIN_RATIO,
} from "./constants";

// Chart Range 계산 공식
export const calculateChartRange = (positions: Position[]) => {
  const result = positions.reduce(
    (acc, { strikePrice }) => {
      const parsedStrikePrice = Number(strikePrice);

      if (parsedStrikePrice < acc.underlyingMinPrice) {
        acc.underlyingMinPrice = parsedStrikePrice;
      }
      if (parsedStrikePrice > acc.underlyingMaxPrice) {
        acc.underlyingMaxPrice = parsedStrikePrice;
      }

      return acc;
    },
    {
      underlyingMinPrice: Infinity,
      underlyingMaxPrice: 0,
    }
  );

  // search boundary
  const underlyingMinPrice =
    Math.floor((result.underlyingMinPrice * 0.1) / 100) * 100;
  const underlyingMaxPrice =
    Math.ceil((result.underlyingMaxPrice * 10) / 100) * 100;

  return {
    underlyingMinPrice,
    underlyingMaxPrice,
  };
};

// BEP 포인트만 찾는 경량 함수 (전체 차트 데이터 생성 없이)
const findBepPoints = (
  chartDataRaw: GenerateChartDataArg[],
  assetPriceMin: number,
  assetPriceMax: number,
  tickInterval: number
): number[] => {
  const bepPoints: number[] = [];
  let prevAssetPrice = assetPriceMin;
  let prevProfit: number | null = null;

  // min ~ max 사이의 tickInterval 간격으로 profit 계산 (차트 데이터 배열 생성 없이)
  for (
    let assetPrice = assetPriceMin;
    assetPrice <= assetPriceMax;
    assetPrice += tickInterval
  ) {
    // 포지션이 하나일 때는 Profit은 단일 포지션에 대한 Profit
    // 포지션이 여러개일 때는 Profit은 각 포지션 Profit의 합
    let profit = 0;

    chartDataRaw.forEach(
      ({
        isCall,
        strikePrice,
        orderPrice,
        qty,
        fromTime,
        expiry,
        volatility,
      }) => {
        profit += calculateBlackScholesProfit({
          markPriceInputData: {
            underlyingFutures: assetPrice,
            strikePrice: Number(strikePrice),
            iv: volatility,
            fromTime: fromTime,
            expiry: expiry,
            isCall,
          },
          orderPrice: Number(orderPrice),
          size: Number(qty),
        });
      }
    );

    // find bep points (마이너스에서 플러스로 혹은 플러스에서 마이너스로 넘어가는 지점)
    if (prevProfit !== null) {
      if (prevProfit < 0 && profit > 0) {
        // (-) -> (+)
        bepPoints.push((assetPrice + prevAssetPrice) / 2);
      } else if (prevProfit > 0 && profit < 0) {
        // (+) -> (-)
        bepPoints.push((assetPrice + prevAssetPrice) / 2);
      }
    }

    prevAssetPrice = assetPrice;
    prevProfit = profit;
  }

  return bepPoints;
};

// Chart 데이터 생성 공식
export const generateChartData = (
  chartDataRaw: GenerateChartDataArg[],
  assetPriceMin: number,
  assetPriceMax: number,
  tickInterval: number
): ChartData => {
  // underlyingAsset이 assetPriceMin에서 assetPriceMax으로 tickInterval 간격으로 변할 때의 profit을 담은 배열
  const chartData: ChartDataPoint[] = [];

  let dataMinX = assetPriceMin;
  let dataMaxX = assetPriceMax;
  let dataMinY = 0;
  let dataMaxY = 0;

  const bepPoints: number[] = [];

  // min ~ max 사이의 tickInterval 간격으로 profit 계산
  for (
    let assetPrice = assetPriceMin;
    assetPrice <= assetPriceMax;
    assetPrice += tickInterval
  ) {
    // 포지션이 하나일 때는 Profit은 단일 포지션에 대한 Profit
    // 포지션이 여러개일 때는 Profit은 각 포지션 Profit의 합
    let profit = 0;

    chartDataRaw.forEach(
      (
        { isCall, strikePrice, orderPrice, qty, fromTime, expiry, volatility },
        idx
      ) => {
        profit += calculateBlackScholesProfit({
          markPriceInputData: {
            underlyingFutures: assetPrice,
            strikePrice: Number(strikePrice),
            iv: volatility,
            fromTime: fromTime,
            expiry: expiry,
            isCall,
          },
          orderPrice: Number(orderPrice),
          size: Number(qty),
        });
      }
    );

    const dataPoint: ChartDataPoint = [assetPrice, profit];

    // calculate dataMinX
    dataMinY = Math.min(dataMinY, profit); // profit이 음수일 때 해당 값이 dataMinY가 됨 (최대값은 0)
    dataMaxY = Math.max(dataMaxY, profit); // profit이 양수 일 때 해당 값이 dataMaxY가 됨 (최소값은 0)

    chartData.push(dataPoint);
  }

  // find bep points (마이너스에서 플러스로 혹은 플러스에서 마이너스로 넘어가는 지점)
  chartData.forEach(([assetPrice, profit], idx) => {
    if (idx != 0) {
      const [prevAssetPrice, prevProfit] = chartData[idx - 1];

      if (prevProfit < 0 && profit > 0) {
        // (-) -> (+)
        bepPoints.push((assetPrice + prevAssetPrice) / 2);
      } else if (prevProfit > 0 && profit < 0) {
        // (+) -> (-)
        bepPoints.push((assetPrice + prevAssetPrice) / 2);
      }
    }
  });

  return {
    list: chartData,
    dataMinX,
    dataMaxX,
    dataMinY,
    dataMaxY,
    tickInterval,
    bepPoints,
  };
};

// Chart 데이터 생성 (BEP 포인트 기반 범위 조정 포함)
export const getChartData = ({
  groupedPosition,
  tickInterval,
  instrument,
  isComboMode,
  daysToLeftDivisor = 60,
}: {
  groupedPosition: GroupedPosition;
  tickInterval: number;
  instrument: string;
  isComboMode: boolean;
  daysToLeftDivisor?: number;
}): {
  chart: ChartData;
  underlyingMinPrice?: number;
  underlyingMaxPrice?: number;
} => {
  const { expiry, positions } = groupedPosition;

  // Strike Price 기준 최대 값(10배)과 최소 값(0.1배)을 구함
  // 여러 포지션이 존재하는 경우 그 중에 가장 큰 값과 작은 값을 구함
  let { underlyingMaxPrice, underlyingMinPrice } =
    calculateChartRange(positions);

  // 차트 그리기 위한 Raw 데이터 생성
  const chartDataRaw = positions.map(
    ({ strikePrice, isCall, isBuy, qty, orderPrice, currentIv }) => {
      return {
        strikePrice,
        isCall: isCall,
        isBuy: isBuy,
        qty: isBuy ? String(qty) : String(-qty),
        orderPrice: orderPrice,
        fromTime: expiry - 1,
        expiry: expiry,
        volatility: currentIv / 100,
        assetPriceMin: underlyingMinPrice,
        assetPriceMax: underlyingMaxPrice,
      };
    }
  );

  // @DEV: search bepPoints with large boundary (경량 함수 사용)
  const bepPoints = findBepPoints(
    chartDataRaw,
    underlyingMinPrice,
    underlyingMaxPrice,
    tickInterval
  );

  if (bepPoints.length === 0) {
    return {
      chart: {
        list: [],
        dataMinX: 0,
        dataMaxX: 0,
        dataMinY: 0,
        dataMaxY: 0,
        tickInterval: tickInterval,
        bepPoints: [],
      },
    };
  }

  const bepPoint = bepPoints[0];
  const daysToLeft = getDaysToLeft(instrument);

  const boundaryMinRatio = isComboMode
    ? BEP_POINT_BOUNDARY_COMBO_MIN_RATIO
    : BEP_POINT_BOUNDARY_NAKED_MIN_RATIO;
  const boundaryMaxRatio = isComboMode
    ? BEP_POINT_BOUNDARY_COMBO_MAX_RATIO
    : BEP_POINT_BOUNDARY_NAKED_MAX_RATIO;

  // If bep points are found, recalculate the underlyingMinPrice and underlyingMaxPrice
  underlyingMinPrice =
    bepPoint * (1 - boundaryMinRatio) * (1 - daysToLeft / daysToLeftDivisor);
  underlyingMaxPrice =
    bepPoint * (1 + boundaryMaxRatio) * (1 + daysToLeft / daysToLeftDivisor);

  const truncatedMin = Math.floor(underlyingMinPrice / 10) * 10;
  const truncatedMax = Math.floor(underlyingMaxPrice / 10) * 10;

  return {
    chart: generateChartData(
      chartDataRaw,
      truncatedMin,
      truncatedMax,
      tickInterval
    ),
    underlyingMinPrice,
    underlyingMaxPrice,
  };
};

export const drawLine = ({
  width,
  color,
  dynamicColor,
  paths,
  adjustFunction = (a) => a,
  callback,
}: {
  width: number;
  color: any;
  dynamicColor?: boolean;
  paths: ChartDataPoint[];
  adjustFunction?: (point: ChartDataPoint) => ChartDataPoint;
  callback: (graphic: any) => void;
}) => {
  const graphics = new Graphics(); // You need to define this

  // set a line style
  if (!dynamicColor && color) {
    graphics.lineStyle({
      width,
      color,
      shader: null,
    } as any); // width, color, alpha
  }

  const increasingLineStyle = getChartLineStyle({ isIncreasing: true });
  const decreasingLineStyle = getChartLineStyle({ isIncreasing: false });

  paths.forEach((path: number[], idx: number) => {
    // path[0]: x
    // path[1]: y
    if (idx === 0) {
      const [adjustedPathX, adjustedPathY] = adjustFunction([path[0], path[1]]);
      graphics.moveTo(adjustedPathX, adjustedPathY);
    } else if (dynamicColor) {
      const [prevPathX, prevPathY] = paths[idx - 1];

      if (prevPathY > 0 && path[1] > 0) {
        const [adjustedPathX, adjustedPathY] = adjustFunction([
          path[0],
          path[1],
        ]);
        graphics.lineStyle(increasingLineStyle);
        graphics.lineTo(adjustedPathX, adjustedPathY);
      } else if (prevPathY < 0 && path[1] < 0) {
        const [adjustedPathX, adjustedPathY] = adjustFunction([
          path[0],
          path[1],
        ]);
        graphics.lineStyle(decreasingLineStyle);
        graphics.lineTo(adjustedPathX, adjustedPathY);
      } else {
        //  + -> -
        if (prevPathY > 0) {
          const [adjustedPathX1, adjustedPathY1] = adjustFunction([path[0], 0]);
          graphics.lineStyle(increasingLineStyle);
          graphics.lineTo(adjustedPathX1, adjustedPathY1);

          const [adjustedPathX2, adjustedPathY2] = adjustFunction([
            path[0],
            path[1],
          ]);
          graphics.lineStyle(decreasingLineStyle);
          graphics.lineTo(adjustedPathX2, adjustedPathY2);
        }

        // - -> +
        if (path[1] > 0) {
          const [adjustedPathX1, adjustedPathY1] = adjustFunction([
            path[0],
            path[1],
          ]);
          graphics.lineStyle(decreasingLineStyle);
          graphics.lineTo(adjustedPathX1, adjustedPathY1);

          const [adjustedPathX2, adjustedPathY2] = adjustFunction([
            path[0],
            path[1],
          ]);
          graphics.lineStyle(increasingLineStyle);
          graphics.lineTo(adjustedPathX2, adjustedPathY2);
        }
      }
    } else {
      const [adjustedPathX, adjustedPathY] = adjustFunction([path[0], path[1]]);
      graphics.lineTo(adjustedPathX, adjustedPathY);
    }
  });

  if (typeof callback === "function") {
    callback(graphics);
  }
};

export const drawCircle = ({
  width,
  x,
  y,
  color,
  fill,
  radius,
  callback,
}: {
  width: number;
  x: number;
  y: number;
  color: any;
  fill: any;
  radius: number;
  callback: (graphic: any) => void;
}) => {
  const graphics = new Graphics();

  graphics.lineStyle({
    width,
    color,
  } as any);

  if (fill) {
    graphics.beginFill(fill);
    graphics.drawCircle(x, y, radius);
    graphics.endFill();
  } else {
    graphics.drawCircle(x, y, radius);
  }

  if (typeof callback === "function") {
    callback(graphics);
  }
};

export const drawText = ({
  text,
  x,
  y,
  style,
  color,
  callback,
  alpha = 0.5,
}: {
  text: string;
  x: number;
  y: number;
  style?: any;
  color: any;
  callback: (graphic: any) => void;
  alpha?: number;
}) => {
  const _text = new Text(
    text,
    style || {
      fontFamily: "Graphie",
      fontSize: 11,
      fill: color,
      align: "center",
    }
  );

  _text.scale.set(1, -1);
  _text.position.set(x, y);
  _text.alpha = alpha;

  if (typeof callback === "function") {
    callback(_text);
  }
};

const getChartLineStyle = ({ isIncreasing }: any) => {
  return { width: 2, color: isIncreasing ? 0x63e073 : 0xff3333 } as any;
};
