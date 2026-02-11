import BigNumber from 'bignumber.js';
import { Olppv } from './interfaces';
import { SENSITIVITY_OLPPV_RATE, UPDATE_THRESHOLD_OLPPV_IN_MS } from '../constants/global';
import { FuturesAssetIndexMapRes, SpotAssetIndexMapRes } from '@callput/shared';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export const shouldUpdateMarketIndex = (
  assets: string[],
  prevIndex: SpotAssetIndexMapRes | FuturesAssetIndexMapRes,
  currIndex: SpotAssetIndexMapRes | FuturesAssetIndexMapRes,
  sensitivityRate: number,
  updateThreshold: number,
): boolean => {
  const timeElapsed = currIndex.lastUpdatedAt - prevIndex.lastUpdatedAt;

  if (timeElapsed <= 0) return false;

  return assets.some((asset) => {
    if (!prevIndex.data[asset] || prevIndex.data[asset] === 0) return true;
    if (!currIndex.data[asset] || currIndex.data[asset] === 0) return false;

    const valueDiffRate = getValueDiffRate(prevIndex.data[asset], currIndex.data[asset]);

    const isValueDiffRateGreaterThanSensitivityRate = valueDiffRate > sensitivityRate;
    const isTimeElapsedGreaterThanUpdateThreshold = timeElapsed >= updateThreshold;

    if (isValueDiffRateGreaterThanSensitivityRate) {
      console.log('isValueDiffRateGreaterThanSensitivityRate', isValueDiffRateGreaterThanSensitivityRate);
      console.log('asset', asset);
      console.log('valueDiffRate', valueDiffRate);
      console.log('sensitivityRate', sensitivityRate);
      return true;
    }

    if (isTimeElapsedGreaterThanUpdateThreshold) {
      console.log('isTimeElapsedGreaterThanUpdateThreshold', isTimeElapsedGreaterThanUpdateThreshold);
      console.log('asset', asset);
      console.log('timeElapsed', timeElapsed);
      console.log('updateThreshold', updateThreshold);
      return true;
    }

    return false;
  });
};

export const shouldUpdateOlppv = (prevOlppv: Olppv, currOlppv: Olppv): boolean => {
  const timeElapsed = currOlppv.lastUpdatedAt - prevOlppv.lastUpdatedAt;

  if (timeElapsed <= 0) return false;

  return ['sOlp'].some((olp) => {
    // if (!prevOlppv.data[olp] || prevOlppv.data[olp] === 0) return true;
    // if (!currOlppv.data[olp] || currOlppv.data[olp] === 0) return false;

    const valueDiffRate = getValueDiffRate(prevOlppv.data[olp], currOlppv.data[olp]);

    const isValueDiffRateGreaterThanSensitivityRate = valueDiffRate > SENSITIVITY_OLPPV_RATE;
    const isTimeElapsedGreaterThanUpdateThreshold = timeElapsed >= UPDATE_THRESHOLD_OLPPV_IN_MS;

    if (isValueDiffRateGreaterThanSensitivityRate) {
      console.log('isValueDiffRateGreaterThanSensitivityRate', isValueDiffRateGreaterThanSensitivityRate);
      console.log('valueDiffRate', valueDiffRate);
      console.log('SENSITIVITY_OLPPV_RATE', SENSITIVITY_OLPPV_RATE);
      return true;
    }

    if (isTimeElapsedGreaterThanUpdateThreshold) {
      console.log('isTimeElapsedGreaterThanUpdateThreshold', isTimeElapsedGreaterThanUpdateThreshold);
      console.log('timeElapsed', timeElapsed);
      console.log('UPDATE_THRESHOLD_OLPPV_IN_MS', UPDATE_THRESHOLD_OLPPV_IN_MS);
      return true;
    }

    return false;
  });
};

const getValueDiffRate = (prevValue: number, currValue: number): number => {
  return Math.abs(1 - currValue / prevValue);
};
