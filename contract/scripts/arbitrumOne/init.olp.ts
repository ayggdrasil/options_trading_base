import BigNumber from "bignumber.js";

import { getDeployedContracts } from "./deployedContracts";
import { MaxUint256 } from "ethers"

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export async function initOlp(ethers: any, addressMap: any) {
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
  ] = await (ethers as any).getSigners();
  
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

  const accountToFund = deployer.address

  let nonce = await ethers.provider.getTransactionCount(accountToFund)
  let balance = await ethers.provider.getBalance(accountToFund)

  console.log(accountToFund, 'accountToFund')
  console.log(balance, 'balance')

  const wethAddress = await weth.getAddress()
  const wbtcAddress = await wbtc.getAddress()
  const usdcAddress = await usdc.getAddress()

  const s_wbtcAmount = new BigNumber(200).multipliedBy(10 ** 8).toString();
  const s_wethAmount = new BigNumber(3300).multipliedBy(10 ** 18).toString()
  const s_usdcAmount = new BigNumber(20_000_000).multipliedBy(10 ** 6).toString()
  

  const all_usdcAmount = new BigNumber(s_usdcAmount)
    .toString()

  const all_wbtcAmount = new BigNumber(s_wbtcAmount)
    .toString()

  const all_wethAmount = new BigNumber(s_wethAmount)
    .toString()

  await usdc.connect(deployer).mint(accountToFund, all_usdcAmount, { nonce: nonce++ });
  await wbtc.connect(deployer).mint(accountToFund, all_wbtcAmount, { nonce: nonce++ });
  await weth.connect(deployer).transfer(accountToFund, all_wethAmount, { nonce: nonce++ })

  // approval
  await (wbtc.connect(deployer).approve(await sOlpManager.getAddress(), MaxUint256, { nonce: nonce++ }))

  await (weth.connect(deployer).approve(await sOlpManager.getAddress(), MaxUint256, { nonce: nonce++ }))

  await (usdc.connect(deployer).approve(await sOlpManager.getAddress(), MaxUint256, { nonce: nonce++ }))

  await (solp.connect(deployer).approve(await sRewardTracker.getAddress(), MaxUint256, { nonce: nonce++ }))

  // <S>
  // eth
  await (sRewardRouterV2.connect(deployer)).mintAndStakeOlp(wethAddress, s_wethAmount, 0, 0).then((tx: any) => tx.wait())

  // btc
  await (sRewardRouterV2.connect(deployer)).mintAndStakeOlp(wbtcAddress, s_wbtcAmount, 0, 0).then((tx: any) => tx.wait())
  
  // usdc
  await (sRewardRouterV2.connect(deployer)).mintAndStakeOlp(usdcAddress, s_usdcAmount, 0, 0).then((tx: any) => tx.wait())
  

  // check
  console.log(await sVault.poolAmounts(wethAddress), 'await sVault.poolAmounts(wethAddress)')
  console.log(await sVault.poolAmounts(wbtcAddress), 'await sVault.poolAmounts(wbtcAddress)')
  console.log(await sVault.poolAmounts(usdcAddress), 'await sVault.poolAmounts(usdcAddress)')  
}

// (async () => {
//   await olpBuyInit(ethers, "")
// })()