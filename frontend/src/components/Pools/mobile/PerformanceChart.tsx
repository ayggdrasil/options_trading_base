import React, { useEffect, useState } from 'react';
import { twJoin } from 'tailwind-merge';

import ReactECharts from 'echarts-for-react';
import { DayRange, defaultOption } from './PerformanceChart.option';
import SelectorForMobile from '@/components/Common/SelectorForMobile';
import { useOlpPerformanceChart, useOLPTotalStat } from '@/hooks/olp';
import { OlpKey } from '@/utils/enums';
import { advancedFormatNumber } from '@/utils/helper';
import { useAppSelector } from '@/store/hooks';

type Props = {
  olpKey: OlpKey;
  data: any;
  className?: string;
};

const PerformanceChart: React.FC<Props> = ({ data, className, olpKey }) => {
  const { isIpad } = useAppSelector(state => state.device);
  const { tvl } = useOLPTotalStat({ olpKey });
  const {
    detailData,
    setChartInstance,
    echartsRef,
    activeDayRange,
    setDayRange,
    getOptions,
  } = useOlpPerformanceChart({ data, defaultOption });

  const [priceChangeRate, setPriceChangeRate] = useState<number>(0)

  useEffect(() => {
    if (!detailData || !detailData.olpPerformance) return

    const olpPerformanceData = Object.entries(detailData?.olpPerformance || {})
      .filter(([date, value]: any) => value.olp_price !== 0)
      .map(([date, value]: any) => ({ date, ...value, }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    const firstPrice = olpPerformanceData[0].olp_price;
    const lastPrice = olpPerformanceData[olpPerformanceData.length - 1].olp_price;

    const priceChangeRate = ((lastPrice - firstPrice) / firstPrice) * 100;
    setPriceChangeRate(priceChangeRate)
  }, [detailData])

  return (
    <div className={twJoin('relative', 'w-full', className)}>
      <div
        className={twJoin(
          'flex items-center justify-between w-screen',
          'px-3 md:px-6 mb-3',
        )}
      >
        <div className={twJoin('flex items-center justify-between')}>
          <div className={twJoin('flex items-center')}>
            <SelectorForMobile
              label='Time'
              items={Object.values(DayRange).map(dayKey => {
                return {
                  value: dayKey + 'd',
                  onClick: () => setDayRange(dayKey),
                  isActive: activeDayRange === dayKey,
                };
              })}
            />
          </div>
        </div>

        <div className='flex flex-row'>
          <div className={twJoin('flex flex-col')}>
            <p
              className={twJoin(
                'text-sm md:text-base font-bold text-contentBright text-right',
              )}
            >
              {advancedFormatNumber(tvl, 0, '$', true)}
            </p>
            <p
              className={twJoin(
                'text-[10px] md:text-[12px] font-normal leading-[15px] text-gray80 text-right',
              )}
            >
              OLP Total Value Locked
            </p>
          </div>

          <div
            className={twJoin(
              "flex flex-col",
              "min-w-[88px] w-[88px]",
            )}
          >
            <p
              className={twJoin(
                'text-sm md:text-base font-bold text-right',
                priceChangeRate > 0 ? "text-green63" : priceChangeRate < 0 ? "text-redE0" : "text-grayb3"
              )}
            >
              {priceChangeRate > 0
                ? `+${advancedFormatNumber(priceChangeRate, 2, "", true)}%`
                : priceChangeRate < 0
                  ? `${advancedFormatNumber(priceChangeRate, 2, "", true)}%`
                  : "0%"
              }
            </p>
            <p
              className={twJoin(
                'text-[10px] md:text-[12px] font-normal leading-[15px] text-gray80 text-right'
              )}
            >
              {`${activeDayRange}d change`}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          height: isIpad ? 'calc(100dvh - 326px)' : 'calc(100dvh - 256px)',
        }}
      >
        <ReactECharts
          ref={echartsRef}
          option={getOptions(detailData)}
          style={{ height: '100%', width: '100%' }}
          onChartReady={instance => {
            setChartInstance(instance);
          }}
        />
      </div>
      <div className='h-[34px]'></div>
    </div>
  );
};

export default PerformanceChart;
