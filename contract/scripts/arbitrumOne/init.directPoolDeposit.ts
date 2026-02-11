import BigNumber from "bignumber.js";

import { ethers } from "hardhat";
import { getDeployedContracts } from "./deployedContracts";
import { MaxUint256 } from "ethers"

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export async function initialDirectPoolDeposit(ethers: any) {

  const [
    deployer, 
    KEEPER_OPTIONS_MARKET,
    KEEPER_POSITION_PROCESSOR,
    KEEPER_SETTLE_OPERATOR,
    KEEPER_POSITION_VALUE_FEEDER,
    KEEPER_POSITION_VALUE_FEEDER_SUB1,
    KEEPER_SPOT_PRICE_FEEDER,
    KEEPER_SPOT_PRICE_FEEDER_SUB1,
    KEEPER_FEE_DISTRIBUTOR,
    KEEPER_CLEARING_HOUSE,
    user1, 
    user2
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
    referral,
    wOlp,
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
  } = await getDeployedContracts(ethers, undefined);

  const accountToFund = deployer.address

  let nonce = await ethers.provider.getTransactionCount(accountToFund)
  let balance = await ethers.provider.getBalance(accountToFund)

  console.log(accountToFund, 'accountToFund')
  console.log(balance, 'balance')

  const wethAddress = await weth.getAddress()
  const wbtcAddress = await wbtc.getAddress()
  const usdcAddress = await usdc.getAddress()

  const s_wbtcAmount = new BigNumber(1_000).multipliedBy(10 ** 8).toString();
  const s_wethAmount = new BigNumber(17_000).multipliedBy(10 ** 18).toString()
  const s_usdcAmount = new BigNumber(45_000_000).multipliedBy(10 ** 6).toString()
  

  const all_usdcAmount = new BigNumber(s_usdcAmount)
    .toString()

  const all_wbtcAmount = new BigNumber(s_wbtcAmount)
    .toString()

  const all_wethAmount = new BigNumber(s_wethAmount)
    .toString()

  await usdc.connect(deployer).mint(accountToFund, all_usdcAmount, { nonce: nonce++ });
  await wbtc.connect(deployer).mint(accountToFund, all_wbtcAmount, { nonce: nonce++ });
  await weth.connect(deployer).transfer(accountToFund, all_wethAmount, { nonce: nonce++ })

  const controllerAddress = await controller.getAddress()

  // approval
  await (wbtc.connect(deployer).approve(controllerAddress, MaxUint256, { nonce: nonce++ }))
  await (weth.connect(deployer).approve(controllerAddress, MaxUint256, { nonce: nonce++ }))
  await (usdc.connect(deployer).approve(controllerAddress, MaxUint256, { nonce: nonce++ }))

  // <S>
  // eth

  const sVaultAddress = await sVault.getAddress()

  await controller.connect(deployer).directPoolDeposit(sVaultAddress, wethAddress, s_wethAmount, { nonce: nonce++ })
  await controller.connect(deployer).directPoolDeposit(sVaultAddress, wbtcAddress, s_wbtcAmount, { nonce: nonce++ })
  await controller.connect(deployer).directPoolDeposit(sVaultAddress, usdcAddress, s_usdcAmount, { nonce: nonce++ })
  
  // check
  console.log(await sVault.poolAmounts(wethAddress), 'await sVault.poolAmounts(wethAddress)')
  console.log(await sVault.poolAmounts(wbtcAddress), 'await sVault.poolAmounts(wbtcAddress)')
  console.log(await sVault.poolAmounts(usdcAddress), 'await sVault.poolAmounts(usdcAddress)')  
}

(async () => {
  await initialDirectPoolDeposit(ethers)
})()