import BigNumber from 'bignumber.js';
import initializeContracts from '../contract';
import { sendMessage } from '../utils/slack';
import { LogLevel } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';
import { getSpotS3 } from '../utils/aws-getter';
import { REDIS_KEYS } from '../utils/redis-key';
import { initializeRedis } from '../redis';
import { SENSITIVITY_SPOT_RATE, UPDATE_THRESHOLD_SPOT_IN_MS } from '../constants/global';
import { CONTRACT_ADDRESSES } from '../constants/constants.addresses';
import { processFeedTx } from '../utils/tx-processing';
import { makeTx } from '../../makeTx';
import { getDeadline } from '../utils/misc';
import { shouldUpdateMarketIndex } from './helpers';
import { isIgnorableError } from '../utils/helper';
import { SpotAssetIndexMapRes } from '@callput/shared';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export const feedSpot = async (assets: string[]) => {
  const { redis } = await initializeRedis();

  const chainId = Number(process.env.CHAIN_ID);

  try {
    const [prevSpot, spot] = await Promise.all([redis.get(REDIS_KEYS.SPOT.LAST_FEED), getSpotS3()]);
    const parsedPrevSpot = prevSpot ? (JSON.parse(prevSpot) as SpotAssetIndexMapRes) : null;

    const shouldUpdate =
      !prevSpot ||
      shouldUpdateMarketIndex(
        assets,
        parsedPrevSpot,
        spot,
        SENSITIVITY_SPOT_RATE,
        UPDATE_THRESHOLD_SPOT_IN_MS,
      );

    console.log('feed.spot.ts: prevSpot ', parsedPrevSpot);
    console.log('feed.spot.ts: spot ', spot);
    console.log('feed.spot.ts: shouldUpdate ', shouldUpdate);

    if (shouldUpdate) {
      const { SpotPriceFeed, keeper_spotPriceFeeder } = await initializeContracts();

      const result = await processFeedTx('feedSpot', async () => {
        return await makeTx(
          SpotPriceFeed,
          keeper_spotPriceFeeder,
          'feedSpotPrices',
          [
            assets.map((asset) => {
              if (asset === 'USDC') return CONTRACT_ADDRESSES[chainId].USDC;
              return CONTRACT_ADDRESSES[chainId][`W${asset}`];
            }),
            assets.reduce((acc, cur) => {
              acc.push(new BigNumber(spot.data[cur]).multipliedBy(10 ** 30).toString());
              return acc;
            }, []),
            getDeadline(),
          ],
          true, // shouldCheckPendingMakeTx
        );
      });

      if (!result?.isSuccess) {
        console.error('feed.spot.ts: Failed to feed spot', {
          txHash: result?.txHash,
          receipt: result?.receipt,
        });
        return;
      }

      await redis.set(REDIS_KEYS.SPOT.LAST_FEED, JSON.stringify(spot));
      console.log('feed.spot.ts: spot has been feeded successfully.');
    }
  } catch (error) {
    console.log('Error processing feeding spot:', error);

    const isIgnorable = isIgnorableError(error);

    if (!isIgnorable) {
      await sendMessage(
        `\`[Lambda][feed.spot.ts]\` ${MESSAGE_TYPE.ERROR_DURING_FEEDING_SPOT_INDICES}`,
        LogLevel.ERROR,
        {
          description: error?.message || error,
        },
      );
    }

    return;
  }
};
