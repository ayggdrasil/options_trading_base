interface BybitOptionMarket {
  symbol: string;
  markIv: string;
}

export interface BybitOptionMarketRes {
  result: {
    list: BybitOptionMarket[];
  };
  time: number;
}
