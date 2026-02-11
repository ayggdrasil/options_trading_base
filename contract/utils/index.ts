export type AllowedNetworks = 'base' | 'arbitrumOne' | 'hardhat' | 'local';

export type EnvVars = {
  DEPLOYER_KEY: string;
  RPC_URL: string;
  GAS_PRICE: string;
  CHAIN_ID: string;
  KEEPER_OPTIONS_MARKET_KEY?: string;
  KEEPER_POSITION_PROCESSOR_KEY?: string;
  KEEPER_SETTLE_OPERATOR_KEY?: string;
  KEEPER_POSITION_VALUE_FEEDER_KEY?: string;
  KEEPER_POSITION_VALUE_FEEDER_SUB1_KEY?: string;
  KEEPER_SPOT_PRICE_FEEDER_KEY?: string;
  KEEPER_SPOT_PRICE_FEEDER_SUB1_KEY?: string;
  KEEPER_FEE_DISTRIBUTOR_KEY?: string;
  KEEPER_CLEARING_HOUSE_KEY?: string;
  TEST_USER1_KEY?: string;
  TEST_USER2_KEY?: string;
};
