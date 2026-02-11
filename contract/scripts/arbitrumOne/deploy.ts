
import BigNumber from 'bignumber.js';
import { ethers, network, upgrades } from "hardhat";
import { formatEther } from "ethers";
import { writeFileSync } from 'fs'

import { init } from "./init.config";

import { deployAssetTokens } from "./deployContracts/deploy.assetTokens";
import { deployOptionsAuthority } from "./deployContracts/deploy.optionsAuthority";
import { deployVaultPriceFeed } from "./deployContracts/deploy.vaultPriceFeed";
import { deployOptionsMarket } from "./deployContracts/deploy.optionsMarket";
import { deployOptionsToken } from "./deployContracts/deploy.optionsToken";
import { deployVault } from "./deployContracts/deploy.vault";
import { deployVaultUtils } from './deployContracts/deploy.vaultUtils';
import { deployUSDG } from "./deployContracts/deploy.usdg";
import { deployOLP } from "./deployContracts/deploy.olp";
import { deployOlpManager } from "./deployContracts/deploy.olpManager";
import { deployRewardTracker } from "./deployContracts/deploy.rewardTacker";
import { deployRewardDistributor } from './deployContracts/deploy.rewardDistributor';
import { deployRewardRouterV2 } from './deployContracts/deploy.rewardRouterV2';
import { deployController } from './deployContracts/deploy.controller';
import { deployPositionManager } from './deployContracts/deploy.positionManager';
import { deploySettleManager } from './deployContracts/deploy.settleManager';
import { deployFeeDistributor } from './deployContracts/deploy.feeDistributor';
import { deployFastPriceFeed } from './deployContracts/deploy.fastPriceFeed';
import { deployPositionValueFeed } from './deployContracts/deploy.positionValueFeed';
import { deploySettlePriceFeed } from './deployContracts/deploy.settlePriceFeed';
import { deploySpotPriceFeed } from './deployContracts/deploy.spotPriceFeed';
import { deployViewAggregator } from './deployContracts/deploy.viewAggreagtor';
import { deployReferral } from './deployContracts/deploy.referral';
import { deployPrimaryOracle } from './deployContracts/deploy.primaryOracle';
import { SecretKeyManager } from '../../utils/crypto';
import { getDeployedContracts } from './deployedContracts';
// import { deployProxyAdmin } from './deployProxyAdmin';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

