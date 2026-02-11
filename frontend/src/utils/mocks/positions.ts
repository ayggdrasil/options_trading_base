import { MONTHS_MAP } from "@callput/shared";
import { FlattenedPosition } from "@/interfaces/interfaces.positionSlice";

// timestamp를 날짜 형식으로 변환 (예: 2JAN26)
const formatExpiryDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const day = date.getUTCDate();
  const month = MONTHS_MAP[date.getUTCMonth() + 1];
  const year = date.getUTCFullYear().toString().slice(-2);
  return `${day}${month}${year}`;
};

// instrument 문자열 생성 (예: BTC-2JAN26-128000-C)
const createInstrument = (
  asset: string,
  expiryTimestamp: number,
  strikePrice: number,
  optionDirection: "Call" | "Put",
  pairedStrikePrice?: number
): string => {
  const expiryDate = formatExpiryDate(expiryTimestamp);
  const optionType = optionDirection === "Call" ? "C" : "P";

  return `${asset}-${expiryDate}-${strikePrice}-${optionType}`;
};

// 가짜 데이터 생성 함수
const createMockPosition = (
  asset: string,
  strikePrice: number,
  size: number,
  avgPrice: number,
  lastPrice: number,
  pnl: number,
  roi: number,
  cashflow: number,
  optionDirection: "Call" | "Put",
  optionOrderSide: "Buy" | "Sell",
  optionStrategy: "Vanilla" | "Spread",
  expiry: number,
  pairedOptionStrikePrice: number = 0
): FlattenedPosition => {
  const instrument = createInstrument(
    asset,
    expiry,
    strikePrice,
    optionDirection,
    optionStrategy === "Spread" ? pairedOptionStrikePrice : undefined
  );

  return {
    underlyingAsset: asset,
    optionTokenId: BigInt(12312312412412312432).toString(),
    length: "1",
    markPrice: lastPrice,
    markIv: 0.5,
    mainOptionStrikePrice: strikePrice,
    pairedOptionStrikePrice,
    isBuys: optionOrderSide === "Buy" ? "1" : "0",
    strikePrices: strikePrice.toString(),
    isCalls: optionDirection === "Call" ? "1" : "0",
    optionNames: instrument,
    size: size.toString(),
    sizeOpened: size.toString(),
    sizeClosing: "0",
    sizeClosed: "0",
    sizeSettled: "0",
    isBuy: optionOrderSide === "Buy",
    executionPrice: avgPrice.toString(),
    openedToken: "USDC",
    openedAmount: (avgPrice * size).toString(),
    openedCollateralToken: "USDC",
    openedCollateralAmount: (avgPrice * size).toString(),
    openedAvgExecutionPrice: avgPrice.toString(),
    openedAvgSpotPrice: asset === "BTC" ? "128000" : "3000",
    closedToken: "",
    closedAmount: "0",
    closedCollateralToken: "",
    closedCollateralAmount: "0",
    closedAvgExecutionPrice: "0",
    closedAvgSpotPrice: "0",
    settledToken: "",
    settledAmount: "0",
    settledCollateralToken: "",
    settledCollateralAmount: "0",
    settledPrice: "0",
    isSettled: false,
    lastProcessBlockTime: Date.now().toString(),
    metadata: {
      expiry,
      isExpired: expiry * 1000 < Date.now(),
      settlePrice: 0,
      instrument,
      optionDirection,
      optionOrderSide,
      optionStrategy,
      size,
      lastPrice,
      avgPrice,
      payoff: pnl / size,
      pnl,
      roi,
      cashflow,
      greeks: {
        delta: 0.5,
        gamma: 0.001,
        vega: 0.02,
        theta: -0.01,
      },
    },
  };
};

