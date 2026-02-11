import BigNumber from "bignumber.js";

import { getDeployedContracts } from "../../deployedContracts";
import { ethers, upgrades } from "hardhat";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export async function checkTx(ethers: any, addressMap: any) {
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
    TEST_USER2,
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
    wbera,
    honey,
    wOlp,
  } = await getDeployedContracts(ethers, addressMap);
  console.log("Start with the account:", DEPLOYER.address);

  const [blockNumber, feeData] = await Promise.all([
    ethers.provider.getBlockNumber(),
    ethers.provider.getFeeData(),
  ]);
  console.log("Current block number:", blockNumber);
  console.log("Current fee data:", feeData);

  // Upgrade WOLP if necessary
  const WOLP = "WOLP";
  const WOLPFactory = await ethers.getContractFactory(WOLP)
  console.log("target proxy : ", WOLP);
  console.log("start upgrading proxy : ", CONTRACT_ADDRESS.W_OLP)
  const wOLPAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.W_OLP, WOLPFactory)
  console.log("upgrade complete : ", WOLP)

  // Before Deposit

  const deployerBalanceOfUSDCBefore = await usdc.balanceOf(DEPLOYER.address);
  const deployerBalanceOfWOLPBefore = await wOlp.balanceOf(DEPLOYER.address);
  const totalSupplyBefore = await wOlp.totalSupply(); // WOLP의 총량
  const totalAssetsBefore = await wOlp.totalAssets(); // WOLP에 들어 있는 OLP의 총량
  const deployerBalanceOfOLPBefore = await sRewardTracker.balanceOf(DEPLOYER.address);
  const wOlpBalanceOfOLPBefore = await sRewardTracker.balanceOf(CONTRACT_ADDRESS.W_OLP);

  console.log("Deployer's USDC balance before deposit:", deployerBalanceOfUSDCBefore.toString());
  console.log("Deployer's WOLP balance before deposit:", deployerBalanceOfWOLPBefore.toString());
  console.log("Total Supply before deposit:", totalSupplyBefore.toString());
  console.log("Total Assets before deposit:", totalAssetsBefore.toString());
  console.log("Deployer's OLP balance in RewardTracker before deposit:", deployerBalanceOfOLPBefore.toString());
  console.log("W_OLP's balance in RewardTracker before deposit:", wOlpBalanceOfOLPBefore.toString());

  console.log("========================================");

  const approve = await usdc.approve(CONTRACT_ADDRESS.W_OLP, 10000000 * 10 ** 6);
  await approve.wait();
  console.log("Approved");

  const depositAmount = (10 ** 4).toString();
  const deposit = await wOlp["deposit(address,uint256,address)"](
    CONTRACT_ADDRESS.USDC,
    depositAmount,
    DEPLOYER.address
  );
  await deposit.wait();
  console.log("Deposited");

  console.log("========================================");

  const deployerBalanceOfUSDCAfterDeposit = await usdc.balanceOf(DEPLOYER.address);
  const deployerBalanceOfWOLPAfterDeposit = await wOlp.balanceOf(DEPLOYER.address);
  const totalSupplyAfterDeposit = await wOlp.totalSupply(); // WOLP의 총량
  const totalAssetsAfterDeposit = await wOlp.totalAssets(); // WOLP에 들어 있는 OLP의 총량
  const deployerBalanceOfOLPAfterDeposit = await sRewardTracker.balanceOf(DEPLOYER.address);
  const wOlpBalanceOfOLPAfterDeposit = await sRewardTracker.balanceOf(CONTRACT_ADDRESS.W_OLP);

  console.log("Deployer's USDC balance after deposit:", deployerBalanceOfUSDCAfterDeposit.toString());
  console.log("Deployer's WOLP balance after deposit:", deployerBalanceOfWOLPAfterDeposit.toString());
  console.log("Total Supply after deposit:", totalSupplyAfterDeposit.toString());
  console.log("Total Assets after deposit:", totalAssetsAfterDeposit.toString());
  console.log("Deployer's OLP balance in RewardTracker after deposit:", deployerBalanceOfOLPAfterDeposit.toString());
  console.log("W_OLP's balance in RewardTracker after deposit:", wOlpBalanceOfOLPAfterDeposit.toString());

  console.log("========================================");

  const redeemAmount = deployerBalanceOfWOLPAfterDeposit;
  const parsedRedeemAmount = Math.floor(Number(redeemAmount)).toString();
  const previewRedeem = await wOlp.previewRedeem(parsedRedeemAmount);
  console.log("Preview Redeem:", previewRedeem.toString());

  const redeem = await wOlp.redeem(parsedRedeemAmount, DEPLOYER.address, DEPLOYER.address);
  await redeem.wait();
  console.log("Redeemed");

  console.log("========================================");

  const deployerBalanceOfUSDCAfterRedeem = await usdc.balanceOf(DEPLOYER.address);
  const deployerBalanceOfWOLPAfterRedeem = await wOlp.balanceOf(DEPLOYER.address);
  const totalSupplyAfterRedeem = await wOlp.totalSupply(); // WOLP의 총량
  const totalAssetsAfterRedeem = await wOlp.totalAssets(); // WOLP에 들어 있는 OLP의 총량
  const deployerBalanceOfOLPAfterRedeem = await sRewardTracker.balanceOf(DEPLOYER.address);
  const wOlpBalanceOfOLPAfterRedeem = await sRewardTracker.balanceOf(CONTRACT_ADDRESS.W_OLP);

  console.log("Deployer's USDC balance after redeem:", deployerBalanceOfUSDCAfterRedeem.toString());
  console.log("Deployer's WOLP balance after redeem:", deployerBalanceOfWOLPAfterRedeem.toString());
  console.log("Total Supply after redeem:", totalSupplyAfterRedeem.toString());
  console.log("Total Assets after redeem:", totalAssetsAfterRedeem.toString());
  console.log("Deployer's OLP balance in RewardTracker after redeem:", deployerBalanceOfOLPAfterRedeem.toString());
  console.log("W_OLP's balance in RewardTracker after redeem:", wOlpBalanceOfOLPAfterRedeem.toString());

  console.log("========================================");

  console.log("Operation completed");
}

(async () => {
  await checkTx(ethers, null);
})();
