import { ReactNode, useEffect, useRef, useState } from "react";
import {
  TrendingContext,
  TrendingData,
  TopPerformingOption,
  HighestVolumeOption,
} from "./TrendingContext";
import { API_URLS } from "../../shared/constants/urls";
import { LEADER_BOARD_DATA } from "../../shared/constants/data";

interface MarketData {
  data: {
    market: {
      [asset: string]: {
        expiries: number[];
        options: {
          [timestamp: string]: {
            call: Option[];
            put: Option[];
          };
        };
      };
    };
    futuresIndices: {
      [asset: string]: number;
    };
    spotIndices: {
      [asset: string]: number;
    };
    riskFreeRates: {
      [asset: string]: {
        [timestamp: string]: number;
      };
    };
    olpStats: {
      sOlp: OlpStat;
      mOlp: OlpStat;
      lOlp: OlpStat;
    };
  };
  timestamp: number;
  lastUpdatedAt: string;
}

interface Option {
  instrument: string;
  optionId: string;
  strikePrice: number;
  markIv: number;
  markPrice: number;
  riskPremiumRateForBuy: number;
  riskPremiumRateForSell: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  volume: number;
  isOptionAvailable: boolean;
}

interface OlpStat {
  greeks: {
    [asset: string]: {
      delta: number;
      gamma: number;
      vega: number;
      theta: number;
    };
  };
  assetAmounts: {
    [asset: string]: {
      utilizedAmount: number;
      availableAmount: number;
      depositedAmount: number;
    };
  };
  utilityRatio: {
    utilizedUsd: number;
    depositedUsd: number;
  };
}

// Helper function to extract all options from market data with instrument as key and markPrice and volume as values
const extractOptions = (marketData: MarketData): Map<string, { markPrice: number; volume: number }> => {
  const options = new Map<string, { markPrice: number; volume: number }>();

  if (!marketData?.data?.market) return options;

  // Process each asset
  for (const assetData of Object.values(marketData.data.market)) {
    if (!assetData.options) continue;

    // Process each expiry timestamp's options
    for (const optionsByType of Object.values(assetData.options)) {
      // Process call options
      if (optionsByType.call) {
        optionsByType.call.forEach((option) => {
          options.set(option.instrument, {
            markPrice: option.markPrice || 0,
            volume: option.volume || 0,
          });
        });
      }

      // Process put options
      if (optionsByType.put) {
        optionsByType.put.forEach((option) => {
          options.set(option.instrument, {
            markPrice: option.markPrice || 0,
            volume: option.volume || 0,
          });
        });
      }
    }
  }

  return options;
};

const processTopGainerOptions = (
  currentMarketData: Map<string, { markPrice: number; volume: number }>,
  dailyMarketData: Map<string, { markPrice: number; volume: number }>
) => {
  const topGainerOptionsData: TopPerformingOption[] = [];

  const filteredCurrentMarketData = Array.from(currentMarketData.entries()).filter(([instrument, data]) => {
    const baseData = dailyMarketData.get(instrument);
    if (baseData === undefined || data.markPrice < 0.01 || baseData.markPrice < 0.01) return false;
    return true;
  });

  filteredCurrentMarketData.forEach(([instrument, currentData]) => {
    const baseData = dailyMarketData.get(instrument);

    if (baseData !== undefined) {
      const priceDiff = (currentData.markPrice - baseData.markPrice) / baseData.markPrice;
      const priceDiffPercentage = priceDiff * 100;

      topGainerOptionsData.push({
        instrument,
        currentPrice: currentData.markPrice,
        basePrice: baseData.markPrice,
        priceDiffPercentage,
      });
    }
  });

  topGainerOptionsData.sort((a, b) => b.priceDiffPercentage - a.priceDiffPercentage);

  return topGainerOptionsData;
};

// Function to process highest volume options
const processHighestVolumeOptions = (
  currentMarketData: Map<string, { markPrice: number; volume: number }>,
) => {
  const highestVolumeOptionsData: HighestVolumeOption[] = [];

  currentMarketData.forEach((data, instrument) => {
    if (data.volume > 0) {
      highestVolumeOptionsData.push({
        instrument,
        currentPrice: data.markPrice,
        volume: data.volume,
      });
    }
  });

  highestVolumeOptionsData.sort((a, b) => b.volume - a.volume);

  return highestVolumeOptionsData;
};

export const TrendingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [data, setData] = useState<TrendingData>(LEADER_BOARD_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    try {
      setIsLoading(true);

      const date = new Date();
      const dateISOString = date.toISOString().split("T")[0];

      const [currentMarketData, dailyMarketData] = await Promise.all([
        fetch(API_URLS.MARKET_DATA).then((res) => res.json() as Promise<MarketData>),
        fetch(`${API_URLS.MARKET_DAILY}-${dateISOString}.json`).then(
          (res) => res.json() as Promise<MarketData>
        ),
      ]);

      const extractedCurrentMarketData = extractOptions(currentMarketData);
      const extractedDailyMarketData = extractOptions(dailyMarketData);

      const topPerformingOptions = processTopGainerOptions(
        extractedCurrentMarketData,
        extractedDailyMarketData
      );
      const highestVolumeOptions = processHighestVolumeOptions(extractedCurrentMarketData);

      setData({
        ...data,
        topPerformingOptions: topPerformingOptions,
        highestVolumeOptions: highestVolumeOptions,
      });
    } catch (error) {
      console.log("Error fetching leaderboard", error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    intervalRef.current = setInterval(refetch, 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!intervalRef.current) {
          intervalRef.current = setInterval(refetch, 60 * 1000);
          refetch();
        }
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <TrendingContext.Provider value={{ data, isLoading, error, refetch }}>
      {children}
    </TrendingContext.Provider>
  );
};
