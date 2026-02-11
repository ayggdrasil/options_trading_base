import BigNumber from 'bignumber.js';
import initializeContracts from '../contract';

import { chunk, groupBy } from 'lodash';
import { PositionState, SettleState, getPositionQueryFilter, getPositionsWithFilter } from '../utils/queries';
import { sendMessage } from '../utils/slack';
import { AssetTicker, LogLevel } from '../utils/enums';
import { getVaultAddressByOptionTokenId } from '../utils/helper';
import { CONTRACT_ADDRESSES } from '../constants/constants.addresses';
import { Contract } from 'ethers';
import { makeTx } from '../../makeTx';
import { MESSAGE_TYPE } from '../utils/messages';
import { updateLastUpdatedTime } from '../redis';
import { REDIS_KEYS } from '../utils/redis-key';
import { ChainNames, isSameAddress, UA_INDEX_TO_TICKER, UnderlyingAssetIndex } from '@callput/shared';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface ClearAvailableOption {
  name: string;
  optionTokenId: number;
}

export const clearPositions = async () => {
  const chainId = Number(process.env.CHAIN_ID);
  const { Controller } = await initializeContracts();

  let s_clearAvailableOptions: { [key: string]: ClearAvailableOption[] };
  let m_clearAvailableOptions: { [key: string]: ClearAvailableOption[] };
  let l_clearAvailableOptions: { [key: string]: ClearAvailableOption[] };

  try {
    const s_positionQueryFilter = getPositionQueryFilter(
      CONTRACT_ADDRESSES[chainId].S_VAULT,
      PositionState.NOT_EXPIRED,
      SettleState.NOT_SETTLED,
      null,
    );
    const m_positionQueryFilter = getPositionQueryFilter(
      CONTRACT_ADDRESSES[chainId].M_VAULT,
      PositionState.NOT_EXPIRED,
      SettleState.NOT_SETTLED,
      null,
    );
    const l_positionQueryFilter = getPositionQueryFilter(
      CONTRACT_ADDRESSES[chainId].L_VAULT,
      PositionState.NOT_EXPIRED,
      SettleState.NOT_SETTLED,
      null,
    );

    const { nodes: s_vaultPositions } = await getPositionsWithFilter(s_positionQueryFilter);
    const { nodes: m_vaultPositions } = await getPositionsWithFilter(m_positionQueryFilter);
    const { nodes: l_vaultPositions } = await getPositionsWithFilter(l_positionQueryFilter);

    s_clearAvailableOptions = getClearAvailableOptions(CONTRACT_ADDRESSES[chainId].S_VAULT, s_vaultPositions);
    m_clearAvailableOptions = getClearAvailableOptions(CONTRACT_ADDRESSES[chainId].M_VAULT, m_vaultPositions);
    l_clearAvailableOptions = getClearAvailableOptions(CONTRACT_ADDRESSES[chainId].L_VAULT, l_vaultPositions);

    // BTC
    await clearWithChunk(
      CONTRACT_ADDRESSES[chainId].S_VAULT,
      AssetTicker.BTC,
      s_clearAvailableOptions[AssetTicker.BTC],
      Controller,
    );
    await clearWithChunk(
      CONTRACT_ADDRESSES[chainId].M_VAULT,
      AssetTicker.BTC,
      m_clearAvailableOptions[AssetTicker.BTC],
      Controller,
    );
    await clearWithChunk(
      CONTRACT_ADDRESSES[chainId].L_VAULT,
      AssetTicker.BTC,
      l_clearAvailableOptions[AssetTicker.BTC],
      Controller,
    );

    // ETH
    await clearWithChunk(
      CONTRACT_ADDRESSES[chainId].S_VAULT,
      AssetTicker.ETH,
      s_clearAvailableOptions[AssetTicker.ETH],
      Controller,
    );
    await clearWithChunk(
      CONTRACT_ADDRESSES[chainId].M_VAULT,
      AssetTicker.ETH,
      m_clearAvailableOptions[AssetTicker.ETH],
      Controller,
    );
    await clearWithChunk(
      CONTRACT_ADDRESSES[chainId].L_VAULT,
      AssetTicker.ETH,
      l_clearAvailableOptions[AssetTicker.ETH],
      Controller,
    );

    await updateLastUpdatedTime(REDIS_KEYS.LAST_CLEARED_TIME);
  } catch (error) {
    console.log('Error processing clearing:', error);
    await sendMessage(
      `\`[Lambda][clear.positions.ts]\` ${MESSAGE_TYPE.ERROR_DURING_CLEARING}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      },
    );
    return;
  }

  console.log('clearing done');
};

const clearWithChunk = async (
  vault: string,
  ticker: AssetTicker,
  options: ClearAvailableOption[],
  Controller: Contract,
) => {
  const chunked = chunk(options, 10);
  const { keeper_clearingHouse } = await initializeContracts();

  for await (const _options of chunked) {
    console.log(`clearing ${vault}-${ticker}`, _options);

    await makeTx(
      Controller,
      keeper_clearingHouse,
      'pluginClearPosition',
      [_options.map((option) => option.optionTokenId), vault],
    );
  }
};

const getClearAvailableOptions = (targetVault, positions) => {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  const sourcePositions = positions.filter((position) => {
    const vaultAddress = getVaultAddressByOptionTokenId(BigInt(position.optionTokenId));
    return isSameAddress(targetVault, vaultAddress);
  });

  const grouped = groupBy(sourcePositions, 'optionNames');

  return Object.entries(grouped).reduce(
    (acc, [optionNames, options]: any) => {
      // If it's not pair, skip
      if (options.length != 2) return acc;

      const sellPosition = options.find((option) => !option.isBuy);
      const buyPosition = options.find((option) => option.isBuy);

      const clearAvailableAmount = BigNumber.min(sellPosition.size, buyPosition.size).toString();
      if (BigNumber(clearAvailableAmount).lte(0)) return acc;

      const underlyingAssetIndex = sellPosition.underlyingAssetIndex;
      const underlyingAsset = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];
      const optionTokenIdToClear = sellPosition.optionTokenId;

      acc[underlyingAsset].push({
        name: optionNames,
        optionTokenId: optionTokenIdToClear,
      });
      return acc;
    },
    {
      [AssetTicker.BTC]: [],
      [AssetTicker.ETH]: [],
    } as { [key: string]: ClearAvailableOption[] },
  );
};
