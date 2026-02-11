import BigNumber from "bignumber.js";

import OptionsAuthorityAbi from "../../../shared/abis/OptionsAuthority.json"
import VaultPriceFeedAbi from "../../../shared/abis/VaultPriceFeed.json"
import OptionsMarketAbi from "../../../shared/abis/OptionsMarket.json"
import OptionsTokenAbi from "../../../shared/abis/OptionsToken.json"
import VaultAbi from "../../../shared/abis/Vault.json"
import VaultUtilsAbi from "../../../shared/abis/VaultUtils.json"
import OlpAbi from "../../../shared/abis/OLP.json"
import OlpManagerAbi from "../../../shared/abis/OlpManager.json"
import RewardTrackerAbi from "../../../shared/abis/RewardTracker.json"
import RewardDistributorAbi from "../../../shared/abis/RewardDistributor.json"
import ControllerAbi from "../../../shared/abis/Controller.json"
import PositionManagerAbi from "../../../shared/abis/PositionManager.json"
import FeeDistributorAbi from "../../../shared/abis/FeeDistributor.json"
import FastPriceFeedAbi from "../../../shared/abis/FastPriceFeed.json"
import PositionValueFeedAbi from "../../../shared/abis/PositionValueFeed.json"
import SettlePriceFeedAbi from "../../../shared/abis/SettlePriceFeed.json"
import SpotPriceFeedAbi from "../../../shared/abis/SpotPriceFeed.json"
import ViewAggregatorAbi from "../../../shared/abis/ViewAggregator.json"
import Erc20Abi from "../../../shared/abis/ERC20.json"

