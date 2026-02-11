import React, {
  Dispatch,
  useEffect,
  SetStateAction,
  useRef,
  useState,
  useMemo,
  useContext,
  useCallback,
} from "react";
import ReactECharts from "echarts-for-react";
import { KLINE_API } from "@/utils/apis";
import { useAppSelector } from "@/store/hooks";
import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import {
  ILeadTrader,
  ILeadTraders,
} from "@/interfaces/interfaces.marketSlice.ts";
import IntervalSelector from "./IntervalSelector";
import { getMarkPointData } from "../MainChart";
import iconGuideMobile from "@assets/mobile/zero-dte/icon-guide-mobile.svg";
import { ModalContext } from "@/components/Common/ModalContext";
import SocialTradingTips from "./SocialTradingTips";
import * as echarts from "echarts";
import iconLoaderChart from "@assets/mobile/zero-dte/icon-loader-chart.svg";
import IconChartZoomIn from "@/assets/mobile/zero-dte/icon-chart-zoom-in.svg";
import IconChartZoomOut from "@/assets/mobile/zero-dte/icon-chart-zoom-out.svg";
import throttle from "lodash/throttle";
import SocialTradingChipList from "./SocialTradingChipList";
import { FuturesAssetIndexMap, UnderlyingAsset } from "@callput/shared";

const dataZoomInitialStart = 55;
const dataZoomInitialEnd = 100;
const milisecondsOfOneDay = 24 * 60 * 60 * 1000;

const option = {
  textStyle: {
    fontFamily: "Host Grotesk",
  },
  grid: {
    left: "0",
    right: "0",
    top: "22",
    bottom: "34",
    containLabel: true,
  },
  xAxis: {
    type: "time",
    min: "dataMin",
    axisLine: { show: false },
    axisTick: {
      show: false,
    },
    splitLine: {
      // Grid line
      show: true,
      lineStyle: {
        color: "#333331",
      },
    },
    axisLabel: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: 400,
      margin: 10,
      color: "#9d9b98",
    },
  },
  yAxis: [
    {
      type: "value",
      triggerEvent: true,
      scale: true,
      splitLine: {
        show: true,
        lineStyle: {
          color: "#333331", // Grid line color
        },
      },
      axisLabel: {
        show: false,
      },
    },
    {
      type: "value",
      triggerEvent: true,
      scale: true,
      position: "right",
      zlevel: 1,
      splitLine: {
        show: false,
      },
      axisLabel: {
        inside: true,
        fontSize: 10,
        lineHeight: 12,
        fontWeight: 400,
        align: "right",
        margin: 12,
        color: "#9d9b98",
      },
    },
  ],
  dataZoom: [
    {
      type: "slider",
      zoomLock: true,
      throttle: 80,
      start: dataZoomInitialStart,
      end: dataZoomInitialEnd,
      showDetail: false,
      brushSelect: false,
      handleIcon: "none",
      handleSize: 0,
      moveHandleIcon: "none",
      moveHandleSize: 0,
      height: 24,
      bottom: 0,
      left: 12,
      right: 12,
      borderRadius: 4,
      backgroundColor: "#121212",
      borderColor: "#9d9b98",
      fillerColor: "rgba(135, 155, 57, 0.5)",
      dataBackground: {
        lineStyle: {
          color: "#808080",
          width: 1,
        },
        areaStyle: { color: "#7ea18a", opacity: 0.2 },
      },
      selectedDataBackground: {
        lineStyle: {
          color: "#e6fc8d",
          width: 2,
        },
        areaStyle: { color: "#879b39" },
      },
    },
  ],
  series: [
    {
      type: "candlestick",
      id: "kline data",
      yAxisIndex: 0,
      barWidth: "70%",
      silent: true,
      data: [],
      itemStyle: {
        color: "#63E073", // Rising candle color
        color0: "#E03F3F", // Falling candle color
        borderColor: "#63E073", // Rising candle border color
        borderColor0: "#E03F3F", // Falling candle border color
      },
      markLine: {
        animation: false,
        silent: true,
        symbol: ["none"],
        data: [
          {
            show: false,
            name: "futures price",
            yAxis: 0,
            lineStyle: {
              opacity: 0,
            },
          },
          {
            name: "horizontal hover",
            yAxis: 0,
            lineStyle: {
              width: 0,
            },
            label: {
              show: false,
            },
          },
          {
            name: "vertical hover",
            xAxis: 0,
            lineStyle: {
              width: 0,
              type: "dashed",
              color: "#808080",
            },
            label: {
              show: false,
            },
          },
        ],
      },
      markArea: {
        silent: true,
        data: [],
      },
      markPoint: {
        symbol: "circle",
        symbolSize: 5,
        animation: false,
        label: {
          show: false,
        },
      },
    },
    {
      type: "candlestick",
      id: "kline data clone",
      yAxisIndex: 1,
      barWidth: 0,
      data: [],
      itemStyle: {
        opacity: 0,
      },
      markArea: {
        silent: true,
        data: [],
      },
    },
    {
      id: "line data",
      type: "line",
      smooth: true,
      showSymbol: false,
      yAxisIndex: 0,
      lineStyle: { width: 1 },
      data: [],
      markPoint: {
        symbol: "circle",
        symbolSize: 5,
        animation: false,
        label: {
          show: false,
        },
      },
    },
  ],
};

const calculateSymmetricalMinMax = (
  value: any,
  forbiddenMinMax: any,
  isZoomIn: boolean,
  zoom: number
) => {
  let adjustedMin, adjustedMax;
  const zoomInverse = 1 / zoom;

  if (isZoomIn) {
    const min = Math.min(
      value.min * (1 - zoomInverse / 100),
      forbiddenMinMax[0] * (1 - zoomInverse / 100)
    );
    const max = Math.max(
      value.max * (1 + zoomInverse / 100),
      forbiddenMinMax[1] * (1 + zoomInverse / 100)
    );
    adjustedMin = Math.floor(
      Math.max(min, value.min * (1 - (2 * zoomInverse) / 100))
    );
    adjustedMax = Math.ceil(
      Math.min(max, value.max * (1 + (2 * zoomInverse) / 100))
    );
  } else {
    const centerOfValue = (value.min + value.max) / 2;
    const range = (centerOfValue * 0.08) / zoom;
    adjustedMin = Math.floor(centerOfValue - range);
    adjustedMax = Math.ceil(centerOfValue + range);
  }

  return { adjustedMin, adjustedMax };
};

interface MainChartProps {
  underlyingAsset: UnderlyingAsset;
  expiry: number;
  forbiddenMinMaxPrices: number[];
  isSelectedZeroDteModalOpen: boolean;
  selectedLeadTrader: ILeadTrader | null;
  shouldBackToDefault: boolean;
  setHoveredPrice: (value: number) => void;
  setEstimatedPrice: Dispatch<SetStateAction<number>>;
  setSelectedLeadTrader: (value: ILeadTrader | null) => void;
  setShouldBackToDefault: Dispatch<SetStateAction<boolean>>;
}

interface SettlePriceData {
  [timestamp: number]: {
    [asset: string]: number;
  };
}

type OverlayPosition = {
  id: string;
  top: string;
  left: string;
  shouldShow: boolean;
};

interface GetHoverStyleProps {
  isAvailability: boolean;
  hoverPointYValue: number;
  fbMinPricesYValue: number;
}

