import BigNumber from 'bignumber.js';
import { fetchDataFromS3, putS3 } from '../utils/aws';
import { sendMessage } from '../utils/slack';
import { LogLevel } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';
import initializeContracts from '../contract';
import { Contract } from 'ethers';
import { CONTRACT_ADDRESSES } from '../constants/constants.addresses';
import { getMarketDataS3 } from '../utils/aws-getter';
import { Olppv } from './interfaces';
import { shouldUpdateOlppv } from './helpers';
import { isIgnorableError } from '../utils/helper';
import {
  calculateCollateralUsd,
  ChainNames,
  generateOptionTokenData,
  getInstrumentOptionDataFromMarket,
  isBuyStrategy,
  isCallSpreadStrategy,
  parseOptionTokenId,
  SpotAssetIndexMap,
  UA_INDEX_TO_TICKER,
  UA_TICKER_TO_DECIMAL,
  UnderlyingAssetIndex,
} from '@callput/shared';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

const initialOlppv: Olppv = {
  data: {},
  lastUpdatedAt: 0,
  positionKeysStart: '0',
};

export const updateOlppv = async () => {
  try {
    const prevOlppv = await fetchDataFromS3({
      Bucket: process.env.APP_DATA_BUCKET,
      Key: process.env.APP_DATA_OLPPV_KEY,
      initialData: initialOlppv,
    });

    const currOlppv = await getOlppvFromOnchain();

    const shouldUpdate = shouldUpdateOlppv(prevOlppv, currOlppv);

    console.log('update.olppv.ts: prevOlppv ', prevOlppv);
    console.log('update.olppv.ts: currOlppv ', currOlppv);
    console.log('update.olppv.ts: shouldUpdate ', shouldUpdate);

    if (shouldUpdate) {
      await putS3({
        Bucket: process.env.APP_DATA_BUCKET,
        Key: process.env.APP_DATA_OLPPV_KEY,
        Body: JSON.stringify(currOlppv),
        CacheControl: 'no-cache',
      });

      console.log('update.olppv.ts: olppv has been updated successfully.');
    }
  } catch (error) {
    console.log('Error processing olppv:', error);
    await sendMessage(
      `\`[Lambda][update.olppv.ts]\` ${MESSAGE_TYPE.ERROR_DURING_FEEDING_OLPPV}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      },
    );
  }
};

const getOlppvFromOnchain = async () => {
  const { PositionManager, ViewAggregator } = await initializeContracts();
  const [positionKeysStart, marketData] = await Promise.all([
    PositionManager.positionRequestKeysStart(),
    getMarketDataS3(),
  ]);

  // Call both getAllOptionToken and positionRequestKeysStart atomically
  const olppv = await getOlppvV2(marketData, ViewAggregator).catch(async (error) => {
    console.log('Error processing olppv v2:', error);
    return await getOlppvV3(marketData, ViewAggregator).catch(async (error) => {
      console.log('Error processing olppv v3:', error);

      const isIgnorable = isIgnorableError(error);

      if (!isIgnorable) {
        await sendMessage(
          `\`[Lambda][update.olppv.ts]\` ${MESSAGE_TYPE.ERROR_DURING_GETTING_OLPPV_FROM_ONCHAIN}`,
          LogLevel.ERROR,
          {
            description: error?.message || error,
          },
        );
      }

      return {
        sOlp: 0,
        mOlp: 0,
        lOlp: 0,
      };
    });
  });

  return {
    data: olppv,
    lastUpdatedAt: Date.now(),
    positionKeysStart: positionKeysStart.toString(),
  };
};

const getOlppvV2 = async (data: any, ViewAggregator: Contract) => {
  const result = await ViewAggregator.getAllOptionToken();

  return result.reduce(
    (acc, positions, index) => {
      const olpCategory = ['sOlp', 'mOlp', 'lOlp'][index];
      acc[olpCategory] = getPvFromPositions(index, positions, data);
      return acc;
    },
    { sOlp: 0, mOlp: 0, lOlp: 0 },
  );
};

/*
 * allExpiries is an array of all expiries of all vaults [selfOriginExpiries of sVault, externalOriginExpiries of sVault, selfOriginExpiries of mVault, ...]
 * - the length of allExpiries is 6 if there are 3 vaults
 *
 * chunkCounts is an array of the number of chunks for each vault [sVaultChunkCount, mVaultChunkCount, lVaultChunkCount]
 * - each chunkCount is the number of chunks for each vault containing selfOrigin and externalOrigin
 * - for example, sVault can have 3 chunks [selfOriginChunk1, selfOriginChunk2, externalOriginChunk1]
 * - for example, mVault can have 2 chunks [selfOriginChunk1, selfOriginChunk2]
 *
 * results is an array of all option tokens of each chunk
 * - we have to know endIndexes to separate each vault's option tokens
 * - following the example above, the endIndexes would be [3, 5] because sVault has 3 chunks and mVault has 2 chunks
 * - so, the first 3 chunks are sVault's option tokens and the rest are mVault's option tokens
 *
 */
