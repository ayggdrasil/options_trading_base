
import BigNumber from 'bignumber.js';
import { ethers, network, upgrades } from "hardhat";
import { formatEther } from "ethers";
import { readFileSync, writeFileSync } from 'fs'

import { init } from "./init.config";

import { SecretKeyManager } from '../../utils/crypto';
import { getDeployedContracts } from './deployedContracts';
import { OptionsAuthority } from '../../typechain-types';
import { CONTRACT_ADDRESS } from './constants';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

async function main() {

  const secretKeyManager = new SecretKeyManager({ region: "ap-northeast-2", DEFAULT_PATH: "/dev-common/"})

  const ONE_TIME_DEPLOYER_KEY = await secretKeyManager.decrypt({ keyName: "one_time_deployer" })

  const DEPLOYER = new ethers.Wallet(ONE_TIME_DEPLOYER_KEY, ethers.provider)
  
  const SAFE_ADDRESS = "0xfDFd54E45A80aFc506D0807Ffc9b5919Ca087A77"

    const {
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
        settleManager,
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
        proxyAdmin,
    } = await getDeployedContracts(ethers, null)

    // owner

    console.log(await optionsAuthority.owner(), "optionsAuthority owner")
    console.log(await vaultPriceFeed.owner(), "vaultPriceFeed owner")
    console.log(await optionsMarket.owner(), "optionsMarket owner")
    console.log(await sVault.owner(), "sVault owner")
    console.log(await mVault.owner(), "mVault owner")
    console.log(await lVault.owner(), "lVault owner")
    console.log(await sVaultUtils.owner(), "sVaultUtils owner")
    console.log(await mVaultUtils.owner(), "mVaultUtils owner")
    console.log(await lVaultUtils.owner(), "lVaultUtils owner")
    console.log(await susdg.owner(), "susdg owner")
    console.log(await musdg.owner(), "musdg owner")
    console.log(await lusdg.owner(), "lusdg owner")
    console.log(await solp.owner(), "solp owner")
    console.log(await molp.owner(), "molp owner")
    console.log(await lolp.owner(), "lolp owner")
    console.log(await sOlpManager.owner(), "sOlpManager owner")
    console.log(await mOlpManager.owner(), "mOlpManager owner")
    console.log(await lOlpManager.owner(), "lOlpManager owner")
    console.log(await sRewardTracker.owner(), "sRewardTracker owner")
    console.log(await mRewardTracker.owner(), "mRewardTracker owner")
    console.log(await lRewardTracker.owner(), "lRewardTracker owner")
    console.log(await sRewardDistributor.owner(), "sRewardDistributor owner")
    console.log(await mRewardDistributor.owner(), "mRewardDistributor owner")
    console.log(await lRewardDistributor.owner(), "lRewardDistributor owner")
    console.log(await sRewardRouterV2.owner(), "sRewardRouterV2 owner")
    console.log(await mRewardRouterV2.owner(), "mRewardRouterV2 owner")
    console.log(await lRewardRouterV2.owner(), "lRewardRouterV2 owner")
    console.log(await controller.owner(), "controller owner")
    console.log(await positionManager.owner(), "positionManager owner")
    console.log(await settleManager.owner(), "settleManager owner")
    console.log(await feeDistributor.owner(), "feeDistributor owner")
    console.log(await btcOptionsToken.owner(), "btcOptionsToken owner")
    console.log(await ethOptionsToken.owner(), "ethOptionsToken owner")
    console.log(await primaryOracle.owner(), "primaryOracle owner")
    console.log(await fastPriceEvents.owner(), "fastPriceEvents owner")
    console.log(await fastPriceFeed.owner(), "fastPriceFeed owner")
    console.log(await positionValueFeed.owner(), "positionValueFeed owner")
    console.log(await settlePriceFeed.owner(), "settlePriceFeed owner")
    console.log(await spotPriceFeed.owner(), "spotPriceFeed owner")
    console.log(await viewAggregator.owner(), "viewAggregator owner")
    console.log(await referral.owner(), "referral owner")
    console.log(await proxyAdmin.owner(), "proxyAdmin owner")

    // optionsAuthority
    console.log(await optionsAuthority.isAdmin(SAFE_ADDRESS), "optionsAuthority.isAdmin(SAFE_ADDRESS)")
    console.log(await optionsAuthority.isKeeper(SAFE_ADDRESS), "optionsAuthority.isKeeper(SAFE_ADDRESS)")
    console.log(await optionsAuthority.isPositionKeeper(SAFE_ADDRESS), "optionsAuthority.isPositionKeeper(SAFE_ADDRESS)")
    console.log(await optionsAuthority.isFastPriceFeed(SAFE_ADDRESS), "optionsAuthority.isFastPriceFeed(SAFE_ADDRESS)")
    console.log(await optionsAuthority.isController(SAFE_ADDRESS), "optionsAuthority.isController(SAFE_ADDRESS)")
    console.log(await optionsAuthority.isFeeDistributor(SAFE_ADDRESS), "optionsAuthority.isFeeDistributor(SAFE_ADDRESS)")

    // vaultPriceFeed
    console.log(await vaultPriceFeed.primaryOracle(), 'primaryOracle')
    console.log(await vaultPriceFeed.secondarySpotPriceFeed(), 'secondarySpotPriceFeed')
    console.log(await vaultPriceFeed.isPrimaryOracleEnabled(), 'isPrimaryOracleEnabled')
    console.log(await vaultPriceFeed.isSecondarySpotEnabled(), 'isSecondarySpotEnabled')
    console.log(await vaultPriceFeed.fastPriceFeed(), 'fastPriceFeed')
    console.log(await vaultPriceFeed.settlePriceFeed(), 'settlePriceFeed')
    console.log(await vaultPriceFeed.positionValueFeed(), 'positionValueFeed')
    console.log(await vaultPriceFeed.maxStrictPriceDeviation(), 'maxStrictPriceDeviation')
    console.log(await vaultPriceFeed.positionManager(), 'positionManager')

    const TOKEN_ADDRESSEES = [CONTRACT_ADDRESS.WBTC, CONTRACT_ADDRESS.WETH, CONTRACT_ADDRESS.USDC]

    for await (const tokenAddress of TOKEN_ADDRESSEES) {
      console.log(await vaultPriceFeed.spreadBasisPoints(tokenAddress), `await vaultPriceFeed.spreadBasisPoints(${tokenAddress})`)
      console.log(await vaultPriceFeed.supportedTokens(tokenAddress), `await vaultPriceFeed.supportedTokens(${tokenAddress})`)
      console.log(await vaultPriceFeed.strictStableTokens(tokenAddress), `await vaultPriceFeed.strictStableTokens(${tokenAddress})`)
    }

    for await (const id of [1, 2]) {
      console.log(await vaultPriceFeed.minMarkPrices(id), `await vaultPriceFeed.minMarkPrices(${id})`)    
    }
    
    // optionsMarket
    console.log(await optionsMarket.registeredOptionsCount(), `await optionsMarket.registeredOptionsCount()`)
    console.log(await optionsMarket.activeOptionsCount(), `await optionsMarket.activeOptionsCount()`)
    console.log(await optionsMarket.mainStableAsset(), `await optionsMarket.mainStableAsset()`)
    console.log(await optionsMarket.nextUnderlyingAssetIndex(), `await optionsMarket.nextUnderlyingAssetIndex()`)

    for await (const id of [1, 2]) {
      console.log(await optionsMarket.indexToUnderlyingAsset(id), `await optionsMarket.indexToUnderlyingAsset(${id})`)
    }

    for await (const tokenAddress of TOKEN_ADDRESSEES) {
      console.log(await optionsMarket.underlyingAssetToIndex(tokenAddress), `await optionsMarket.underlyingAssetToIndex(${tokenAddress})`)
      console.log(await optionsMarket.underlyingAssetToOptionsToken(tokenAddress), `await optionsMarket.underlyingAssetToOptionsToken(${tokenAddress})`)
      console.log(await optionsMarket.optionsTokenToUnderlyingAsset(tokenAddress), `await optionsMarket.optionsTokenToUnderlyingAsset(${tokenAddress})`)
      console.log(await optionsMarket.isUnderlyingAssetActive(tokenAddress), `await optionsMarket.isUnderlyingAssetActive(${tokenAddress})`)
    }

    // vault

    console.log(await sVault.isPositionEnabled(), `await sVault.isPositionEnabled()`)
    console.log(await sVault.isBuySellSwapEnabled(), `await sVault.isBuySellSwapEnabled()`)
    console.log(await sVault.useSwapPricing(), `await sVault.useSwapPricing()`)
    console.log(await sVault.vaultUtils(), `await sVault.vaultUtils()`)
    console.log(await sVault.optionsMarket(), `await sVault.optionsMarket()`)
    console.log(await sVault.settleManager(), `await sVault.settleManager()`)
    console.log(await sVault.controller(), `await sVault.controller()`)
    console.log(await sVault.vaultPriceFeed(), `await sVault.vaultPriceFeed()`)
    console.log(await sVault.usdg(), `await sVault.usdg()`)
    console.log(await sVault.thresholdDays(), `await sVault.thresholdDays()`)
    console.log(await sVault.whitelistedTokenCount(), `await sVault.whitelistedTokenCount()`)
    console.log(await sVault.totalTokenWeights(), `await sVault.totalTokenWeights()`)



}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});