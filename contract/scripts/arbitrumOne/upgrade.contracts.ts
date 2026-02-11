import BigNumber from "bignumber.js";

import { getDeployedContracts } from "./deployedContracts";
import { ethers, upgrades } from "hardhat";
import { parseOptionTokenId } from "../../utils/format";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export async function upgradeContracts(ethers: any, addressMap: any) {
  const [
    DEPLOYER,
    KEEPER_OPTIONS_MARKET,
    KEEPER_POSITION_PROCESSOR,
    KEEPER_SETTLE_OPERATOR,
    KEEPER_POSITION_VALUE_FEEDER,
    KEEPER_POSITION_VALUE_FEEDER_SUB1,
    KEEPER_SPOT_PRICE_FEEDER,
    KEEPER_SPOT_PRICE_FEEDER_SUB1,
    KEEPER_FEE_DISTRIBUTOR,
    KEEPER_CLEARING_HOUSE,
    TEST_USER1, 
    TEST_USER2
  ] = await (ethers as any).getSigners()
  const {
    CONTRACT_ADDRESS,
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
    feeDistributor,
    btcOptionsToken,
    ethOptionsToken,
    fastPriceEvents,
    fastPriceFeed,
    positionValueFeed,
    settlePriceFeed,
    spotPriceFeed,
    viewAggregator,
    referral
  } = await getDeployedContracts(ethers, addressMap);
  console.log("Start upgrading contracts with the account:", DEPLOYER.address)

  const [blockNumber, feeData] = await Promise.all([
    ethers.provider.getBlockNumber(),
    ethers.provider.getFeeData()
  ])
  console.log("Current block number:", blockNumber)
  console.log("Current fee data:", feeData)

  /*
   * Controller 업데이트
   */
  // const Controller = "Controller";
  // const ControllerFactory = await ethers.getContractFactory(Controller)
  // console.log("target proxy : ", Controller);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.CONTROLLER)
  // const controllerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.CONTROLLER, ControllerFactory);
  // // const controllerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.CONTROLLER, ControllerFactory, {
  // //   unsafeSkipStorageCheck: true,
  // //   txOverrides: {
  // //     gasLimit: 8000000,
  // //     gasPrice: 100000000000
  // //   }
  // // })
  // console.log("upgrade complete : ", Controller)
  
  /*
   * FastPriceEvents 업데이트
   */
  // const FastPriceEvents = "FastPriceEvents";
  // const FastPriceEventsFactory = await ethers.getContractFactory(FastPriceEvents)
  // console.log("target proxy : ", FastPriceEvents);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.FAST_PRICE_EVENTS)
  // const fastPriceEventsAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.FAST_PRICE_EVENTS, FastPriceEventsFactory)
  // console.log("upgrade complete : ", FastPriceEvents)

  /*
   * FastPriceFeed 업데이트
   */
  // const FastPriceFeed = "FastPriceFeed";
  // const FastPriceFeedFactory = await ethers.getContractFactory(FastPriceFeed)
  // console.log("target proxy : ", FastPriceFeed);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.FAST_PRICE_FEED)
  // const fastPriceFeedAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.FAST_PRICE_FEED, FastPriceFeedFactory)
  // console.log("upgrade complete : ", FastPriceFeed)

  /*
   * FeeDistributor 업데이트
   */
  // const FeeDistributor = "FeeDistributor";
  // const feeDistributorFactory = await ethers.getContractFactory(FeeDistributor)
  // console.log("target proxy : ", FeeDistributor);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.FEE_DISTRIBUTOR)
  // const feeDistributorAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.FEE_DISTRIBUTOR, feeDistributorFactory)
  // console.log("upgrade complete : ", FeeDistributor)

  /*
   * OlpManager 업데이트
   */
  // const OlpManager = "OlpManager";
  // const OlpManagerFactory = await ethers.getContractFactory(OlpManager)
  // console.log("target proxy : ", OlpManager);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.S_OLP_MANAGER)
  // const sOlpManagerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.S_OLP_MANAGER, OlpManagerFactory)
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.M_OLP_MANAGER)
  // const mOlpManagerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.M_OLP_MANAGER, OlpManagerFactory)
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.L_OLP_MANAGER)
  // const lOlpManagerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.L_OLP_MANAGER, OlpManagerFactory)
  // console.log("upgrade complete : ", OlpManager)

  /*
   * OptionsMarket 업데이트
   */
  // const OptionsMarket = "OptionsMarket";
  // const OptionsMarketFactory = await ethers.getContractFactory(OptionsMarket)
  // console.log("target proxy : ", OptionsMarket);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.OPTIONS_MARKET)
  // const optionsMarketAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.OPTIONS_MARKET, OptionsMarketFactory)
  // console.log("upgrade complete : ", OptionsMarket)

  /*
   * OptionsToken 업데이트
   */
  // const OptionsToken = "OptionsToken";
  // const OptionsTokenFactory = await ethers.getContractFactory(OptionsToken)
  
  // console.log("target proxy : ", "Btc", OptionsToken)
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.BTC_OPTIONS_TOKEN)
  // const btcOptionsTokenAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.BTC_OPTIONS_TOKEN, OptionsTokenFactory)
  // console.log("upgrade complete : ", "Btc", OptionsToken)

  // console.log("target proxy : ", "Eth", OptionsToken)
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.ETH_OPTIONS_TOKEN)
  // const ethOptionsTokenAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.ETH_OPTIONS_TOKEN, OptionsTokenFactory)
  // console.log("upgrade complete : ", "Eth", OptionsToken)

  /*
   * PositionManager 업데이트
   */
  // const PositionManager = "PositionManager";
  // const PositionManagerFactory = await ethers.getContractFactory(PositionManager)
  // console.log("target proxy : ", PositionManager);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.POSITION_MANAGER)
  // // const positionManagerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.POSITION_MANAGER, PositionManagerFactory)
  // const positionManagerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.POSITION_MANAGER, PositionManagerFactory, {
  //   unsafeSkipStorageCheck: true,
  //   txOverrides: {
  //     gasLimit: 8000000,
  //     gasPrice: 100000000000
  //   }
  // })
  // console.log("upgrade complete : ", PositionManager)

  /*
   * PositionValueFeed 업데이트
   */
  // const PositionValueFeed = "PositionValueFeed";
  // const PositionValueFeedFactory = await ethers.getContractFactory(PositionValueFeed)
  // console.log("target proxy : ", PositionValueFeed);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.POSITION_VALUE_FEED)
  // const positionValueFeedAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.POSITION_VALUE_FEED, PositionValueFeedFactory)
  // console.log("upgrade complete : ", PositionValueFeed)

  /*
   * Referral 업데이트
   */
  // const Referral = "Referral";
  // const ReferralFactory = await ethers.getContractFactory(Referral)
  // console.log("target proxy : ", Referral);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.REFERRAL)
  // const referralAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.REFERRAL, ReferralFactory)
  // console.log("upgrade complete : ", Referral)

  /*
   * RewardRouterV2 업데이트
   */
  // const RewardRouterV2 = "RewardRouterV2";
  // const RewardRouterV2Factory = await ethers.getContractFactory(RewardRouterV2)
  // console.log("target proxy : ", RewardRouterV2);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.S_REWARD_ROUTER_V2)
  // const sRewardRouterAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.S_REWARD_ROUTER_V2, RewardRouterV2Factory)
  // // const sRewardRouterAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.S_REWARD_ROUTER_V2, RewardRouterV2Factory, {
  // //   unsafeSkipStorageCheck: true,
  // //   txOverrides: {
  // //     gasLimit: 8000000,
  // //     gasPrice: 100000000000
  // //   }
  // // })
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.M_REWARD_ROUTER_V2)
  // const mRewardRouterAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.M_REWARD_ROUTER_V2, RewardRouterV2Factory)
  // // const mRewardRouterAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.M_REWARD_ROUTER_V2, RewardRouterV2Factory, {
  // //   unsafeSkipStorageCheck: true,
  // //   txOverrides: {
  // //     gasLimit: 8000000,
  // //     gasPrice: 100000000000
  // //   }
  // // })
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.L_REWARD_ROUTER_V2)
  // const lRewardRouterAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.L_REWARD_ROUTER_V2, RewardRouterV2Factory)
  // // const lRewardRouterAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.L_REWARD_ROUTER_V2, RewardRouterV2Factory, {
  // //   unsafeSkipStorageCheck: true,
  // //   txOverrides: {
  // //     gasLimit: 8000000,
  // //     gasPrice: 100000000000
  // //   }
  // // })
  // console.log("upgrade complete : ", RewardRouterV2)

  /*
   * RewardTracker 업데이트
   */
  // const RewardTracker = "RewardTracker";
  // const RewardTrackerFactory = await ethers.getContractFactory(RewardTracker)
  // console.log("target proxy : ", RewardTracker);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.S_REWARD_TRACKER)
  // const sRewardTrackerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.S_REWARD_TRACKER, RewardTrackerFactory)
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.M_REWARD_TRACKER)
  // const mRewardTrackerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.M_REWARD_TRACKER, RewardTrackerFactory)
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.L_REWARD_TRACKER)
  // const lRewardTrackerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.L_REWARD_TRACKER, RewardTrackerFactory)
  // console.log("upgrade complete : ", RewardTracker)

  /*
   * SettleManager 업데이트
   */
  // const SettleManager = "SettleManager";
  // const SettleManagerFactory = await ethers.getContractFactory(SettleManager)
  // console.log("target proxy : ", SettleManager);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.SETTLE_MANAGER)
  // // const settleManagerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.SETTLE_MANAGER, SettleManagerFactory)
  // const settleManagerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.SETTLE_MANAGER, SettleManagerFactory, {
  //   unsafeSkipStorageCheck: true,
  //   txOverrides: {
  //     gasLimit: 8000000,
  //     gasPrice: 100000000000
  //   }
  // })
  // console.log("upgrade complete : ", SettleManager)

  /*
   * SpotPriceFeed 업데이트
   */
  // const SpotPriceFeed = "SpotPriceFeed";
  // const SpotPriceFeedFactory = await ethers.getContractFactory(SpotPriceFeed)
  // console.log("target proxy : ", SpotPriceFeed);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.SPOT_PRICE_FEED)
  // const spotPriceFeedAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.SPOT_PRICE_FEED, SpotPriceFeedFactory)
  // console.log("upgrade complete : ", SpotPriceFeed)

  /*
   * Vault 업데이트
   */
  // const Vault = "Vault";
  // const VaultFactory = await ethers.getContractFactory(Vault)
  // console.log("target proxy : ", Vault);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.S_VAULT)
  // const sVaultAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.S_VAULT, VaultFactory)
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.M_VAULT)
  // const mVaultAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.M_VAULT, VaultFactory)
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.L_VAULT)
  // const lVaultAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.L_VAULT, VaultFactory)
  // console.log("upgrade complete : ", Vault)

  /*
   * VaultUtils 업데이트
   */
  // const VaultUtils = "VaultUtils";
  // const VaultUtilsFactory = await ethers.getContractFactory(VaultUtils)
  // console.log("target proxy : ", VaultUtils);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.S_VAULT_UTILS)
  // const sVaultUtilsAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.S_VAULT_UTILS, VaultUtilsFactory)
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.M_VAULT_UTILS)
  // const mVaultUtilsAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.M_VAULT_UTILS, VaultUtilsFactory)
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.L_VAULT_UTILS)
  // const lVaultUtilsAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.L_VAULT_UTILS, VaultUtilsFactory)
  // console.log("upgrade complete : ", VaultUtils)  

  /*
   * VaultPriceFeed 업데이트
   */
  // const VaultPriceFeed = "VaultPriceFeed";
  // const VaultPriceFeedFactory = await ethers.getContractFactory(VaultPriceFeed)
  // console.log("target proxy : ", VaultPriceFeed);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.VAULT_PRICE_FEED)
  // const vaultPriceFeedAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.VAULT_PRICE_FEED, VaultPriceFeedFactory)
  // console.log("upgrade complete : ", VaultPriceFeed)

  /*
   * ViewAggregator 업데이트
   */
  // const ViewAggregator = "ViewAggregator";
  // const ViewAggregatorFactory = await ethers.getContractFactory(ViewAggregator)
  // console.log("target proxy : ", ViewAggregator);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.VIEW_AGGREGATOR)
  // const viewAggregatorAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.VIEW_AGGREGATOR, ViewAggregatorFactory)
  // // const viewAggregatorAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.VIEW_AGGREGATOR, ViewAggregatorFactory, {
  // //   unsafeSkipStorageCheck: true,
  // //   txOverrides: {
  // //     gasLimit: 8000000,
  // //     gasPrice: 100000000000
  // //   }
  // // })
  // console.log("upgrade complete : ", ViewAggregator)

  /*
   * [2024-08-19] Upgrade Controller and Options Token for advanced approval
   */
  // await btcOptionsTokenAfterUpgrades.setHandler(CONTRACT_ADDRESS.CONTROLLER, true);
  // await ethOptionsTokenAfterUpgrades.setHandler(CONTRACT_ADDRESS.CONTROLLER, true);
  // console.log("Has set handler for Controller in Options Token")
  // await solp.setHandler(CONTRACT_ADDRESS.S_REWARD_TRACKER, true);
  // await molp.setHandler(CONTRACT_ADDRESS.M_REWARD_TRACKER, true);
  // await lolp.setHandler(CONTRACT_ADDRESS.L_REWARD_TRACKER, true);
  // console.log("Has set handler for Reward Tracker in Olp Manager")

  /*
   * [2024-10-25] Upgrade For Contract Integration
   */
  // const isNATSupported = await controller.validateNATSupport();
  // console.log(isNATSupported, "is NAT Supported")

  console.log("Upgrade completed")
}

(async () => {
  await upgradeContracts(ethers, null)
})()