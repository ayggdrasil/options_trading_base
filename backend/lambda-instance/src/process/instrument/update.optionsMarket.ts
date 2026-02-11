import { chunk, uniq } from 'lodash';
import initializeContracts from '../../contract';
import { getS3 } from '../../utils/aws';
import { convertExpiryDateToTimestampInSec, getOptionKey, removeCallPutPart } from '../../utils/format';
import { CONTRACT_ADDRESSES } from '../../constants/constants.addresses';
import { makeTx } from '../../../makeTx';
import { updateLastUpdatedTime } from '../../redis';
import { REDIS_KEYS } from '../../utils/redis-key';

export const updateOptionsMarket = async (instrumentsToApply) => {
  const chainId = Number(process.env.CHAIN_ID);
  const { OptionsMarket, keeper_optionsMarket } = await initializeContracts();

  let instrumentsFromS3 = await getS3({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: process.env.APP_DATA_INSTRUMENTS_KEY,
  });

  instrumentsFromS3 = instrumentsFromS3?.instruments || { active: [], inactive: [] };

  const instruments = instrumentsToApply || instrumentsFromS3;

  const activeInstruments = uniq(instruments.active.map(removeCallPutPart));

  const inactiveInstruments = uniq(instruments.inactive.map(removeCallPutPart));

  const listToActivate = {};
  const listToDeactivate = {};

  const chunkedActiveInstruments = chunk(activeInstruments, 100);

  for await (const instrumentNameList of chunkedActiveInstruments) {
    const optionInfoList = await OptionsMarket.getOptionsBatch(
      instrumentNameList.map((instrumentName) => getOptionKey(instrumentName)),
    );

    optionInfoList.forEach(([_1, _2, _3, _4, isActive], idx) => {
      const instrumentName = instrumentNameList[idx];
      const [symbol, expiryString, strikePrice, callPut] = String(instrumentName).split('-');

      const expiry = convertExpiryDateToTimestampInSec(expiryString);

      const groupKey = `${symbol}:${expiry}`;

      if (!isActive) {
        listToActivate[groupKey] = listToActivate[groupKey] || [];
        listToActivate[groupKey].push({
          instrumentName,
          expiry,
          strikePrice,
          indexToken: CONTRACT_ADDRESSES[chainId][`W${symbol}`],
          isActive,
        });
      }
    });
  }

  const chunkedInactiveInstruments = chunk(inactiveInstruments, 100);

  for await (const instrumentNameList of chunkedInactiveInstruments) {
    const optionInfoList = await OptionsMarket.getOptionsBatch(
      instrumentNameList.map((instrumentName) => getOptionKey(instrumentName)),
    );

    optionInfoList.forEach(([_1, _2, _3, _4, isActive], idx) => {
      const instrumentName = instrumentNameList[idx];
      const [symbol, expiryString, strikePrice, callPut] = String(instrumentName).split('-');

      const expiry = convertExpiryDateToTimestampInSec(expiryString);

      const groupKey = `${symbol}:${expiry}`;

      const key = getOptionKey(instrumentName);

      if (isActive) {
        listToDeactivate[groupKey] = listToDeactivate[groupKey] || [];

        listToDeactivate[groupKey].push({
          instrumentName,
          key,
          expiry,
          strikePrice,
          indexToken: CONTRACT_ADDRESSES[chainId][`W${symbol}`],
          isActive,
        });
      }
    });
  }

  console.log(listToActivate, 'listToActivate');
  console.log(listToDeactivate, 'listToDeactivate');

  for await (const [groupKey, options] of Object.entries(listToActivate)) {
    let nonce = await keeper_optionsMarket.getNonce();
    console.log(groupKey, 'groupKey');
    console.log((options as any).length, 'options ...processing');
    console.log(nonce, 'nonce');

    await makeTx(
      OptionsMarket,
      keeper_optionsMarket,
      'addOptions',
      [
        options[0].indexToken,
        options[0].expiry,
        (options as any[]).map(({ strikePrice }) => strikePrice),
      ],
    );
  }

  for await (const [groupKey, options] of Object.entries(listToDeactivate)) {
    let nonce = await keeper_optionsMarket.getNonce();
    console.log(groupKey, 'groupKey');
    console.log((options as any).length, 'options ...deactivating');
    console.log(nonce, 'nonce');

    await makeTx(
      OptionsMarket,
      keeper_optionsMarket,
      'removeOptions',
      [(options as any[]).map(({ key }) => key)],
    );
  }

  await updateLastUpdatedTime(REDIS_KEYS.LAST_OPTIONS_MARKET_UPDATED_TIME);
};
