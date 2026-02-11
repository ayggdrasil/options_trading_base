
import BigNumber from 'bignumber.js';
import { ethers, upgrades } from "hardhat";
import { formatEther } from "ethers";
import { writeFileSync } from 'fs'

import { deployAssetTokens } from "./deployContracts/deploy.assetTokens";
import { deployOptionsAuthority } from "./deployContracts/deploy.optionsAuthority";
import { deployVaultPriceFeed } from "./deployContracts/deploy.vaultPriceFeed";
import { deployOptionsMarket } from "./deployContracts/deploy.optionsMarket";
import { deployOptionsToken } from "./deployContracts/deploy.optionsToken";
import { deployVault } from "./deployContracts/deploy.vault";
import { deployVaultUtils } from './deployContracts/deploy.vaultUtils';
import { deployUSDG } from "./deployContracts/deploy.usdg";
import { deployOLP } from "./deployContracts/deploy.olp";
import { deployOlpManager } from "./deployContracts/deploy.olpManager";
import { deployRewardTracker } from "./deployContracts/deploy.rewardTacker";
import { deployRewardDistributor } from './deployContracts/deploy.rewardDistributor';
import { deployRewardRouterV2 } from './deployContracts/deploy.rewardRouterV2';
import { deployController } from './deployContracts/deploy.controller';
import { deployPositionManager } from './deployContracts/deploy.positionManager';
import { deploySettleManager } from './deployContracts/deploy.settleManager';
import { deployFeeDistributor } from './deployContracts/deploy.feeDistributor';
import { deployFastPriceFeed } from './deployContracts/deploy.fastPriceFeed';
import { deployPositionValueFeed } from './deployContracts/deploy.positionValueFeed';
import { deploySettlePriceFeed } from './deployContracts/deploy.settlePriceFeed';
import { deploySpotPriceFeed } from './deployContracts/deploy.spotPriceFeed';
import { deployViewAggregator } from './deployContracts/deploy.viewAggreagtor';
import { deployReferral } from './deployContracts/deploy.referral';
import { deployPrimaryOracle } from './deployContracts/deploy.primaryOracle';
import { deployOlpQueue } from './deployContracts/deploy.olpQueue';

import { init } from "./init.config";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

async function main() {  
  const [
    DEPLOYER,
  ] = await (ethers as any).getSigners()
  
  console.log("Deploying contracts with the account:", DEPLOYER.address);

  const deployerBalanceBefore = formatEther(await (ethers as any).provider.getBalance(DEPLOYER.address))
  console.log("Deployer balance before:", deployerBalanceBefore);
  
  const CONTRACT_ADDRESS: any = {}

  const { wbtc, weth, usdc } = await deployAssetTokens(ethers, { upgrades, CONTRACT_ADDRESS })
  const { optionsAuthority } = await deployOptionsAuthority(ethers, { upgrades, CONTRACT_ADDRESS })  
  const { vaultPriceFeed } =  await deployVaultPriceFeed(ethers, { upgrades, CONTRACT_ADDRESS })
  const { optionsMarket } = await deployOptionsMarket(ethers, { upgrades, CONTRACT_ADDRESS })
  
  const { sVault, mVault, lVault } = await deployVault(ethers, { upgrades, CONTRACT_ADDRESS })
  const { sVaultUtils, mVaultUtils, lVaultUtils } = await deployVaultUtils(ethers, { upgrades, CONTRACT_ADDRESS })
  
  const { controller } = await deployController(ethers, { upgrades, CONTRACT_ADDRESS })
  
  const { susdg, musdg, lusdg } = await deployUSDG(ethers, { upgrades, CONTRACT_ADDRESS })
  const { solp, molp, lolp } = await deployOLP(ethers, { upgrades, CONTRACT_ADDRESS })
  const { sOlpManager, mOlpManager, lOlpManager } = await deployOlpManager(ethers, { upgrades, CONTRACT_ADDRESS })
  const { sRewardTracker, mRewardTracker, lRewardTracker } = await deployRewardTracker(ethers, { upgrades, CONTRACT_ADDRESS })
  const { sRewardDistributor, mRewardDistributor, lRewardDistributor } = await deployRewardDistributor(ethers, { upgrades, CONTRACT_ADDRESS })
  const { sRewardRouterV2, mRewardRouterV2, lRewardRouterV2 } = await deployRewardRouterV2(ethers, { upgrades, CONTRACT_ADDRESS })
  const { sOlpQueue, mOlpQueue, lOlpQueue } = await deployOlpQueue(ethers, { upgrades, CONTRACT_ADDRESS })
  
  const { positionManager } = await deployPositionManager(ethers, { upgrades, CONTRACT_ADDRESS })
  const { settleManager } = await deploySettleManager(ethers, { upgrades, CONTRACT_ADDRESS })
  const { feeDistributor } = await deployFeeDistributor(ethers, { upgrades, CONTRACT_ADDRESS })
  
  const { btcOptionsToken, ethOptionsToken } = await deployOptionsToken(ethers, { upgrades, CONTRACT_ADDRESS })
  
  const { fastPriceEvents, fastPriceFeed } = await deployFastPriceFeed(ethers, { upgrades, CONTRACT_ADDRESS })
  const { positionValueFeed } = await deployPositionValueFeed(ethers, { upgrades, CONTRACT_ADDRESS })
  const { settlePriceFeed } = await deploySettlePriceFeed(ethers, { upgrades, CONTRACT_ADDRESS })
  const { spotPriceFeed } = await deploySpotPriceFeed(ethers, { upgrades, CONTRACT_ADDRESS })
  const { primaryOracle } = await deployPrimaryOracle(ethers, { upgrades, CONTRACT_ADDRESS })

  const { viewAggregator } = await deployViewAggregator(ethers, { upgrades, CONTRACT_ADDRESS })
  const { referral } = await deployReferral(ethers, { upgrades, CONTRACT_ADDRESS })

  // add proxy admin address
  const proxyAdmin = await upgrades.admin.getInstance();
  CONTRACT_ADDRESS.PROXY_ADMIN = await proxyAdmin.getAddress();

  writeFileSync(`latestAddress.${process.env.HARDHAT_NETWORK}.json`, JSON.stringify(CONTRACT_ADDRESS, null, 2))
  writeFileSync(`../shared/src/latestAddress.${process.env.HARDHAT_NETWORK}.json`, JSON.stringify(CONTRACT_ADDRESS, null, 2))
  
  await init(ethers, CONTRACT_ADDRESS)

  const deployerBalanceAfter = formatEther(await (ethers as any).provider.getBalance(DEPLOYER.address))
  console.log("Deployer balance after:", deployerBalanceAfter);
  console.log("Diff balance:", new BigNumber(deployerBalanceBefore).minus(deployerBalanceAfter).toString());

  console.log('Deployment completed')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});