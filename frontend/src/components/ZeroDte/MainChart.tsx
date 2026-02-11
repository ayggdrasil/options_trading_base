import React, { Dispatch, useEffect, SetStateAction, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { KLINE_API } from "@/utils/apis";
import { useAppSelector } from "@/store/hooks";
import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import IconMoveToEnd from "@/assets/icon-move-to-end.svg";
import IconMoveToEndHovered from "@/assets/icon-move-to-end-hovered.svg";
import IconChartZoomOut from "@/assets/icon-chart-zoom-in.svg";
import IconChartZoomOutHover from "@/assets/icon-chart-zoom-in-hover.svg";
import IconChartZoomIn from "@/assets/icon-chart-zoom-out.svg";
import IconChartZoomInHover from "@/assets/icon-chart-zoom-out-hover.svg";
import { ILeadTrader, ILeadTraders } from "@/interfaces/interfaces.marketSlice.ts";
import SocialTradingChip from "@/components/ZeroDte/SocialTradingChip.tsx";
import { BigNumber } from "bignumber.js";
import IntervalSelector from "./IntervalSelector";
import { Subject } from "rxjs";
import { FuturesAssetIndexMap, UnderlyingAsset } from "@callput/shared";

interface MainChartProps {
  underlyingAsset: UnderlyingAsset;
  expiry: number;
  forbiddenMinMaxPrices: number[];
  setHoveredPrice: (value: number) => void;
  estimatedPrice: number;
  setEstimatedPrice: Dispatch<SetStateAction<number>>;
  setClientXY: (value: [number, number]) => void;
  setSelectedLeadTrader: (value: ILeadTrader | null) => void;
  clientXY: [number, number];
  setModalXY: (value: [number, number]) => void;
  chartMouseOut$: Subject<boolean>;
}

interface SettlePriceData {
  [timestamp: number]: {
    [asset: string]: number;
  };
}

const calculateYAxisMinMax = (data: any) => {
  let min = Infinity;
  let max = -Infinity;

  data.forEach((candle: any) => {
    const low = candle[3]; // Assuming the low price is at index 3
    const high = candle[4]; // Assuming the high price is at index 4
    if (low < min) min = low;
    if (high > max) max = high;
  });

  return { min, max };
};

const calculateSymmetricalMinMax = (value: any, forbiddenMinMax: any, isZoomIn: boolean) => {
  const zoomValue = isZoomIn ? 0.001 : 0.01;
  const zoomValueMin = 1 - zoomValue;
  const zoomValueMax = 1 + zoomValue;

  const adjustedMin = Math.floor(
    forbiddenMinMax[0] === 0
      ? value.min * zoomValueMin
      : Math.min(value.min * zoomValueMin, forbiddenMinMax[0] * zoomValueMin)
  );

  const adjustedMax = Math.ceil(
    forbiddenMinMax[1] === 999999
      ? value.max * zoomValueMax
      : Math.max(value.max * zoomValueMax, forbiddenMinMax[1] * zoomValueMax)
  );

  return { adjustedMin, adjustedMax };
};

const option = {
  textStyle: {
    fontFamily: "graphie",
  },
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "cross",
      link: [{ xAxisIndex: "all" }, { yAxisIndex: "all" }],
    },
    showContent: false,
  },
  grid: {
    left: "0%",
    right: "2%",
    top: "10%",
    bottom: "0%",
    containLabel: true,
  },
  xAxis: {
    type: "time",
    boundaryGap: false,
    axisLine: { onZero: false },
    splitLine: {
      // Grid line
      show: true,
      lineStyle: {
        color: "#333331",
      },
    },
    axisPointer: {
      type: "line", // Pointer type for x-axis
      lineStyle: {
        color: "#808080",
        type: "dotted",
      },
      label: {
        backgroundColor: "#4D4D4D",
        color: "#000000",
        padding: [4, 6],
        distance: 0,
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 0,
        formatter: (params: any) => {
          if (!params.value) return "";

          const date = new Date(params.value);

          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");

          return `${year}-${month}-${day} ${hours}:${minutes}`;
        },
      },
    },
    min: "dataMin",
  },
  yAxis: {
    type: "value",
    triggerEvent: true,
    scale: true,
    position: "right",
    splitLine: {
      show: true,
      lineStyle: {
        color: "#333331", // Grid line color
      },
    },
    axisPointer: {
      type: "line", // Pointer type for y-axis
      lineStyle: {
        type: "solid",
      },
      label: {
        show: true,
        color: "#121212",
        fontSize: 11,
        padding: [4, 6],
        borderRadius: 3,
        fontWeight: 600,
      },
    },
  },
  dataZoom: [
    {
      type: "inside",
      throttle: 80,
      // zoomLock: true,
    },
  ],
  series: [
    {
      type: "candlestick",
      data: [],
      barWidth: "40%",
      // barMaxWidth: 5,
      itemStyle: {
        color: "#63E073", // Rising candle color
        color0: "#E03F3F", // Falling candle color
        borderColor: "#63E073", // Rising candle border color
        borderColor0: "#E03F3F", // Falling candle border color
      },
      markArea: {
        data: [],
      },
      markLine: {
        animation: false,
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
            name: "estimated price stroke",
            yAxis: 0,
            lineStyle: {
              color: "transparent",
              type: "solid",
              width: 5,
              borderRadius: 3,
            },
            label: {
              show: false,
            },
          },
          {
            name: "estimated price",
            yAxis: 0,
            lineStyle: {
              color: "transparent",
              type: "solid",
              width: 1,
            },
            label: {
              show: true,
              formatter: "0",
              backgroundColor: "transparent",
              color: "#121212",
              padding: [4, 6],
              distance: 0,
              fontFamily: "graphie",
              fontSize: 11,
              fontWeight: 600,
              borderWidth: 2,
              borderColor: "transparent",
              borderRadius: 3,
            },
          },
        ],
      },
    },
  ],
};