const MainChart: React.FC<MainChartProps> = ({
  underlyingAsset,
  expiry,
  forbiddenMinMaxPrices,
  isSelectedZeroDteModalOpen,
  selectedLeadTrader,
  shouldBackToDefault,
  setHoveredPrice,
  setEstimatedPrice,
  setSelectedLeadTrader,
  setShouldBackToDefault,
}) => {
  const { openModal } = useContext(ModalContext);

  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;
  const settlePricesData = useAppSelector(
    (state: any) => state.market.settlePrices
  );
  const webSocketKlinesData = useAppSelector(
    (state: any) => state.webSocket.klines
  );
  const leadTraders: ILeadTraders = useAppSelector(
    (state: any) => state.market.leadTraders
  );

  const [chartInterval, setChartInterval] = useState<string>("15m");
  const [lastChartInterval, setLastChartInterval] = useState<string>("15m");
  const [needToFetch, setNeedToFetch] = useState<boolean>(false);
  const [klineData, setKlineData] = useState<any[]>([]);
  const [futuresIndex, setFuturesIndex] = useState<number>(0);
  const [lastFuturesIndex, setLastFuturesIndex] = useState<number>(0);
  const [settlePrices, setSettlePrices] = useState<SettlePriceData>({});
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [overlayPositions, setOverlayPositions] = useState<OverlayPosition[]>(
    []
  );
  const [isZoomIn, setIsZoomIn] = useState<boolean>(true);
  const [futuresIndexYAxis, setFuturesIndexYAxis] = useState<number>(0);
  const [futuresIndexAnimation, setFuturesIndexAnimation] =
    useState<string>("");
  const [startTime, setStartTime] = useState<number>(0);
  const [firstTimeShow1mChart, setFirstTimeShow1mChart] =
    useState<boolean>(false);

  const [showDirectCoord, setShowDirectCoord] = useState(false);
  const [directCoord, setDirectCoord] = useState<{
    hoverPointXPx: number;
    hoverPointYPx: number;
    hoverPointXValue: number;
    hoverPointYValue: number;
    fbMinPricesYPx: number;
    fbMaxPricesYPx: number;
    maxXValue: number;
    maxXPx: number;
    chartMaxYPx: number;
  }>();

  const echartsRef = useRef<any>(null);
  const mouseupTimeout = useRef<any>();
  const [isHovering, setIsHovering] = useState(false);
  const [dataZoomDefault, setDataZoomDefault] = useState<{
    start: number;
    end: number;
  }>();
  const [copedStrikePrice, setCopedStrikePrice] = useState(0);

  const symbol = useMemo(() => {
    return `${underlyingAsset}USDC`;
  }, [underlyingAsset]);

  const handleSocialTradingChipsPositionUpdate = useCallback(() => {
    const chartInstance = echartsRef.current?.getEchartsInstance();
    if (!chartInstance) {
      return;
    }

    const series = chartInstance?.getOption()?.series?.[0];

    const userMarkPoints = series?.markPoint?.data?.filter((item: any) => {
      return item?.name?.includes("leader");
    });

    if (
      !series?.markPoint ||
      userMarkPoints?.length != leadTraders?.[underlyingAsset]?.length
    ) {
      return;
    }

    const _overlayPositions: OverlayPosition[] = [];
    const chartRect = chartInstance.getDom().getBoundingClientRect();

    for (let i = 0; i < leadTraders?.[underlyingAsset]?.length; i++) {
      {
        const markPointData = userMarkPoints?.[i];

        const [endTime, open, high, low, close] = markPointData?.coord;
        const coord: number[] = [endTime, close];
        const markPointName: string = markPointData?.name;
        const pointInPixel = chartInstance?.convertToPixel(
          { seriesIndex: 0 },
          coord
        );

        const isAvailablePrice = !(
          close > forbiddenMinMaxPrices[0] && close < forbiddenMinMaxPrices[1]
        );

        if (pointInPixel) {
          const [x, y] = pointInPixel;
          const isInsideChart =
            x >= 52 &&
            x <= chartRect.width - 92 &&
            y >= 40 &&
            y <= chartRect.height - 68;

          _overlayPositions.push({
            id: markPointName,
            top: `${y}px`,
            left: `${x}px`,
            shouldShow: isInsideChart && isAvailablePrice,
          });
        } else {
          _overlayPositions.push({
            id: "",
            top: `${0}px`,
            left: `${0}px`,
            shouldShow: false,
          });
        }
      }
    }

    setOverlayPositions(_overlayPositions);
  }, [echartsRef, forbiddenMinMaxPrices, leadTraders, underlyingAsset]);

  // get and set yAxis of futures price markLine
  const handleFuturesPricePositionUpdate = useCallback(() => {
    const chartInstance = echartsRef.current?.getEchartsInstance();

    if (!chartInstance) {
      return;
    }
    const currentOption = chartInstance.getOption();
    const getMarkLineData = currentOption?.series?.[0]?.markLine?.data;

    if (!getMarkLineData) {
      return;
    }

    const futuresIndexMarkLine = getMarkLineData?.find(
      (item: any) => item.name === "futures price"
    );
    const yAxixOfFuturesIndex = chartInstance.convertToPixel(
      { seriesIndex: 0 },
      [0, futuresIndexMarkLine.yAxis]
    )[1];
    setFuturesIndexYAxis(yAxixOfFuturesIndex);
  }, [echartsRef]);

  const handleOverlayPositionUpdate = useCallback(
    throttle((): void => {
      handleSocialTradingChipsPositionUpdate();
      handleFuturesPricePositionUpdate();
    }, 300),
    [handleSocialTradingChipsPositionUpdate, handleFuturesPricePositionUpdate]
  );

  const getOverlayPosition = useCallback(
    (i: number): OverlayPosition => {
      const _overlayPosition: OverlayPosition = {
        id: "",
        top: "0",
        left: "0",
        shouldShow: false,
      };
      return overlayPositions.length < 1 || overlayPositions.length <= i
        ? _overlayPosition
        : overlayPositions[i];
    },
    [overlayPositions]
  );

  const fetchKlinesData = async (isIntervalChanged: boolean) => {
    const endOfChart = getEndOfChart().getTime();
    const minStartOfChart = endOfChart - 3 * milisecondsOfOneDay;

    if (
      startTime &&
      startTime <= minStartOfChart + 60 * 1000 &&
      chartInterval === "1m"
    ) {
      return;
    }

    let klinesApi = KLINE_API + `?symbol=${symbol}&interval=${chartInterval}`;

    if (chartInterval !== "1m") {
      klinesApi = klinesApi + `&startTime=${minStartOfChart}`;
    } else {
      if (startTime > 0) {
        klinesApi =
          klinesApi +
          `&startTime=${
            startTime - milisecondsOfOneDay / 2
          }&endTime=${startTime}`;
      } else {
        klinesApi =
          klinesApi + `&startTime=${endOfChart - milisecondsOfOneDay / 2}`;
      }
    }

    const response = await fetch(klinesApi);
    const result = await response.json();

    if (!result || !result.data || result.data.length === 0) {
      return;
    }

    const additionalKlineData = result.data.map((kline: any) => [
      kline[0],
      kline[1],
      kline[4],
      kline[3],
      kline[2],
    ]);

    // const nextStart = limit / (klineData.length + additionalKlineData.length) * 100;

    if (isIntervalChanged) {
      setKlineData(additionalKlineData);
    } else {
      setKlineData((prevData) => [...additionalKlineData, ...prevData]);
    }

    setStartTime(chartInterval === "1m" ? result.startTime : 0);
    setNeedToFetch(false);
  };

  const getEndOfChart = () => {
    const now = new Date();
    const hour = now.getUTCHours();

    if (hour < 8) {
      now.setDate(now.getDate() - 1);
    }

    let endOfChart;
    if (chartInterval === "15m") {
      const startOfDay = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          7,
          0,
          0
        )
      );
      endOfChart = new Date(startOfDay.getTime() + 29 * 60 * 60 * 1000);
    } else if (chartInterval === "5m") {
      endOfChart = new Date(Date.now() + 5000 * 1000);
    } else {
      endOfChart = new Date(Date.now() + 1000 * 1000);
    }

    return endOfChart;
  };

  const updateXAxisMax = (chartInstance: any) => {
    chartInstance.setOption({
      xAxis: {
        max: getEndOfChart(),
      },
    });
  };

  const formatDateLabel = (value?: number) => {
    if (!value) return "";

    const date = new Date(value);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const getHoverPointData = useCallback(
    (e: PointerEvent) => {
      const chartMaxYPx = chartInstance?.getHeight() - 57;

      const klineData = chartInstance
        ?.getOption()
        ?.series?.find((item: any) => {
          return item?.id === "kline data";
        });
      const maxXValue =
        klineData?.data?.[klineData?.data?.length - 1]?.[0] || 0;
      const maxXPx = chartInstance?.convertToPixel("xAxis", maxXValue) || 0;

      const hoverPointXPx = e.offsetX;
      const hoverPointYPx =
        e.offsetY < 23 ? 23 : e.offsetY > chartMaxYPx ? chartMaxYPx : e.offsetY;
      // 23: top margin
      // 57: bottom margin

      const hoverPointInGrid = chartInstance?.convertFromPixel("grid", [
        hoverPointXPx,
        hoverPointYPx,
      ]);

      return {
        chartMaxYPx,
        hoverPointXPx,
        hoverPointYPx,
        hoverPointXValue: hoverPointInGrid?.[0] || 0,
        hoverPointYValue: hoverPointInGrid?.[1] || 0,
        maxXValue,
        maxXPx,
      };
    },
    [chartInstance]
  );

  const getForbiddenMinMaxPricesData = useCallback(() => {
    const klineData = chartInstance?.getOption()?.series?.find((item: any) => {
      return item?.id === "kline data";
    });
    const fbMinMaxPricesArea = klineData?.markArea?.data;

    const fbMinPricesYValue = fbMinMaxPricesArea?.[0]?.[1]?.yAxis || 0;
    const fbMaxPricesYValue = fbMinMaxPricesArea?.[1]?.[0]?.yAxis || 0;
    const fbMinPricesYPx =
      chartInstance?.convertToPixel("yAxis", fbMinPricesYValue) || 0;
    const fbMaxPricesYPx =
      chartInstance?.convertToPixel("yAxis", fbMaxPricesYValue) || 0;

    return {
      fbMinPricesYValue,
      fbMaxPricesYValue,
      fbMinPricesYPx,
      fbMaxPricesYPx,
    };
  }, [chartInstance]);

  const getLineDataOption = useCallback(
    (endPointYValue: number) => {
      const klineDataSerie = chartInstance?.getOption()?.series?.[0];
      const { fbMinPricesYValue, fbMaxPricesYValue } =
        getForbiddenMinMaxPricesData();

      const isAvailability =
        endPointYValue >= fbMaxPricesYValue ||
        endPointYValue <= fbMinPricesYValue;

      const expiryLineTime = klineDataSerie?.markLine?.data?.find(
        (item: any) => {
          return item?.name === "expiry";
        }
      )?.xAxis;
      const expiryLineXValue = new Date(expiryLineTime)?.getTime();
      const expiryLineXPx =
        chartInstance?.convertToPixel("xAxis", expiryLineXValue) || 0;

      if (!isAvailability || expiryLineXPx > chartInstance?.getWidth()) {
        return {
          series: [{ id: "line data", data: [], markPoint: { data: [] } }],
        };
      }

      const lastKlineXValue =
        klineDataSerie?.data?.[klineDataSerie?.data?.length - 1]?.[0];
      const futuresPriceYValue = klineDataSerie?.markLine?.data?.find(
        (item: any) => {
          return item?.name === "futures price";
        }
      )?.yAxis;

      const yAxisMinMax = chartInstance
        ?.getModel()
        ?.getComponent("yAxis")
        ?.axis?.scale?.getExtent();

      const yAxisMin = yAxisMinMax?.[0];
      const yAxisMax = yAxisMinMax?.[1];

      const curvePointYValue = (yAxisMax - yAxisMin) / 50;
      const curvePointX1Value = (expiryLineXValue - lastKlineXValue) / 8;
      const curvePointX2Value = (expiryLineXValue - lastKlineXValue) / 2;

      const isAbove = endPointYValue >= futuresPriceYValue;

      const startColor = isAbove ? "#ccfffa" : "#ffcc00";
      const endColor = isAbove ? "#63e073" : "#e03f3f";

      const color = new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: startColor },
        { offset: 1, color: endColor },
      ]);

      return {
        yAxis: [
          { min: yAxisMin, max: yAxisMax },
          { min: yAxisMin, max: yAxisMax },
        ],
        series: [
          {
            id: "line data",
            color,
            data: [
              [lastKlineXValue, futuresPriceYValue],
              [
                lastKlineXValue + curvePointX1Value,
                isAbove
                  ? futuresPriceYValue + curvePointYValue
                  : futuresPriceYValue - curvePointYValue,
              ],
              [
                lastKlineXValue + curvePointX2Value,
                isAbove
                  ? futuresPriceYValue - curvePointYValue
                  : futuresPriceYValue + curvePointYValue,
              ],
              [expiryLineXValue, endPointYValue],
            ],
            markPoint: {
              data: [
                {
                  coord: [expiryLineXValue, endPointYValue],
                  symbolSize: 10,
                  itemStyle: {
                    color: isAbove ? "#63e073" : "#e03f3f",
                    opacity: 0.2,
                  },
                },
                {
                  coord: [expiryLineXValue, endPointYValue],
                  itemStyle: {
                    color: isAbove ? "#63e073" : "#e03f3f",
                  },
                },
              ],
            },
          },
        ],
      };
    },
    [chartInstance, getForbiddenMinMaxPricesData]
  );

  const toggleDirectCoord = useCallback(
    (show: boolean) => {
      if (!chartInstance) {
        return;
      }

      const chartOption: any = {};

      if (!show) {
        const klineData = chartInstance
          ?.getOption()
          ?.series?.find((item: any) => {
            return item?.id === "kline data";
          });

        const newMarkLines = (klineData?.markLine?.data || [])?.map(
          (line: any) => {
            if (line?.name === "horizontal hover") {
              return {
                ...line,
                yAxis: 0,
                lineStyle: {
                  ...(line?.lineStyle || {}),
                  width: 0,
                },
              };
            }

            if (line?.name === "vertical hover") {
              return {
                ...line,
                xAxis: 0,
                lineStyle: {
                  ...(line?.lineStyle || {}),
                  width: 0,
                },
              };
            }

            return line;
          }
        );

        const userMarkPoint = (klineData?.markPoint?.data || [])?.filter(
          (point: any) => {
            return point?.name !== "hover point";
          }
        );

        chartOption.series = [
          {
            id: "kline data",
            markLine: {
              data: newMarkLines,
            },
            markPoint: {
              data: userMarkPoint,
            },
          },
          {
            id: "kline data clone",
            markArea: {
              data: [],
            },
          },
          { id: "line data", data: [], markPoint: { data: [] } },
        ];
      }

      chartInstance.setOption(chartOption);
      setShowDirectCoord(show);
    },
    [chartInstance]
  );

  const getHoverPointStyle = useCallback(
    ({
      isAvailability,
      hoverPointYValue,
      fbMinPricesYValue,
    }: GetHoverStyleProps) => {
      return {
        color: isAvailability
          ? hoverPointYValue >= fbMinPricesYValue
            ? "#63e073"
            : "#e03f3f"
          : "#f0ebe5",
      };
    },
    []
  );

  const getHorizontalHoverLineStyle = useCallback(
    ({
      isAvailability,
      hoverPointYValue,
      fbMinPricesYValue,
    }: GetHoverStyleProps) => {
      return {
        width: isAvailability ? 1 : 0.5,
        type: isAvailability ? "solid" : "dashed",
        color: isAvailability
          ? hoverPointYValue >= fbMinPricesYValue
            ? "#63e073"
            : "#e03f3f"
          : "#808080",
      };
    },
    []
  );

  const getHoverAreaOption = ({
    chartInstance,
    isAvailability,
    hoverPointYPx,
    fbMinPricesYValue,
    fbMaxPricesYValue,
  }: {
    chartInstance: any;
    isAvailability: boolean;
    hoverPointYPx: number;
    fbMinPricesYValue: number;
    fbMaxPricesYValue: number;
  }) => {
    if (!isAvailability) {
      return [];
    }

    const hoverAreaTopYAxis = chartInstance?.convertFromPixel(
      { yAxisIndex: 0 },
      hoverPointYPx - 30
    );

    const hoverAreaBottomYAxis = chartInstance?.convertFromPixel(
      { yAxisIndex: 0 },
      hoverPointYPx + 30
    );

    const isInMaxPrice = hoverAreaTopYAxis >= fbMaxPricesYValue;

    return [
      [
        {
          yAxis:
            isInMaxPrice || hoverAreaTopYAxis < fbMinPricesYValue
              ? hoverAreaTopYAxis
              : fbMinPricesYValue,
          itemStyle: {
            color: isInMaxPrice ? "#4C5237" : "#664141",
            opacity: 0.9,
          },
        },
        {
          yAxis:
            !isInMaxPrice || hoverAreaBottomYAxis > fbMaxPricesYValue
              ? hoverAreaBottomYAxis
              : fbMaxPricesYValue,
        },
      ],
    ];
  };

  const updateHoverPosition = useCallback(
    throttle((e: PointerEvent) => {
      if (!chartInstance) {
        return;
      }

      let newOption: any = {};

      const {
        hoverPointXPx,
        hoverPointXValue,
        hoverPointYPx,
        hoverPointYValue,
        maxXValue,
        maxXPx,
        chartMaxYPx,
      } = getHoverPointData(e);

      if (hoverPointYValue) {
        setHoveredPrice(hoverPointYValue);
      }

      const klineData = chartInstance
        ?.getOption()
        ?.series?.find((item: any) => {
          return item?.id === "kline data";
        });

      const {
        fbMinPricesYValue,
        fbMaxPricesYValue,
        fbMinPricesYPx,
        fbMaxPricesYPx,
      } = getForbiddenMinMaxPricesData();

      const isAvailability =
        hoverPointYValue >= fbMaxPricesYValue ||
        hoverPointYValue <= fbMinPricesYValue;

      newOption = {
        ...getLineDataOption(hoverPointYValue),
      };

      const newMarkLines = (klineData?.markLine?.data || [])?.map(
        (line: any) => {
          if (line?.name === "horizontal hover") {
            return {
              ...line,
              yAxis: hoverPointYValue,
              lineStyle: {
                ...line?.lineStyle,
                ...getHorizontalHoverLineStyle({
                  isAvailability,
                  hoverPointYValue,
                  fbMinPricesYValue,
                }),
              },
            };
          }

          if (line?.name === "vertical hover") {
            return {
              ...line,
              xAxis:
                hoverPointXValue <= maxXValue ? hoverPointXValue : maxXValue,
              lineStyle: {
                ...line?.lineStyle,
                width: 0.5,
              },
            };
          }

          return line;
        }
      );

      const renderHoverPointInGrid = chartInstance?.convertFromPixel("grid", [
        hoverPointXPx + 0.5,
        hoverPointYPx + 0.5,
      ]);

      const currentMarkPoints = klineData?.markPoint?.data || [];

      const hoverPoint = currentMarkPoints?.find((item: any) => {
        return item?.name === "hover point";
      });

      if (!hoverPoint) {
        currentMarkPoints?.push({
          name: "hover point",
        });
      }

      const newMarkPoints =
        currentMarkPoints?.map((item: any) => {
          if (item?.name === "hover point") {
            return {
              name: "hover point",
              coord: [
                hoverPointXValue <= maxXValue
                  ? renderHoverPointInGrid?.[0]
                  : chartInstance?.convertFromPixel("xAxis", maxXPx + 0.5),
                renderHoverPointInGrid?.[1],
              ],
              itemStyle: {
                ...getHoverPointStyle({
                  isAvailability,
                  hoverPointYValue,
                  fbMinPricesYValue,
                }),
              },
            };
          }
          return item;
        }) || [];

      newOption.series = [
        ...newOption.series,
        {
          id: "kline data",
          markLine: {
            data: newMarkLines,
          },
          markPoint: {
            data: newMarkPoints,
          },
        },
      ];

      // if (isAvailability) {
      //   newOption.series = [
      //     ...newOption.series,
      //     {
      //       id: "kline data clone",
      //       markArea: {
      //         data: getHoverAreaOption({
      //           chartInstance,
      //           isAvailability,
      //           hoverPointYPx,
      //           fbMinPricesYValue,
      //           fbMaxPricesYValue,
      //         }),
      //       },
      //     },
      //   ];
      // } else {
      //   newOption.series = [
      //     ...newOption.series,
      //     {
      //       id: "kline data clone",
      //       markArea: {
      //         data: [],
      //       },
      //     },
      //   ];
      // }

      chartInstance.setOption(newOption);
      setDirectCoord({
        hoverPointXPx,
        hoverPointYPx,
        hoverPointXValue,
        hoverPointYValue,
        fbMinPricesYPx,
        fbMaxPricesYPx,
        chartMaxYPx,
        maxXValue,
        maxXPx,
      });

      if (isAvailability) {
        return {
          hoverPointXValue,
          hoverPointYValue,
        };
      }
    }, 100),
    [
      chartInstance,
      getHoverPointData,
      getForbiddenMinMaxPricesData,
      getLineDataOption,
      getHoverPointStyle,
      getHorizontalHoverLineStyle,
    ]
  );

  const getYAxisMinMaxByHoverPointYValue = (hoverPointYValue?: number) => {
    const yAxisMinMax = chartInstance
      ?.getModel()
      ?.getComponent("yAxis")
      ?.axis?.scale?.getExtent();

    const yAxisMax = yAxisMinMax?.[1]
      ? hoverPointYValue && hoverPointYValue > yAxisMinMax?.[1]
        ? Math.ceil(hoverPointYValue + 500)
        : yAxisMinMax?.[1]
      : null;

    const yAxisMin = yAxisMinMax?.[0]
      ? hoverPointYValue && hoverPointYValue < yAxisMinMax?.[0]
        ? Math.floor(hoverPointYValue - 500)
        : yAxisMinMax?.[0]
      : null;

    return {
      yAxisMax,
      yAxisMin,
    };
  };

  const backToDefault = () => {
    if (!chartInstance || chartInterval !== "15m") return;

    toggleDirectCoord(true);

    const klineData = chartInstance?.getOption()?.series?.find((item: any) => {
      return item?.id === "kline data";
    });

    // Get hover hover XAxis value before zoom to defautl
    const prevHoverPointXValue = klineData?.markLine?.data?.find(
      (item: any) => {
        return item?.name === "vertical hover";
      }
    )?.xAxis;

    // Zoom to default
    chartInstance.dispatchAction({
      type: "dataZoom",
      startValue: dataZoomDefault?.start,
      endValue: dataZoomDefault?.end,
    });

    const hoverPointYValue = copedStrikePrice || directCoord?.hoverPointYValue;

    const { yAxisMax, yAxisMin } =
      getYAxisMinMaxByHoverPointYValue(hoverPointYValue);

    // Reset min of yAxis if hoverPointYValue < current min of yAxis
    // Reset maxn of yAxis if hoverPointYValue > current min of yAxis
    chartInstance?.setOption({
      yAxis: [
        { min: yAxisMin, max: yAxisMax },
        { min: yAxisMin, max: yAxisMax },
      ],
    });

    const currentHoverPointYValue =
      copedStrikePrice ||
      klineData?.markLine?.data?.find((item: any) => {
        return item?.name === "horizontal hover";
      })?.yAxis;

    const lineDataOption = getLineDataOption(currentHoverPointYValue);

    const newOption: any = {
      series: [...(lineDataOption?.series || {})],
    };

    const { fbMinPricesYValue, fbMaxPricesYValue } =
      getForbiddenMinMaxPricesData();

    const isAvailability =
      (copedStrikePrice || currentHoverPointYValue) >= fbMaxPricesYValue ||
      (copedStrikePrice || currentHoverPointYValue) <= fbMinPricesYValue;

    if (copedStrikePrice || typeof prevHoverPointXValue === "number") {
      const prevHoverXPx =
        chartInstance?.convertToPixel("xAxis", prevHoverPointXValue) || 0;

      if (copedStrikePrice || (prevHoverXPx && prevHoverXPx < 0)) {
        const lastKlineXValue =
          klineData?.data?.[klineData?.data?.length - 1]?.[0];

        let verticalHoverLineStyle = {};
        let horizontalHoverLineStyle = {};
        let hoverPointStyle = {};

        if (copedStrikePrice) {
          verticalHoverLineStyle = {
            width: 0.5,
          };

          horizontalHoverLineStyle = getHorizontalHoverLineStyle({
            isAvailability,
            hoverPointYValue: copedStrikePrice,
            fbMinPricesYValue,
          });

          hoverPointStyle = getHoverPointStyle({
            isAvailability,
            hoverPointYValue: copedStrikePrice,
            fbMinPricesYValue,
          });
        }

        const newMarkLines =
          (klineData?.markLine?.data || [])?.map((line: any) => {
            if (line?.name === "horizontal hover") {
              return {
                ...line,
                yAxis: copedStrikePrice || line?.yAxis,
                lineStyle: {
                  ...line?.lineStyle,
                  ...horizontalHoverLineStyle,
                },
              };
            }

            if (line?.name === "vertical hover") {
              return {
                ...line,
                xAxis: lastKlineXValue,
                lineStyle: {
                  ...line?.lineStyle,
                  ...verticalHoverLineStyle,
                },
              };
            }

            return line;
          }) || [];

        const currentMarkPoints = klineData?.markPoint?.data || [];

        const hoverPoint = currentMarkPoints?.find((item: any) => {
          return item?.name === "hover point";
        });

        if (!hoverPoint) {
          currentMarkPoints?.push({
            name: "hover point",
          });
        }

        const newMarkPoints =
          currentMarkPoints?.map((item: any) => {
            if (item?.name === "hover point") {
              return {
                ...item,
                coord: [lastKlineXValue, copedStrikePrice || item?.coord?.[1]],
                itemStyle: {
                  ...item?.itemStyle,
                  ...hoverPointStyle,
                },
              };
            }
            return item;
          }) || [];

        newOption.series = [
          ...newOption.series,
          {
            id: "kline data",
            markLine: {
              data: newMarkLines,
            },
            markPoint: {
              data: newMarkPoints,
            },
          },
        ];
      }
    }

    // newOption.series = [
    //   ...newOption.series,
    //   {
    //     id: "kline data clone",
    //     markArea: {
    //       data: getHoverAreaOption({
    //         chartInstance,
    //         isAvailability,
    //         hoverPointYPx,
    //         fbMinPricesYValue,
    //         fbMaxPricesYValue,
    //       }),
    //     },
    //   },
    // ];

    chartInstance?.setOption(newOption);

    const newKlineData = chartInstance
      ?.getOption()
      ?.series?.find((item: any) => {
        return item?.id === "kline data";
      });

    const newHoverPointYValue = newKlineData?.markLine?.data?.find(
      (item: any) => {
        return item?.name === "horizontal hover";
      }
    )?.yAxis;

    const newHoverPointXValue = newKlineData?.markLine?.data?.find(
      (item: any) => {
        return item?.name === "vertical hover";
      }
    )?.xAxis;

    setDirectCoord((prevData: any) => {
      return {
        ...prevData,
        hoverPointXPx:
          chartInstance?.convertToPixel("xAxis", newHoverPointXValue) || 0,
        hoverPointYPx:
          chartInstance?.convertToPixel("yAxis", newHoverPointYValue) || 0,
        hoverPointXValue: newHoverPointXValue,
        hoverPointYValue: newHoverPointYValue,
      };
    });

    setShouldBackToDefault(false);
    setCopedStrikePrice(0);
  };

  const updateYAxisMinMax = (isZoomIn: boolean) => {
    const zoomRatioComparedTo15Min = 15 / Number(chartInterval.split("m")[0]);

    const yAxisMinMax = {
      min: function (value: any) {
        const { adjustedMin } = calculateSymmetricalMinMax(
          value,
          forbiddenMinMaxPrices,
          isZoomIn,
          zoomRatioComparedTo15Min
        );

        return adjustedMin;
      },
      max: function (value: any) {
        const { adjustedMax } = calculateSymmetricalMinMax(
          value,
          forbiddenMinMaxPrices,
          isZoomIn,
          zoomRatioComparedTo15Min
        );

        return adjustedMax;
      },
    };

    chartInstance?.setOption({
      yAxis: [yAxisMinMax, yAxisMinMax],
    });
  };

  const handleClick = (e: PointerEvent) => {
    if (!chartInstance) {
      return;
    }

    if (e.offsetY > chartInstance?.getHeight() - 48) {
      return;
    }

    if (mouseupTimeout.current) {
      clearTimeout(mouseupTimeout.current);
    }

    if (!showDirectCoord) {
      const data = updateHoverPosition(e);

      if (data?.hoverPointYValue) {
        setEstimatedPrice(data?.hoverPointYValue);
      }
    }

    toggleDirectCoord(!showDirectCoord);
  };

  const handleMousemove = useCallback(
    (e: PointerEvent) => {
      if (!chartInstance) {
        return;
      }

      if (e.offsetY > chartInstance?.getHeight() - 48) {
        return;
      }

      setIsHovering(true);

      updateHoverPosition(e);
    },
    [chartInstance, updateHoverPosition]
  );

  const handleMouseup = (e: PointerEvent) => {
    setIsHovering(false);

    if (e.offsetY > chartInstance?.getHeight() - 48) {
      return;
    }

    mouseupTimeout.current = setTimeout(() => {
      if (!showDirectCoord) {
        return;
      }

      const data = updateHoverPosition(e);

      if (data?.hoverPointYValue) {
        setEstimatedPrice(data?.hoverPointYValue);
      }
    }, 50);
  };

  const handleDataZoom = useCallback(
    throttle((event: any) => {
      if (!chartInstance) {
        return;
      }

      if (event) {
        const { start } = event;

        if (start === 0 && chartInterval === "1m") setNeedToFetch(true);
      }

      if (!showDirectCoord) {
        return;
      }

      const chartSeries = chartInstance?.getOption()?.series || [];

      const expiryLineTime = chartInstance
        ?.getOption()
        ?.series?.find((item: any) => {
          return item?.id === "kline data";
        })
        ?.markLine?.data?.find((item: any) => {
          return item?.name === "expiry";
        })?.xAxis;
      const expiryLineXValue = new Date(expiryLineTime)?.getTime();
      const expiryLineXPx =
        chartInstance?.convertToPixel("xAxis", expiryLineXValue) || 0;

      const lineData = chartSeries?.find((item: any) => {
        return item?.id === "line data";
      })?.data;

      const klineSeries = chartSeries?.find((item: any) => {
        return item?.id === "kline data";
      });

      const hoverPointXValue = klineSeries?.markLine?.data?.find(
        (item: any) => {
          return item?.name === "vertical hover";
        }
      )?.xAxis;

      const hoverPointYValue = klineSeries?.markLine?.data?.find(
        (item: any) => {
          return item?.name === "horizontal hover";
        }
      )?.yAxis;

      const hoverPointPx = chartInstance?.convertToPixel({ seriesIndex: 0 }, [
        hoverPointXValue,
        hoverPointYValue,
      ]);

      const maxXValue =
        klineSeries?.data?.[klineSeries?.data?.length - 1]?.[0] || 0;
      const maxXPx = chartInstance?.convertToPixel("xAxis", maxXValue) || 0;

      setDirectCoord((prevData: any) => {
        return {
          ...prevData,
          hoverPointXPx: hoverPointPx?.[0] || 0,
          hoverPointYPx: hoverPointPx?.[1] || 0,
          maxXPx,
        };
      });

      if (expiryLineXPx > chartInstance?.getWidth() && lineData?.length) {
        chartInstance?.setOption({
          series: [
            {
              id: "line data",
              data: [],
            },
          ],
        });

        return;
      }

      if (expiryLineXPx <= chartInstance?.getWidth() && !lineData?.length) {
        const lineDataOption = getLineDataOption(hoverPointYValue);

        chartInstance?.setOption({
          series: lineDataOption?.series || [],
        });
      }
    }, 300),
    [chartInstance, showDirectCoord, chartInterval]
  );

  const handleZoomYAxis = () => {
    setIsZoomIn(!isZoomIn);

    updateYAxisMinMax(!isZoomIn);

    handleOverlayPositionUpdate();

    const { yAxisMax, yAxisMin } = getYAxisMinMaxByHoverPointYValue(
      directCoord?.hoverPointYValue
    );

    // Reset min of yAxis if hoverPointYValue < current min of yAxis
    // Reset maxn of yAxis if hoverPointYValue > current min of yAxis
    chartInstance?.setOption({
      yAxis: [
        { min: yAxisMin, max: yAxisMax },
        { min: yAxisMin, max: yAxisMax },
      ],
    });

    const hoverPointYValue = chartInstance
      ?.getOption()
      ?.series?.find((item: any) => {
        return item?.id === "kline data";
      })
      ?.markLine?.data?.find((item: any) => {
        return item?.name === "horizontal hover";
      })?.yAxis;

    const hoverPointYPx =
      chartInstance?.convertToPixel("yAxis", hoverPointYValue) || 0;

    setDirectCoord((prevData: any) => {
      return {
        ...prevData,
        hoverPointYPx,
      };
    });
  };

  const isHideFuturesIndex = useMemo(() => {
    if (!chartInstance) {
      return true;
    }

    return (
      futuresIndexYAxis < 24 ||
      futuresIndexYAxis > chartInstance?.getHeight() - 58
    );
  }, [chartInstance, futuresIndexYAxis]);

  // Initialize
  useEffect(() => {
    if (echartsRef.current) {
      const chartInstance = echartsRef.current?.getEchartsInstance();
      setChartInstance(chartInstance);

      updateXAxisMax(chartInstance);

      chartInstance?.dispatchAction({
        type: "dataZoom",
        start: dataZoomInitialStart,
        end: dataZoomInitialEnd,
      });

      setNeedToFetch(true);
    }
  }, []);

  // Update futures index
  useEffect(() => {
    if (!futuresAssetIndexMap) return;
    setFuturesIndex(futuresAssetIndexMap?.[underlyingAsset]);
  }, [futuresAssetIndexMap]);

  // Control forbidden area
  useEffect(() => {
    if (!chartInstance) return;

    const forbiddenData = [
      // Red area
      [
        {
          yAxis: 0,
          itemStyle: {
            color: "#664141",
            opacity: 0.5,
          }, // 아래 영역 색상
        },
        {
          yAxis: forbiddenMinMaxPrices?.[0] || 0,
        },
      ],
      // Green area
      [
        {
          yAxis: forbiddenMinMaxPrices?.[1] || 999999,
        },
        {
          yAxis: 999999,
          itemStyle: {
            color: "#4C5237",
            opacity: 0.5,
          },
        },
      ],
    ];

    chartInstance.setOption({
      series: [
        {
          id: "kline data",
          markArea: {
            data: forbiddenData,
          },
        },
      ],
    });
  }, [chartInstance, forbiddenMinMaxPrices]);

  // Control futures price markLine
  useEffect(() => {
    if (!chartInstance) return;

    let markLineData = chartInstance?.getOption()?.series?.[0]?.markLine?.data;
    if (!markLineData) return;
    markLineData = markLineData?.map((item: any) => {
      if (item?.name === "futures price") {
        item.yAxis = futuresIndex;
      }

      return item;
    });

    chartInstance?.setOption({
      series: [
        {
          id: "kline data",
          markLine: {
            animation: false,
            data: markLineData,
          },
        },
      ],
    });

    return () => {
      setLastFuturesIndex(futuresIndex);
    };
  }, [chartInstance, futuresIndex]);

  // Control dataZoom events
  useEffect(() => {
    if (!chartInstance) return;

    chartInstance.on("dataZoom", handleDataZoom);

    return () => {
      chartInstance?.off("dataZoom", handleDataZoom);
    };
  }, [chartInstance, handleDataZoom]);

  // Fetch history klines data
  useEffect(() => {
    if (needToFetch) {
      fetchKlinesData(false);
    }
  }, [needToFetch]);

  //  Update xAxis max when chartInterval changes
  useEffect(() => {
    if (lastChartInterval !== chartInterval) {
      fetchKlinesData(true);
      if (!chartInstance) {
        return;
      }

      updateXAxisMax(chartInstance);
    }
    toggleDirectCoord(false);
    setEstimatedPrice(0);
    setSelectedLeadTrader(null);
    setLastChartInterval(chartInterval);
    setStartTime(0);
    setFirstTimeShow1mChart(false);
  }, [chartInterval]);

  // Fetch recent kline data
  useEffect(() => {
    if (!klineData || klineData?.length === 0) return;
    if (!webSocketKlinesData[symbol]) return;

    const lastKlineData = klineData[klineData.length - 1];
    const currentKlineData = webSocketKlinesData?.[symbol];

    if (lastKlineData?.[0] === currentKlineData?.[0]) {
      const newKlineData = [...klineData];
      newKlineData[newKlineData.length - 1] = [
        currentKlineData[0],
        currentKlineData[1],
        currentKlineData[4],
        currentKlineData[3],
        currentKlineData[2],
      ];
      setKlineData(newKlineData);
    } else if (lastKlineData?.[0] < currentKlineData?.[0]) {
      const newKlineData = [...klineData];
      newKlineData.push([
        currentKlineData[0],
        currentKlineData[1],
        currentKlineData[4],
        currentKlineData[3],
        currentKlineData[2],
      ]);
      setKlineData(newKlineData);
    }
  }, [webSocketKlinesData]);

  // Update chart data when kline data changes
  useEffect(() => {
    if (!chartInstance) return;

    const currentOption = chartInstance?.getOption();
    const currentOptionData = currentOption?.series?.[0]?.data;

    if (
      currentOptionData?.length === 0 ||
      Math.abs(currentOptionData?.length - klineData?.length) <= 2
    ) {
      chartInstance?.setOption({
        series: [
          {
            id: "kline data",
            data: klineData,
          },
          {
            id: "kline data clone",
            data: klineData,
          },
        ],
      });

      const dataZoom = chartInstance?.getOption()?.dataZoom?.[0];

      if (!dataZoomDefault) {
        setDataZoomDefault({
          start: dataZoom?.startValue,
          end: dataZoom?.endValue,
        });
      }

      return;
    }

    const currentZoomEnd = currentOption?.dataZoom?.[0]?.end;
    const nextStart =
      ((currentOptionData?.[0]?.[0] - klineData?.[0]?.[0]) /
        (currentOption?.xAxis?.[0]?.max - klineData?.[0]?.[0])) *
      100;
    const nextEnd =
      ((currentZoomEnd *
        (currentOption?.xAxis?.[0]?.max - currentOptionData?.[0]?.[0])) /
        (currentOption?.xAxis?.[0]?.max - klineData?.[0]?.[0]) /
        100 +
        (currentOptionData?.[0]?.[0] - klineData?.[0]?.[0]) /
          (currentOption?.xAxis?.[0]?.max - klineData?.[0]?.[0])) *
      100;

    if (chartInterval === "1m") {
      setFirstTimeShow1mChart(true);
    }

    chartInstance?.setOption({
      series: [
        {
          id: "kline data",
          data: klineData,
        },
        {
          id: "kline data clone",
          data: klineData,
        },
      ],
      dataZoom: [
        {
          start:
            !firstTimeShow1mChart || chartInterval !== "1m"
              ? dataZoomInitialStart
              : nextStart,
          end:
            !firstTimeShow1mChart || chartInterval !== "1m"
              ? dataZoomInitialEnd
              : nextEnd,
        },
      ],
    });
  }, [klineData]);

  // Update settle prices timestamp
  useEffect(() => {
    const settlePricesDataLen = Object.keys(settlePricesData)?.length;
    const SettlePricesLastTimestamp =
      Object.keys(settlePricesData)?.[settlePricesDataLen - 1];

    const currentSettlePriceLastTimestamp =
      Object.keys(settlePrices)?.[settlePricesDataLen - 1];
    if (SettlePricesLastTimestamp === currentSettlePriceLastTimestamp) return;

    const processSettlePrices = Object.keys(settlePricesData)?.reduce(
      (acc, timestamp, index) => {
        if (index < settlePricesDataLen - 5) return acc;
        return {
          ...acc,
          [timestamp]: settlePricesData?.[timestamp],
        };
      },
      {} as SettlePriceData
    );

    setSettlePrices(processSettlePrices);
  }, [settlePricesData]);

  // Control settle price + expiry markLines
  useEffect(() => {
    if (!chartInstance) return;

    const lineLabel = {
      show: true,
      distance: 8,
      align: "center",
      fontSize: 10,
      lineHeight: 12,
      fontWeight: 600,
      color: "#E0E0E0",
      backgroundColor: "transparent",
    };

    const newSettlePriceMarkLines = Object.keys(settlePrices)?.map(
      (timestamp, index) => {
        return {
          name: `settle price ${index}`,
          xAxis: new Date(Number(timestamp) * 1000),
          lineStyle: {
            color: "#9D9B98",
            type: "solid",
          },
          label: {
            formatter: `Settled: ${advancedFormatNumber(
              settlePrices?.[Number(timestamp)]?.[underlyingAsset],
              0,
              ""
            )}`,
            ...lineLabel,
          },
        };
      }
    );

    const newExpiryMarkLine = [
      {
        name: "expiry",
        xAxis: new Date(Number(expiry) * 1000),
        lineStyle: {
          color: "#9D9B98",
          type: "dashed",
        },
        label: {
          formatter: "Expiry",
          ...lineLabel,
        },
      },
    ];

    const existingMarkLines =
      chartInstance
        ?.getOption()
        ?.series?.[0]?.markLine?.data?.filter(
          (item: any) =>
            item?.name?.includes("settle price") === false &&
            item?.name?.includes("expiry") === false
        ) || [];

    chartInstance?.setOption({
      series: [
        {
          id: "kline data",
          markLine: {
            data: [
              ...newSettlePriceMarkLines,
              ...newExpiryMarkLine,
              ...existingMarkLines,
            ],
          },
        },
      ],
    });
  }, [chartInstance, settlePrices, expiry, chartInterval]);

  // Update yAxis min - max
  useEffect(() => {
    if (!chartInstance || showDirectCoord) return;

    updateYAxisMinMax(isZoomIn);
  }, [
    chartInstance,
    forbiddenMinMaxPrices,
    isZoomIn,
    futuresIndex,
    chartInterval,
    showDirectCoord,
  ]);

  // Toggle animation
  useEffect(() => {
    if (futuresIndex === lastFuturesIndex) {
      setFuturesIndexAnimation("");
    } else if (futuresIndex > lastFuturesIndex) {
      setFuturesIndexAnimation("up-blink");
    } else {
      setFuturesIndexAnimation("down-blink");
    }

    const resetAnimation = setTimeout(() => {
      setFuturesIndexAnimation("");
    }, 1000);

    return () => clearTimeout(resetAnimation);
  }, [futuresIndex, lastFuturesIndex]);

  // Add chart events and add markPoint - done
  useEffect(() => {
    if (!chartInstance) return;

    const hoverPoint =
      chartInstance
        ?.getOption()
        ?.series?.find((item: any) => {
          return item?.id === "kline data";
        })
        ?.markPoint?.data?.filter((item: any) => {
          return item?.name === "hover point";
        }) || [];

    chartInstance?.setOption({
      series: [
        {
          markPoint: {
            data: [
              ...hoverPoint,
              ...getMarkPointData(leadTraders, underlyingAsset),
            ],
            tooltip: {
              formatter: function (param: any) {
                return param?.name || "" + "<br>" + (param?.data?.coord || "");
              },
            },
          },
        },
      ],
    });
  }, [chartInstance, leadTraders]);

  useEffect(() => {
    if (!chartInstance) return;

    chartInstance.on("dataZoom", handleOverlayPositionUpdate); // Update on zoom
    handleOverlayPositionUpdate(); // Initial call to set position

    return () => {
      chartInstance.off("dataZoom", handleOverlayPositionUpdate);
    };
  }, [chartInstance, handleOverlayPositionUpdate]);

  // Add click event
  useEffect(() => {
    if (!chartInstance) {
      return;
    }

    chartInstance?.getZr()?.on("click", handleClick);

    return () => {
      chartInstance?.getZr()?.off("click", handleClick);
    };
  }, [chartInstance, showDirectCoord]);

  // Add mousemove event
  useEffect(() => {
    if (!chartInstance || !showDirectCoord) {
      return;
    }

    chartInstance?.getZr()?.on("mousemove", handleMousemove);

    return () => {
      chartInstance?.getZr()?.off("mousemove", handleMousemove);
    };
  }, [chartInstance, showDirectCoord, handleMousemove]);

  // Add mouseup event
  useEffect(() => {
    if (!chartInstance) {
      return;
    }

    chartInstance?.getZr()?.on("mouseup", handleMouseup);

    return () => {
      chartInstance?.getZr()?.off("mouseup", handleMouseup);
    };
  }, [chartInstance, showDirectCoord]);

  useEffect(() => {
    if (
      !isSelectedZeroDteModalOpen &&
      !selectedLeadTrader &&
      shouldBackToDefault
    ) {
      backToDefault();
    }
  }, [isSelectedZeroDteModalOpen, selectedLeadTrader, shouldBackToDefault]);

  return (
    <div className="relative w-full h-full flex flex-col gap-y-3">
      {/* Loading */}
      {(expiry === 0 || Date.now() / 1000 >= expiry) && (
        <div
          className={twJoin(
            "absolute -top-3 left-0 right-0 -bottom-3 z-10",
            "flex justify-center items-center",
            "bg-[rgba(26,26,26,0.85)] backdrop-blur-[2px]"
          )}
        >
          <img
            className="animate-spinReverse"
            width={32}
            height={32}
            src={iconLoaderChart}
          />
        </div>
      )}
      <div
        className={twJoin(
          "flex justify-between items-center gap-3",
          "px-3 md:px-6"
        )}
      >
        <IntervalSelector
          interval={chartInterval}
          setChartInterval={setChartInterval}
        />
        <div className="flex items-center gap-x-3">
          <div
            className={twJoin(
              "w-6 h-6 border-[1px] rounded cursor-pointer",
              "flex-shrink-0 flex justify-center items-center",
              "border-gray5C bg-black17"
            )}
            onClick={handleZoomYAxis}
          >
            {isZoomIn ? (
              <img width={18} height={18} src={IconChartZoomIn} />
            ) : (
              <img width={16} height={16} src={IconChartZoomOut} />
            )}
          </div>
          <div
            className={twJoin(
              "w-6 h-6 border-[1px] rounded cursor-pointer",
              "flex-shrink-0 flex justify-center items-center",
              "border-gray5C bg-black17"
            )}
            onClick={() => {
              openModal(<SocialTradingTips />, {
                contentClassName: "flex flex-col min-h-[150px]",
              });
            }}
          >
            <img src={iconGuideMobile} alt="Guide Icon" className="w-3" />
          </div>
        </div>
      </div>
      <div className="relative flex-1 touch-none">
        <ReactECharts
          ref={echartsRef}
          option={option}
          className="w-full !h-full"
        />

        {/* Add the overlay div */}
        <SocialTradingChipList
          leadTraders={leadTraders}
          underlyingAsset={underlyingAsset}
          getOverlayPosition={getOverlayPosition}
          setCopedStrikePrice={setCopedStrikePrice}
          setEstimatedPrice={setEstimatedPrice}
          setSelectedLeadTrader={setSelectedLeadTrader}
          toggleDirectCoord={toggleDirectCoord}
        />

        {/* New elements replace markline for future price and its label*/}
        <div
          style={{
            top: `${futuresIndexYAxis}px`,
          }}
          className={twJoin(
            "absolute left-0 top-1/2 z-[1] -translate-y-1/2",
            "w-full pl-[1px] pr-3 flex items-center",
            "pointer-events-none",
            isHideFuturesIndex ? "hidden" : ""
          )}
        >
          {/* Horizontal line across the chart*/}
          <div
            className={twJoin(
              "flex-1",
              "border-b-[1px] border-dashed border-gray80 !bg-transparent",
              `border-${futuresIndexAnimation}`
            )}
          />
          {/* Label next to the horizontal line */}
          <div
            className={twJoin(
              "text-[10px] md:text-[12px] leading-[15px] font-semibold",
              "py-[2px] px-1 rounded-[3px]",
              "text-black12 bg-gray80",
              futuresIndexAnimation
            )}
          >
            {advancedFormatNumber(futuresIndex, 2, "")}
          </div>
        </div>

        {/* Direct coord */}
        {showDirectCoord && (
          <>
            {/* Price Bubble */}
            <div
              style={{
                left: `${directCoord?.hoverPointXPx}px`,
                top: `${directCoord?.hoverPointYPx}px`,
              }}
              className={twJoin(
                "absolute",
                "py-[2px] px-1 rounded-[3px]",
                "text-[14px] leading-[21px] font-semibold text-black12",
                "pointer-events-none",
                directCoord?.hoverPointYValue &&
                  (directCoord?.hoverPointYValue >=
                    forbiddenMinMaxPrices?.[1] ||
                    directCoord?.hoverPointYValue <= forbiddenMinMaxPrices?.[0])
                  ? "block"
                  : "hidden",
                directCoord?.hoverPointXPx &&
                  directCoord?.hoverPointXPx > (isHovering ? 160 : 90)
                  ? isHovering
                    ? "-translate-x-[calc(100%+76px)]"
                    : "-translate-x-[calc(100%+6px)]"
                  : isHovering
                  ? "translate-x-[76px]"
                  : "translate-x-[6px]",
                directCoord?.hoverPointYPx &&
                  directCoord?.hoverPointYPx > 60 &&
                  (directCoord?.hoverPointYPx - 32 >
                    directCoord?.fbMinPricesYPx ||
                    directCoord?.hoverPointYPx + 32 >
                      directCoord?.chartMaxYPx ||
                    directCoord?.hoverPointYPx < directCoord?.fbMaxPricesYPx)
                  ? "-translate-y-[calc(100%+6px)]"
                  : "translate-y-[6px]",
                directCoord?.hoverPointYValue &&
                  directCoord?.hoverPointYValue >= forbiddenMinMaxPrices?.[1]
                  ? "bg-green63"
                  : directCoord?.hoverPointYValue &&
                    directCoord?.hoverPointYValue <= forbiddenMinMaxPrices?.[0]
                  ? "bg-[#e03f3f]"
                  : ""
              )}
            >
              {advancedFormatNumber(directCoord?.hoverPointYValue || 0, 2, "")}
            </div>

            {/* Date */}
            {formatDateLabel(directCoord?.hoverPointXValue) && (
              <div className={twJoin("absolute bottom-[36px] w-full", "flex")}>
                <div
                  style={{
                    width:
                      directCoord?.hoverPointXPx &&
                      directCoord?.hoverPointXPx > 48
                        ? `${directCoord?.hoverPointXPx - 48}px`
                        : 0,
                    maxWidth: directCoord?.maxXPx
                      ? `${directCoord?.maxXPx - 48}px`
                      : "",
                  }}
                />
                <div
                  style={{
                    transform:
                      directCoord?.hoverPointXPx &&
                      directCoord?.hoverPointXPx < 0
                        ? `translateX(${directCoord?.hoverPointXPx}px)`
                        : directCoord?.hoverPointXPx &&
                          directCoord?.hoverPointXPx > window.innerWidth
                        ? `translateX(${
                            directCoord?.hoverPointXPx - window.innerWidth
                          }px)`
                        : "",
                  }}
                  className={twJoin(
                    "py-[2px] px-1 rounded-[3px] flex-shrink-0",
                    "text-[10px] leading-[15px] font-semibold",
                    "text-black12 bg-gray80"
                  )}
                >
                  {formatDateLabel(
                    (directCoord?.hoverPointXValue || 0) <=
                      (directCoord?.maxXValue || 0)
                      ? directCoord?.hoverPointXValue
                      : directCoord?.maxXValue
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MainChart;