const getOlppvV3 = async (data, ViewAggregator: Contract) => {
  const chainId = Number(process.env.CHAIN_ID);
  const allExpiries = await ViewAggregator.getAllExpiries();

  const chunkArray = (array, size) => {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  };

  const multicallToGetPositions = [];
  const pageSize = 2;

  const vaultUtils = [
    CONTRACT_ADDRESSES[chainId].S_VAULT_UTILS,
    CONTRACT_ADDRESSES[chainId].M_VAULT_UTILS,
    CONTRACT_ADDRESSES[chainId].L_VAULT_UTILS,
  ];

  let chunkCounts = [0, 0, 0];

  allExpiries.forEach((expiries, index) => {
    const vaultUtilsIndex = index;

    let startIndex = 0;

    const chunks = chunkArray(expiries, pageSize);

    chunks.forEach((chunk) => {
      multicallToGetPositions.push(
        ViewAggregator.getOptionTokens(vaultUtils[vaultUtilsIndex], startIndex, startIndex + chunk.length),
      );
      startIndex += chunk.length;
    });

    chunkCounts[vaultUtilsIndex] += chunks.length; // count chunks for each vault
  });

  const results = await Promise.all(multicallToGetPositions);

  const endIndexes = chunkCounts.reduce((acc, curr) => {
    if (acc.length === 0) return [curr];
    return [...acc, acc[acc.length - 1] + curr];
  }, []);

  return results.reduce(
    (acc, positions, index) => {
      const olpCategoryIndex = endIndexes.findIndex((endIndex) => index < endIndex);
      const olpCategory = ['sOlp', 'mOlp', 'lOlp'][olpCategoryIndex];
      acc[olpCategory] = new BigNumber(acc[olpCategory])
        .plus(getPvFromPositions(olpCategoryIndex, positions, data))
        .toNumber();
      return acc;
    },
    { sOlp: 0, mOlp: 0, lOlp: 0 },
  );
};

const getPvFromPositions = (index, positions, data) => {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  const marketData = data.market;
  const spotAssetIndexMap = data.spotIndices as SpotAssetIndexMap;

  const optionInfo = getInstrumentOptionDataFromMarket(marketData);

  return positions.reduce((acc, position) => {
    const [optionTokenId, size] = position;

    const { underlyingAssetIndex, strategy, length, strikePrices, vaultIndex } =
      parseOptionTokenId(optionTokenId);
    const isBuy = isBuyStrategy(strategy);

    const { optionNames } = generateOptionTokenData(chainName, optionTokenId);
    const optionNamesArr = optionNames.split(',');

    let markPrice = 0;

    if (length === 1) {
      const optionName = optionNamesArr[0];

      if (optionName && optionInfo[optionName]) {
        markPrice = optionInfo[optionName].markPrice || 0;
      }
    } else if (length === 2) {
      const mainOptionName = isCallSpreadStrategy(strategy) ? optionNamesArr[0] : optionNamesArr[1];
      const pairedOptionName = isCallSpreadStrategy(strategy) ? optionNamesArr[1] : optionNamesArr[0];

      if (mainOptionName && optionInfo[mainOptionName] && pairedOptionName && optionInfo[pairedOptionName]) {
        const mainOptionMarkPrice = optionInfo[mainOptionName].markPrice || 0;
        const pairedOptionMarkPrice = optionInfo[pairedOptionName].markPrice || 0;
        markPrice =
          mainOptionMarkPrice >= pairedOptionMarkPrice ? mainOptionMarkPrice - pairedOptionMarkPrice : 0;
      }
    }

    const underlyingAsset = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];
    const decimals = UA_TICKER_TO_DECIMAL[chainName][underlyingAsset];

    const underlyingAssetSpotIndex = spotAssetIndexMap[underlyingAsset];

    const positionValue = new BigNumber(markPrice)
      .multipliedBy(size)
      .multipliedBy(isBuy ? 1 : -1)
      .dividedBy(10 ** decimals)
      .toNumber();

    let collateralValue = 0;

    // @check should be deprecated after the close position logic changes
    if (!isBuy && vaultIndex !== index) {
      collateralValue = calculateCollateralUsd({
        strategy,
        strikePrices,
        size,
        underlyingAssetSpotIndex,
      });
    }

    return new BigNumber(acc).plus(positionValue).plus(collateralValue).toNumber();
  }, 0);
};
