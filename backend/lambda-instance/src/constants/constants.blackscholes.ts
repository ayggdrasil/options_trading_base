export const MAX_UTILITY_RATIO = 1;
export const UR_INITIAL_MULTIPLIER = 0.5;
export const UR_THRESHOLD = 0.4;

export const TOTAL_RATIO = 1.3; //전체 웨이트를 움직이는 비율
export const MUL_RATIO = 1.1; //RP_Mul 그래프의 기울기 조정

export const UA_RATIO = {
  //BTC 대비 ETH의 스프레드 비율
  BTC: 1,
  ETH: 0.6,
};

export const CP_RATIO = {
  //Put 대비 Call의 스프레드 비율
  Call: 1.2,
  Put: 1,
};

export const RP_MUL_ARRAY = [
  [24.45, -0.46, 1.21], // Short-Term (x2의 계수, x의 계수, 상수항의 계수)
  [32.25, -0.46, 1.12], // Mid-Term (weekly) (x2의 계수, x의 계수, 상수항의 계수)
  [19.2, -0.46, 1.23], // Mid-Term (monthly) (x2의 계수, x의 계수, 상수항의 계수)
];

export const ST_list = [
  100000 * 10 ** 0,
  100000 * 10 ** 1,
  100000 * 10 ** 2,
  100000 * 10 ** 3,
  100000 * 10 ** 4,
];

export const MIN_RATE = 1;
export const MAX_RATE = 2;

export const MAX_RISK_PREMIUM_RATE_FOR_SHORT = 0.8;

export const RP_WEIGHT_V3 = {
  BTC: [
    [0.00012, 0.0009, 0.0009], // Short-Term (Delta, Vega, Theta)
    [0.0000768, 0.000384, 0.000384], // Mid-Term (Delta, Vega, Theta)
    [0, 0, 0], // // Long-Term (Delta, Vega, Theta)
  ],
  ETH: [
    [0.00012, 0.0009, 0.0009], // Short-Term (Delta, Vega, Theta)
    [0.0000768, 0.000384, 0.000384], // Mid-Term (Delta, Vega, Theta)
    [0, 0, 0], // // Long-Term (Delta, Vega, Theta)
  ],
};

export const RP_SHORT_TERM = 2;
export const RP_MID_TERM = 90;
export const RP_DEFAULT_VALUE = 0.002; // $0.002