import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useWindowSize } from 'react-use';
import { twJoin } from 'tailwind-merge';
import { drawLine } from '@/utils/charts';

interface KlinesData {
  startTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  endTime: number;
}

interface MainCandleChartProps {
  data: any[];
}

const processData = (data: any[], startTime: number): {
  chartData: KlinesData[],
  minPrice: number,
  maxPrice: number
} => {
  const result = data
    .filter(item => item[0] >= startTime)
    .map(item => ({
      startTime: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      endTime: item[5]
    }))

  const minPrice = Math.min(...result.map(d => d.low));
  const maxPrice = Math.max(...result.map(d => d.high));
    
  return {
    chartData: result,
    minPrice,
    maxPrice
  };
};

const CANVAS_WIDTH = 1216;
const CANVAS_HEIGHT = 496;
const CHART_START_X = 0;
const CHART_END_X = CANVAS_WIDTH - 60;
const CHART_START_Y = 40;
const CHART_END_Y = CANVAS_HEIGHT - 10;
const CHART_WIDTH = CHART_END_X - CHART_START_X;
const CHART_HEIGHT = CHART_END_Y - CHART_START_Y;


const Y_RANGE_LABEL_COUNT_MIN = 10;

const MainCandleChart: React.FC<MainCandleChartProps> = ({ data }) => {
  const [app, setApp] = useState<PIXI.Application | null>(null);
  const [chartContainer, setChartContainer] = useState<PIXI.Container | null>(null);

  const [defaultStartTime, setDefaultStartTime] = useState<number>(0);
  const [defaultEndTime, setDefaultEndTime] = useState<number>(0);
  const [chartData, setChartData] = useState<KlinesData[]>([]);

  const [xRange, setXRange] = useState<[number, number]>([0, 0]);
  const [yRange, setYRange] = useState<[number, number]>([0, 0]);
  const [yCount, setYCount] = useState<number>(0);
  const [yIncrement, setYIncrement] = useState<number>(0);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentTime = Date.now();
    const dayRange = getDayRange(currentTime);
    setDefaultStartTime(dayRange.start);
    setDefaultEndTime(dayRange.end);
    setXRange([dayRange.start, dayRange.end]);
  }, [])

  useEffect(() => {
    if (!data) return;

    const processed = processData(data, defaultStartTime);
    setChartData(processed.chartData);

    // Set Y Range
    let adjustedMinPrice = roundUptoNearest(Math.floor(processed.minPrice * 0.98));
    let adjustedMaxPrice = roundUptoNearest(Math.floor(processed.maxPrice * 1.02));
    
    const diff = adjustedMaxPrice - adjustedMinPrice;
    const increment = roundUptoNearest(Math.ceil(diff / Y_RANGE_LABEL_COUNT_MIN));
    const labelCount = Math.ceil(diff / increment);

    adjustedMaxPrice = adjustedMinPrice + increment * labelCount;

    setYRange([adjustedMinPrice, adjustedMaxPrice]);
    setYCount(labelCount);
    setYIncrement(increment);
  }, [data])

  useEffect(() => {
    const app = new PIXI.Application({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      antialias: true,
      autoDensity: true,
      resolution: 2,
      backgroundColor: "#000000",
    });
    setApp(app);

    const chartContainer = new PIXI.Container();
    setChartContainer(chartContainer);
    
    initChart();
    
    drawXAxis();
    drawYAxis();

    return () => {
      destroyChart();
    }
  }, [containerRef.current])

  // useEffect(() => {
  //   if (containerRef.current) {
  //     containerRef.current.appendChild(app.view as unknown as HTMLCanvasElement);
  //   }

  //   // Constants
  //   const chartWidth = app.screen.width;
  //   const chartHeight = app.screen.height;
  //   const margin = { top: 20, right: 60, bottom: 20, left: 60 };
  //   const innerWidth = chartWidth - margin.left - margin.right;
  //   const innerHeight = chartHeight - margin.top - margin.bottom;

  //   // Determine the time range
  //   const endTime = parsedData[parsedData.length - 1].timestamp;
  //   const startTime = endTime - 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  //   // Determine the price range with 2% padding
  //   const prices = parsedData.flatMap(d => [d.open, d.high, d.low, d.close]);
  //   const minPrice = Math.min(...prices) * 0.98;
  //   const maxPrice = Math.max(...prices) * 1.02;

  //   // Scale functions
  //   const xScale = (timestamp: number) => {
  //     return ((timestamp - startTime) / (endTime - startTime)) * innerWidth + margin.left;
  //   };
  //   const yScale = (price: number) => {
  //     return innerHeight - ((price - minPrice) / (maxPrice - minPrice)) * innerHeight + margin.top;
  //   };

  //   // Draw the X and Y axis
  //   const drawAxes = () => {
  //     const graphics = new PIXI.Graphics();
  //     graphics.lineStyle(1, 0xffffff, 1);
  //     graphics.moveTo(margin.left, margin.bottom);
  //     graphics.lineTo(margin.left, chartHeight - margin.bottom);
  //     graphics.lineTo(chartWidth - margin.right, chartHeight - margin.bottom);
  //     app.stage.addChild(graphics);
  //   };

  //   // Draw Candles
  //   const drawCandles = () => {
  //     parsedData.forEach(d => {
  //       const x = xScale(d.timestamp);
  //       const openY = yScale(d.open);
  //       const closeY = yScale(d.close);
  //       const highY = yScale(d.high);
  //       const lowY = yScale(d.low);
  //       const color = d.close > d.open ? 0x00ff00 : 0xff0000;

  //       // Draw high-low line
  //       const line = new PIXI.Graphics();
  //       line.lineStyle(1, color);
  //       line.moveTo(x, highY);
  //       line.lineTo(x, lowY);
  //       app.stage.addChild(line);

  //       // Draw open-close rectangle
  //       const rect = new PIXI.Graphics();
  //       rect.beginFill(color);
  //       rect.drawRect(x - 2, Math.min(openY, closeY), 4, Math.abs(openY - closeY));
  //       rect.endFill();
  //       app.stage.addChild(rect);
  //     });
  //   };

  //   // Draw Settle Price
  //   const drawSettlePrice = () => {
  //     const settlePriceY = yScale(data[0].open); // Example settle price, replace with real value
  //     const settleLine = new PIXI.Graphics();
  //     settleLine.lineStyle(1, 0x0000ff, 1);
  //     settleLine.moveTo(margin.left, settlePriceY);
  //     settleLine.lineTo(chartWidth - margin.right, settlePriceY);
  //     app.stage.addChild(settleLine);

  //     const settleText = new PIXI.Text('Settle Price', {
  //       fontSize: 12,
  //       fill: 0x0000ff
  //     });
  //     settleText.position.set(chartWidth - margin.right + 5, settlePriceY - 10);
  //     app.stage.addChild(settleText);

  //     // Draw vertical line for Settle Price
  //     const verticalLine = new PIXI.Graphics();
  //     verticalLine.lineStyle(1, 0x0000ff, 1);
  //     verticalLine.moveTo(margin.left, settlePriceY);
  //     verticalLine.lineTo(margin.left, margin.top);
  //     app.stage.addChild(verticalLine);
  //   };

  //   // Draw last price
  //   const drawLastPrice = () => {
  //     const lastPriceY = yScale(parsedData[parsedData.length - 1].close);
  //     const lastLine = new PIXI.Graphics();
  //     lastLine.lineStyle(1, 0xff00ff, 1);
  //     lastLine.moveTo(margin.left, lastPriceY);
  //     lastLine.lineTo(chartWidth - margin.right, lastPriceY);
  //     app.stage.addChild(lastLine);

  //     const lastText = new PIXI.Text(`Last Price: ${parsedData[parsedData.length - 1].close}`, {
  //       fontSize: 12,
  //       fill: 0xff00ff
  //     });
  //     lastText.position.set(chartWidth - margin.right + 5, lastPriceY - 10);
  //     app.stage.addChild(lastText);
  //   };

  //   // Draw the Y axis on the right
  //   const drawYAxis = () => {
  //     const yAxis = new PIXI.Graphics();
  //     yAxis.lineStyle(1, 0xffffff, 1);
  //     yAxis.moveTo(chartWidth - margin.right, margin.top);
  //     yAxis.lineTo(chartWidth - margin.right, chartHeight - margin.bottom);
  //     app.stage.addChild(yAxis);

  //     const step = (maxPrice - minPrice) / 15;
  //     for (let i = 0; i <= 15; i++) {
  //       const price = minPrice + step * i;
  //       const y = yScale(price);
  //       const text = new PIXI.Text(price.toFixed(2), {
  //         fontSize: 12,
  //         fill: 0xffffff
  //       });
  //       text.anchor.set(0.5);
  //       text.position.set(chartWidth - margin.right + 30, y);
  //       app.stage.addChild(text);
  //     }
  //   };


  //   // Render the chart
  //   drawAxes();
  //   drawCandles();
  //   drawSettlePrice();
  //   drawLastPrice();
  //   drawYAxis();

  //   return () => {
  //     app.destroy(true, true);
  //   };
  // }, [parsedData, width]);

  const initChart = () => {
    if (app === null || chartContainer === null) return;
    if (containerRef.current) containerRef.current.appendChild(app.view as any)

    chartContainer.interactive = true
    chartContainer.position.set(CHART_START_X, CHART_END_Y)
    chartContainer.scale.set(1, -1)
    chartContainer.hitArea = new PIXI.Rectangle(CHART_START_X, CHART_START_Y, CHART_END_X, CHART_END_Y)

    chartContainer.on('pointermove', handlePointerMove);
    // chartContainer.on('pointerout', handlePointerOut);

    app.stage.addChild(chartContainer)
  }

  const destroyChart = () => {
    if (app === null || chartContainer === null) return;
    if (app?.view?.parentNode) app.view.parentNode.removeChild(app.view) 

    chartContainer.off('pointermove', handlePointerMove)
    // chartContainer.off('pointerout', handlePointerOut)

    chartContainer.interactive = false
    chartContainer.removeChildren()
    chartContainer.destroy({ children: true, texture: true, baseTexture: true })

    app.stage.removeChild(chartContainer)
    app.stop()
    app.destroy(true)
  }

  const addStage = (graphic: any) => {
    if (chartContainer === null) return;
    chartContainer.addChild(graphic)
  }

  const drawXAxis = () => {
    const graphics = new PIXI.Graphics();
    
    graphics.lineStyle({
      width: 1,
      color: "#333331",
      shader: null,
    } as any)

    graphics.moveTo(CHART_START_X, CHART_START_Y)
    graphics.lineTo(CHART_END_X, CHART_START_Y)

    addStage(graphics)
  }

  const yScale = (price: number, minPrice: number, maxPrice: number) => {
    return CHART_HEIGHT - ((price - minPrice) / (maxPrice - minPrice)) * CHART_HEIGHT;
  };

  const drawYAxis = () => {
    const graphics = new PIXI.Graphics();

    graphics.lineStyle({
      width: 1,
      color: "#333331",
      shader: null,
    } as any)

    graphics.moveTo(CHART_END_X, CHART_START_Y)
    graphics.lineTo(CHART_END_X, CHART_END_Y)

    addStage(graphics)

    const step = yCount;

    for (let i = 0; i <= step; i++) {
      const price = yRange[0] + yIncrement * i;
      const y = CHART_END_Y - yScale(price, yRange[0], yRange[1]);
      const text = new PIXI.Text(price.toFixed(0), {
        fontSize: 12,
        fill: "#9D9B98"
      });
      
      text.anchor.set(0.5);
      text.position.set(CHART_END_X + 30, y);
      text.scale.set(1, -1);

      addStage(text);
    }



      // for (let i = 0; i <= 15; i++) {
      //   const price = minPrice + step * i;
      //   const y = yScale(price);
      //   const text = new PIXI.Text(price.toFixed(2), {
      //     fontSize: 12,
      //     fill: 0xffffff
      //   });
      //   text.anchor.set(0.5);
      //   text.position.set(chartWidth - margin.right + 30, y);
      //   app.stage.addChild(text);
      // }
  }

  const handlePointerMove = (e: any) => {
    console.log(e);
  }

  const roundUptoNearest = (num: number): number => {
    if (num < 10) {
      return 1;
    } else if (num < 50) {
      return Math.floor(num / 10) * 10; // 23 => 30, 47 => 50
    } else {
      return Math.floor(num / 50) * 50; // 54 => 100, 99 => 100, 145 => 150, 945 => 90
    }
  }

  const getDayRange = (timestamp: number): { start: number, end: number } => {
    const date = new Date(timestamp);
    const hour = date.getUTCHours();
    date.setUTCHours(0, 0, 0, 0);

    const start = new Date(date.getTime())
    start.setUTCHours(7, 0, 0, 0);

    const end = new Date(start.getTime())
    end.setUTCDate(end.getUTCDate() + 1);
    end.setUTCHours(8, 59, 59, 999);

    if (hour < 8) {
      start.setUTCDate(start.getUTCDate() - 1);
      end.setUTCDate(end.getUTCDate() - 1);
    }

    return {
      start: start.getTime(),
      end: end.getTime()
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full bg-transparent pt-[39px] pb-[28px]"
    >
    </div>
  );
};

export default MainCandleChart;