// 가짜 데이터 20개
export const MOCK_POSITIONS: FlattenedPosition[] = [
  createMockPosition(
    "BTC",
    128000,
    10,
    150,
    180,
    300,
    20,
    -1500,
    "Call",
    "Buy",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 86400 // 1일 후 만료
  ),
  createMockPosition(
    "ETH",
    3000,
    5,
    80,
    95,
    75,
    18.75,
    400,
    "Put",
    "Sell",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 172800 // 2일 후 만료
  ),
  createMockPosition(
    "BTC",
    130000,
    8,
    50,
    45,
    -40,
    -10,
    400,
    "Call",
    "Buy",
    "Spread",
    Math.floor(Date.now() / 1000) + 259200, // 3일 후 만료
    132000
  ),
  createMockPosition(
    "ETH",
    3200,
    12,
    120,
    145,
    300,
    25,
    -1440,
    "Call",
    "Buy",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 43200 // 12시간 후 만료
  ),
  createMockPosition(
    "BTC",
    125000,
    7,
    90,
    75,
    -105,
    -16.67,
    630,
    "Put",
    "Sell",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 345600 // 4일 후 만료
  ),
  createMockPosition(
    "ETH",
    3100,
    15,
    35,
    42,
    105,
    20,
    -525,
    "Call",
    "Buy",
    "Spread",
    Math.floor(Date.now() / 1000) + 518400, // 6일 후 만료
    3200
  ),
  createMockPosition(
    "BTC",
    132000,
    20,
    110,
    125,
    300,
    13.64,
    -2200,
    "Call",
    "Buy",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 21600 // 6시간 후 만료
  ),
  createMockPosition(
    "ETH",
    2800,
    6,
    85,
    100,
    90,
    17.65,
    510,
    "Put",
    "Sell",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 604800 // 7일 후 만료
  ),
  createMockPosition(
    "BTC",
    128000,
    9,
    60,
    55,
    -45,
    -8.33,
    540,
    "Put",
    "Buy",
    "Spread",
    Math.floor(Date.now() / 1000) + 259200, // 3일 후 만료
    126000
  ),
  createMockPosition(
    "ETH",
    3150,
    11,
    130,
    155,
    275,
    21.15,
    -1430,
    "Call",
    "Buy",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 86400 // 1일 후 만료
  ),
  createMockPosition(
    "BTC",
    120000,
    8,
    75,
    88,
    104,
    17.33,
    600,
    "Put",
    "Sell",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 432000 // 5일 후 만료
  ),
  createMockPosition(
    "ETH",
    2950,
    13,
    40,
    38,
    -26,
    -5,
    520,
    "Call",
    "Buy",
    "Spread",
    Math.floor(Date.now() / 1000) + 172800, // 2일 후 만료
    3050
  ),
  createMockPosition(
    "BTC",
    135000,
    14,
    100,
    115,
    210,
    15,
    -1400,
    "Call",
    "Buy",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 64800 // 18시간 후 만료
  ),
  createMockPosition(
    "ETH",
    2700,
    4,
    95,
    110,
    60,
    15.79,
    380,
    "Put",
    "Sell",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 691200 // 8일 후 만료
  ),
  createMockPosition(
    "BTC",
    128000,
    10,
    55,
    50,
    -50,
    -9.09,
    550,
    "Put",
    "Buy",
    "Spread",
    Math.floor(Date.now() / 1000) + 345600, // 4일 후 만료
    126000
  ),
  createMockPosition(
    "ETH",
    3050,
    16,
    140,
    165,
    400,
    28.57,
    -2240,
    "Call",
    "Buy",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 129600 // 1.5일 후 만료
  ),
  createMockPosition(
    "BTC",
    122000,
    9,
    70,
    82,
    108,
    15.43,
    630,
    "Put",
    "Sell",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 777600 // 9일 후 만료
  ),
  createMockPosition(
    "ETH",
    3000,
    12,
    45,
    48,
    36,
    8,
    -540,
    "Call",
    "Buy",
    "Spread",
    Math.floor(Date.now() / 1000) + 388800, // 4.5일 후 만료
    3100
  ),
  createMockPosition(
    "BTC",
    134000,
    7,
    110,
    130,
    140,
    12.73,
    -770,
    "Call",
    "Buy",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 108000 // 1.25일 후 만료
  ),
  createMockPosition(
    "ETH",
    2900,
    11,
    65,
    72,
    77,
    11.85,
    715,
    "Put",
    "Sell",
    "Vanilla",
    Math.floor(Date.now() / 1000) + 864000 // 10일 후 만료
  ),
];

