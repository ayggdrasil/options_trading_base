import BigNumber from "bignumber.js";
import { ethers } from "hardhat";
import { getDeployedContracts } from "./deployedContract";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

async function main() {
  const [DEPLOYER] = await (ethers as any).getSigners();

  console.log("Transferring ownership with the account:", DEPLOYER.address);

  const {
    CONTRACT_ADDRESS,
    proxyAdmin,
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
    referral
  } = await getDeployedContracts(ethers, null)

  const SAFE_ADDRESS = "";

  await optionsAuthority.connect(DEPLOYER).setKeeper(SAFE_ADDRESS, true);

  await vaultPriceFeed.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await vaultPriceFeed.owner(), 'vaultPriceFeed ownership transferred to SAFE_ADDRESS')
  await optionsMarket.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await optionsMarket.owner(), 'optionsMarket ownership transferred to SAFE_ADDRESS')
  
  await sVault.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await sVault.owner(), 'sVault ownership transferred to SAFE_ADDRESS')
  await mVault.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await mVault.owner(), 'mVault ownership transferred to SAFE_ADDRESS')
  await lVault.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await lVault.owner(), 'lVault ownership transferred to SAFE_ADDRESS')
  
  await sVaultUtils.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await sVaultUtils.owner(), 'sVaultUtils ownership transferred to SAFE_ADDRESS')
  await mVaultUtils.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await mVaultUtils.owner(), 'mVaultUtils ownership transferred to SAFE_ADDRESS')
  await lVaultUtils.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await lVaultUtils.owner(), 'lVaultUtils ownership transferred to SAFE_ADDRESS')
  
  await susdg.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await susdg.owner(), 'susdg ownership transferred to SAFE_ADDRESS')
  await musdg.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await musdg.owner(), 'musdg ownership transferred to SAFE_ADDRESS')
  await lusdg.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await lusdg.owner(), 'lusdg ownership transferred to SAFE_ADDRESS')
  
  await solp.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await solp.owner(), 'solp ownership transferred to SAFE_ADDRESS')
  await molp.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await molp.owner(), 'molp ownership transferred to SAFE_ADDRESS')
  await lolp.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await lolp.owner(), 'lolp ownership transferred to SAFE_ADDRESS')

  await sOlpManager.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await sOlpManager.owner(), 'sOlpManager ownership transferred to SAFE_ADDRESS')
  await mOlpManager.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await mOlpManager.owner(), 'mOlpManager ownership transferred to SAFE_ADDRESS')
  await lOlpManager.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await lOlpManager.owner(), 'lOlpManager ownership transferred to SAFE_ADDRESS')

  await sRewardTracker.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await sRewardTracker.owner(), 'sRewardTracker ownership transferred to SAFE_ADDRESS')
  await mRewardTracker.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await mRewardTracker.owner(), 'mRewardTracker ownership transferred to SAFE_ADDRESS')
  await lRewardTracker.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await lRewardTracker.owner(), 'lRewardTracker ownership transferred to SAFE_ADDRESS')
  
  await sRewardDistributor.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await sRewardDistributor.owner(), 'sRewardDistributor ownership transferred to SAFE_ADDRESS')
  await mRewardDistributor.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await mRewardDistributor.owner(), 'mRewardDistributor ownership transferred to SAFE_ADDRESS')
  await lRewardDistributor.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await lRewardDistributor.owner(), 'lRewardDistributor ownership transferred to SAFE_ADDRESS')

  await sRewardRouterV2.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await sRewardRouterV2.owner(), 'sRewardRouterV2 ownership transferred to SAFE_ADDRESS')
  await mRewardRouterV2.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await mRewardRouterV2.owner(), 'mRewardRouterV2 ownership transferred to SAFE_ADDRESS')
  await lRewardRouterV2.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await lRewardRouterV2.owner(), 'lRewardRouterV2 ownership transferred to SAFE_ADDRESS')
  
  await controller.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await controller.owner(), 'controller ownership transferred to SAFE_ADDRESS')
  await positionManager.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await positionManager.owner(), 'positionManager ownership transferred to SAFE_ADDRESS')
  await settleManager.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await settleManager.owner(), 'settleManager ownership transferred to SAFE_ADDRESS')
  await feeDistributor.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await feeDistributor.owner(), 'feeDistributor ownership transferred to SAFE_ADDRESS')
  await btcOptionsToken.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await btcOptionsToken.owner(), 'btcOptionsToken ownership transferred to SAFE_ADDRESS')
  await ethOptionsToken.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await ethOptionsToken.owner(), 'ethOptionsToken ownership transferred to SAFE_ADDRESS')

  await fastPriceEvents.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await fastPriceEvents.owner(), 'fastPriceEvents ownership transferred to SAFE_ADDRESS')
  await fastPriceFeed.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await fastPriceFeed.owner(), 'fastPriceFeed ownership transferred to SAFE_ADDRESS')
  await positionValueFeed.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await positionValueFeed.owner(), 'positionValueFeed ownership transferred to SAFE_ADDRESS')
  await settlePriceFeed.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await settlePriceFeed.owner(), 'settlePriceFeed ownership transferred to SAFE_ADDRESS')
  await spotPriceFeed.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await spotPriceFeed.owner(), 'spotPriceFeed ownership transferred to SAFE_ADDRESS')
  await viewAggregator.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await viewAggregator.owner(), 'viewAggregator ownership transferred to SAFE_ADDRESS')
  await referral.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await referral.owner(), 'referral ownership transferred to SAFE_ADDRESS')

  await optionsAuthority.connect(DEPLOYER).setAdmin(SAFE_ADDRESS, true);
  console.log(await optionsAuthority.isAdmin(SAFE_ADDRESS), 'SAFE_ADDRESS is admin')
  await optionsAuthority.connect(DEPLOYER).transferOwnership(SAFE_ADDRESS);
  console.log(await optionsAuthority.owner(), 'optionsAuthority ownership transferred to SAFE_ADDRESS')

  await proxyAdmin.transferOwnership(SAFE_ADDRESS);
  console.log(await proxyAdmin.owner(), 'proxyAdmin ownership transferred to SAFE_ADDRESS')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
