export const Strategy = {
  NotSupported: 0,
  BuyCall: 1,
  SellCall: 2,
  BuyPut: 3,
  SellPut: 4,
  BuyCallSpread: 5,
  SellCallSpread: 6,
  BuyPutSpread: 7,
  SellPutSpread: 8,
} as const;

export type Strategy = keyof typeof Strategy;
export type StrategyValue = typeof Strategy[keyof typeof Strategy];
