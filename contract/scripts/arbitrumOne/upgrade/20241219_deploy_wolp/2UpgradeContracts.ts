import BigNumber from "bignumber.js";

import { getDeployedContracts } from "../../deployedContracts";
import { ethers, upgrades } from "hardhat";

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
    wOlp,
  } = await getDeployedContracts(ethers, addressMap);
  console.log("Start with the account:", DEPLOYER.address)

  const [blockNumber, feeData] = await Promise.all([
    ethers.provider.getBlockNumber(),
    ethers.provider.getFeeData()
  ])
  console.log("Current block number:", blockNumber)
  console.log("Current fee data:", feeData)

  // // 1. Upgrade OlpManager
  // const OlpManager = "OlpManager";
  // const OlpManagerFactory = await ethers.getContractFactory(OlpManager)
  // console.log("target proxy : ", OlpManager);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.S_OLP_MANAGER)
  // const olpManagerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.S_OLP_MANAGER, OlpManagerFactory)
  // console.log("upgrade complete : ", OlpManager)

  // 2. Upgrade RewardTracker
  // const RewardTracker = "RewardTracker";
  // const RewardTrackerFactory = await ethers.getContractFactory(RewardTracker)
  // console.log("target proxy : ", RewardTracker);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.S_REWARD_TRACKER)
  // const rewardTrackerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.S_REWARD_TRACKER, RewardTrackerFactory)
  // console.log("upgrade complete : ", RewardTracker)

  // const tx1 = await rewardTrackerAfterUpgrades.setHandler(CONTRACT_ADDRESS.S_REWARD_TRACKER, true);
  // await tx1.wait();

  // const tx2 = await sRewardTracker.setAuthorizedForTransfer(CONTRACT_ADDRESS.W_OLP, true);
  // await tx2.wait();

  // const tx3 = await sRewardTracker.setOlpManager(CONTRACT_ADDRESS.S_OLP_MANAGER);
  // await tx3.wait();

  console.log("Operation completed")
}

(async () => {
  await upgradeContracts(ethers, null)
})()