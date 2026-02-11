import BigNumber from "bignumber.js";
import { getDeployedContracts } from "./deployedContract";
import { ethers, upgrades } from "hardhat";
import {
  KP_OPTIONS_MARKET,
  KP_POSITION_PROCESSOR,
  KP_SETTLE_OPERATOR,
  KP_PV_FEEDER,
  KP_SPOT_FEEDER,
  KP_FEE_DISTRIBUTOR,
  KP_CLEARING_HOUSE,
  KP_OLP_PROCESSOR,
  OLP_TOKEN_INFO,
  TREASURY,
  GOVERNANCE,
} from "./deployConfig";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 18,
});

async function sendEthToKeepers(deployer: any, amount: string) {
  const keepers = [
    KP_OPTIONS_MARKET,
    KP_POSITION_PROCESSOR,
    KP_SETTLE_OPERATOR,
    KP_PV_FEEDER,
    KP_SPOT_FEEDER,
    KP_FEE_DISTRIBUTOR,
    KP_CLEARING_HOUSE,
    KP_OLP_PROCESSOR,
  ];

  console.log(`Sending ${amount} ETH to ${keepers.length} keepers...`);

  for (const keeper of keepers) {
    try {
      const tx = await deployer.sendTransaction({
        to: keeper.address,
        value: ethers.parseEther(amount),
      });
      await tx.wait();
      console.log(`✓ Sent ${amount} ETH to ${keeper.address}`);
    } catch (error: any) {
      console.error(
        `✗ Failed to send ETH to ${keeper.address}:`,
        error.message
      );
    }
  }

  console.log("Finished sending ETH to keepers");
}

async function vaultPriceFeedSetPriceFeeds(
  vaultPriceFeed: any,
  deployer: any,
  contractAddress: any
) {
  try {
    console.log("Setting price feeds for VaultPriceFeed...");
    console.log(`  - Fast Price Feed: ${contractAddress.FAST_PRICE_FEED}`);
    console.log(`  - Settle Price Feed: ${contractAddress.SETTLE_PRICE_FEED}`);
    console.log(
      `  - Position Value Feed: ${contractAddress.POSITION_VALUE_FEED}`
    );

    const tx = await vaultPriceFeed
      .setPriceFeeds(
        contractAddress.FAST_PRICE_FEED,
        contractAddress.SETTLE_PRICE_FEED,
        contractAddress.POSITION_VALUE_FEED
      );

    console.log(`  Transaction hash: ${tx.hash}`);
    console.log("  Waiting for confirmation...");

    await tx.wait();

    console.log("✓ Successfully set price feeds for VaultPriceFeed");
  } catch (error: any) {
    console.error("✗ Failed to set price feeds for VaultPriceFeed:");
    console.error(`  Error: ${error.message}`);
    if (error.transaction) {
      console.error(`  Transaction hash: ${error.transaction.hash}`);
    }
    throw error;
  }
}

async function vaultPriceFeedDisablePrimaryOracle(
  vaultPriceFeed: any,
  deployer: any,
  primaryOracleAddress: any,
  isPrimaryOracleEnabled: boolean
) {
  try {
    console.log("Disabling primary oracle for VaultPriceFeed...");
    console.log(`  - Primary Oracle: ${primaryOracleAddress}`);
    console.log(`  - Enabled: ${isPrimaryOracleEnabled}`);

    const tx = await vaultPriceFeed
      .connect(deployer)
      .setPrimaryOracle(primaryOracleAddress, isPrimaryOracleEnabled);

    console.log(`  Transaction hash: ${tx.hash}`);
    console.log("  Waiting for confirmation...");

    await tx.wait();

    console.log("✓ Successfully disabled primary oracle for VaultPriceFeed");
  } catch (error: any) {
    console.error("✗ Failed to disable primary oracle for VaultPriceFeed:");
    console.error(`  Error: ${error.message}`);
    if (error.transaction) {
      console.error(`  Transaction hash: ${error.transaction.hash}`);
    }
    throw error;
  }
}

