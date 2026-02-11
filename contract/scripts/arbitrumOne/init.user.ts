import BigNumber from "bignumber.js";
import { getDeployedContracts } from "./deployedContracts";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 18,
})

export const initUser = async (ethers: any, addressMap: any) => {
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

  console.log("init: mint wbtc and usdc to user1 and user2");

  const usdcAmount = 1_000_000_000;
  const wbtcAmount = 100;
  const wethAmount = 10_000;
  
  // mint wbtc and usdc to deployer, user1 and user2 (weth to deployer only)
  await wbtc.connect(deployer).mint(deployer.address, wbtcAmount * 10 ** 8);
  await wbtc.connect(deployer).mint(user1.address, wbtcAmount * 10 ** 8);
  await wbtc.connect(deployer).mint(user2.address, wbtcAmount * 10 ** 8);
  await usdc.connect(deployer).mint(deployer.address, usdcAmount * 10 ** 6);
  await usdc.connect(deployer).mint(user1.address, usdcAmount * 10 ** 6);
  await usdc.connect(deployer).mint(user2.address, usdcAmount * 10 ** 6);
  await weth.connect(deployer).deposit({
    value: new BigNumber(wethAmount).multipliedBy(10 ** 18).toString()
  })

  // approve position manager as plugin for user1 and user2
  await controller.connect(user1).approvePlugin(CONTRACT_ADDRESS.POSITION_MANAGER)
  await controller.connect(user2).approvePlugin(CONTRACT_ADDRESS.POSITION_MANAGER)

  // user1

  // increase allowance of controller => able to open, close, settle options
  await wbtc.connect(user1).approve(CONTRACT_ADDRESS.CONTROLLER, ethers.MaxUint256)
  await usdc.connect(user1).approve(CONTRACT_ADDRESS.CONTROLLER, ethers.MaxUint256)

  await btcOptionsToken.connect(user1).setApprovalForAll(CONTRACT_ADDRESS.CONTROLLER, true);
  await ethOptionsToken.connect(user1).setApprovalForAll(CONTRACT_ADDRESS.CONTROLLER, true);
  
  // increase allowance of olp manager => able to buy and sell olps
  await solp.connect(user1).approve(CONTRACT_ADDRESS.S_REWARD_TRACKER, ethers.MaxUint256)

  await usdc.connect(user1).approve(CONTRACT_ADDRESS.S_OLP_MANAGER, ethers.MaxUint256)

  await wbtc.connect(user1).approve(CONTRACT_ADDRESS.S_OLP_MANAGER, ethers.MaxUint256)

  // user 2

  // increase allowance of controller => able to open, close, settle options
  await wbtc.connect(user2).approve(CONTRACT_ADDRESS.CONTROLLER, ethers.MaxUint256)
  await usdc.connect(user2).approve(CONTRACT_ADDRESS.CONTROLLER, ethers.MaxUint256)
  
  await btcOptionsToken.connect(user2).setApprovalForAll(CONTRACT_ADDRESS.CONTROLLER, true);
  await ethOptionsToken.connect(user2).setApprovalForAll(CONTRACT_ADDRESS.CONTROLLER, true);

  // increase allowance of olp manager => able to buy and sell olps
  await solp.connect(user2).approve(CONTRACT_ADDRESS.S_REWARD_TRACKER, ethers.MaxUint256)
  
  await usdc.connect(user2).approve(CONTRACT_ADDRESS.S_OLP_MANAGER, ethers.MaxUint256)
  
  await wbtc.connect(user2).approve(CONTRACT_ADDRESS.S_OLP_MANAGER, ethers.MaxUint256)
}