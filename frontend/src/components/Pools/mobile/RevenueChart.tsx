import React from 'react';
import { twJoin } from 'tailwind-merge';

import ReactECharts from 'echarts-for-react';
import { DayRange, defaultOption, Tab } from './RevenueChart.option';
import SelectorForMobile from '@/components/Common/SelectorForMobile';
import { useRevenueChart } from '@/hooks/olp';
import { OlpKey } from '@/utils/enums';
import { advancedFormatNumber } from '@/utils/helper';
import { useAppSelector } from '@/store/hooks';

type Props = {
  olpKey: OlpKey;
  className?: string;
  data: any;
};

const RevenueChart: React.FC<Props> = ({ className, olpKey, data }) => {
  const { isIpad } = useAppSelector(state => state.device);

  const {
    detailData,
    setChartInstance,
    echartsRef,
    activeDayRange,
    activeTab,
    setActiveTab,
    setDayRange,
    getOptions,
    getTotalValue,
  } = useRevenueChart({ data, defaultOption });

  return (
    <div className={twJoin('relative', 'w-full', className)}>
      <div className={twJoin('flex flex-col gap-1', 'px-3 md:px-6 mb-3')}>
        <SelectorForMobile
          label='Type'
          items={Object.values(Tab).map(tabTitle => {
            return {
              value: tabTitle,
              onClick: () => setActiveTab(tabTitle),
              isActive: activeTab === tabTitle,
            };
          })}
        />
        <div className='w-full flex items-center justify-between'>
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
          <div className={twJoin('flex flex-col')}>
            <p
              className={twJoin(
                'text-sm md:text-base font-bold text-contentBright text-right',
              )}
            >
              {advancedFormatNumber(getTotalValue(), 0, '$', true)}
            </p>
            <p
              className={twJoin(
                'relative',
                'text-[10px] md:text-[12px] font-normal text-gray80 text-right',
              )}
            >
              {activeDayRange}d {activeTab}
              {activeTab == Tab.PNL && (
                <p className='w-screen absolute bottom-[-15px] right-0'>
                  * Options not been settled or closed excluded
                </p>
              )}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          height: isIpad ? 'calc(100dvh - 342px)' : 'calc(100dvh - 272px)',
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

export default RevenueChart;
