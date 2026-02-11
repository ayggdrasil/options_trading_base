import BigNumber from "bignumber.js";
import { useAccount } from "wagmi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { writeHandleRewards } from "@/utils/contract";
import { OlpKey } from "@/utils/enums";
import { loadBalance } from "@/store/slices/UserSlice";
import { useEffect, useMemo, useRef, useState } from "react";
import { DayRange } from "@/components/Pools/PerformanceChart.option";
import dayjs from "dayjs";
import { Tab } from "@/components/Pools/RevenueChart.option";
import { NetworkState } from "@/networks/types";
import { FuturesAssetIndexMap, SpotAssetIndexMap } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export const useMyOlpData = ({ olpKey }: any) => {
  const { address } = useAccount();
  const dispatch = useAppDispatch();
  const { chain } = useAppSelector((state) => state.network) as NetworkState;
  const userBalance = useAppSelector((state: any) => state.user.balance);
  const olpQueueState = useAppSelector((state: any) => state.olpQueue); // P&L data is loaded in App.tsx
  const futuresAssetIndexMap = useAppSelector(
    (state: any) => state.market.futuresAssetIndexMap
  ) as FuturesAssetIndexMap;
  const olpMetricsData = useAppSelector((state: any) => state.app.olpMetrics);

  const [isClaimingRewards, setIsClaimingRewards] = useState<boolean>(false);

  const handleRewards = async () => {
    setIsClaimingRewards(true);
    const result = await writeHandleRewards(olpKey as OlpKey, chain);
    if (result && address) {
      dispatch(loadBalance({ chain, address }));
    }
    setIsClaimingRewards(false);
  };

  // Calculate OLP balance and price (memoized)
  const { stakedOlp, claimable, olpPrice, stakedOlpUsd, claimableUsd } = useMemo(() => {
    if (!address || !userBalance?.olpToken?.[olpKey] || !olpMetricsData?.[olpKey]) {
      return {
        stakedOlp: "0",
        claimable: "0",
        olpPrice: "0",
        stakedOlpUsd: 0,
        claimableUsd: 0,
      };
    }

    const stakedOlp = new BigNumber(userBalance.olpToken[olpKey]).toString();
    const claimable = userBalance.claimableReward[olpKey] || "0";
    const olpPrice = new BigNumber(olpMetricsData[olpKey].price)
      .dividedBy(10 ** 30)
      .toString();

    const stakedOlpUsd = new BigNumber(stakedOlp).multipliedBy(olpPrice).toNumber();
    const claimableUsd = new BigNumber(claimable)
      .multipliedBy(futuresAssetIndexMap.eth || 0)
      .toNumber();

    return { stakedOlp, claimable, olpPrice, stakedOlpUsd, claimableUsd };
  }, [address, userBalance, olpMetricsData, olpKey, futuresAssetIndexMap.eth]);

  // Calculate P&L and ROI (memoized)
  const pnlMetrics = useMemo(() => {
    const { pnl: pnlData } = olpQueueState;
    
    const holdings = new BigNumber(pnlData.holdings);
    const investment = new BigNumber(pnlData.investment);
    const avgEntryPrice = new BigNumber(pnlData.avgEntryPrice);
    const realizedPnl = new BigNumber(pnlData.realizedPnl);
    const realizedRoi = new BigNumber(pnlData.realizedRoi);
    const realizedInvestment = new BigNumber(pnlData.realizedInvestment);
    const currentOlpPrice = new BigNumber(olpPrice);

    // Calculate unrealized P&L
    const unrealizedPnl = holdings.multipliedBy(currentOlpPrice.minus(avgEntryPrice));
    const unrealizedRoi = investment.isZero()
      ? new BigNumber(0)
      : unrealizedPnl.dividedBy(investment).multipliedBy(100);

    return {
      holdings: holdings.toNumber(),
      investment: investment.toNumber(),
      avgEntryPrice: avgEntryPrice.toNumber(),
      realizedPnl: realizedPnl.toNumber(),
      realizedRoi: realizedRoi.toNumber(),
      realizedInvestment: realizedInvestment.toNumber(),
      unrealizedPnl: unrealizedPnl.toNumber(),
      unrealizedRoi: unrealizedRoi.toNumber(),
    };
  }, [olpQueueState.pnl, olpPrice]);

  return {
    stakedOlp,
    stakedOlpUsd,
    claimable,
    claimableUsd,
    isClaimingRewards,
    handleRewards,
    ...pnlMetrics,
  };
};

