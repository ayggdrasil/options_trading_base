
import BigNumber from 'bignumber.js';
import { ethers, network, upgrades } from "hardhat";
import { formatEther } from "ethers";
import { readFileSync, writeFileSync } from 'fs'

import { init } from "./init.config";

import { SecretKeyManager } from '../../utils/crypto';
import { getDeployedContracts } from './deployedContracts';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

async function main() {

  const secretKeyManager = new SecretKeyManager({ region: "ap-northeast-2", DEFAULT_PATH: "/dev-common/"})

  const ONE_TIME_DEPLOYER_KEY = await secretKeyManager.decrypt({ keyName: "one_time_deployer" })

  const DEPLOYER = new ethers.Wallet(ONE_TIME_DEPLOYER_KEY, ethers.provider)

  console.log(DEPLOYER, 'DEPLOYER')
  
  const SAFE_ADDRESS = "0xfDFd54E45A80aFc506D0807Ffc9b5919Ca087A77"

  const CONTRACT_ADDRESS = {
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    OPTIONS_AUTHORITY: '0x14B44D35b5992C9d5Ef6922ff9823eB80B31C452',
    VAULT_PRICE_FEED: '0x3c70425836a5e87eBFd5Ce27b065ff0D6Aae2628',
    OPTIONS_MARKET: '0x2e8c0aE9503C43FB2d545cfE0bC704baC58ACf1d',
    S_VAULT: '0x157CF8715b8362441669f8c89229bd6d4aa3EE92',
    M_VAULT: '0x0DB7707a3188D28300f97E3c4a513630106eD192',
    L_VAULT: '0x8aBd3F9a4047FB959F3089744DBaAec393aD2e09',
    S_VAULT_UTILS: '0x0370594163A5c2a68b9AB10ee78c26349Ce6FD79',
    M_VAULT_UTILS: '0x4eb1A0f502D0d613D184eBa9753e570B9FBeADA4',
    L_VAULT_UTILS: '0x75d212dE5260715c83bc8f1e3b9f3A87Bb58E7C9',
    CONTROLLER: '0xe886D83CDfdcd22AF5be952667c466Ad65d042Fb',
    S_USDG: '0xE978AF4d1A5846dF4FDCa2F39aAE391a4481ecff',
    M_USDG: '0xfFC29cbC121A025139cAc468A956D0fdb2f9CC70',
    L_USDG: '0x503e5388BB83AD9D3eb9FeCab92355FEa517e20b',
    S_OLP: '0x3A630c2Ab413a00426FF6F20726ab252D073359F',
    M_OLP: '0xc44805E6f6550A7AC3094771287aD1963b2F2e3b',
    L_OLP: '0xa84fb5697AF169Dfe5EF1f7579015843c413125b',
    S_OLP_MANAGER: '0x0893C039c296C97d4235C3aAF39D011613596196',
    M_OLP_MANAGER: '0xA2Ac5c36FE53724596D9bf1729C9EaF3BE492157',
    L_OLP_MANAGER: '0x86C2D98669b25E83794012Ef73e2b84AFa24B4D9',
    S_REWARD_TRACKER: '0xe8B06d92F79EA7e98d0a65060A1BB44B5035d3cE',
    M_REWARD_TRACKER: '0x56De134E4137a777594969ef6971234e321AfA17',
    L_REWARD_TRACKER: '0x7A92425f1C047219593b21c63C1bFc3a41EC8622',
    S_REWARD_DISTRIBUTOR: '0x988178D3F1Cd44525dA0Ad80A1106b8EC3435734',
    M_REWARD_DISTRIBUTOR: '0x15a6F2e210E20bdf0c434A33714628FD203914a1',
    L_REWARD_DISTRIBUTOR: '0x1724AbA0f8F62a61AF76d42Ae2716544D05FD176',
    S_REWARD_ROUTER_V2: '0x0E6354aD77D9b7388ED387Bb29DE626002A215EE',
    M_REWARD_ROUTER_V2: '0xc9701fF02b696B7f71C13a26005568e339B4de00',
    L_REWARD_ROUTER_V2: '0x4E0FcadB4c736a58ef5b2e04fFfE8F6a7F55a7a0',
    POSITION_MANAGER: '0xaf5AB7cCBBFE28576EAa9Fc9183FE1E0078B284c',
    SETTLE_MANAGER: '0xb96e7891a0A131c7DF90A22a434E49209528fB7c',
    FEE_DISTRIBUTOR: '0xc3Ff9e0fAE457845073694884d02C074791D77DE',
    BTC_OPTIONS_TOKEN: '0x8c0c4a7aDCC5961003D5ec7CF395f9E70E1D1249',
    ETH_OPTIONS_TOKEN: '0x601AAf9F290aFF7750B8087999526f50166deBA1',
    FAST_PRICE_EVENTS: '0xBEEED38990B54BA7291fDfA7F1Ee1e135e306786',
    FAST_PRICE_FEED: '0xa9AB9e9B3d8F6fa0c8Ca7f5a6520Ab51A7B518D1',
    POSITION_VALUE_FEED: '0xA93D3A711533ecE8F9c541ea8aE6Cc1A500BAfB3',
    SETTLE_PRICE_FEED: '0x5Ade9De50d8cd6D4DD51621a675DcEEaf3c9F4fE',
    SPOT_PRICE_FEED: '0x8dC5cf57783375d554D1cB22dd8341F3f4196143',
    PRIMARY_ORACLE: '0xeF0a886A93afaEa2d7A20013E9445a08DAD71f67',
    VIEW_AGGREGATOR: '0xE77Cb1128F62daD2CC3586551D6B3C3C61B055FA',
    REFERRAL: '0x68a1E85F1cdf335FE07F86601Ca59b5A59240515'
  }

  const {
    optionsAuthority,
    vaultPriceFeed,
    optionsMarket,
    sVault,
    mVault,
    lVault,
    sVaultUtils,
    mVaultUtils,
    lVaultUtils,
    susdg,
    musdg,
    lusdg,
    solp,
    molp,
    lolp,
    sOlpManager,
    mOlpManager,
    lOlpManager,
    sRewardTracker,
    mRewardTracker,
    lRewardTracker,
    sRewardDistributor,
    mRewardDistributor,
    lRewardDistributor,
    sRewardRouterV2,
    mRewardRouterV2,
    lRewardRouterV2,
    controller,
    positionManager,
    settleManager,
    feeDistributor,
    btcOptionsToken,
    ethOptionsToken,
    primaryOracle,
    fastPriceEvents,
    fastPriceFeed,
    positionValueFeed,
    settlePriceFeed,
    spotPriceFeed,
    viewAggregator,
    referral,
} = await getDeployedContracts(ethers, CONTRACT_ADDRESS)

    const proxyAdmin = await ethers.getContractAt("OwnableUpgradeable", "0x09967AaCBE1D760d6C44823480fa50e884ef1733")

    console.log(await optionsAuthority.owner(), "optionsAuthority")
    console.log(await vaultPriceFeed.owner(), "vaultPriceFeed")
    console.log(await optionsMarket.owner(), "optionsMarket")
    console.log(await sVault.owner(), "sVault")
    console.log(await mVault.owner(), "mVault")
    console.log(await lVault.owner(), "lVault")
    console.log(await sVaultUtils.owner(), "sVaultUtils")
    console.log(await mVaultUtils.owner(), "mVaultUtils")
    console.log(await lVaultUtils.owner(), "lVaultUtils")
    console.log(await susdg.owner(), "susdg")
    console.log(await musdg.owner(), "musdg")
    console.log(await lusdg.owner(), "lusdg")
    console.log(await solp.owner(), "solp")
    console.log(await molp.owner(), "molp")
    console.log(await lolp.owner(), "lolp")
    console.log(await sOlpManager.owner(), "sOlpManager")
    console.log(await mOlpManager.owner(), "mOlpManager")
    console.log(await lOlpManager.owner(), "lOlpManager")
    console.log(await sRewardTracker.owner(), "sRewardTracker")
    console.log(await mRewardTracker.owner(), "mRewardTracker")
    console.log(await lRewardTracker.owner(), "lRewardTracker")
    console.log(await sRewardDistributor.owner(), "sRewardDistributor")
    console.log(await mRewardDistributor.owner(), "mRewardDistributor")
    console.log(await lRewardDistributor.owner(), "lRewardDistributor")
    console.log(await sRewardRouterV2.owner(), "sRewardRouterV2")
    console.log(await mRewardRouterV2.owner(), "mRewardRouterV2")
    console.log(await lRewardRouterV2.owner(), "lRewardRouterV2")
    console.log(await controller.owner(), "controller")
    console.log(await positionManager.owner(), "positionManager")
    console.log(await settleManager.owner(), "settleManager")
    console.log(await feeDistributor.owner(), "feeDistributor")
    console.log(await btcOptionsToken.owner(), "btcOptionsToken")
    console.log(await ethOptionsToken.owner(), "ethOptionsToken")
    console.log(await primaryOracle.owner(), "primaryOracle")
    console.log(await fastPriceEvents.owner(), "fastPriceEvents")
    console.log(await fastPriceFeed.owner(), "fastPriceFeed")
    console.log(await positionValueFeed.owner(), "positionValueFeed")
    console.log(await settlePriceFeed.owner(), "settlePriceFeed")
    console.log(await spotPriceFeed.owner(), "spotPriceFeed")
    console.log(await viewAggregator.owner(), "viewAggregator")
    console.log(await referral.owner(), "referral")
    console.log(await proxyAdmin.owner(), "proxyAdmin")

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});