// ========================================
  // Contract Upgrade Examples
  // ========================================
  
  // Example 1: Upgrade OlpQueue
  // await upgradeContract("OlpQueue", CONTRACT_ADDRESS.S_OLP_QUEUE);
  // await upgradeContract("OlpQueue", CONTRACT_ADDRESS.M_OLP_QUEUE);
  // await upgradeContract("OlpQueue", CONTRACT_ADDRESS.L_OLP_QUEUE);

  // Example 2: Upgrade RewardRouterV2
  // await upgradeContract("RewardRouterV2", CONTRACT_ADDRESS.S_REWARD_ROUTER_V2);
  // await upgradeContract("RewardRouterV2", CONTRACT_ADDRESS.M_REWARD_ROUTER_V2);
  // await upgradeContract("RewardRouterV2", CONTRACT_ADDRESS.L_REWARD_ROUTER_V2);

  // Example 3: Upgrade with options (skip storage check)
  // await upgradeContract("Controller", CONTRACT_ADDRESS.CONTROLLER, {
  //   unsafeSkipStorageCheck: true,
  //   txOverrides: {
  //     gasLimit: 8000000,
  //     gasPrice: 100000000000
  //   }
  // });

  // Example 4: Upgrade multiple contracts
  // const contractsToUpgrade = [
  //   { name: "OlpManager", address: CONTRACT_ADDRESS.S_OLP_MANAGER },
  //   { name: "OlpManager", address: CONTRACT_ADDRESS.M_OLP_MANAGER },
  //   { name: "OlpManager", address: CONTRACT_ADDRESS.L_OLP_MANAGER },
  // ];
  // for (const contract of contractsToUpgrade) {
  //   await upgradeContract(contract.name, contract.address);
  // }
  
async function upgradeContract(
  contractName: string,
  proxyAddress: string,
  options?: {
    unsafeSkipStorageCheck?: boolean;
    txOverrides?: {
      gasLimit?: number;
      gasPrice?: number;
    };
  }
) {
  try {
    console.log(`\n========================================`);
    console.log(`Upgrading ${contractName}...`);
    console.log(`  - Proxy Address: ${proxyAddress}`);

    const Factory = await ethers.getContractFactory(contractName);
    
    const upgradeOptions: any = {};
    if (options?.unsafeSkipStorageCheck) {
      upgradeOptions.unsafeSkipStorageCheck = true;
    }
    if (options?.txOverrides) {
      upgradeOptions.txOverrides = options.txOverrides;
    }

    const upgraded = Object.keys(upgradeOptions).length > 0 
      ? await upgrades.upgradeProxy(proxyAddress, Factory, upgradeOptions)
      : await upgrades.upgradeProxy(proxyAddress, Factory);

    console.log(`  Transaction hash: ${upgraded.deploymentTransaction()?.hash || "N/A"}`);
    console.log(`✓ Successfully upgraded ${contractName}`);
    console.log(`========================================\n`);

    return upgraded;
  } catch (error: any) {
    console.error(`\n✗ Failed to upgrade ${contractName}:`);
    console.error(`  Error: ${error.message}`);
    if (error.transaction) {
      console.error(`  Transaction hash: ${error.transaction.hash}`);
    }
    console.error(`========================================\n`);
    throw error;
  }
}