async function main() {

  const secretKeyManager = new SecretKeyManager({ region: "ap-northeast-2", DEFAULT_PATH: "/dev-common/"})

  const ONE_TIME_DEPLOYER_KEY = await secretKeyManager.decrypt({ keyName: "one_time_deployer" })
  
  const [
    DEPLOYER,
  ] = await (ethers as any).getSigners()
  
  // await deployProxyAdmin(ethers, { upgrades })
  console.log("Deploying contracts with the account:", DEPLOYER.address);
  const deployerBalanceBefore = formatEther(await (ethers as any).provider.getBalance(DEPLOYER.address))
  // const CONTRACT_ADDRESS: any = {}
  
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

  // const { wbtc, weth, usdc } = await deployAssetTokens(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { optionsAuthority } = await deployOptionsAuthority(ethers, { upgrades, CONTRACT_ADDRESS })  
  // const { vaultPriceFeed } =  await deployVaultPriceFeed(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { optionsMarket } = await deployOptionsMarket(ethers, { upgrades, CONTRACT_ADDRESS })
  
  // const { sVault, mVault, lVault } = await deployVault(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { sVaultUtils, mVaultUtils, lVaultUtils } = await deployVaultUtils(ethers, { upgrades, CONTRACT_ADDRESS })
  
  // const { controller } = await deployController(ethers, { upgrades, CONTRACT_ADDRESS })
  
  // const { susdg, musdg, lusdg } = await deployUSDG(ethers, { upgrades, CONTRACT_ADDRESS })
  
  // const { solp, molp, lolp } = await deployOLP(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { sOlpManager, mOlpManager, lOlpManager } = await deployOlpManager(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { sRewardTracker, mRewardTracker, lRewardTracker } = await deployRewardTracker(ethers, { upgrades, CONTRACT_ADDRESS })
  
  // const { sRewardDistributor, mRewardDistributor, lRewardDistributor } = await deployRewardDistributor(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { sRewardRouterV2, mRewardRouterV2, lRewardRouterV2 } = await deployRewardRouterV2(ethers, { upgrades, CONTRACT_ADDRESS })
  
  // const { positionManager } = await deployPositionManager(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { settleManager } = await deploySettleManager(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { feeDistributor } = await deployFeeDistributor(ethers, { upgrades, CONTRACT_ADDRESS })
  
  // const { btcOptionsToken, ethOptionsToken } = await deployOptionsToken(ethers, { upgrades, CONTRACT_ADDRESS })
  
  // const { fastPriceEvents, fastPriceFeed } = await deployFastPriceFeed(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { positionValueFeed } = await deployPositionValueFeed(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { settlePriceFeed } = await deploySettlePriceFeed(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { spotPriceFeed } = await deploySpotPriceFeed(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { primaryOracle } = await deployPrimaryOracle(ethers, { upgrades, CONTRACT_ADDRESS })

  // const { viewAggregator } = await deployViewAggregator(ethers, { upgrades, CONTRACT_ADDRESS })
  // const { referral } = await deployReferral(ethers, { upgrades, CONTRACT_ADDRESS })

  // writeFileSync(`latestAddress.${process.env.HARDHAT_NETWORK}.json`, JSON.stringify(CONTRACT_ADDRESS, null, 2))
  // writeFileSync(`../shared/src/latestAddress.${process.env.HARDHAT_NETWORK}.json`, JSON.stringify(CONTRACT_ADDRESS, null, 2))
  
  // init

  await init(ethers, CONTRACT_ADDRESS, SAFE_ADDRESS)

  // const proxyAdmin = await ethers.getContractAt("OwnableUpgradeable", "0x09967AaCBE1D760d6C44823480fa50e884ef1733")
  // await proxyAdmin.transferOwnership(SAFE_ADDRESS)

  // const deployerBalanceAfter = formatEther(await (ethers as any).provider.getBalance(DEPLOYER.address))
  // const diffBalance = new BigNumber(deployerBalanceBefore).minus(deployerBalanceAfter).toString()
  // console.log(`${diffBalance} ETH used for running deploy script`)

  // console.log('Deployment completed')


  // test

  const {
      wbtc,
      weth,
      usdc,
      optionsAuthority,
      vaultPriceFeed,
      optionsMarket,
      sVault,
      sVaultUtils,
      susdg,
      solp,
      sOlpManager,
      sRewardTracker,
      sRewardDistributor,
      sRewardRouterV2,
      controller,
      positionManager,
      settleManager,
      feeDistributor,
      btcOptionsToken,
      ethOptionsToken,
      fastPriceEvents,
      fastPriceFeed,
      positionValueFeed,
      settlePriceFeed,
      spotPriceFeed,
      primaryOracle,
      viewAggregator,
      referral,
    } = await getDeployedContracts(ethers, CONTRACT_ADDRESS)

    // 1. Upgrade OlpManager
    // await optionsAuthority.setAdmin("0x09845ca32B1df76F86b62E4652044204BEb5DdA1", true)

  // console.log("target proxy : ", OptionsAuthority);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.OPTIONS_AUTHORITY)
  // const optionsAuthorityAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.OPTIONS_AUTHORITY, OptionsAuthorityFactory)
  // console.log("upgrade complete : ", OptionsAuthority)




  // const CHAINLINK_FLAGS = "0x3C14e07Edd0dC67442FA96f1Ec6999c57E810a83"
  // const CHAINLINK_PRICE_FEED_WBTC = "0x6ce185860a4963106506C203335A2910413708e9"
  // const CHAINLINK_PRICE_FEED_WETH = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612"
  // const CHAINLINK_PRICE_FEED_USDC = "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3"
  // const CHAINLINK_TOKEN_DECIMALS = 8

  // // const ArbitrumPrimaryOracleFactory = await ethers.getContractFactory("ArbitrumPrimaryOracle");
  // // const ArbitrumPrimaryOracleDeployed = await upgrades.deployProxy(ArbitrumPrimaryOracleFactory, [CONTRACT_ADDRESS.OPTIONS_AUTHORITY]);
  // // const ArbitrumPrimaryOracleAddress = await ArbitrumPrimaryOracleDeployed.getAddress();

  // const ArbitrumPrimaryOracle = await ethers.getContractAt("ArbitrumPrimaryOracle", "0xeF0a886A93afaEa2d7A20013E9445a08DAD71f67");

  // console.log(ArbitrumPrimaryOracle, 'ArbitrumPrimaryOracle')

  // await ArbitrumPrimaryOracle.connect(DEPLOYER).setTokenConfig(
  //   CONTRACT_ADDRESS.WBTC,
  //   CHAINLINK_PRICE_FEED_WBTC,
  //   CHAINLINK_TOKEN_DECIMALS
  // );
  // await ArbitrumPrimaryOracle.connect(DEPLOYER).setTokenConfig(
  //   CONTRACT_ADDRESS.WETH,
  //   CHAINLINK_PRICE_FEED_WETH,
  //   CHAINLINK_TOKEN_DECIMALS
  // );
  // await ArbitrumPrimaryOracle.connect(DEPLOYER).setTokenConfig(
  //   CONTRACT_ADDRESS.USDC,
  //   CHAINLINK_PRICE_FEED_USDC,
  //   CHAINLINK_TOKEN_DECIMALS
  // );
  // await ArbitrumPrimaryOracle.connect(DEPLOYER).setChainlinkFlags(
  //   CHAINLINK_FLAGS
  // );

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});