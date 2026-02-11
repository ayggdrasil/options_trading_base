export const TOTAL_RATIO = 1.3; //전체 웨이트를 움직이는 비율
export const UNDERLYING_ASSET_RATIO = {
  //BTC 대비 ETH의 스프레드 비율
  BTC: 1,
  ETH: 0.6,
};
export const CALL_PUT_RATIO = {
  //Put 대비 Call의 스프레드 비율
  Call: 1.2,
  Put: 1,
};
export const MUL_RATIO = 1.1; //RP_Mul 그래프의 기울기 조정

export const UR_MAX_VALUE = 1;
export const UR_INITIAL_MULTIPLIER = 0.5;
export const UR_THRESHOLD = 0.4;

export const OLP_STANDARD_SIZES = [
  100000 * 10 ** 0,
  100000 * 10 ** 1,
  100000 * 10 ** 2,
  100000 * 10 ** 3,
  100000 * 10 ** 4,
];

export const UNIT_PERCENTAGE_MIN_RATE = 1;
export const UNIT_PERCENTAGE_MAX_RATE = 2;