export const useOLPTotalStat = ({ olpKey }: any) => {
  const [tvlComposition, setTVLComposition] = useState({
    // wbtc: "0",
    // weth: "0",
    usdc: "0",
  });

  const spotAssetIndexMap = useAppSelector(
    (state: any) => state.market.spotAssetIndexMap
  ) as SpotAssetIndexMap;
  const olpStats = useAppSelector((state: any) => state.market.olpStats);

  // Calculate TVL
  useEffect(() => {
    if (!spotAssetIndexMap || !olpStats || !olpStats[olpKey]) return;

    const data = {
      // wbtc: "0",
      // weth: "0",
      usdc: "0",
    };

    const olpAssetAmounts = olpStats[olpKey].assetAmounts;

    if (!olpAssetAmounts) return;

    // data.wbtc = new BigNumber(olpAssetAmounts.wbtc?.depositedAmount || "0").multipliedBy(spotAssetIndexMap.btc).toString()
    // data.weth = new BigNumber(olpAssetAmounts.weth?.depositedAmount || "0").multipliedBy(spotAssetIndexMap.eth).toString()
    data.usdc = new BigNumber(olpAssetAmounts.usdc?.depositedAmount || "0")
      .multipliedBy(spotAssetIndexMap.usdc)
      .toString();

    setTVLComposition(data);
  }, [spotAssetIndexMap, olpStats]);

  const tvl = new BigNumber(tvlComposition.usdc).toNumber();

  return {
    tvl,
    tvlComposition,
  };
};

export const useOlpPerformanceChart = ({ data, defaultOption }: any) => {
  const [chartInstance, setChartInstance] = useState<any>(null);
  const echartsRef = useRef<any>(null);
  const [activeDayRange, setDayRange] = useState<DayRange>(DayRange.D30);

  const detailData = data[activeDayRange] || {};

  const olpPerformanceData = Object.entries(detailData?.olpPerformance || {})
    .map(([date, value]: any) => ({ date, ...value }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getOptions = (data: any) => {
    if (Object.keys(data).length === 0) return {};

    const yMin = 0.9;

    const totalPoints = olpPerformanceData.length;

    return {
      ...defaultOption,
      xAxis: {
        ...defaultOption.xAxis,
        axisLabel: {
          ...defaultOption.xAxis.axisLabel,
          interval: (index: number) => {
            return (
              index === Math.floor(totalPoints / 3) ||
              index === Math.floor((totalPoints * 2) / 3)
            );
          },
        },
        data: olpPerformanceData?.map((item: any) =>
          dayjs(item.date).format("DD MMM")
        ),
      },
      yAxis: {
        ...defaultOption.yAxis,
        min: yMin,
      },
      series: [
        {
          ...defaultOption.series[0],
          data: olpPerformanceData?.map((item: any) => item.olp_price),
        },
      ],
    };
  };

  useEffect(() => {
    if (chartInstance) {
      chartInstance.setOption(getOptions(detailData));
    }
  }, [detailData]);

  return {
    detailData,
    setChartInstance,
    echartsRef,
    activeDayRange,
    setDayRange,
    getOptions,
  };
};

export const useRevenueChart = ({ data, defaultOption }: any) => {
  const [chartInstance, setChartInstance] = useState<any>(null);
  const echartsRef = useRef<any>(null);
  const [activeDayRange, setDayRange] = useState<DayRange>(DayRange.D30);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Volume);

  const detailData = data[activeDayRange] || {};

  const revenueData = Object.entries(detailData?.revenue || {})
    .map(([date, value]: any) => ({ date, ...value }))
    .sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const getTotalValue = () => {
    if (activeTab == Tab.PNL) {
      const lastItem = revenueData[revenueData.length - 1];
      return lastItem?.[`pnl_${activeDayRange}d`] || 0;
    }

    return revenueData.reduce((acc: any, item: any) => {
      if (activeTab === Tab.Volume) return acc + Number(item?.notional_volume);

      return acc + Number(item?.fees) + Number(item?.risk_premium);
    }, 0);
  };

  const getBarWidth = () => {
    if (activeDayRange === DayRange.D30) return 18;
    if (activeDayRange === DayRange.D60) return 8;
    return 3;
  };

  const getOptions = (data: any) => {
    if (Object.keys(data).length === 0) return {};

    return {
      ...defaultOption,
      xAxis: {
        ...defaultOption.xAxis,
        axisLabel: {
          ...defaultOption.xAxis.axisLabel,
        },
        data: revenueData?.map((item: any) =>
          dayjs(item.date).format("DD MMM")
        ),
      },
      yAxis: {
        ...defaultOption.yAxis,
      },
      series: [
        {
          ...defaultOption.series[0],
          barWidth: getBarWidth(),
          data: revenueData?.map((item: any) => {
            if (activeTab === Tab.Volume) {
              return Number(item.notional_volume);
            }

            if (activeTab === Tab.PNL) {
              return Number(item.pnl);
            }

            return Number(item.fees) + Number(item.risk_premium);
          }),
        },
      ],
    };
  };

  useEffect(() => {
    if (chartInstance) {
      chartInstance.setOption(getOptions(detailData));
    }
  }, [detailData]);

  return {
    detailData,
    setChartInstance,
    echartsRef,
    activeDayRange,
    setDayRange,
    activeTab,
    setActiveTab,
    getOptions,
    getTotalValue,
  };
};