import { getDeployedContracts } from "./deployedContracts";
import { ethers, upgrades } from "hardhat";
import { parseOptionTokenId, Strategy } from "../../utils/format";
import { CancelClosePositionTopic, ClearPositionTopic, CloseSellPositionTopic, CreateClosePositionTopic, db, DecreaseUtilizedAmountTopic, FeedSpotPriceTopic, getLogs, handleCancelClosePosition, handleClearPosition, handleCloseSellPosition, handleCreateClosePosition, handleDecreaseUtilizedAmount, handleFeedSpotPrice, handleIncreaseUtilizedAmount, handleOpenSellPosition, handleSetMaxStrictPriceDeviation, IncreaseUtilizedAmountTopic, OpenSellPositionTopic, SetMaxStrictPriceDeviationTopic } from "../handler";
import { cooldownDuration, mpReleaseDuration, rpReleaseDuration, settleFeeCalculationLimitRate, tradeFeeCalculationLimitRate } from "./constants";
import { IVault } from "../../typechain-types";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export async function operation(ethers: any, addressMap: any) {
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
  console.log("Starting operation with the account:", DEPLOYER.address)

  /*
   * [2024-08-23] Change Underlying Asset Token Address
   */

  // CONTRACT
  // 0. Upgrade Contracts
  // - OptionsMarket, PositionManager, Controller, Vault
  // - Check whether platform works after upgrade

  // SHARED
  // 0. Update Contract Address Jsons (Shared, Contracts)
  // - in Contracts Folder : Done
  // - in Shared Folder : Done

  // EVENT
  // 0. Update Constants
  // - UNDERLYING_ASSET_ADDRESS_TO_TICKER
  // - OA_ADDRESS_TO_DECIMAL
  // 1. Update Enums
  // - UnderlyingAssetIndex

  // LAMBDA
  // 0. Deactivate Existing Options
  // 1. Update Constants
  // 2. Update Enums

  // const a = await sVaultUtils.getWhitelistedTokens();
  // console.log(a, "a")

  // CONTRACT
  // 1. De-whitelist Old WBTC, WETH in Vault
  // 2. Inactivate Old WBTC, WETH in Options Market
  
  // 1. Deploy New Options Token for New Wrapped Tokens - New BTC Options Token, New ETH Options Token
  // 2. Add New Wrapped Token To VaultPriceFeed
  // 3. Add New Wrapped Token and New Options Token To OptionsMarket
  // 4. Set Token Config in Vault
  // 5. Set Release Duration in VaultUtils

  // SHARED
  // 0. Update Contract Address of Options Token

  // Server (Lambda)
  // OLD WBTC, WETH 관련 constants 및 enums를 NEW WBTC, WETH로 변경 (공존해야 하는 경우 OLD는 하드코딩으로 대체)
  // 공존해야 하는 경우 -> constants, enums에 OLD, NEW 둘 다 존재해야 하며 Settle Price, Spot Price도 공존해야 함
  // Distribute Fee 부분은 추가 리비짓 필요
  // OlpAssetAmount 부분도 추가 리비짓 필요
  // Position 가지고 올 때 OLD, NEW 모두 가져올 것인지 결정하고 OLD를 안가져오면 해당 underlying asset index가 들어올 때 처리해야 함

  // 1. Update Contracts
  // const Controller = "Controller";
  // const ControllerFactory = await ethers.getContractFactory(Controller)
  // console.log("target proxy : ", Controller);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.CONTROLLER)
  // const controllerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.CONTROLLER, ControllerFactory)
  // console.log("upgrade complete : ", Controller)

  // const OptionsMarket = "OptionsMarket";
  // const OptionsMarketFactory = await ethers.getContractFactory(OptionsMarket)
  // console.log("target proxy : ", OptionsMarket);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.OPTIONS_MARKET)
  // const optionsMarketAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.OPTIONS_MARKET, OptionsMarketFactory)
  // console.log("upgrade complete : ", OptionsMarket)

  // const PositionManager = "PositionManager";
  // const PositionManagerFactory = await ethers.getContractFactory(PositionManager)
  // console.log("target proxy : ", PositionManager);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.POSITION_MANAGER)
  // const positionManagerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.POSITION_MANAGER, PositionManagerFactory)
  // console.log("upgrade complete : ", PositionManager)

  // const Vault = "Vault";
  // const VaultFactory = await ethers.getContractFactory(Vault)
  // console.log("target proxy : ", Vault);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.S_VAULT)
  // const sVaultAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.S_VAULT, VaultFactory, {unsafeSkipStorageCheck: true})
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.M_VAULT)
  // const mVaultAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.M_VAULT, VaultFactory, {unsafeSkipStorageCheck: true})
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.L_VAULT)
  // const lVaultAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.L_VAULT, VaultFactory, {unsafeSkipStorageCheck: true})
  // console.log("upgrade complete : ", Vault)

  // 2. Update Setting of Old WBTC, WETH
  // const OLD_WBTC = "0x286F1C3f0323dB9c91D1E8f45c8DF2d065AB5fae"
  // const OLD_WBTC_DECIMAL = 8
  // const OLD_WETH = "0x6E1E9896e93F7A71ECB33d4386b49DeeD67a231A"
  // const OLD_WETH_DECIMAL = 18
  // await sVault.connect(DEPLOYER).clearTokenConfig(OLD_WBTC);
  // await sVault.connect(DEPLOYER).clearTokenConfig(OLD_WETH);
  // await optionsMarket.connect(DEPLOYER).setIsUnderlyingAsset(1, false);
  // await optionsMarket.connect(DEPLOYER).setIsUnderlyingAsset(2, false);
  // const a = await sVault.isWhitelistedToken(OLD_WBTC);
  // const b = await sVault.isWhitelistedToken(OLD_WETH);
  // console.log(a, b)
  // const c = await optionsMarket.isUnderlyingAssetActive(OLD_WBTC);
  // const d = await optionsMarket.isUnderlyingAssetActive(OLD_WETH);
  // console.log(c, d)
  
  // 3. Deploy New Options Token and Initialize Setting
  // const NEW_WBTC = "0x2577D24a26f8FA19c1058a8b0106E2c7303454a4"
  // const NEW_WBTC_DECIMAL = 8
  // const NEW_WBTC_WEIGHT = 15000;
  // const NEW_WBTC_BUFFER_AMOUNT = new BigNumber(4).multipliedBy(10 ** NEW_WBTC_DECIMAL).toString() // 4_00000000;
  // const NEW_WBTC_MAX_USDG_AMOUNT = new BigNumber(30000000).multipliedBy(10 ** 18).toString(); // $30,000,000 
  // const NEW_WBTC_DECREASE_BUFFER_AMOUNT = 100;

  // const NEW_WETH = "0xE28AfD8c634946833e89ee3F122C06d7C537E8A8"
  // const NEW_WETH_DECIMAL = 18
  // const NEW_WETH_WEIGHT = 15000;
  // const NEW_WETH_BUFFER_AMOUNT = new BigNumber(65).multipliedBy(10 ** NEW_WETH_DECIMAL).toString() // 65_000000000000000000;
  // const NEW_WETH_MAX_USDG_AMOUNT = new BigNumber(30000000).multipliedBy(10 ** 18).toString();
  // const NEW_WETH_DECREASE_BUFFER_AMOUNT = 10000;
  
  // const OptionsToken = await ethers.getContractFactory("OptionsToken")

  // const newBtcOptionsToken = await upgrades.deployProxy(OptionsToken, [
  //   "BTC-USD Options",
  //   NEW_WBTC,
  //   CONTRACT_ADDRESS.OPTIONS_MARKET,
  //   CONTRACT_ADDRESS.VAULT_PRICE_FEED,
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  // ])

  // const newEthOptionsToken = await upgrades.deployProxy(OptionsToken, [
  //   "ETH-USD Options",
  //   NEW_WETH,
  //   CONTRACT_ADDRESS.OPTIONS_MARKET,
  //   CONTRACT_ADDRESS.VAULT_PRICE_FEED,
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  // ])

  // const newBtcOptionsTokenAddress = await newBtcOptionsToken.getAddress()
  // const newEthOptionsTokenAddress = await newEthOptionsToken.getAddress()

  // await newBtcOptionsToken.connect(DEPLOYER).setHandler(CONTRACT_ADDRESS.CONTROLLER, true);
  // await newEthOptionsToken.connect(DEPLOYER).setHandler(CONTRACT_ADDRESS.CONTROLLER

  // console.log("newBtcOptionsTokenAddress:", newBtcOptionsTokenAddress)
  // console.log("newEthOptionsTokenAddress:", newEthOptionsTokenAddress)

  // await vaultPriceFeed.connect(DEPLOYER).setTokenConfig(
  //   NEW_WBTC,
  //   NEW_WBTC_DECIMAL,
  //   false
  // );
  // await vaultPriceFeed.connect(DEPLOYER).setTokenConfig(
  //   NEW_WETH,
  //   NEW_WETH_DECIMAL,
  //   false
  // );

  // console.log("Token Config Updated")

  // await (optionsMarket.connect(DEPLOYER)).addUnderlyingAsset(NEW_WBTC, newBtcOptionsTokenAddress);
  // await (optionsMarket.connect(DEPLOYER)).addUnderlyingAsset(NEW_WETH, newEthOptionsTokenAddress);

  // console.log("Underlying Asset Added to Options Market")

  // const vaults = [sVault, mVault, lVault];
  // const vaultUtils = [sVaultUtils, mVaultUtils, lVaultUtils];

  // for (let i = 0; i < vaults.length; i++) {
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(NEW_WBTC, NEW_WBTC_BUFFER_AMOUNT);
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(NEW_WETH, NEW_WETH_BUFFER_AMOUNT);
  //   await vaults[i].connect(DEPLOYER).setTokenConfig(NEW_WBTC, NEW_WBTC_DECIMAL, NEW_WBTC_WEIGHT, NEW_WBTC_MAX_USDG_AMOUNT, true, false, NEW_WBTC_DECREASE_BUFFER_AMOUNT);
  //   await vaults[i].connect(DEPLOYER).setTokenConfig(NEW_WETH, NEW_WETH_DECIMAL, NEW_WETH_WEIGHT, NEW_WETH_MAX_USDG_AMOUNT, true, false, NEW_WETH_DECREASE_BUFFER_AMOUNT);
  // }

  // for (let i = 0; i < vaultUtils.length; i++) {
  //   await vaultUtils[i].connect(DEPLOYER).setReleaseDuration(NEW_WBTC, mpReleaseDuration, BigInt(0)); // MP
  //   await vaultUtils[i].connect(DEPLOYER).setReleaseDuration(NEW_WETH, mpReleaseDuration, BigInt(0)); // MP
  //   await vaultUtils[i].connect(DEPLOYER).setReleaseDuration(NEW_WBTC, rpReleaseDuration, BigInt(1)); // RP
  //   await vaultUtils[i].connect(DEPLOYER).setReleaseDuration(NEW_WETH, rpReleaseDuration, BigInt(1)); // RP
  // }

  // console.log("Vault Config Updated")
  
  // 4. Destory Existing S Vault
  // const wbtcBalance = await wbtc.balanceOf(CONTRACT_ADDRESS.S_VAULT);
  // const wethBalance = await weth.balanceOf(CONTRACT_ADDRESS.S_VAULT);
  // const usdcBalance = await usdc.balanceOf(CONTRACT_ADDRESS.S_VAULT);

  // console.log("wbtcBalance:", wbtcBalance.toString())
  // console.log("wethBalance:", wethBalance.toString())
  // console.log("usdcBalance:", usdcBalance.toString())

  // await sVault.connect(DEPLOYER).emergencyRecovery(
  //   CONTRACT_ADDRESS.WBTC,
  //   wbtcBalance,
  //   "0x90b98c11B4234Bbc375Bb7c781445Af42eD63a0b"
  // )

  // await sVault.connect(DEPLOYER).emergencyRecovery(
  //   CONTRACT_ADDRESS.WETH,
  //   wethBalance,
  //   "0x90b98c11B4234Bbc375Bb7c781445Af42eD63a0b"
  // )

  // await sVault.connect(DEPLOYER).emergencyRecovery(
  //   CONTRACT_ADDRESS.USDC,
  //   usdcBalance,
  //   "0x90b98c11B4234Bbc375Bb7c781445Af42eD63a0b"
  // )

  // 5. Deploy New sVault
  // const Vault = await ethers.getContractFactory("Vault");
  // const newSVault = await upgrades.deployProxy(Vault, [
  //   90 * 86400, // 90 days, m 기준으로
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  // ]) 
  // const newSVaultAddress = await newSVault.getAddress()
  // console.log("newSVaultAddress:", newSVaultAddress)

  // const VaultUtils = await ethers.getContractFactory("VaultUtils")
  // const newSVaultUtils = await upgrades.deployProxy(VaultUtils, [
  //   newSVaultAddress,
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  // ])
  // const newSVaultUtilsAddress = await newSVaultUtils.getAddress()
  // console.log("newSVaultUtilsAddress:", newSVaultUtilsAddress)

  // const USDG = await ethers.getContractFactory("USDG")
  // const newSusdg = await upgrades.deployProxy(USDG, [
  //   newSVaultAddress,
  //   "Short-Term USDG",
  //   "sUSDG",
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  // ])
  // const newSusdgAddress = await newSusdg.getAddress()
  // console.log("newSusdgAddress:", newSusdgAddress)

  // const OLP = await ethers.getContractFactory("OLP")
  // const newSolp = await upgrades.deployProxy(OLP, [
  //   "Short-Term OLP",
  //   "sOLP",
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  // ])
  // const newSolpAddress = await newSolp.getAddress()
  // console.log("newSolpAddress:", newSolpAddress)

  // const OLPManager = await ethers.getContractFactory("OlpManager")
  // const newSOlpManager = await upgrades.deployProxy(OLPManager, [
  //   newSVaultAddress,
  //   newSVaultUtilsAddress,
  //   CONTRACT_ADDRESS.VAULT_PRICE_FEED,
  //   newSusdgAddress,
  //   newSolpAddress,
  //   cooldownDuration,
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  // ])
  // const newSOlpManagerAddress = await newSOlpManager.getAddress()
  // console.log("newSOlpManagerAddress:", newSOlpManagerAddress)

  // const RewardTracker = await ethers.getContractFactory("RewardTracker")
  // const newSRewardTracker = await upgrades.deployProxy(RewardTracker, [
  //   "Short-Term Fee OLP",
  //   "sfOLP",
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  // ])
  // const newSRewardTrackerAddress = await newSRewardTracker.getAddress()
  // console.log("newSRewardTrackerAddress:", newSRewardTrackerAddress)

  // const RewardDistributor = await ethers.getContractFactory("RewardDistributor")
  // const newSRewardDistributor = await upgrades.deployProxy(RewardDistributor, [
  //   CONTRACT_ADDRESS.WETH,
  //   newSRewardTrackerAddress, 
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  // ])
  // const newSRewardDistributorAddress = await newSRewardDistributor.getAddress()
  // console.log("newSRewardDistributorAddress:", newSRewardDistributorAddress)

  // reward distributor 교체 필요 한데 못햇어서 추후에 작업 진행함
  // await feeDistributor.connect(DEPLOYER).setRewardDistributor(
  //   CONTRACT_ADDRESS.S_REWARD_DISTRIBUTOR,
  //   CONTRACT_ADDRESS.M_REWARD_DISTRIBUTOR,
  //   CONTRACT_ADDRESS.L_REWARD_DISTRIBUTOR
  // )

  // 확인해 보니 feeDistributor의 weth 주소도 업데이트 해야 해서 feeDeistributor 업그레이드 후 진행
  // await feeDistributor.connect(DEPLOYER).setWeth(CONTRACT_ADDRESS.WETH);
  // const a = await feeDistributor.weth();
  // console.log(a, "a")



  // const RewardRouterV2 = await ethers.getContractFactory("RewardRouterV2")
  // const newSRewardRouterV2 = await upgrades.deployProxy(RewardRouterV2, [
  //   CONTRACT_ADDRESS.WETH,
  //   newSolpAddress,
  //   newSRewardTrackerAddress,
  //   newSOlpManagerAddress,
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  // ])
  // const newSRewardRouterV2Address = await newSRewardRouterV2.getAddress()
  // console.log("newSRewardRouterV2Address:", newSRewardRouterV2Address)

  // upgrade controller
  // upgrade fee distributor
  // upgrade view aggregator

  // init

  // await (newSVault.connect(DEPLOYER) as IVault).setContracts(
  //   newSVaultUtilsAddress,
  //   CONTRACT_ADDRESS.OPTIONS_MARKET,
  //   CONTRACT_ADDRESS.SETTLE_MANAGER,
  //   CONTRACT_ADDRESS.CONTROLLER,
  //   CONTRACT_ADDRESS.VAULT_PRICE_FEED,
  //   newSusdgAddress
  // );

  // const wbtcDecimal = await wbtc.decimals();
  // const wethDecimal = await weth.decimals();
  // const usdcDecimal = await usdc.decimals();
  // const honeyDecimal = await honey.decimals();

  // await newSVault.connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.WBTC, wbtcBufferAmounts);
  // await newSVault.connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.WETH, wethBufferAmounts);
  // await newSVault.connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.USDC, usdcBufferAmounts);
  // await newSVault.connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.HONEY, honeyBufferAmounts);
  // await newSVault.connect(DEPLOYER).setTokenConfig(CONTRACT_ADDRESS.WBTC, wbtcDecimal, btcTokenWeight, btcMaxUsdgAmount, true, false, 100);
  // await newSVault.connect(DEPLOYER).setTokenConfig(CONTRACT_ADDRESS.WETH, wethDecimal, ethTokenWeight, ethMaxUsdgAmount, true, false, 10000);
  // await newSVault.connect(DEPLOYER).setTokenConfig(CONTRACT_ADDRESS.USDC, usdcDecimal, usdcTokenWeight, usdcMaxUsdgAmount, false, true, 100);
  // await newSVault.connect(DEPLOYER).setTokenConfig(CONTRACT_ADDRESS.HONEY, honeyDecimal, honeyTokenWeight, honeyMaxUsdgAmount, false, true, 10000)
  // await newSVault.connect(DEPLOYER).setManager(newSOlpManagerAddress, true);
  // await newSVault.connect(DEPLOYER).setManager(CONTRACT_ADDRESS.SETTLE_MANAGER, true);
  // await newSVault.connect(DEPLOYER).setManager(CONTRACT_ADDRESS.CONTROLLER, true);
  // console.log("Vault Config Updated")

  // await newSVaultUtils.connect(DEPLOYER).setReleaseDuration(CONTRACT_ADDRESS.WBTC, mpReleaseDuration, BigInt(0)); // MP
  // await newSVaultUtils.connect(DEPLOYER).setReleaseDuration(CONTRACT_ADDRESS.WETH, mpReleaseDuration, BigInt(0)); // MP
  // await newSVaultUtils.connect(DEPLOYER).setReleaseDuration(CONTRACT_ADDRESS.USDC, mpReleaseDuration, BigInt(0)); // MP
  // await newSVaultUtils.connect(DEPLOYER).setReleaseDuration(CONTRACT_ADDRESS.HONEY, mpReleaseDuration, BigInt(0)); // MP
  // await newSVaultUtils.connect(DEPLOYER).setReleaseDuration(CONTRACT_ADDRESS.WBTC, rpReleaseDuration, BigInt(1)); // RP
  // await newSVaultUtils.connect(DEPLOYER).setReleaseDuration(CONTRACT_ADDRESS.WETH, rpReleaseDuration, BigInt(1)); // RP
  // await newSVaultUtils.connect(DEPLOYER).setReleaseDuration(CONTRACT_ADDRESS.USDC, rpReleaseDuration, BigInt(1)); // RP
  // await newSVaultUtils.connect(DEPLOYER).setReleaseDuration(CONTRACT_ADDRESS.HONEY, rpReleaseDuration, BigInt(1)); // RP
  // await newSVaultUtils.connect(DEPLOYER).setReferral(CONTRACT_ADDRESS.REFERRAL);
  // await newSVaultUtils.connect(DEPLOYER).setTradeFeeCalculationLimitRate(tradeFeeCalculationLimitRate);
  // await newSVaultUtils.connect(DEPLOYER).setSettleFeeCalculationLimitRate(settleFeeCalculationLimitRate);
  // await newSVaultUtils.connect(DEPLOYER).setPositionManager(CONTRACT_ADDRESS.POSITION_MANAGER);
  // console.log("Vault Utils Config Updated")

  // await newSOlpManager.connect(DEPLOYER).setHandler(newSRewardRouterV2Address, true);
  // await newSRewardTracker.connect(DEPLOYER).initSetup(newSolpAddress, newSRewardDistributorAddress);
  // await newSusdg.connect(DEPLOYER).setVault(newSVaultAddress, true)
  // await newSolp.connect(DEPLOYER).setMinter(newSOlpManagerAddress, true);
  // await newSolp.connect(DEPLOYER).setHandler(newSRewardTrackerAddress, true);
  // await newSRewardTracker.connect(DEPLOYER).setHandler(newSRewardRouterV2Address, true)
  // await newSRewardDistributor.connect(DEPLOYER).updateLastDistributionTime();
  // console.log("Reward Config Updated")

  // await btcOptionsToken.connect(DEPLOYER).setHandler(CONTRACT_ADDRESS.CONTROLLER, true);
  // await ethOptionsToken.connect(DEPLOYER).setHandler(CONTRACT_ADDRESS.CONTROLLER, true);
  // console.log("Options Token Handler Updated")

  // controller
  // fee distributor
  // view aggregator
  // await controller.setVault(0, newSVaultAddress, newSVaultUtilsAddress);
  // await feeDistributor.setRewardDistributor(
  //   newSRewardDistributorAddress,
  //   CONTRACT_ADDRESS.M_REWARD_DISTRIBUTOR,
  //   CONTRACT_ADDRESS.L_REWARD_DISTRIBUTOR
  // )
  // await viewAggregator.setVault(
  //   0,
  //   newSVaultAddress,
  //   newSolpAddress,
  //   newSOlpManagerAddress,
  //   newSRewardDistributorAddress,
  //   newSVaultUtilsAddress
  // )

  // await sVault.connect(DEPLOYER).setIsPositionEnabled(true);
  // await sVault.connect(DEPLOYER).setIsBuySellSwapEnabled(true);


  // SOLP term 조정
  // 1. 서버에서 OLP_TERM 추가 (기존 RP_TERM과 분리)
  // 2. contract에서 vault threshold 변경
  // 3. frontend에서 OLP_TERM 추가 하되 체인별 구분 필요
  // - frontend도 마찬가지로 RP_TERM과 구분 짓는 변수 넣었으면 RP_TERM 사용처와 OLP_TERM 사용처 구분 필요

  // const sThresholdDays = 90 * 86400 // 90 days of thresholdDays
  // const mThresholdDays = 180 * 86400 // 180 days of thresholdDays
  // await sVault.connect(DEPLOYER).setThresholdDays(sThresholdDays);
  // await mVault.connect(DEPLOYER).setThresholdDays(mThresholdDays);

  // const a = await optionsMarket.getOptionsTokenByIndex(3)
  // console.log(a, "a")
  // console.log(CONTRACT_ADDRESS.BTC_OPTIONS_TOKEN, "btc")






















  

  

  // // 1.
  // const OptionsToken = await ethers.getContractFactory("OptionsToken")
  // const newBtcOptionsToken = await upgrades.deployProxy(OptionsToken, [
  //   "BTC-USD Options",
  //   NEW_WBTC,
  //   CONTRACT_ADDRESS.OPTIONS_MARKET,
  //   CONTRACT_ADDRESS.VAULT_PRICE_FEED,
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  // ])
  // const newEthOptionsToken = await upgrades.deployProxy(OptionsToken, [
  //   "ETH-USD Options",
  //   NEW_WETH,
  //   CONTRACT_ADDRESS.OPTIONS_MARKET,
  //   CONTRACT_ADDRESS.VAULT_PRICE_FEED,
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  // ])
  // const newBtcOptionsTokenAddress = await newBtcOptionsToken.getAddress()
  // const newEthOptionsTokenAddress = await newEthOptionsToken.getAddress()
  // console.log("newBtcOptionsTokenAddress:", newBtcOptionsTokenAddress)
  // console.log("newEthOptionsTokenAddress:", newEthOptionsTokenAddress)

  // // 2.
  // await vaultPriceFeed.connect(DEPLOYER).setTokenConfig(
  //   NEW_WBTC,
  //   8,
  //   false
  // );
  // await vaultPriceFeed.connect(DEPLOYER).setTokenConfig(
  //   NEW_WETH,
  //   18,
  //   false
  // );

  // // 3.
  // await (optionsMarket.connect(DEPLOYER)).addUnderlyingAsset(NEW_WBTC, newBtcOptionsTokenAddress);
  // await (optionsMarket.connect(DEPLOYER)).addUnderlyingAsset(NEW_WETH, newEthOptionsTokenAddress);

  // // 4.
  // // 5.
  // const vaults = [sVault, mVault, lVault];
  // const vaultUtils = [sVaultUtils, mVaultUtils, lVaultUtils];
  // for (let i = 0; i < vaults.length; i++) {
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(NEW_WBTC, wbtcBufferAmounts);
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(NEW_WETH, wethBufferAmounts);
  //   await vaults[i].connect(DEPLOYER).setTokenConfig(NEW_WBTC, 8, btcTokenWeight, btcMaxUsdgAmount, true, false);
  //   await vaults[i].connect(DEPLOYER).setTokenConfig(NEW_WETH, 18, ethTokenWeight, ethMaxUsdgAmount, true, false);
  // }
  // for (let i = 0; i < vaultUtils.length; i++) {
  //   await vaultUtils[i].connect(DEPLOYER).setReleaseDuration(NEW_WBTC, mpReleaseDuration, BigInt(0)); // MP
  //   await vaultUtils[i].connect(DEPLOYER).setReleaseDuration(NEW_WETH, mpReleaseDuration, BigInt(0)); // MP
  //   await vaultUtils[i].connect(DEPLOYER).setReleaseDuration(NEW_WBTC, rpReleaseDuration, BigInt(1)); // RP
  //   await vaultUtils[i].connect(DEPLOYER).setReleaseDuration(NEW_WETH, rpReleaseDuration, BigInt(1)); // RP
  // }  

  






  /*
   * [2024-08-21] Deploy Social 0DTE
   */
  // await sVault.connect(DEPLOYER).setIsPositionEnabled(false);
  // console.log("Position disabled")
  // console.log("=====================================")

  // const PositionManager = "PositionManager";
  // const PositionManagerFactory = await ethers.getContractFactory(PositionManager)
  // console.log("target proxy : ", PositionManager);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.POSITION_MANAGER)
  // const positionManagerAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.POSITION_MANAGER, PositionManagerFactory)
  // console.log("upgrade complete : ", PositionManager)
  // console.log("=====================================")

  // const Vault = "Vault";
  // const VaultFactory = await ethers.getContractFactory(Vault)
  // console.log("target proxy : ", Vault);
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.S_VAULT)
  // const sVaultAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.S_VAULT, VaultFactory, {unsafeSkipStorageCheck: true})
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.M_VAULT)
  // const mVaultAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.M_VAULT, VaultFactory, {unsafeSkipStorageCheck: true})
  // console.log("start upgrading proxy : ", CONTRACT_ADDRESS.L_VAULT)
  // const lVaultAfterUpgrades = await upgrades.upgradeProxy(CONTRACT_ADDRESS.L_VAULT, VaultFactory, {unsafeSkipStorageCheck: true})
  // console.log("upgrade complete : ", Vault)
  // console.log("=====================================")

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
  // console.log("=====================================")

  // await sVaultAfterUpgrades.setContracts(CONTRACT_ADDRESS.S_VAULT_UTILS, CONTRACT_ADDRESS.OPTIONS_MARKET, CONTRACT_ADDRESS.SETTLE_MANAGER, CONTRACT_ADDRESS.CONTROLLER, CONTRACT_ADDRESS.VAULT_PRICE_FEED, CONTRACT_ADDRESS.S_USDG)
  // await mVaultAfterUpgrades.setContracts(CONTRACT_ADDRESS.M_VAULT_UTILS, CONTRACT_ADDRESS.OPTIONS_MARKET, CONTRACT_ADDRESS.SETTLE_MANAGER, CONTRACT_ADDRESS.CONTROLLER, CONTRACT_ADDRESS.VAULT_PRICE_FEED, CONTRACT_ADDRESS.M_USDG)
  // await lVaultAfterUpgrades.setContracts(CONTRACT_ADDRESS.L_VAULT_UTILS, CONTRACT_ADDRESS.OPTIONS_MARKET, CONTRACT_ADDRESS.SETTLE_MANAGER, CONTRACT_ADDRESS.CONTROLLER, CONTRACT_ADDRESS.VAULT_PRICE_FEED, CONTRACT_ADDRESS.L_USDG)
  // console.log("setContracts complete")

  // await sVaultUtilsAfterUpgrades.setPositionManager(CONTRACT_ADDRESS.POSITION_MANAGER)
  // await mVaultUtilsAfterUpgrades.setPositionManager(CONTRACT_ADDRESS.POSITION_MANAGER)
  // await lVaultUtilsAfterUpgrades.setPositionManager(CONTRACT_ADDRESS.POSITION_MANAGER)
  // console.log("setPositionManager complete")

  // await sVault.connect(DEPLOYER).setIsPositionEnabled(true);
  // console.log("Position disabled")
  // console.log("=====================================")


















  /*
   * [2024-08-20] Add Settle Manager as Manager to Vault
   */
  // await sVault.connect(DEPLOYER).setManager(CONTRACT_ADDRESS.SETTLE_MANAGER, true);
  // await mVault.connect(DEPLOYER).setManager(CONTRACT_ADDRESS.SETTLE_MANAGER, true);
  // await lVault.connect(DEPLOYER).setManager(CONTRACT_ADDRESS.SETTLE_MANAGER, true);
  // console.log("Settle Manager added as Manager to Vault")

  /*
   * [2024-08-20] Add Settle Manager as Plugin to Controller
   */
  // await controller.addPlugin(CONTRACT_ADDRESS.SETTLE_MANAGER);

  /*
   * [2024-08-20] Deploy Settle Manager
   */
  // const SettleManager = await ethers.getContractFactory("SettleManager")
  // const settleManager = await upgrades.deployProxy(SettleManager, [
  //   CONTRACT_ADDRESS.OPTIONS_MARKET,
  //   CONTRACT_ADDRESS.CONTROLLER,
  //   CONTRACT_ADDRESS.WBERA,
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  // ])
  
  // CONTRACT_ADDRESS.SETTLE_MANAGER = await settleManager.getAddress()

  // console.log(CONTRACT_ADDRESS.SETTLE_MANAGER, 'CONTRACT_ADDRESS.SETTLE_MANAGER')

  // const optionTokens = await sVaultUtils.getOptionTokensAtSelfOriginExpiry(1724313600)
  // console.log(optionTokens, "optionTokens")


























  
  /* 
   *
   * Get Logs
   *
   */ 
  // const startBlock = 1280000;
  // const endBlock = 2737721;

  // const schedules = [
  //   { address: CONTRACT_ADDRESS.CONTROLLER, topic: ClearPositionTopic, abi: ControllerAbi, handler: handleClearPosition },
  //   // { address: CONTRACT_ADDRESS.POSITION_MANAGER, topic: CancelClosePositionTopic, abi: PositionManagerAbi, handler: handleCancelClosePosition },
  //   // { address: CONTRACT_ADDRESS.CONTROLLER, topic: OpenSellPositionTopic, abi: ControllerAbi, handler: handleOpenSellPosition },
  //   // { address: CONTRACT_ADDRESS.POSITION_MANAGER, topic: CreateClosePositionTopic, abi: PositionManagerAbi, handler: handleCreateClosePosition },
  //   // { address: CONTRACT_ADDRESS.CONTROLLER, topic: CloseSellPositionTopic, abi: ControllerAbi, handler: handleCloseSellPosition },
  // ]

  // for (let i = 1280000; i < 2737721; i += 10000) {
  //   for await (const { address, topic, abi, handler } of schedules) {
  //     await getLogs(ethers, i, i + 9999, address, topic, abi, handler)
  //   }

  //   console.log(db, "db")
  // }
  





  /* 
   *
   * Add Affiliates
   *
   */

  // 2024-07-10
  // const affiliatesToAdd = [
  //   "0x73572065b5a52c8CbFEBF0630072EAAf90f10bB9",
  //   "0x4d11d8edcA605E92965339Ca3aF5447111111111",
  //   "0xca288eabadc6ed48cda2440a5b068cda8ae9995e"
  // ]

  // const accountsBatch = []
  // const discountRatesBatch = []
  // const feeRebateRateBatch = []

  // for (let i = 0; i < affiliatesToAdd.length; i++) {
  //   accountsBatch.push(affiliatesToAdd[i])
  //   discountRatesBatch.push(1500)
  //   feeRebateRateBatch.push(3000)
  // }

  // await referral.addToAffiliatesInBatch(
  //   accountsBatch,
  //   discountRatesBatch,
  //   feeRebateRateBatch
  // )

  // for (let i = 0; i < affiliatesToAdd.length; i++) {
  //   const affiliatesDiscountRate = await referral.affiliatesDiscountRate(affiliatesToAdd[i])
  //   const affiliateFeeRebateRate = await referral.affiliatesFeeRebateRate(affiliatesToAdd[i])
  //   console.log(affiliatesToAdd[i], ":", affiliatesDiscountRate.toString() + " / " + affiliateFeeRebateRate.toString())
  // }




  
  /* 
   *
   * Add Partners
   *
   */

  // // 2024-07-24
  // const partnersToAdd = [
  //   "0x5215B4ee0914eA3C62Aa1d059837293C5d2ccEEf"
  // ]
  // const discountRatesToAdd = [
  //   0
  // ]
  // const termsToAdd = [
  //   253402300740    
  // ]
  
  // for (let i = 0; i < partnersToAdd.length; i++) {
  //   console.log("working on ", partnersToAdd[i], " at discount rate of ", discountRatesToAdd[i], "..")
  //   await referral.setPartner(partnersToAdd[i], false, discountRatesToAdd[i], termsToAdd[i])
  // }

  // // Check
  // for (let i = 0; i < partnersToAdd.length; i++) {
  //   const isPartner = await referral.partners(partnersToAdd[i])
  //   const discountRate = await referral.partnersDiscountRate(partnersToAdd[i])
  //   const term = await referral.partnersTerm(partnersToAdd[i])
  //   console.log(partnersToAdd[i], ":", isPartner.toString() + " / " + discountRate.toString() + " / " + term.toString())
  // }
  





  /* 
   *
   * Set Buffer Amount
   *
   */

  // const vaults = [sVault, mVault, lVault];

  // const WBTC = "0x286F1C3f0323dB9c91D1E8f45c8DF2d065AB5fae"
  // const WBTC_DECIMAL = 8
  // const WETH = "0x6E1E9896e93F7A71ECB33d4386b49DeeD67a231A"
  // const WETH_DECIMAL = 18
  // const USDC = "0xd6D83aF58a19Cd14eF3CF6fe848C9A4d21e5727c"
  // const USDC_DECIMAL = 6
  // const WBERA = "0x7507c1dc16935B82698e4C63f2746A2fCf994dF8"
  // const WBERA_DECIMAL = 18
  // const HONEY = "0x0E4aaF1351de4c0264C5c7056Ef3777b41BD8e03"
  // const HONEY_DECIMAL = 18

  // const wbtcBufferAmounts = new BigNumber(1).multipliedBy(10 ** WBTC_DECIMAL).toString() // 4_00000000
  // const wethBufferAmounts = new BigNumber(16).multipliedBy(10 ** WETH_DECIMAL).toString() // 65_000000000000000000
  // const usdcBufferAmounts = new BigNumber(37500).multipliedBy(10 ** USDC_DECIMAL).toString() // 150000_000000
  // const honeyBufferAmounts = new BigNumber(10000).multipliedBy(10 ** HONEY_DECIMAL).toString() // 40000_000000000000000000

  // for (let i = 0; i < vaults.length; i++) {
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.WBTC, wbtcBufferAmounts);
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.WETH, wethBufferAmounts);
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.USDC, usdcBufferAmounts);
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.HONEY, honeyBufferAmounts);
  // }






  /* 
   *
   * Check Settlement Logic
   *
   */
  
  // 50 * 0.44390668
  // 22.195334
  // 22.195083

  // const targetExpiry = 1724832000;
  // const optionTokensAtSelfExpiry = await sVaultUtils.getOptionTokensAtSelfOriginExpiry(targetExpiry);

  // const targetIndexes = [15];
  // const targetOptionIds = [];
  // const targetOptionInfos = [];
  // const targetOptionIdsAmount = [];

  // for (let i = 0; i < targetIndexes.length; i++) {
  //   const optionTokenId = optionTokensAtSelfExpiry[targetIndexes[i]][0];
  //   const optionInfo = parseOptionTokenId(optionTokenId);
  
  //   targetOptionIds.push(optionTokenId);
  //   targetOptionInfos.push(optionInfo);
  //   targetOptionIdsAmount.push(optionTokensAtSelfExpiry[targetIndexes[i]][1]);
  // }

  // console.log("targetOptionIds:", targetOptionIds);
  // console.log("targetOptionInfos:", targetOptionInfos);
  // console.log("targetOptionIdsAmount:", targetOptionIdsAmount);

  // const a = await vaultPriceFeed.maxStrictPriceDeviation();
  // console.log(a, "a")

  // 22195083000000000000000000000000
  // 443906682053288854

  // await usdc.connect(DEPLOYER).transfer(CONTRACT_ADDRESS.S_VAULT, new BigNumber(76).multipliedBy(10 ** 6).toString())
  // await sVault.connect(DEPLOYER).directPoolDeposit(CONTRACT_ADDRESS.USDC)

  // const test = await sOlpManager.getOlpAssetUsd(CONTRACT_ADDRESS.USDC, false)
  // console.log(
  //   "reservedUsd : ", new BigNumber(test[3]).toString(), "\n",
  //   "utilizedUsd : ", new BigNumber(test[4]).toString(), "\n",
  //   "availableUsd : ", new BigNumber(test[5]).toString(), "\n",
  //   "depositedUsd : ", new BigNumber(test[6]).toString(), "\n",
  // )
  // console.log(
  //   new BigNumber(50580125703937393)
  //   .multipliedBy(new BigNumber(50).multipliedBy(new BigNumber(10).pow(6)))
  //   .dividedBy(new BigNumber(10).pow(18))
  //   .toString()
  // )
  // 22195083000000000000000000000000 // utilized usd
  // 22195334000000000000000000000000 // settle 하려는 포지션

  // 2528755000000000000000000000000 // utilized usd
  // 2529006.2851968695

  // 22195083
  // 22195334 - 22195083 = 251


  /*
   * Get Positions
   */
  // const allOptionTokens = await viewAggregator.getAllOptionToken();
  // console.log(allOptionTokens, "allOptionToknes")

  // const sVaultOptionTokens = allOptionTokens[0]

  // let btcCollateralAmount = new BigNumber(0)
  // let ethCollateralAmount = new BigNumber(0)
  // let usdcCollateralAmount = new BigNumber(0)

  // for (let i = 0; i < sVaultOptionTokens.length; i++) {
  //   const position = sVaultOptionTokens[i]
  //   const optionTokenId = position[0]
  //   const size = position[1]

  //   const optionTokenInfo = parseOptionTokenId(optionTokenId)

  //   if (optionTokenInfo.strategy === Strategy.SellCall) {
  //     const decimal = optionTokenInfo.underlyingAssetIndex === 1 ? 8 : 18;
  //     const collateralAmountPerSize = new BigNumber(10).pow(decimal);
  //     const collateralAmount = collateralAmountPerSize.multipliedBy(size).dividedBy(new BigNumber(10).pow(decimal));

  //     if (optionTokenInfo.underlyingAssetIndex === 1) {
  //       btcCollateralAmount = new BigNumber(btcCollateralAmount).plus(collateralAmount)
  //     } else if (optionTokenInfo.underlyingAssetIndex === 2) {
  //       ethCollateralAmount = new BigNumber(ethCollateralAmount).plus(collateralAmount)
  //     }
  //   } else if (optionTokenInfo.strategy === Strategy.SellPut) {
  //     const decimal = optionTokenInfo.underlyingAssetIndex === 1 ? 8 : 18;

  //     const precision = new BigNumber(10).pow(6);
  //     const collateralAmountPerSize = new BigNumber(optionTokenInfo.strikePrices[0]).multipliedBy(precision);
  //     const collateralAmount = collateralAmountPerSize.multipliedBy(size).dividedBy(new BigNumber(10).pow(decimal));

  //     usdcCollateralAmount = new BigNumber(usdcCollateralAmount).plus(collateralAmount)
  //   } else if (optionTokenInfo.strategy === Strategy.SellCallSpread || optionTokenInfo.strategy === Strategy.SellPutSpread) {
  //     const decimal = optionTokenInfo.underlyingAssetIndex === 1 ? 8 : 18;

  //     const precision = new BigNumber(10).pow(6);
  //     const collateralAmountPerSize = new BigNumber(optionTokenInfo.strikePrices[1]).minus(optionTokenInfo.strikePrices[0]).multipliedBy(precision);
  //     const collateralAmount = collateralAmountPerSize.multipliedBy(size).dividedBy(new BigNumber(10).pow(decimal));

  //     usdcCollateralAmount = new BigNumber(usdcCollateralAmount).plus(collateralAmount)
  //   }
  // }

  // console.log("btcCollateralAmount:", btcCollateralAmount.toString())
  // console.log("ethCollateralAmount:", ethCollateralAmount.toString())
  // console.log("usdcCollateralAmount:", usdcCollateralAmount.toString())

  // const test = await sOlpManager.getOlpAssetUsd(CONTRACT_ADDRESS.USDC, false)
  // console.log(
  //   "reservedUsd : ", new BigNumber(test[3]).toString(), "\n",
  //   "utilizedUsd : ", new BigNumber(test[4]).toString(), "\n",
  //   "availableUsd : ", new BigNumber(test[5]).toString(), "\n",
  //   "depositedUsd : ", new BigNumber(test[6]).toString(), "\n",
  // )


  /* 
   *
   * Get Logs
   *
   */ 
  // const startBlock = 1280000;
  // const endBlock = 2767625 + 1;
  // const endBlock = 2720212 + 1;
  // const endBlock = 2673862 + 1;
  // const endBlock = 3308362;

  // const startBlock = 3240677;
  // const endBlock = 3260677;

  // const startBlock = 1000000;
  // const endBlock = 1280000;

  // // 112470642
  // // 114625436
  // // 114625436 - 112470642 = 2151794
  // // 112471642 - 112470642 = 1000
  // // 113682249 - 112470642 = 1210607
  // 112470642
  // 112470642 - 108247195
  // const schedules = [
  //   // { address: CONTRACT_ADDRESS.S_VAULT, topic: IncreaseUtilizedAmountTopic, abi: VaultAbi, handler: handleIncreaseUtilizedAmount },
  //   // { address: CONTRACT_ADDRESS.S_VAULT, topic: DecreaseUtilizedAmountTopic, abi: VaultAbi, handler: handleDecreaseUtilizedAmount },
  //   { address: CONTRACT_ADDRESS.CONTROLLER, topic: ClearPositionTopic, abi: ControllerAbi, handler: handleClearPosition },
  //   // { address: CONTRACT_ADDRESS.SPOT_PRICE_FEED, topic: FeedSpotPriceTopic, abi: SpotPriceFeedAbi, handler: handleFeedSpotPrice },
  //   // { address: CONTRACT_ADDRESS.VAULT_PRICE_FEED, topic: SetMaxStrictPriceDeviationTopic, abi: VaultPriceFeedAbi, handler: handleSetMaxStrictPriceDeviation },
  //   // { address: CONTRACT_ADDRESS.POSITION_MANAGER, topic: CancelClosePositionTopic, abi: PositionManagerAbi, handler: handleCancelClosePosition },
  //   // { address: CONTRACT_ADDRESS.CONTROLLER, topic: OpenSellPositionTopic, abi: ControllerAbi, handler: handleOpenSellPosition },
  //   // { address: CONTRACT_ADDRESS.POSITION_MANAGER, topic: CreateClosePositionTopic, abi: PositionManagerAbi, handler: handleCreateClosePosition },
  //   // { address: CONTRACT_ADDRESS.CONTROLLER, topic: CloseSellPositionTopic, abi: ControllerAbi, handler: handleCloseSellPosition },
  // ]

  // for (let i = startBlock; i < endBlock; i += 10000) {
  //   for await (const { address, topic, abi, handler } of schedules) {
  //     await getLogs(ethers, i, i + 9999, address, topic, abi, handler)
  //   }

  //   console.log(db, "db")
  // }














// const key = await positionManager.positionRequestKeys(100);
// const info = await positionManager.openPositionRequests(key);
// console.log(info)


















  

















  // const aum = await sOlpManager.getAum(true);
  // console.log("aum:", aum.toString())

  // const aumAddition = await sOlpManager.aumAddition();
  // const aumaumDeduction = await sOlpManager.aumDeduction();
  // console.log("aumAddition:", aumAddition.toString())
  // console.log("aumDeduction:", aumaumDeduction.toString())
  
  // const totalOlpAssetUsd = await sOlpManager.getTotalOlpAssetUsd(true);
  // console.log("totalOlpAssetUsd:", totalOlpAssetUsd.toString())
  
  // const pv = await vaultPriceFeed.getPVAndSign(await sVault.getAddress());
  // console.log("pv:", pv.toString())

  // const aumInUsdg = await sOlpManager.getAumInUsdg(true);
  // console.log("aumInUsdg:", aumInUsdg.toString())

  console.log("Operation completed")
}

(async () => {
  await operation(ethers, null)
})()