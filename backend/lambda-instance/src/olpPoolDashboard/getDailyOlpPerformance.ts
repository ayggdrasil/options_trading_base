import { getOlpInfo } from './getOlpInfo';
// import { getDistributedEthReward } from './getDistributedEthReward';
import { interpolateDate, interpolateData, getOldestData } from '../utils/helper';
import dayjs from 'dayjs';
type ResultRowType = {
  [date: string]: {
    olp_price: number; // chart 1 
    total_value_per_olp: number; //chart 2
    olptvl: number; // olptvl
  }
}

export const getDailyOlpPerformance = async (period: string) => {
  try {
    const [
      olpInfo,
      // distributedEthReward
    ] = await Promise.all([
      getOlpInfo(period),
      // getDistributedEthReward(period),
    ]);
    // needed for previous initial data
    const oldestOlpInfo = getOldestData(olpInfo);
    // const oldestDistributedEthReward = getOldestData(distributedEthReward);

    const allDates = interpolateDate(
      [...new Set([
        ...Object.keys(olpInfo),
        // ...Object.keys(distributedEthReward),
        ...[dayjs().format('YYYY-MM-DD')] // add for interpolating from oldest to latest
      ])]
    );

    const interpolatedOlpInfo = interpolateData(
      olpInfo, 
      allDates, 
      'previous',
      oldestOlpInfo
    );

    // const interpolatedDistributedEthReward = interpolateData(
    //   distributedEthReward,
    //   allDates,
    //   'previous',
    //   oldestDistributedEthReward
    // );

    const olpPerformance: ResultRowType = allDates.slice(-parseInt(period)).reduce((acc: ResultRowType, date: string) => {
      const formattedDate = dayjs(date).format('YYYY-MM-DD');
      acc[formattedDate] = {
        olp_price: interpolatedOlpInfo[formattedDate]?.olp_price || 0,
        total_value_per_olp: (interpolatedOlpInfo[formattedDate]?.olptv) / interpolatedOlpInfo[formattedDate]?.total_supply_olp || 0,
        // total_value_per_olp: (interpolatedOlpInfo[formattedDate]?.olptv + interpolatedDistributedEthReward[formattedDate]?.cumulative_dist_eth_reward || 0) / interpolatedOlpInfo[formattedDate]?.total_supply_olp || 0,
        olptvl: interpolatedOlpInfo[formattedDate]?.olptv || 0,
      };
      return acc;
    }, {});

    console.log('olpPerformance', JSON.stringify(olpPerformance, null, 2));
    return olpPerformance;
  } catch (error) {
    console.log('getDailyOlpPerformance error:', error);
    throw error;
  }
}