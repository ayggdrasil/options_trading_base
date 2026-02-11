import '@openzeppelin/hardhat-upgrades';
import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { loadEnv } from "./utils/parseFiles";
require("hardhat-contract-sizer")

dotenvConfig({
  path: resolve(__dirname, './environments/.env.defaults')
});

if (process.env.HARDHAT_NETWORK == "arbitrumOne") {
  dotenvConfig({ 
    path: resolve(__dirname, './environments/arbitrumOne/.env')
  })
}

if (process.env.HARDHAT_NETWORK == "base") {
  dotenvConfig({
    path: resolve(__dirname, './environments/base/.env')
  })
}

const baseEnv = loadEnv("base");
const arbitrumOneEnv = loadEnv("arbitrumOne");

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10,
          },
          viaIR: true,
        },
      },
    ],
  },
  networks: {
    base: {
      url: baseEnv.RPC_URL,
      gasPrice: Number(baseEnv.GAS_PRICE),
      chainId: Number(baseEnv.CHAIN_ID),
      accounts: [
        baseEnv.DEPLOYER_KEY,
        baseEnv.TEST_USER1_KEY,
      ].filter(Boolean) as string[], // Remove any undefined keys
    },
    arbitrumOne: {
      url: arbitrumOneEnv.RPC_URL,
      gasPrice: Number(arbitrumOneEnv.GAS_PRICE),
      chainId: Number(arbitrumOneEnv.CHAIN_ID),
      accounts: [
        arbitrumOneEnv.DEPLOYER_KEY,
        arbitrumOneEnv.TEST_USER1_KEY,
      ].filter(Boolean) as string[], // Remove any undefined keys
    },
    // "local": {
    //   url: localEnv.RPC_URL,
    //   gasPrice: 20000000000,
    //   chainId: 31337,
    //   accounts: [
    //     localEnv.DEPLOYER_KEY,

    //     localEnv.KEEPER_OPTIONS_MARKET_KEY!,
    //     localEnv.KEEPER_POSITION_PROCESSOR_KEY!,
    //     localEnv.KEEPER_SETTLE_OPERATOR_KEY!,
    //     localEnv.KEEPER_POSITION_VALUE_FEEDER_KEY!,
    //     localEnv.KEEPER_POSITION_VALUE_FEEDER_SUB1_KEY!,
    //     localEnv.KEEPER_SPOT_PRICE_FEEDER_KEY!,
    //     localEnv.KEEPER_SPOT_PRICE_FEEDER_SUB1_KEY!,
    //     localEnv.KEEPER_FEE_DISTRIBUTOR_KEY!,
    //     localEnv.KEEPER_CLEARING_HOUSE_KEY!,

    //     localEnv.TEST_USER1_KEY!,
    //     localEnv.TEST_USER2_KEY!,
    //   ],
    // },
    hardhat: {
      allowUnlimitedContractSize: true,
      blockGasLimit: 40_000_000,
      throwOnCallFailures: false,
      accounts: {
        mnemonic: 'test options test options test options test options test options test options',
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};

export default config;