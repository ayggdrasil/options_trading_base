import { VolatilityScore } from "@callput/shared";

export interface NumericKeyValue {
  [key: string]: number;
}

export interface Olppv {
  data: NumericKeyValue;
  lastUpdatedAt: number;
  positionKeysStart: string;
}

export type VolatilityScoreRes = {
  data: VolatilityScore;
  lastUpdatedAt: number;
};

export interface TimeSeriesData {
  [timestamp: string]: NumericKeyValue;
}
