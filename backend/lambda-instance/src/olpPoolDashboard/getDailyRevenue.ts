import { getDailyPnl } from './getDailyPnl';
import { getDailyNotionalVolume } from './getDailyNotionalVolume';
import { getDailyFeesAndRp } from './getDailyFeesAndRp';
import { interpolateData, interpolateDate } from '../utils/helper';

type ResultRowType = {
  [day: string]: {
    fees: number;
    risk_premium: number;
    notional_volume: number;
    pnl: number;
    pnl_30d: number;
    pnl_60d: number;
    pnl_180d: number;
  }
}

export const getDailyRevenue = async (period: string) => {
  try {
    const [pnlData, volumeData, feesData] = await Promise.all([
      getDailyPnl(period),
      getDailyNotionalVolume(period),
      getDailyFeesAndRp(period)
    ]);

    const allDates = interpolateDate(
      [...new Set([
        ...Object.keys(pnlData),
        ...Object.keys(volumeData),
        ...Object.keys(feesData)
      ])]
    ).slice(0, parseInt(period));
    const interpolatedPnlData = interpolateData(pnlData, allDates, 'previous');
    const interpolatedVolumeData = interpolateData(
      volumeData, 
      allDates, 
      'initial', 
      {
        notional_volume: 0,
      }
    );
    const interpolatedFeesData = interpolateData(feesData, allDates, 'initial', {
      fees: 0,
      risk_premium: 0,
    });

    const dailyRevenue = allDates.reverse().reduce((acc: ResultRowType, date: string) => {
      acc[date] = {
        fees: interpolatedFeesData[date]?.fees || 0,
        risk_premium: interpolatedFeesData[date]?.risk_premium || 0,
        notional_volume: interpolatedVolumeData[date]?.notional_volume || 0,
        pnl: interpolatedPnlData[date]?.cumulative_pnl || 0,
        pnl_30d: interpolatedPnlData[date]?.pnl_30d || 0,
        pnl_60d: interpolatedPnlData[date]?.pnl_60d || 0,
        pnl_180d: interpolatedPnlData[date]?.pnl_180d || 0,
      };
      return acc;
    }, {});

    return dailyRevenue;
  } catch (error) {
    console.log('getRevenue error:', error);
    throw error;
  }
}