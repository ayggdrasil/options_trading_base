import {
  FuturesAssetIndexMapRes,
  FuturesAssetNumberMap,
  FuturesAssetNumberTimeSeries,
  VolatilityScore,
} from '@callput/shared';
import { VolatilityScoreRes } from '../feed/interfaces';
import { getDailyRedis, initializeRedis } from '../redis';
import { getPercentageChange } from './calculation';
import { getDateISOString } from './date';
import { REDIS_KEYS } from './redis-key';

type Timeframe = '1m' | '5m' | '15m' | '60m' | '4h' | '12h' | '24h';

const TIMEFRAMES: {
  [key in Timeframe]: number;
} = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '60m': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
} as const;

type ScoreTable = {
  [key: number]: {
    [key in Timeframe]: number;
  };
};

// Key is the percentage of the difference between the current and previous price
// const SCORE_TABLE: ScoreTable = { // Version 1: 2025-04-23
//   0: { '1m': 0.0, '5m': 0.0, '15m': 0.0, '60m': 0.0, '4h': 0.0, '12h': 0.0, '24h': 0.0 },
//   0.0025: { '1m': 0.02, '5m': 0.01, '15m': 0.01, '60m': 0.005, '4h': 0.005, '12h': 0.001, '24h': 0.0005 },
//   0.005: { '1m': 0.03, '5m': 0.02, '15m': 0.02, '60m': 0.01, '4h': 0.01, '12h': 0.003, '24h': 0.0015 },
//   0.01: { '1m': 0.05, '5m': 0.03, '15m': 0.03, '60m': 0.015, '4h': 0.015, '12h': 0.005, '24h': 0.0025 },
//   0.02: { '1m': 0.1, '5m': 0.05, '15m': 0.05, '60m': 0.025, '4h': 0.025, '12h': 0.008, '24h': 0.004 },
//   0.05: { '1m': 0.2, '5m': 0.1, '15m': 0.1, '60m': 0.05, '4h': 0.05, '12h': 0.01, '24h': 0.006 },
// } as const;
// const SCORE_TABLE: ScoreTable = { // Version 2: 2025-06-23
//   0: { '1m': 0.0, '5m': 0.0, '15m': 0.0, '60m': 0.0, '4h': 0.0, '12h': 0.0, '24h': 0.0 },
//   0.0025: { '1m': 0.012, '5m': 0.008, '15m': 0.004, '60m': 0.0016, '4h': 0.0008, '12h': 0.0004, '24h': 0.0002 },
//   0.005: { '1m': 0.016, '5m': 0.012, '15m': 0.008, '60m': 0.004, '4h': 0.0016, '12h': 0.0008, '24h': 0.0003 },
//   0.01: { '1m': 0.032, '5m': 0.024, '15m': 0.012, '60m': 0.008, '4h': 0.0032, '12h': 0.0016, '24h': 0.0006 },
//   0.02: { '1m': 0.064, '5m': 0.04, '15m': 0.024, '60m': 0.016, '4h': 0.0064, '12h': 0.0032, '24h': 0.0012 },
//   0.05: { '1m': 0.12, '5m': 0.08, '15m': 0.04, '60m': 0.024, '4h': 0.008, '12h': 0.0048, '24h': 0.0016 },
// } as const;
const SCORE_TABLE: ScoreTable = {
  // Version 3: 2025-07-02
  0.0: { '1m': 0.0, '5m': 0.0, '15m': 0.0, '60m': 0.0, '4h': 0.0, '12h': 0.0, '24h': 0.0 },
  0.25: { '1m': 0.2, '5m': 0.1, '15m': 0.05, '60m': 0.02, '4h': 0.01, '12h': 0.01, '24h': 0.0 },
  0.5: { '1m': 0.5, '5m': 0.2, '15m': 0.1, '60m': 0.05, '4h': 0.02, '12h': 0.01, '24h': 0.01 },
  1.0: { '1m': 1.0, '5m': 0.5, '15m': 0.2, '60m': 0.1, '4h': 0.02, '12h': 0.01, '24h': 0.01 },
  2.0: { '1m': 1.5, '5m': 1.0, '15m': 0.5, '60m': 0.2, '4h': 0.04, '12h': 0.02, '24h': 0.01 },
  4.0: { '1m': 3.0, '5m': 1.5, '15m': 1.0, '60m': 0.5, '4h': 0.08, '12h': 0.04, '24h': 0.02 },
  5.0: { '1m': 5.0, '5m': 3.0, '15m': 2.0, '60m': 1.0, '4h': 0.15, '12h': 0.08, '24h': 0.04 },
  10.0: { '1m': 10.0, '5m': 5.0, '15m': 3.0, '60m': 1.5, '4h': 0.2, '12h': 0.1, '24h': 0.06 },
} as const;

