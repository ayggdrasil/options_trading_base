import { FuturesAssetIndexMapRes, SpotAssetIndexMapRes } from '@callput/shared';
import { Olppv } from '../feed/interfaces';
import { getS3 } from './aws';

export const getFuturesS3 = async (): Promise<FuturesAssetIndexMapRes> => {
  const futures = await getS3({
    Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
    Key: process.env.APP_GLOBAL_DATA_FUTURES_KEY,
  });

  if (!futures?.data || Object.keys(futures.data).length === 0 || futures.lastUpdatedAt <= 0) {
    throw new Error(`Invalid futures data format: ${JSON.stringify(futures)}`);
  }

  return futures;
};

export const getSpotS3 = async (): Promise<SpotAssetIndexMapRes> => {
  const spot = await getS3({
    Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
    Key: process.env.APP_GLOBAL_DATA_SPOT_KEY,
  });

  if (!spot?.data || Object.keys(spot.data).length === 0 || spot.lastUpdatedAt <= 0) {
    throw new Error(`Invalid spot data format: ${JSON.stringify(spot)}`);
  }

  return spot;
};

export const getOlppvS3 = async (): Promise<Olppv> => {
  const olppv = await getS3({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: process.env.APP_DATA_OLPPV_KEY,
  });

  if (!olppv?.data || Object.keys(olppv.data).length === 0 || olppv.lastUpdatedAt <= 0) {
    throw new Error(`Invalid olppv data format: ${JSON.stringify(olppv)}`);
  }

  return olppv;
};

export const getRiskFreeRatesS3 = async () => {
  const riskFreeRates = await getS3({
    Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
    Key: process.env.APP_GLOBAL_DATA_RISK_FREE_RATES_KEY,
  });

  if (!riskFreeRates) {
    throw new Error('RiskFreeRates is not available');
  }

  return riskFreeRates;
};

export const getMarketDataS3 = async () => {
  const marketData = await getS3({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: process.env.APP_DATA_MARKET_DATA_KEY,
  });

  if (!marketData?.data || marketData.lastUpdatedAt <= 0) {
    throw new Error(`Invalid market data format: ${JSON.stringify(marketData)}`);
  }

  return marketData.data;
};
