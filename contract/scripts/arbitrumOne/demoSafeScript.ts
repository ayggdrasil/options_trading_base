import BigNumber from "bignumber.js";

import { getDeployedContracts } from "./deployedContracts";
import { ethers, upgrades } from "hardhat";
import { safeTx } from "../safeTx";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export async function operation(ethers: any, addressMap: any) {
  const [
    DEPLOYER,
  ] = await (ethers as any).getSigners()
  const {
    CONTRACT_ADDRESS,
    proxyAdmin,
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
    mRewardRouterV2,
    lRewardRouterV2,
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
    viewAggregator,
    referral
  } = await getDeployedContracts(ethers, addressMap);

  const txDataList = [
    { to: await vaultPriceFeed.getAddress(), data: (await vaultPriceFeed.connect(DEPLOYER).setMinMarkPrice.populateTransaction(1, 0)).data },
    { to: await vaultPriceFeed.getAddress(), data: (await vaultPriceFeed.connect(DEPLOYER).setMinMarkPrice.populateTransaction(2, 0)).data },
  ]

  try {
    await safeTx(
        "", // private key
        CONTRACT_ADDRESS.SAFE_ADDRESS, 
        txDataList
    )

  } catch (e) {
    console.log(e)
    return;
  }
  console.log("Operation completed")
}

(async () => {
  await operation(ethers, null)
})()