async function playground() {
  const [DEPLOYER] = await (ethers as any).getSigners();

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
    sOlpQueue,
    mOlpQueue,
    lOlpQueue,
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
    referral,
  } = await getDeployedContracts(ethers, null);

  // const a = await sOlpManager.getPrice(false);
  // console.log(a, "a");

  // const a = await feeDistributor.treasury()
  // console.log(a, "a");
  // const b = await feeDistributor.governance()
  // console.log(b, "b");
  // const c = await feeDistributor.treasuryRate()
  // console.log(c, "c");
  // const d = await feeDistributor.governanceRate()
  // console.log(d, "d");
  // const e = await feeDistributor.olpRewardRate()
  // console.log(e, "e");

  // const s_feeReserves_USDC = await sVault.feeReserves(CONTRACT_ADDRESS.USDC);
  // console.log(s_feeReserves_USDC, "s_feeReserves_USDC");

  // await feeDistributor.connect(DEPLOYER).setTreasury(TREASURY);
  // console.log(await feeDistributor.treasury(), "treasury");
  // await feeDistributor.connect(DEPLOYER).setGovernance(GOVERNANCE);
  // console.log(await feeDistributor.governance(), "governance");

  // await vaultPriceFeedSetPriceFeeds(vaultPriceFeed, DEPLOYER, CONTRACT_ADDRESS);
  // await sendEthToKeepers(DEPLOYER, "0.003");
  // await vaultPriceFeedDisablePrimaryOracle(vaultPriceFeed, DEPLOYER, CONTRACT_ADDRESS.PRIMARY_ORACLE, false);
  // await upgradeContract("PositionManager", CONTRACT_ADDRESS.POSITION_MANAGER);

  // await upgradeContract("Controller", CONTRACT_ADDRESS.CONTROLLER);
  // await upgradeContract("Vault", CONTRACT_ADDRESS.S_VAULT);
  // await upgradeContract("Vault", CONTRACT_ADDRESS.M_VAULT);
  // await upgradeContract("Vault", CONTRACT_ADDRESS.L_VAULT);
  // await upgradeContract("VaultUtils", CONTRACT_ADDRESS.S_VAULT_UTILS);
  // await upgradeContract("VaultUtils", CONTRACT_ADDRESS.M_VAULT_UTILS);
  // await upgradeContract("VaultUtils", CONTRACT_ADDRESS.L_VAULT_UTILS); 
  // await upgradeContract("OlpQueue", CONTRACT_ADDRESS.S_OLP_QUEUE);
  // await upgradeContract("OlpQueue", CONTRACT_ADDRESS.M_OLP_QUEUE);
  // await upgradeContract("OlpQueue", CONTRACT_ADDRESS.L_OLP_QUEUE);
  // await upgradeContract("Controller", CONTRACT_ADDRESS.CONTROLLER);
  // await upgradeContract("OlpManager", CONTRACT_ADDRESS.S_OLP_MANAGER);
  // await upgradeContract("OlpManager", CONTRACT_ADDRESS.M_OLP_MANAGER);
  // await upgradeContract("OlpManager", CONTRACT_ADDRESS.L_OLP_MANAGER);
  // await upgradeContract("RewardRouterV2", CONTRACT_ADDRESS.S_REWARD_ROUTER_V2);
  // await upgradeContract("RewardRouterV2", CONTRACT_ADDRESS.M_REWARD_ROUTER_V2);
  // await upgradeContract("RewardRouterV2", CONTRACT_ADDRESS.L_REWARD_ROUTER_V2);
  // await upgradeContract("RewardTracker", CONTRACT_ADDRESS.S_REWARD_TRACKER);
  // await upgradeContract("RewardTracker", CONTRACT_ADDRESS.M_REWARD_TRACKER);
  // await upgradeContract("RewardTracker", CONTRACT_ADDRESS.L_REWARD_TRACKER);

  // Set allowed strategies for trading
  // Strategy enum values: BuyCall(1), SellCall(2), BuyPut(3), SellPut(4), 
  //                       BuyCallSpread(5), SellCallSpread(6), BuyPutSpread(7), SellPutSpread(8)
  // Usage examples:
  //   - Using numbers: setAllowedStrategies([1, 3], true) // Allow BuyCall and BuyPut
  //   - Disallow: setAllowedStrategies([2], false) // Disallow SellCall
  // await controller.connect(DEPLOYER).setAllowedStrategies([5, 6, 7, 8], true);

  // const vaults = [sVault, mVault, lVault];
  // const vaultUtils = [sVaultUtils, mVaultUtils, lVaultUtils];
  // const wbtcDecimal = await wbtc.decimals();
  // const wethDecimal = await weth.decimals();
  // const usdcDecimal = await usdc.decimals();
  // for (let i = 0; i < vaults.length; i++) {
  //   await vaultUtils[i].connect(DEPLOYER).setHasDynamicFees(false);
  //   await vaults[i].connect(DEPLOYER).setTokenConfig(CONTRACT_ADDRESS.WBTC, wbtcDecimal, OLP_TOKEN_INFO.WBTC.WEIGHT, OLP_TOKEN_INFO.WBTC.MAX_USDG_AMOUNT, true, false, OLP_TOKEN_INFO.WBTC.DECREASE_TOLERANCE_AMOUNT);
  //   await vaults[i].connect(DEPLOYER).setTokenConfig(CONTRACT_ADDRESS.WETH, wethDecimal, OLP_TOKEN_INFO.WETH.WEIGHT, OLP_TOKEN_INFO.WETH.MAX_USDG_AMOUNT, true, false, OLP_TOKEN_INFO.WETH.DECREASE_TOLERANCE_AMOUNT);
  //   await vaults[i].connect(DEPLOYER).setTokenConfig(CONTRACT_ADDRESS.USDC, usdcDecimal, OLP_TOKEN_INFO.USDC.WEIGHT, OLP_TOKEN_INFO.USDC.MAX_USDG_AMOUNT, false, true, OLP_TOKEN_INFO.USDC.DECREASE_TOLERANCE_AMOUNT);
  //   await vaultUtils[i].connect(DEPLOYER).setFees(
  //     6, // 1. openBuyNakedPositionFee
  //     3, // 2. openSellNakedPositionFee
  //     3, // 3. openComboPositionFee
  //     3, // 4. closeNakedPositionFee
  //     3, // 5. closeComboPositionFee
  //     2, // 6. settlePositionFee
  //     60, // 7. taxFee
  //     5, // 8. stableTaxFee
  //     10, // 9. mintBurnFee
  //     25, // 10. swapFee
  //     1 // 11. stableSwapFee
  //   );
  // }



  // ========================================
  // Playground
  // ========================================


  // const beforeCooldownDuration = await sOlpManager.connect(DEPLOYER).cooldownDuration();
  // console.log(beforeCooldownDuration, "beforeCooldownDuration"); // 604800n
  // await sOlpManager.connect(DEPLOYER).setCooldownDuration(180);
  // const afterCooldownDuration = await sOlpManager.connect(DEPLOYER).cooldownDuration();
  // console.log(afterCooldownDuration, "afterCooldownDuration"); // 180n





  


  // const vaults = [sVault, mVault, lVault];
  
  // const wbtcDecimal = await wbtc.decimals();
  // const wethDecimal = await weth.decimals();
  // const usdcDecimal = await usdc.decimals();

  // for (let i = 0; i < vaults.length; i++) {
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.WBTC, OLP_TOKEN_INFO.WBTC.BUFFER_AMOUNT);
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.WETH, OLP_TOKEN_INFO.WETH.BUFFER_AMOUNT);
  //   await vaults[i].connect(DEPLOYER).setBufferAmount(CONTRACT_ADDRESS.USDC, OLP_TOKEN_INFO.USDC.BUFFER_AMOUNT);
  //   await vaults[i].connect(DEPLOYER).setTokenConfig(CONTRACT_ADDRESS.WBTC, wbtcDecimal, OLP_TOKEN_INFO.WBTC.WEIGHT, OLP_TOKEN_INFO.WBTC.MAX_USDG_AMOUNT, true, false, OLP_TOKEN_INFO.WBTC.DECREASE_TOLERANCE_AMOUNT);
  //   await vaults[i].connect(DEPLOYER).setTokenConfig(CONTRACT_ADDRESS.WETH, wethDecimal, OLP_TOKEN_INFO.WETH.WEIGHT, OLP_TOKEN_INFO.WETH.MAX_USDG_AMOUNT, true, false, OLP_TOKEN_INFO.WETH.DECREASE_TOLERANCE_AMOUNT);
  //   await vaults[i].connect(DEPLOYER).setTokenConfig(CONTRACT_ADDRESS.USDC, usdcDecimal, OLP_TOKEN_INFO.USDC.WEIGHT, OLP_TOKEN_INFO.USDC.MAX_USDG_AMOUNT, false, true, OLP_TOKEN_INFO.USDC.DECREASE_TOLERANCE_AMOUNT);
  // }



















  // const epochStage = await sRewardRouterV2.epochStage();
  // console.log(epochStage, "epochStage");

  // const hasPendingQueue = await sOlpQueue.hasPendingQueue();
  // console.log(hasPendingQueue, "hasPendingQueue");

  // const pvLastUpdatedAt = await positionValueFeed.getPVLastUpdatedAt();
  // console.log(new Date(Number(pvLastUpdatedAt) * 1000).toISOString(), "pvLastUpdatedAt");

  // // 1. start epoch
  // const tx1 = await sRewardRouterV2.connect(DEPLOYER).startEpoch();
  // await tx1.wait();
  // console.log(tx1.hash, 'startEpoch tx.hash');

  // // 2. approve usdc to reward router
  // const tx2 = await usdc.connect(DEPLOYER).approve(CONTRACT_ADDRESS.S_REWARD_ROUTER_V2, "10000000");
  // await tx2.wait();
  // console.log(tx2.hash, 'approve usdc to reward router tx.hash');

  // // 3. enqueue mint and stake olp
  // const tx3 = await sRewardRouterV2.connect(DEPLOYER).submitMintAndStakeOlp(
  //   CONTRACT_ADDRESS.USDC,
  //   "10000000", // 10 USDC
  //   DEPLOYER.address,
  //   false
  // )
  // await tx3.wait();
  // console.log(tx3.hash, 'submitMintAndStakeOlp tx.hash');

  // // 4. end epoch
  // const tx4 = await sRewardRouterV2.connect(DEPLOYER).endEpoch();
  // await tx4.wait();
  // console.log(tx4.hash, "endEpoch tx.hash");

  // 5. execute queue
  // const tx5 = await sOlpQueue.connect(DEPLOYER).executeQueue(2);
  // await tx5.wait();
  // console.log(tx5.hash, "executeQueue tx.hash");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
playground().catch((error: any) => {
  console.error(error);
  process.exitCode = 1;
});
