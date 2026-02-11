import { StatsData } from "../../contexts/data/StatsContext";

import SymbolBtc from "../../assets/images/symbol-btc.png";
import SymbolEth from "../../assets/images/symbol-eth.png";
import { TrendingData } from "../../contexts/data/TrendingContext";

export const STATS_DATA: StatsData = {
  totalTradingVolume: {
    label: "Total Trading Volume",
    value: 0,
    prefix: "$",
  },
  dailyTradingVolume: {
    label: "Daily Trading Volume",
    value: 0,
    prefix: "$",
  },
  totalContracts: {
    label: "Total Contracts",
    assets: {
      BTC: {
        icon: SymbolBtc,
        value: 0,
        iconAlt: "BTC Contract",
      },
      ETH: {
        icon: SymbolEth,
        value: 0,
        iconAlt: "ETH Contract",
      },
    },
  },
  totalTransactionVolume: {
    label: "Total Transaction Volume",
    value: 0,
    prefix: "$",
  },
  protocolNetRevenue: {
    label: "Protocol Net Revenue",
    value: 0,
    prefix: "$",
  },
};

export const LEADER_BOARD_DATA: TrendingData = {
  topPerformingOptions: [],
  highestVolumeOptions: [],
};
