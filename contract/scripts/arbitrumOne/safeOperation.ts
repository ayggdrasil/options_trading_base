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
import ProxyAdminAbi from "../../../shared/abis/ProxyAdmin.json"

import { getDeployedContracts } from "./deployedContracts";
import { ethers, upgrades } from "hardhat";
import { parseOptionTokenId, Strategy } from "../../utils/format";
import { CancelClosePositionTopic, ClearPositionTopic, CloseSellPositionTopic, CreateClosePositionTopic, db, DecreaseUtilizedAmountTopic, FeedSpotPriceTopic, getLogs, handleCancelClosePosition, handleClearPosition, handleCloseSellPosition, handleCreateClosePosition, handleDecreaseUtilizedAmount, handleFeedSpotPrice, handleIncreaseUtilizedAmount, handleOpenSellPosition, handleSetMaxStrictPriceDeviation, IncreaseUtilizedAmountTopic, OpenSellPositionTopic, SetMaxStrictPriceDeviationTopic } from "../handler";
import { cooldownDuration, mpReleaseDuration, rpReleaseDuration, settleFeeCalculationLimitRate, tradeFeeCalculationLimitRate } from "./constants";
import { safeTx } from "../safeTx";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export async function operation(ethers: any, addressMap: any) {
  const [
    DEPLOYER,
  ] = await (ethers as any).getSigners()
  const {
    CONTRACT_ADDRESS,
    proxyAdmin,
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
    mRewardRouterV2,
    lRewardRouterV2,
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
  const newImplementation = ""
  if (newImplementation === "") {
    throw new Error("Enter new implementation address")
  }

  const txData1 = await proxyAdmin.interface.encodeFunctionData("upgradeAndCall", [await sRewardRouterV2.getAddress(), newImplementation, ""])
  const txData2 = await proxyAdmin.interface.encodeFunctionData("upgradeAndCall", [await mRewardRouterV2.getAddress(), newImplementation, ""])
  const txData3 = await proxyAdmin.interface.encodeFunctionData("upgradeAndCall", [await lRewardRouterV2.getAddress(), newImplementation, ""])

  try {
    await safeTx(
      DEPLOYER.privateKey, CONTRACT_ADDRESS.SAFE_ADDRESS, [
      { to: proxyAdmin.address, data: txData1 },
      { to: proxyAdmin.address, data: txData2 },
      { to: proxyAdmin.address, data: txData3 },
    ])
  } catch (e) {
    console.log(e)
    return;
  }
  console.log("Operation completed")
}

(async () => {
  await operation(ethers, null)
})()