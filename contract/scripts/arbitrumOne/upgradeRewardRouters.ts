
import BigNumber from 'bignumber.js';
import { ethers, network, upgrades } from "hardhat";
import { formatEther } from "ethers";
import { writeFileSync } from 'fs'

import { init } from "./init.config";

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
import { safeTx } from './../../scripts/safeTx';
import { getDeployedContracts } from './deployedContracts';
BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

async function main(addressMap: any) {

  const [
    DEPLOYER,
  ] = await (ethers as any).getSigners()

  // await deployProxyAdmin(ethers, { upgrades })
  console.log("Deploying contracts with the account:", DEPLOYER.address);

  // 1. deploy implementation
  const RewardRouterV2 = "RewardRouterV2";
  const RewardRouterV2Factory = await ethers.getContractFactory(RewardRouterV2)
  const implementation = await RewardRouterV2Factory.deploy()
  await implementation.waitForDeployment()
  console.log("implementation : ", await implementation.getAddress())

  const {
    CONTRACT_ADDRESS,
    proxyAdmin,
    sRewardRouterV2,
    mRewardRouterV2,
    lRewardRouterV2,
    
  } = await getDeployedContracts(ethers, addressMap);

  const txData1 = await proxyAdmin.interface.encodeFunctionData("upgrade", [await sRewardRouterV2.getAddress(), "0x6C12CF163C37Aa55c0C447C2f66C4DfDC1d59cE7"])
  const txData2 = await proxyAdmin.interface.encodeFunctionData("upgrade", [await mRewardRouterV2.getAddress(), "0x6C12CF163C37Aa55c0C447C2f66C4DfDC1d59cE7"])
  const txData3 = await proxyAdmin.interface.encodeFunctionData("upgrade", [await lRewardRouterV2.getAddress(), "0x6C12CF163C37Aa55c0C447C2f66C4DfDC1d59cE7"])

  console.log(txData1, 'txData1')
  console.log(txData2, 'txData2')
  console.log(txData3, 'txData3')

  try {
    await safeTx(
      DEPLOYER.privateKey, CONTRACT_ADDRESS.SAFE_ADDRESS, [
      { to: await proxyAdmin.getAddress(), data: txData1 },
      { to: await proxyAdmin.getAddress(), data: txData2 },
      { to: await proxyAdmin.getAddress(), data: txData3 },
    ])
  } catch (e) {
    console.log(e)
    return;
  }
  console.log("Operation completed")








}
(async () => {
  await main(null)
})()