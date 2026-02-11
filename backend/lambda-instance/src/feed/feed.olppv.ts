import BigNumber from 'bignumber.js';
import initializeContracts from '../contract';
import { sendMessage } from '../utils/slack';
import { LogLevel } from '../utils/enums';
import { MESSAGE_TYPE } from '../utils/messages';
import { getOlppvS3 } from '../utils/aws-getter';
import { REDIS_KEYS } from '../utils/redis-key';
import { initializeRedis } from '../redis';
import { CONTRACT_ADDRESSES } from '../constants/constants.addresses';
import { processFeedTx } from '../utils/tx-processing';
import { makeTx } from '../../makeTx';
import { getDeadline } from '../utils/misc';
import { shouldUpdateOlppv } from './helpers';
import { isIgnorableError } from '../utils/helper';
import { Olppv } from './interfaces';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export const feedOlppv = async () => {
  const { redis } = await initializeRedis();

  const chainId = Number(process.env.CHAIN_ID);

  try {
    const [prevOlppv, olppv] = await Promise.all([redis.get(REDIS_KEYS.OLP.PV.LAST_FEED), getOlppvS3()]);
    const parsedPrevOlppv = prevOlppv ? (JSON.parse(prevOlppv) as Olppv) : null;

    const shouldUpdate = !prevOlppv || shouldUpdateOlppv(parsedPrevOlppv, olppv);

    console.log('feed.olppv.ts: prevOlppv ', parsedPrevOlppv);
    console.log('feed.olppv.ts: olppv ', olppv);
    console.log('feed.olppv.ts: shouldUpdate ', shouldUpdate);

    if (shouldUpdate) {
      const { PositionValueFeed, keeper_positionValueFeeder } = await initializeContracts();

      const result = await processFeedTx('feedOlpPv', async () => {
        return await makeTx(
          PositionValueFeed,
          keeper_positionValueFeeder,
          'feedPV',
          [
            [
              CONTRACT_ADDRESSES[chainId].S_VAULT,
              CONTRACT_ADDRESSES[chainId].M_VAULT,
              CONTRACT_ADDRESSES[chainId].L_VAULT,
            ],
            [olppv.data.sOlp, olppv.data.mOlp, olppv.data.lOlp].map((price) =>
              new BigNumber(price)
                .multipliedBy(10 ** 30) // PRECISON: 30
                .abs()
                .toFixed(0),
            ),
            [olppv.data.sOlp, olppv.data.mOlp, olppv.data.lOlp].map((price) =>
              new BigNumber(price).isNegative(),
            ),
            olppv.positionKeysStart,
            getDeadline(),
          ],
          true, // shouldCheckPendingMakeTx
        );
      });

      if (!result?.isSuccess) {
        console.error('feed.olppv.ts: Failed to feed olppv', {
          txHash: result?.txHash,
          receipt: result?.receipt,
        });
        return;
      }

      await redis.set(REDIS_KEYS.OLP.PV.LAST_FEED, JSON.stringify(olppv));
      console.log('feed.olppv.ts: olppv has been feeded successfully.');
    }
  } catch (error) {
    console.log('Error processing feeding olppv:', error);

    const isIgnorable = isIgnorableError(error);

    if (!isIgnorable) {
      await sendMessage(
        `\`[Lambda][feed.olppv.ts]\` ${MESSAGE_TYPE.ERROR_DURING_FEEDING_OLPPV}`,
        LogLevel.ERROR,
        {
          description: error?.message || error,
        },
      );
    }

    return;
  }
};
