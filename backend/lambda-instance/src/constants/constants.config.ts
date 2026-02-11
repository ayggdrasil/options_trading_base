import { ChainId } from './constants.networks';

export const CONFIG = {
  [ChainId.BASE]: {
    RPC_URLS: ['https://base-mainnet.g.alchemy.com/v2/iNAQbcZGHbvRuPN6jGgwR'],
    SUBQL_URL: 'http://54.179.228.234:3111/graphql',
  },
  [ChainId.ARBITRUM_ONE]: {
    RPC_URLS: ['', ''],
    SUBQL_URL: '',
  },
};