type OverlayPosition = {
  id: string;
  top: string;
  left: string;
  shouldShow: boolean;
};
const MainChart: React.FC<MainChartProps> = ({
  underlyingAsset,
  expiry,
  forbiddenMinMaxPrices,
  setHoveredPrice,
  estimatedPrice,
  setEstimatedPrice,
  setClientXY,
  setSelectedLeadTrader,
  clientXY,
  setModalXY,
  chartMouseOut$,
}) => {
  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;
  const settlePricesData = useAppSelector((state: any) => state.market.settlePrices);
  const webSocketKlinesData = useAppSelector((state: any) => state.webSocket.klines);
  const leadTraders: ILeadTraders = useAppSelector((state: any) => state.market.leadTraders);

  const dataZoomInitialStart = 70;
  const dataZoomInitialEnd = 100;

  const [symbol, setSymbol] = useState<string>(`${underlyingAsset}USDC`);
  const [chartInterval, setChartInterval] = useState<string>("15m");
  const [lastChartInterval, setLastChartInterval] = useState<string>("15m");
  const [limit, setLimit] = useState<number>(500);
  const [startTime, setStartTime] = useState<number>(0);
  const [needToFetch, setNeedToFetch] = useState<boolean>(false);
  const [klineData, setKlineData] = useState<any[]>([]);
  const [hoverColor, setHoverColor] = useState<string>("");
  const [hoverPrice, setHoverPrice] = useState<number>(0);
  const [futuresIndex, setFuturesIndex] = useState<number>(0);
  const [lastFuturesIndex, setLastFuturesIndex] = useState<number>(0);
  const [settlePrices, setSettlePrices] = useState<SettlePriceData>({});
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [overlayPositions, setOverlayPositions] = useState<OverlayPosition[]>([]);
  const [isZoomIn, setIsZoomIn] = useState<boolean>(true);

  const echartsRef = useRef<any>(null);
  const timeoutIds = useRef<NodeJS.Timeout[]>([]);
  const [futuresIndexYAxis, setFuturesIndexYAxis] = useState<string>("");
  const [futuresIndexAnimation, setFuturesIndexAnimation] = useState<string>("");

  const resetDataZoom = () => {
    if (!chartInstance) return;
    const currentOption = chartInstance.getOption();
    const currentKlineData = currentOption.series[0].data;
    const newStart =
      ((currentKlineData[currentKlineData.length - 1][0] - currentKlineData[0][0]) /
        (currentOption.xAxis[0].max - currentKlineData[0][0])) *
      0.3 *
      100;

    chartInstance.dispatchAction({
      type: "dataZoom",
      start: newStart,
      end: 100,
    });
  };

  // Initialize
  useEffect(() => {
    if (echartsRef.current) {
      const chartInstance = echartsRef.current.getEchartsInstance();
      setChartInstance(chartInstance);
      // chartInstance.showLoading({
      //   text: '',
      //   color: '#c23531',
      //   maskColor: 'transparent',
      //   zlevel: 0,
      //   showSpinner: true,
      //   spinnerRadius: 30,
      //   lineWidth: 8,
      // })

      const now = new Date();
      const hour = now.getUTCHours();

      if (hour < 8) {
        now.setDate(now.getDate() - 1);
      }

      const startOfDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 0, 0)
      );

      let endOfChart;
      if (chartInterval === "15m") {
        const startOfDay = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 0, 0)
        );
        endOfChart = new Date(startOfDay.getTime() + 29 * 60 * 60 * 1000);
      } else if (chartInterval === "5m") {
        endOfChart = new Date(Date.now() + 5000 * 1000);
      } else {
        endOfChart = new Date(Date.now() + 1000 * 1000);
      }

      const newOption = {
        ...option,
        xAxis: {
          ...option.xAxis,
          max: endOfChart,
        },
      };

      chartInstance.setOption(newOption);

      chartInstance.dispatchAction({
        type: "dataZoom",
        start: dataZoomInitialStart,
        end: dataZoomInitialEnd,
        // startValue: startOfDay,
        // endValue: endOfChart
      });

      setNeedToFetch(true);
    }
  }, []);

  // Update futures index
  useEffect(() => {
    if (!futuresAssetIndexMap) return;
    setFuturesIndex(futuresAssetIndexMap[underlyingAsset]);
  }, [futuresAssetIndexMap]);

  // Control hovered price
  useEffect(() => {
    if (!chartInstance) return;

    const color =
      hoverPrice < forbiddenMinMaxPrices[0]
        ? "#A34B4B"
        : hoverPrice > forbiddenMinMaxPrices[1]
        ? "#4A8F53"
        : "#4D4D4D";

    if (hoverColor === "" || hoverColor !== color) {
      setHoverColor(color);

      chartInstance.setOption({
        yAxis: {
          axisPointer: {
            lineStyle: {
              color: color,
            },
            label: {
              backgroundColor: color,
            },
          },
        },
      });
    }
  }, [chartInstance, hoverPrice]);

  // Control forbidden area
  useEffect(() => {
    if (!chartInstance) return;

    const forbiddenData = [
      [
        {
          yAxis: 0,
          itemStyle: {
            color: "#5C4040",
            opacity: 0.25,
          }, // 아래 영역 색상
        },
        {
          yAxis: forbiddenMinMaxPrices[0],
        },
      ],
      [
        {
          yAxis: forbiddenMinMaxPrices[1],
        },
        {
          yAxis: 999999,
          itemStyle: {
            color: "#4C5237",
            opacity: 0.25,
          },
        },
      ],
    ];

    chartInstance.setOption({
      series: [
        {
          markArea: {
            data: forbiddenData,
          },
        },
      ],
    });
  }, [chartInstance, forbiddenMinMaxPrices]);

  // Control estimated price markLine
  useEffect(() => {
    if (!chartInstance) return;

    let markLineData = chartInstance.getOption().series[0].markLine.data;
    const shouldDelete =
      estimatedPrice >= forbiddenMinMaxPrices[0] && estimatedPrice <= forbiddenMinMaxPrices[1];

    const color = shouldDelete
      ? "transparent"
      : estimatedPrice > forbiddenMinMaxPrices[1]
      ? "#63E073"
      : "#E03F3F";

    const borderColor = shouldDelete
      ? "transparent"
      : estimatedPrice > forbiddenMinMaxPrices[1]
      ? "#4C5237"
      : "#5C4040";

    let shouldAnimate;

    markLineData = markLineData.map((item: any) => {
      if (item.name === "estimated price") {
        if (item.yAxis === 0) shouldAnimate = false;

        item.yAxis = shouldDelete ? 0 : estimatedPrice;
        item.lineStyle.color = color;
        item.label.formatter = shouldDelete ? "0" : `${advancedFormatNumber(estimatedPrice, 2, "")}`;
        item.label.backgroundColor = color;
        item.label.borderColor = borderColor;
        return item;
      } else if (item.name == "estimated price stroke") {
        item.yAxis = shouldDelete ? 0 : estimatedPrice;
        item.lineStyle.color = borderColor;
        return item;
      } else {
        return item;
      }
    });

    chartInstance.setOption({
      series: [
        {
          markLine: {
            animation: shouldAnimate,
            data: markLineData,
          },
        },
      ],
    });
  }, [chartInstance, estimatedPrice, forbiddenMinMaxPrices]);

  // Control futures price markLine
  useEffect(() => {
    if (!chartInstance) return;
    let markLineData = chartInstance.getOption()?.series[0].markLine.data;
    if (!markLineData) return;
    markLineData = markLineData.map((item: any) => {
      if (item.name === "futures price") item.yAxis = futuresIndex;
      return item;
    });

    chartInstance.setOption({
      series: [
        {
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

  // Control mouse events
  useEffect(() => {
    if (!chartInstance) return;

    chartInstance.getZr().on("mousemove", (params: any) => {
      const pointInPixel = [params.offsetX, params.offsetY];
      const pointInGrid = chartInstance.convertFromPixel("grid", pointInPixel);

      if (pointInGrid) {
        setHoveredPrice(pointInGrid[1]);
        setHoverPrice(pointInGrid[1]);
      }
    });

    chartInstance.getZr().on("mouseout", () => {
      chartMouseOut$.next(true);
    });

    chartInstance.getZr().on("click", (params: any) => {
      const pointInPixel = [params.offsetX, params.offsetY];
      const pointInGrid = chartInstance.convertFromPixel("grid", pointInPixel);

      if (pointInGrid) {
        setEstimatedPrice(pointInGrid[1]);

        const rect = chartInstance.getDom().getBoundingClientRect();
        const mouseX = params.event.clientX;
        const mouseY = params.event.clientY;
        const isInChart =
          mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;

        if (isInChart) {
          setClientXY([mouseX, mouseY]);
        } else {
          setClientXY([0, 0]);
        }
      }
    });

    chartInstance.on("dataZoom", (event: any) => {
      if (!event.batch) return;
      const { start, end } = event.batch[0];
      if (start === 0) setNeedToFetch(true);
    });

    return () => {
      chartInstance.getZr()?.off("mousemove"); // Cleanup event listener
      chartInstance.getZr()?.off("click"); // Cleanup event listener
      chartInstance.off("dataZoom");
    };
  }, [chartInstance]);

  const fetchKlinesData = async (isIntervalChanged: boolean, _limitToFetch?: number) => {
    _limitToFetch = _limitToFetch || limit;
    let klinesApi = KLINE_API + `?symbol=${symbol}&interval=${chartInterval}&limit=${_limitToFetch}`;
    if (!isIntervalChanged && startTime > 0) klinesApi = klinesApi + `&endTime=${startTime - 30 * 1000}`;
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
    setStartTime(result.startTime);
    // setDataZoomDefaultStart(nextStart);
    setNeedToFetch(false);
  };

  // Fetch history klines data
  useEffect(() => {
    if (needToFetch) {
      fetchKlinesData(false);
    }
  }, [needToFetch]);

  useEffect(() => {
    if (lastChartInterval !== chartInterval) {
      fetchKlinesData(true, 500);
      if (!chartInstance) return;

      const now = new Date();
      const hour = now.getUTCHours();

      if (hour < 8) {
        now.setDate(now.getDate() - 1);
      }

      let endOfChart;
      if (chartInterval === "15m") {
        const startOfDay = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 0, 0)
        );
        endOfChart = new Date(startOfDay.getTime() + 29 * 60 * 60 * 1000);
      } else if (chartInterval === "5m") {
        endOfChart = new Date(Date.now() + 5000 * 1000);
      } else {
        endOfChart = new Date(Date.now() + 1000 * 1000);
      }

      const newOption = {
        ...option,
        xAxis: {
          ...option.xAxis,
          max: endOfChart,
        },
        dataZoom: {
          start: dataZoomInitialStart,
          end: dataZoomInitialEnd,
        },
      };

      chartInstance.setOption(newOption);
    }
    setEstimatedPrice(0);
    setSelectedLeadTrader(null);
    setLastChartInterval(chartInterval);
  }, [chartInterval]);

  // Fetch recent kline data
  useEffect(() => {
    if (klineData.length === 0) return;
    if (!webSocketKlinesData[symbol]) return;

    const lastKlineData = klineData[klineData.length - 1];
    const currentKlineData = webSocketKlinesData[symbol];

    if (lastKlineData[0] === currentKlineData[0]) {
      const newKlineData = [...klineData];
      newKlineData[newKlineData.length - 1] = [
        currentKlineData[0],
        currentKlineData[1],
        currentKlineData[4],
        currentKlineData[3],
        currentKlineData[2],
      ];
      setKlineData(newKlineData);
    } else if (lastKlineData[0] < currentKlineData[0]) {
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

  // Update option when klineData changes
  useEffect(() => {
    if (!chartInstance) return;

    const currentOption = chartInstance.getOption();
    const currentOptionData = currentOption.series[0].data;

    if (currentOptionData.length === 0) {
      chartInstance.setOption({
        series: [
          {
            data: klineData,
          },
        ],
      });
      return;
    }

    if (Math.abs(currentOptionData.length - klineData.length) <= 2) {
      chartInstance.setOption({
        series: [
          {
            data: klineData,
          },
        ],
      });
      return;
    }

    /*
                            (   currentData[0]   )---------------(currentData[last])----------------------------------------------------------------(max)
                            (currentZoomStart(=0))---------------( currentZoomEnd  )----------------------------------------------------------------(100)
      (neData[0])-------------------------------------------------( newData[last]  )----------------------------------------------------------------(max)
      (  0  )-------------------(newZoomStart)--------------------( newZoomEnd  )------------------------------------------------------------------(100)
    */
    const currentZoomEnd = currentOption.dataZoom[0].end;
    const nextStart =
      ((currentOptionData[0][0] - klineData[0][0]) / (currentOption.xAxis[0].max - klineData[0][0])) * 100;
    const nextEnd =
      ((currentZoomEnd * (currentOption.xAxis[0].max - currentOptionData[0][0])) /
        (currentOption.xAxis[0].max - klineData[0][0]) /
        100 +
        (currentOptionData[0][0] - klineData[0][0]) / (currentOption.xAxis[0].max - klineData[0][0])) *
      100;

    chartInstance.setOption({
      series: [
        {
          data: klineData,
        },
      ],
      dataZoom: [
        {
          type: "inside",
          start: nextStart,
          end: nextEnd,
        },
      ],
    });
  }, [klineData]);

  // Update settle prices
  useEffect(() => {
    const settlePricesDataLen = Object.keys(settlePricesData).length;
    const SettlePricesLastTimestamp = Object.keys(settlePricesData)[settlePricesDataLen - 1];

    const currentSettlePriceLastTimestamp = Object.keys(settlePrices)[settlePricesDataLen - 1];
    if (SettlePricesLastTimestamp === currentSettlePriceLastTimestamp) return;

    const processSettlePrices = Object.keys(settlePricesData).reduce((acc, timestamp, index) => {
      if (index < settlePricesDataLen - 5) return acc;
      return {
        ...acc,
        [timestamp]: settlePricesData[timestamp],
      };
    }, {} as SettlePriceData);

    setSettlePrices(processSettlePrices);
  }, [settlePricesData]);

  // Control settle price markLines
  useEffect(() => {
    if (!chartInstance) return;

    const newSettlePriceMarkLines = Object.keys(settlePrices).map((timestamp, index) => {
      return {
        name: `settle price ${index}`,
        xAxis: new Date(Number(timestamp) * 1000),
        lineStyle: {
          color: "#9D9B98",
          type: "solid",
        },
        label: {
          show: true,
          formatter: `Settled: ${advancedFormatNumber(
            settlePrices[Number(timestamp)][underlyingAsset],
            0,
            ""
          )}`,
          align: "center",
          padding: [4, 6],
          backgroundColor: "transparent",
          color: "#F5F5F5",
          fontSize: 14,
          fontWeight: 600,
        },
      };
    });

    const newExpiryMarkLine = [
      {
        name: `expiry`,
        xAxis: new Date(Number(expiry) * 1000),
        lineStyle: {
          color: "#9D9B98",
          type: "dashed",
        },
        label: {
          show: true,
          formatter: "Expiry",
          align: "center",
          padding: [4, 6],
          backgroundColor: "transparent",
          color: "#F5F5F5",
          fontSize: 14,
          fontWeight: 600,
        },
      },
    ];

    const existingMarkLines = chartInstance
      .getOption()
      .series[0].markLine.data.filter(
        (item: any) => item.name.includes("settle price") === false && item.name.includes("expiry") === false
      );

    chartInstance.setOption({
      series: [
        {
          markLine: {
            data: [...existingMarkLines, ...newSettlePriceMarkLines, ...newExpiryMarkLine],
          },
        },
      ],
    });
  }, [chartInstance, settlePrices, expiry, chartInterval]);

  useEffect(() => {
    if (!chartInstance) return;

    chartInstance.setOption({
      yAxis: {
        min: function (value: any) {
          const { adjustedMin } = calculateSymmetricalMinMax(value, forbiddenMinMaxPrices, isZoomIn);

          return adjustedMin;
        },
        max: function (value: any) {
          const { adjustedMax } = calculateSymmetricalMinMax(value, forbiddenMinMaxPrices, isZoomIn);

          return adjustedMax;
        },
      },
    });
  }, [chartInstance, forbiddenMinMaxPrices, isZoomIn, futuresIndex, chartInterval]);

  const handleOverlayPositionUpdate = (): void => {
    handleSocialTradingChipsPositionUpdate();
    handleFuturesPricePositionUpdate();
  };

  const handleSocialTradingChipsPositionUpdate = () => {
    const chartInstance = echartsRef.current.getEchartsInstance();

    const series = chartInstance.getOption().series[0];
    if (!series.markPoint || series.markPoint.data.length != leadTraders[underlyingAsset].length) {
      return;
    }

    let _overlayPositions: OverlayPosition[] = [];
    const chartRect = chartInstance.getDom().getBoundingClientRect();
    for (let i = 0; i < leadTraders[underlyingAsset].length; i++) {
      {
        const markPointData = series.markPoint && series.markPoint.data[i];
        const [endTime, open, high, low, close] = markPointData.coord;
        const coord: number[] = [endTime, close];
        const markPointName: string = markPointData.name;
        const pointInPixel = chartInstance.convertToPixel({ seriesIndex: 0 }, coord);

        const isAvailablePrice = !(close > forbiddenMinMaxPrices[0] && close < forbiddenMinMaxPrices[1]);

        if (pointInPixel) {
          const [x, y] = pointInPixel;
          const isInsideChart =
            x >= 50 && x <= chartRect.width * 0.9 && y >= 55 && y <= chartRect.height - 20;

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
  };

  // get and set yAxis of futures price markLine
  const handleFuturesPricePositionUpdate = () => {
    const chartInstance = echartsRef.current.getEchartsInstance();
    const currentOption = chartInstance.getOption();
    const getMarkLineData = currentOption.series[0].markLine.data;
    const futuresIndexMarkLine = getMarkLineData.find((item: any) => item.name === "futures price");

    const rect = chartInstance.getDom().getBoundingClientRect();

    const yAxisOfFuturesIndex = chartInstance.convertToPixel({ seriesIndex: 0 }, [
      0,
      futuresIndexMarkLine.yAxis,
    ])[1];

    const parsedYAxis = Math.max(55, Math.min(rect.height - 20, yAxisOfFuturesIndex))
    
    setFuturesIndexYAxis(`${parsedYAxis}px`);
  };

  useEffect(() => {
    if (futuresIndex === lastFuturesIndex) {
      setFuturesIndexAnimation("");
    } else if (futuresIndex > lastFuturesIndex) {
      setFuturesIndexAnimation("up-blink 1s linear infinite");
    } else {
      setFuturesIndexAnimation("down-blink 1s linear infinite");
    }

    const resetAnimation = setTimeout(() => {
      setFuturesIndexAnimation("");
    }, 1000);

    return () => clearTimeout(resetAnimation);
  }, [futuresIndex, lastFuturesIndex]);

  // Control futures price markLine
  useEffect(() => {
    if (!chartInstance) return;
    chartInstance.setOption({
      series: [
        {
          markPoint: {
            data: getMarkPointData(leadTraders, underlyingAsset),
            tooltip: {
              formatter: function (param: any) {
                return param.name + "<br>" + (param.data.coord || "");
              },
            },
          },
        },
      ],
    });
    chartInstance.on("dataZoom", handleOverlayPositionUpdate); // Update on zoom
    chartInstance.on("highlight", handleOverlayPositionUpdate); // Update on highlight
    chartInstance.on("click", handleOverlayPositionUpdate); // Update on click
    handleOverlayPositionUpdate(); // Initial call to set position
    return () => {
      chartInstance.off("dataZoom", handleOverlayPositionUpdate);
      chartInstance.off("highlight", handleOverlayPositionUpdate);
      chartInstance.off("click", handleOverlayPositionUpdate);
    };
  }, [chartInstance, leadTraders, forbiddenMinMaxPrices]);

  const getOverlayPosition = (i: number): OverlayPosition => {
    const _overlayPosition: OverlayPosition = {
      id: "",
      top: "0",
      left: "0",
      shouldShow: false,
    };
    return overlayPositions.length < 1 || overlayPositions.length <= i
      ? _overlayPosition
      : overlayPositions[i];
  };

  useEffect(() => {
    setOverlayPositions(overlayPositions);
  }, [clientXY]);

  return (
    <div className="relative w-full h-full">
      <ReactECharts ref={echartsRef} option={option} style={{ height: "100%", width: "100%" }} />
      {/* Add the overlay div */}

      {leadTraders[underlyingAsset]
        .slice()
        .sort((a, b) => {
          // Sort by executionPrice in ascending order
          return (
            Number(BigNumber(a.executionPrice).dividedBy(BigNumber(10).pow(30))) -
            Number(BigNumber(b.executionPrice).dividedBy(BigNumber(10).pow(30)))
          );
        })
        .map((leadTrader) => {
          const position = getOverlayPosition(leadTrader.id);
          if (position.shouldShow) {
            return (
              <div
                key={leadTrader.id} // Ensure each child has a unique key
                className="absolute"
                style={{
                  top: position.top,
                  left: position.left,
                  transform: "translate(-50%, -50%)", // Centers the overlay
                  zIndex: 0,
                }}
              >
                <div className="flex items-center justify-center hover:scale-110 active:opacity-50 active:scale-100">
                  <SocialTradingChip
                    leadTrader={leadTrader}
                    underlyingAsset={underlyingAsset}
                    setSelectedLeadTrader={setSelectedLeadTrader}
                    setModalXY={setModalXY}
                    modalXY={[
                      Number(position.left.replace(/px$/, "")),
                      Number(position.top.replace(/px$/, "")),
                    ]}
                    setEstimatedPrice={setEstimatedPrice}
                  />
                </div>
              </div>
            );
          }
        })}

      <div>
        {/* New elements replace markline for future price and its label*/}
        {/* Horizontal line across the chart*/}
        <div
          className="absolute"
          style={{
            top: futuresIndexYAxis,
            left: 0,
            width: "95%",
            borderBottom: "1px dotted #808080", // Dotted line style
            animation: futuresIndexAnimation ? futuresIndexAnimation : "none",
          }}
        />
        {/* Label next to the horizontal line */}
        <div
          style={{
            position: "absolute",
            left: "94%", // Position it to the right of the line
            top: futuresIndexYAxis,
            backgroundColor: "#808080", // Label background color
            color: "#121212", // Label text color
            padding: "2px 6px", // Padding for the label
            fontSize: "11px", // Label text size
            fontWeight: 600, // Label text weight
            transform: "translate(4%,-50%)", // Center the label vertically
            animation: futuresIndexAnimation ? futuresIndexAnimation : "none",
          }}
        >
          {advancedFormatNumber(futuresIndex, 2, "")}
        </div>
        <style>{`
          @keyframes up-blink {
            0%, 100% { background-color: #808080; }
            5%, 50% { background-color: #63E073; }
          }
          @keyframes down-blink {
            0%, 100% { background-color: #808080; }
            5%, 50% { background-color: #E03F3F; }
          }
        `}</style>
      </div>

      <button className={twJoin("group", "absolute top-[84px] left-[24px]")}>
        <IntervalSelector interval={chartInterval} setChartInterval={setChartInterval} />
      </button>

      <button
        className={twJoin(
          "group",
          "absolute top-[84px] right-[94px]",
          "border-[1px] border-[#5C5C5C] rounded-[3px] backdrop-blur-[6px]"
        )}
        onClick={() => setIsZoomIn(!isZoomIn)}
      >
        <div className="flex flex-row justify-center items-center group-hover:pl-[10px]">
          <p className="hidden group-hover:block text-[12px] text-[#E6FC8D] font-semibold">Zoom Y-axis</p>
          {isZoomIn ? (
            <>
              <img className="hidden group-hover:block" width={32} height={32} src={IconChartZoomOutHover} />
              <img className="group-hover:hidden block" width={32} height={32} src={IconChartZoomOut} />
            </>
          ) : (
            <>
              <img className="hidden group-hover:block" width={32} height={32} src={IconChartZoomInHover} />
              <img className="group-hover:hidden block" width={32} height={32} src={IconChartZoomIn} />
            </>
          )}
        </div>
      </button>

      <button
        className={twJoin(
          "group",
          "absolute bottom-[44px] right-[94px]",
          "border-[1px] border-[#5C5C5C] rounded-[3px] backdrop-blur-[6px]"
        )}
        onClick={resetDataZoom}
      >
        <div className="flex flex-row justify-center items-center group-hover:pl-[10px]">
          <p className="hidden group-hover:block text-[12px] text-[#E6FC8D] font-semibold">Back to default</p>
          <img className="hidden group-hover:block" width={32} height={32} src={IconMoveToEndHovered} />
          <img className="group-hover:hidden block" width={32} height={32} src={IconMoveToEnd} />
        </div>
      </button>
    </div>
  );
};

export default MainChart;

// get data from "leadTraders", and make echarts' markPoint data
export const getMarkPointData = (
  leadTraders: ILeadTraders,
  underlyingAsset: string,
): any[] => {
  let result: any[] = [];

  for (let i = 0; i < leadTraders[underlyingAsset].length; i++) {
    const strikePrice = String(leadTraders[underlyingAsset][i].strikePrice);

    result.push({
      name: String(i + "th leader - " + String(leadTraders[underlyingAsset][i].address)), // only for debugging
      coord: [
        String(Number(leadTraders[underlyingAsset][i].processBlockTime) * 1000),
        strikePrice,
        strikePrice,
        strikePrice,
        strikePrice,
      ],
      value: strikePrice,
      itemStyle: {
        opacity: 0,
      },
      label: {
        show: false,
      },
    });
  }

  return result;
};
