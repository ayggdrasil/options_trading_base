import { advancedFormatNumber } from "@/utils/helper";
import { graphic } from 'echarts'

export enum DayRange {
  D30 = '30',
  D60 = '60',
  D180 = '180'
}

export const defaultOption = {
  grid: {
    left: '28px',
    right: '36px',
    bottom: '32px',
    top: '64px',
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#181A1F',
    borderColor: '#202329',
    borderWidth: 1,
    extraCssText: "height: 64px; padding: 16px 12px; border-radius: 4px; box-sizing: border-box; box-shadow: 0 0 24px 0 rgba(10, 10, 10, 0.36); display: flex; flex-direction: column; justify-content: center;",
    textStyle: {
      fontFamily: 'Host Grotesk',
      fontSize: 13,
      fontWeight: 600,
      color: '#BFBFBF'
    },
    formatter: function(params: any) {
      if (!params?.length) return ""
      const param = params[0]
      return `<div style="margin-bottom:2px;">${param.axisValue}</div><div style="color:#278EF5; font-size:14px;">${advancedFormatNumber(param.data, 3, "$", false)}</div>`
    }
  },
  xAxis: {
    type: 'category',
    data: [],
    boundaryGap: false,
    axisLine: {
      show: false 
    },
    axisTick: {
      show: false,
    },
    axisLabel: {
      color: '#8C8C8C',
      fontFamily: '"Host Grotesk"',
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 14,
    },
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      margin: 32,
      color: '#8C8C8C',
      fontFamily: '"Host Grotesk"',
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 14,
      formatter: (value: number) => {
        if (value == 0) return ""
        return advancedFormatNumber(value, 2, "$", false)
      },
    },
    splitLine: {
      show: false
    }
  },
  legend: {
    show: false
  },
  series: [
    {
      name: 'OLP Token Value (Price)',
      type: 'line',
      data: [],
      showSymbol: false,
      smooth: true,
      lineStyle: {
        width: 2
      },
      itemStyle: {
        color: '#278EF5'
      },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          {
            offset: 0,
            color: '#1E2833'
          },
          {
            offset: 1,
            color: '#1A1A1A'
          }
        ])
      }
    },
  ]
};