import { createContext } from "react";

export interface TopPerformingOption {
  instrument: string;
  currentPrice: number;
  basePrice: number;
  priceDiffPercentage: number;
}

export interface HighestVolumeOption {
  instrument: string;
  currentPrice: number;
  volume: number;
}

export interface TrendingData {
  topPerformingOptions: TopPerformingOption[];
  highestVolumeOptions: HighestVolumeOption[];
}

export interface TrendingContextType {
  data: TrendingData;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const TrendingContext = createContext<TrendingContextType | undefined>(undefined);
