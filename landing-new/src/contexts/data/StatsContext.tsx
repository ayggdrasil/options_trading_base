import { createContext } from "react";

export interface StatItem {
  label: string;
  value: number;
  prefix?: string;
}

interface ContractStatAsset {
  icon: string;
  value: number;
  iconAlt?: string;
}

export interface ContractStatItem {
  label: string;
  assets: {
    [key: string]: ContractStatAsset;
  };
}

export interface StatsData {
  totalTradingVolume: StatItem;
  dailyTradingVolume: StatItem;
  totalContracts: ContractStatItem;
  totalTransactionVolume: StatItem;
  protocolNetRevenue: StatItem;
}

export interface StatsContextType {
  data: StatsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const StatsContext = createContext<StatsContextType | undefined>(undefined);
