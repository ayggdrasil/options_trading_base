import BigNumber from "bignumber.js";

import { getDeployedContracts } from "./deployedContracts";
import { ethers, upgrades } from "hardhat";
import { OLP_TOKEN_INFO } from "./constants";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export async function main(ethers: any, addressMap: any) {
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
    honey,
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
    viewAggregator,
    referral
  } = await getDeployedContracts(ethers, addressMap);
  console.log("Starting with the account:", DEPLOYER.address)

  const wbtcDecimal = await wbtc.decimals();
  const wethDecimal = await weth.decimals();
  const usdcDecimal = await usdc.decimals();

  // const wbtcConfig = await sVault.connect(DEPLOYER).setTokenConfig(
  //   CONTRACT_ADDRESS.WBTC,
  //   wbtcDecimal,
  //   OLP_TOKEN_INFO.WBTC.WEIGHT,
  //   OLP_TOKEN_INFO.WBTC.MAX_USDG_AMOUNT,
  //   true,
  //   false,
  //   OLP_TOKEN_INFO.WBTC.DECREASE_TOLERANCE_AMOUNT
  // )
  // await wbtcConfig.wait()
  // console.log("WBTC config set", wbtcConfig)

  // const wethConfig = await sVault.connect(DEPLOYER).setTokenConfig(
  //   CONTRACT_ADDRESS.WETH,
  //   wethDecimal,
  //   OLP_TOKEN_INFO.WETH.WEIGHT,
  //   OLP_TOKEN_INFO.WETH.MAX_USDG_AMOUNT,
  //   true,
  //   false,
  //   OLP_TOKEN_INFO.WETH.DECREASE_TOLERANCE_AMOUNT
  // )
  // await wethConfig.wait()
  // console.log("WETH config set", wethConfig)

  const usdcConfig = await sVault.connect(DEPLOYER).setTokenConfig(
    CONTRACT_ADDRESS.USDC,
    usdcDecimal,
    OLP_TOKEN_INFO.USDC.WEIGHT,
    OLP_TOKEN_INFO.USDC.MAX_USDG_AMOUNT,
    false,
    true,
    OLP_TOKEN_INFO.USDC.DECREASE_TOLERANCE_AMOUNT
  )
  await usdcConfig.wait()
  console.log("USDC config set", OLP_TOKEN_INFO.USDC)

  console.log("Completed")
}

(async () => {
  await main(ethers, null)
})()