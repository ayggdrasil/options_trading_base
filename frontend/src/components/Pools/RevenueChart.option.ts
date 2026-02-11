import { advancedFormatBigNumber, advancedFormatNumber } from "@/utils/helper";
import { graphic } from "echarts";

export enum DayRange {
  D30 = "30",
  D60 = "60",
  D180 = "180",
}

export enum Tab {
  Volume = "Volume",
  Revenue = "Revenue",
  PNL = "P&L",
}

export const defaultOption = {
  grid: {
    left: "28px",
    right: "36px",
    bottom: "32px",
    top: "64px",
    containLabel: true,
  },
  tooltip: {
    trigger: "axis",
    backgroundColor: "#181A1F",
    borderColor: "#202329",
    borderWidth: 1,
    extraCssText:
      "height: 64px; padding: 16px 12px; border-radius: 4px; box-sizing: border-box; box-shadow: 0 0 24px 0 rgba(10, 10, 10, 0.36); display: flex; flex-direction: column; justify-content: center;",
    textStyle: {
      fontFamily: "Host Grotesk",
      fontSize: 13,
      fontWeight: 600,
      color: "#BFBFBF",
    },
    formatter: function (params: any) {
      if (!params?.length) return "";
      let message = `<div style="margin-bottom:2px;">${params[0].axisValue}</div>`;
      message += params.reduce((acc: any, param: any) => {
        const data = param.data;
        return (
          acc +
          `<div style="color:#278EF5; font-size:14px;">${advancedFormatNumber(data, 0, "$", true)}</div>`
        );
      }, "");
      return message;
    },
  },
  xAxis: {
    type: "category",
    data: [],
    boundaryGap: false,
    axisLine: {
      show: false,
    },
    axisTick: {
      show: false,
    },
    axisLabel: {
      color: "#8C8C8C",
      fontFamily: '"Host Grotesk"',
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 14,
    },
  },
  yAxis: {
    type: "value",
    axisLabel: {
      margin: 32,
      color: "#8C8C8C",
      fontFamily: '"Host Grotesk"',
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 14,
      formatter: (value: number) => {
        if (value == 0) return "";
        return "$" + advancedFormatBigNumber(value, true);
      },
    },
    splitLine: {
      show: false,
    },
  },
  series: [
    {
      type: "bar",
      data: [],
      showSymbol: false,
      smooth: true,
      barCategoryGap: "0%",
      barGap: "0%",
      itemStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          {
            offset: 0,
            color: "#3B465C",
          },
          {
            offset: 1,
            color: "#2d3647",
          },
        ]),
        emphasis: {
          color: "#278EF5",
        },
      },
    },
  ],
};