const SCORE_TABLE_THRESHOLD = Object.keys(SCORE_TABLE)
  .map(Number)
  .sort((a, b) => a - b);

// Score Table 기준 마지막 인덱스에서 각각 timeframe 별 점수의 합
const MAX_VOLATILITY_SCORE = Object.values(
  SCORE_TABLE[SCORE_TABLE_THRESHOLD[SCORE_TABLE_THRESHOLD.length - 1]],
).reduce((acc, curr) => acc + curr, 0);

function convertTimeSeriesDataToEntries(
  data: FuturesAssetNumberTimeSeries,
): { timestamp: number; data: FuturesAssetNumberMap }[] {
  return Object.entries(data).map(([timestamp, data]) => ({
    timestamp: parseInt(timestamp),
    data,
  }));
}

// assume that SCORE_TABLE_THRESHOLD is sorted in ascending order
function getScore(percentageChange: number, timeframe: Timeframe): number {
  if (percentageChange === 0 || isNaN(Number(percentageChange))) {
    return SCORE_TABLE[0][timeframe];
  }
  for (let i = 0; i < SCORE_TABLE_THRESHOLD.length; i++) {
    const threshold = SCORE_TABLE_THRESHOLD[i];
    const nextThreshold = SCORE_TABLE_THRESHOLD[i + 1];
    if (percentageChange < nextThreshold || i === SCORE_TABLE_THRESHOLD.length - 1) {
      return SCORE_TABLE[threshold][timeframe];
    }
  }
}

export async function calculateVolatilityScore(): Promise<VolatilityScoreRes> {
  const { redisGlobal } = await initializeRedis();

  const currentTimestamp = Date.now();
  const yesterdayISOString = getDateISOString(-1);
  const todayISOString = getDateISOString(0);

  const [currentFuturesData, yesterdayFuturesDailyData, todayFuturesDailyData] = await Promise.all([
    redisGlobal.get(REDIS_KEYS.FUTURES.MAIN),
    getDailyRedis(`${REDIS_KEYS.FUTURES.DAILY}:${yesterdayISOString}`, true),
    getDailyRedis(`${REDIS_KEYS.FUTURES.DAILY}:${todayISOString}`, true),
  ]);

  const currentFutures = JSON.parse(currentFuturesData) as FuturesAssetIndexMapRes;

  if (!currentFutures || !yesterdayFuturesDailyData || !todayFuturesDailyData) {
    return { data: { BTC: 0, btc: 0, ETH: 0, eth: 0 }, lastUpdatedAt: currentTimestamp };
  }

  const yesterdayEntries = convertTimeSeriesDataToEntries(
    yesterdayFuturesDailyData.data as FuturesAssetNumberTimeSeries,
  );
  const todayEntries = convertTimeSeriesDataToEntries(
    todayFuturesDailyData.data as FuturesAssetNumberTimeSeries,
  );
  const allFutures = [...yesterdayEntries, ...todayEntries].sort((a, b) => a.timestamp - b.timestamp);

  const result: VolatilityScore = {
    BTC: 0,
    btc: 0,
    ETH: 0,
    eth: 0,
  };
  const targetFuturesByTimeframe: Record<string, { data: FuturesAssetNumberMap; timestamp: number }> = {};

  // Find target timestamps for each timeframe once
  for (const timeframe in TIMEFRAMES) {
    const millisecondsAgo = TIMEFRAMES[timeframe as Timeframe];
    const targetTimestamp = currentTimestamp - millisecondsAgo;
    const targetFutures = allFutures.find((entry) => entry.timestamp >= targetTimestamp);

    if (!targetFutures) {
      continue;
    }

    targetFuturesByTimeframe[timeframe] = {
      data: targetFutures.data,
      timestamp: targetFutures.timestamp,
    };
  }

  // Calculate volatility score for each asset
  for (const underlyingAsset in currentFutures.data) {
    let totalScore = 0;
    const currentUnderlyingAssetPrice = currentFutures.data[underlyingAsset];

    for (const timeframe in targetFuturesByTimeframe) {
      const { data: targetFutures } = targetFuturesByTimeframe[timeframe];

      if (!(underlyingAsset in targetFutures)) {
        continue;
      }

      const targetAssetPrice = targetFutures[underlyingAsset];
      const percentageChange = getPercentageChange(targetAssetPrice, currentUnderlyingAssetPrice);

      const score = getScore(percentageChange, timeframe as Timeframe);
      totalScore += score;
    }

    result[underlyingAsset] = Math.min(MAX_VOLATILITY_SCORE, totalScore);
  }

  return {
    data: result,
    lastUpdatedAt: currentTimestamp,
  };
}
