export const RP_DEFAULT_VALUE = 0.002; // $0.002
export const RP_MAX_RATE_FOR_SHORT_TERM = 0.8;
export const RP_SHORT_TERM_IN_DAYS = 2;
export const RP_MID_TERM_IN_DAYS = 90;
export const RP_MUL_ARRAY = [
  [24.45, -0.46, 1.21], // Short-Term (x2의 계수, x의 계수, 상수항의 계수)
  [32.25, -0.46, 1.12], // Mid-Term (weekly) (x2의 계수, x의 계수, 상수항의 계수)
  [19.2, -0.46, 1.23], // Mid-Term (monthly) (x2의 계수, x의 계수, 상수항의 계수)
];
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
