import BigNumber from 'bignumber.js';
import initializeContracts from '../contract';
import { sendMessage } from '../utils/slack';
import { LogLevel } from '../utils/enums';
import { getSpotS3, getOlppvS3 } from '../utils/aws-getter';
import { REDIS_KEYS } from '../utils/redis-key';
import { initializeRedis } from '../redis';
import { SENSITIVITY_SPOT_RATE, UPDATE_THRESHOLD_SPOT_IN_MS } from '../constants/global';
import { CONTRACT_ADDRESSES } from '../constants/constants.addresses';
import { processFeedTx } from '../utils/tx-processing';
import { Keeper } from '../constants/safe';
import { getDeadline } from '../utils/misc';
import { shouldUpdateMarketIndex, shouldUpdateOlppv } from './helpers';
import { isIgnorableError } from '../utils/helper';
import { SpotAssetIndexMapRes } from '@callput/shared';
import { Olppv } from './interfaces';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export const feedUnified = async (assets: string[]) => {
  const { redis } = await initializeRedis();
  const chainId = Number(process.env.CHAIN_ID);

  try {
    const [prevSpot, spot, prevOlppv, olppv] = await Promise.all([
      redis.get(REDIS_KEYS.SPOT.LAST_FEED),
      getSpotS3(),
      redis.get(REDIS_KEYS.OLP.PV.LAST_FEED),
      getOlppvS3(),
    ]);
    const parsedPrevSpot = prevSpot ? (JSON.parse(prevSpot) as SpotAssetIndexMapRes) : null;
    const parsedPrevOlppv = prevOlppv ? (JSON.parse(prevOlppv) as Olppv) : null;

    const shouldSpotUpdate =
      !prevSpot ||
      shouldUpdateMarketIndex(
        assets,
        parsedPrevSpot,
        spot,
        SENSITIVITY_SPOT_RATE,
        UPDATE_THRESHOLD_SPOT_IN_MS,
      );

    const shouldOlppvUpdate = !prevOlppv || shouldUpdateOlppv(parsedPrevOlppv, olppv);

    const shouldUpdate = shouldSpotUpdate || shouldOlppvUpdate;

    console.log('feed.unified.ts: prevSpot ', parsedPrevSpot);
    console.log('feed.unified.ts: spot ', spot);
    console.log('feed.unified.ts: shouldSpotUpdate ', shouldSpotUpdate);

    console.log('feed.unified.ts: prevOlppv ', parsedPrevOlppv);
    console.log('feed.unified.ts: olppv ', olppv);
    console.log('feed.unified.ts: shouldOlppvUpdate ', shouldOlppvUpdate);
    
    console.log('feed.unified.ts: shouldUpdate ', shouldUpdate);

    if (!shouldUpdate) {
      console.log('feed.unified.ts: No updates needed');
      return;
    }

    const { SpotPriceFeed, PositionValueFeed } = await initializeContracts();

    const spotTxData = await SpotPriceFeed.feedSpotPrices.populateTransaction(
      assets.map((asset) => {
        if (asset === 'USDC') return CONTRACT_ADDRESSES[chainId].USDC;
        return CONTRACT_ADDRESSES[chainId][`W${asset}`];
      }),
      assets.reduce((acc, cur) => {
        acc.push(new BigNumber(spot.data[cur]).multipliedBy(10 ** 30).toString());
        return acc;
      }, []),
      getDeadline(),
    );

    const olppvTxData = await PositionValueFeed.feedPV.populateTransaction(
      [
        CONTRACT_ADDRESSES[chainId].S_VAULT,
        CONTRACT_ADDRESSES[chainId].M_VAULT,
        CONTRACT_ADDRESSES[chainId].L_VAULT,
      ],
      [olppv.data.sOlp, olppv.data.mOlp, olppv.data.lOlp].map((price) =>
        new BigNumber(price)
          .multipliedBy(10 ** 30)
          .abs()
          .toFixed(0),
      ),
      [olppv.data.sOlp, olppv.data.mOlp, olppv.data.lOlp].map((price) => new BigNumber(price).isNegative()),
      getDeadline(),
    );

    await processFeedTx('feedUnified', async () => {
      const { safeTxBatch } = await import('../../safeTx');
      return await safeTxBatch(
        Keeper.PV_FEEDER, // This keeper should have permissions for both feeds
        [
          {
            to: spotTxData.to as string,
            data: spotTxData.data as string,
            value: '0',
          },
          {
            to: olppvTxData.to as string,
            data: olppvTxData.data as string,
            value: '0',
          },
        ],
      );
    });

    await Promise.all([
      redis.set(REDIS_KEYS.SPOT.LAST_FEED, JSON.stringify(spot)),
      redis.set(REDIS_KEYS.OLP.PV.LAST_FEED, JSON.stringify(olppv)),
    ]);

    console.log('feed.unified.ts: spot and olppv have been fed successfully.');
  } catch (error) {
    console.log('Error processing unified feed:', error);

    const isIgnorable = isIgnorableError(error);

    if (!isIgnorable) {
      await sendMessage(
        `\`[Lambda][feed.unified.ts]\` Error during unified feed (Spot + Olppv)`,
        LogLevel.ERROR,
        {
          description: error?.message || error,
        },
      );
    }

    return;
  }
};
