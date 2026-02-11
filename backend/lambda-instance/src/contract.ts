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
import RewardRouterV2Abi from "../../../shared/abis/RewardRouterV2.json"
import OlpQueueAbi from "../../../shared/abis/OlpQueue.json"

import ControllerAbi from "../../../shared/abis/Controller.json"
import PositionManagerAbi from "../../../shared/abis/PositionManager.json"
import FeeDistributorAbi from "../../../shared/abis/FeeDistributor.json"

import FastPriceFeedAbi from "../../../shared/abis/FastPriceFeed.json"
import PositionValueFeedAbi from "../../../shared/abis/PositionValueFeed.json"
import SettlePriceFeedAbi from "../../../shared/abis/SettlePriceFeed.json"
import SpotPriceFeedAbi from "../../../shared/abis/SpotPriceFeed.json"

import ViewAggregatorAbi from "../../../shared/abis/ViewAggregator.json"
import Erc20Abi from "../../../shared/abis/ERC20.json"

import { ethers } from "ethers"
import { CONTRACT_ADDRESSES } from "./constants/constants.addresses"
import { CONFIG } from "./constants/constants.config"

export const selectBestProvider = async (): Promise<ethers.JsonRpcProvider> => {
  const chainId = Number(process.env.CHAIN_ID);
  const timeout = 10000; // 10 seconds timeout

  const attempts = CONFIG[chainId].RPC_URLS.map(async (url) => {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      const blockNumberPromise = provider.getBlockNumber();
      const blockNumber = await Promise.race([
        blockNumberPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]);
      return { url, blockNumber };
    } catch (error) {
      console.log(`Error with provider at ${url}:`, error);
      return { url, blockNumber: -1 };
    }
  });

  const results = await Promise.all(attempts);
  const bestProvider = results.reduce((best, current) => 
    current.blockNumber > best.blockNumber ? current : best
  , { url: "", blockNumber: -1 });

  if (bestProvider.blockNumber === -1) {
    throw new Error("No available providers");
  }

  return new ethers.JsonRpcProvider(bestProvider.url);
}

export const getMostReliableProvider = async () => {
  const provider = new ethers.JsonRpcProvider(CONFIG[Number(process.env.CHAIN_ID)].RPC_URLS[0]);
  return {provider, rpcUrl: CONFIG[Number(process.env.CHAIN_ID)].RPC_URLS[0]};
}

const initializeContracts = async () => {
  const chainId = Number(process.env.CHAIN_ID);

  const provider = await selectBestProvider();

  const keeper_optionsMarket = new ethers.Wallet(process.env.KP_OPTIONS_MARKET, provider)
  const keeper_positionProcessor = new ethers.Wallet(process.env.KP_POSITION_PROCESSOR, provider)
  const keeper_settleOperator = new ethers.Wallet(process.env.KP_SETTLE_OPERATOR, provider)
  const keeper_positionValueFeeder = new ethers.Wallet(process.env.KP_PV_FEEDER, provider)
  const keeper_spotPriceFeeder = new ethers.Wallet(process.env.KP_SPOT_FEEDER, provider)
  const keeper_feeDistributor = new ethers.Wallet(process.env.KP_FEE_DISTRIBUTOR, provider)
  const keeper_clearingHouse = new ethers.Wallet(process.env.KP_CLEARING_HOUSE, provider)
  const kp_olpProcessor = new ethers.Wallet(process.env.KP_OLP_PROCESSOR, provider)
    
  const WETHToken = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].WETH,
    Erc20Abi,
    provider
  )

  const USDCToken = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].USDC,
    Erc20Abi,
    provider
  )

  const BTCToken = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].WBTC,
    Erc20Abi,
    provider
  )

  const OptionsAuthority = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].OPTIONS_AUTHORITY,
    OptionsAuthorityAbi,
    provider
  )
  
  const VaultPriceFeed = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].VAULT_PRICE_FEED,
    VaultPriceFeedAbi,
    provider
  )
  
  const OptionsMarket = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].OPTIONS_MARKET,
    OptionsMarketAbi,
    provider,
  )
  
  const BTCOptionsToken = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].BTC_OPTIONS_TOKEN,
    OptionsTokenAbi,
    provider
  )
  
  const ETHOptionsToken = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].ETH_OPTIONS_TOKEN,
    OptionsTokenAbi,
    provider
  )
  
  const sVault = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].S_VAULT,
    VaultAbi,
    provider
  )
  
  const mVault = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].M_VAULT,
    VaultAbi,
    provider
  )
  
  const lVault = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].L_VAULT,
    VaultAbi,
    provider
  )
  
  const getVaultContractByAddress = (vaultAddress: string) => {
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].S_VAULT) return sVault
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].M_VAULT) return mVault
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].L_VAULT) return lVault
  }

  const sVaultUtils = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].S_VAULT_UTILS,
    VaultUtilsAbi,
    provider
  )
  
  const mVaultUtils = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].M_VAULT_UTILS,
    VaultUtilsAbi,
    provider
  )
  
  const lVaultUtils = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].L_VAULT_UTILS,
    VaultUtilsAbi,
    provider
  )
  
  const sOLP = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].S_OLP,
    OlpAbi,
    provider
  )
  
  const mOLP = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].M_OLP,
    OlpAbi,
    provider
  )
  
  const lOLP = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].L_OLP,
    OlpAbi,
    provider
  )
  
  const sOLPManager = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].S_OLP_MANAGER,
    OlpManagerAbi,
    provider
  )
  
  const mOLPManager = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].M_OLP_MANAGER,
    OlpManagerAbi,
    provider
  )
  
  const lOLPManager = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].L_OLP_MANAGER,
    OlpManagerAbi,
    provider
  )
  
  const getOlpManagerContractByVaultAddress = (vaultAddress: string) => {
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].S_VAULT) return sOLPManager
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].M_VAULT) return mOLPManager
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].L_VAULT) return lOLPManager
  }

  const sRewardTracker = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].S_REWARD_TRACKER,
    RewardTrackerAbi,
    provider
  )
  
  const mRewardTracker = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].M_REWARD_TRACKER,
    RewardTrackerAbi,
    provider
  )
  
  const lRewardTracker = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].L_REWARD_TRACKER,
    RewardTrackerAbi,
    provider
  )

  const sRewardDistributor = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].S_REWARD_DISTRIBUTOR,
    RewardDistributorAbi,
    provider
  )
  
  const mRewardDistributor = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].M_REWARD_DISTRIBUTOR,
    RewardDistributorAbi,
    provider
  )
  
  const lRewardDistributor = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].L_REWARD_DISTRIBUTOR,
    RewardDistributorAbi,
    provider
  )
  
  const getRewardDistributorContractByVaultAddress = (address: string) => {
    if (address === CONTRACT_ADDRESSES[chainId].S_VAULT) return sRewardDistributor
    if (address === CONTRACT_ADDRESSES[chainId].M_VAULT) return mRewardDistributor
    if (address === CONTRACT_ADDRESSES[chainId].L_VAULT) return lRewardDistributor
  }

  const sRewardRouterV2 = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].S_REWARD_ROUTER_V2,
    RewardRouterV2Abi,
    provider
  )

  const mRewardRouterV2 = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].M_REWARD_ROUTER_V2,
    RewardRouterV2Abi,
    provider
  )

  const lRewardRouterV2 = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].L_REWARD_ROUTER_V2,
    RewardRouterV2Abi,
    provider
  )

  const getRewardRouterV2ContractByVaultAddress = (vaultAddress: string) => {
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].S_VAULT) return sRewardRouterV2
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].M_VAULT) return mRewardRouterV2
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].L_VAULT) return lRewardRouterV2
  }

  const sOlpQueue = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].S_OLP_QUEUE,
    OlpQueueAbi,
    provider
  )

  const mOlpQueue = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].M_OLP_QUEUE,
    OlpQueueAbi,
    provider
  )

  const lOlpQueue = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].L_OLP_QUEUE,
    OlpQueueAbi,
    provider
  )

  const getOlpQueueContractByVaultAddress = (vaultAddress: string) => {
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].S_VAULT) return sOlpQueue
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].M_VAULT) return mOlpQueue
    if (vaultAddress === CONTRACT_ADDRESSES[chainId].L_VAULT) return lOlpQueue
  }

  const Controller = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].CONTROLLER,
    ControllerAbi,
    provider
  )

  const PositionManager = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].POSITION_MANAGER,
    PositionManagerAbi,
    provider
  )

  const FeeDistributor = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].FEE_DISTRIBUTOR,
    FeeDistributorAbi,
    provider
  )
  
  const FastPriceFeed = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].FAST_PRICE_FEED,
    FastPriceFeedAbi,
    provider
  )
  
  const PositionValueFeed = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].POSITION_VALUE_FEED,
    PositionValueFeedAbi,
    provider
  )
  
  const SettlePriceFeed = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].SETTLE_PRICE_FEED,
    SettlePriceFeedAbi,
    provider
  )
  
  const SpotPriceFeed = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].SPOT_PRICE_FEED,
    SpotPriceFeedAbi,
    provider
  )
  
  const ViewAggregator = new ethers.Contract(
    CONTRACT_ADDRESSES[chainId].VIEW_AGGREGATOR,
    ViewAggregatorAbi,
    provider,
  )

  return {
    provider,
    keeper_optionsMarket,
    keeper_positionProcessor,
    keeper_settleOperator,  
    keeper_positionValueFeeder,
    keeper_spotPriceFeeder,
    keeper_feeDistributor,
    keeper_clearingHouse,
    kp_olpProcessor,
    WETHToken,
    USDCToken,
    BTCToken,
    OptionsAuthority,
    VaultPriceFeed,
    BTCOptionsToken,
    ETHOptionsToken,
    OptionsMarket,
    sVault,
    mVault,
    lVault,
    sVaultUtils,
    mVaultUtils,
    lVaultUtils,
    sOLP,
    mOLP,
    lOLP,
    sOLPManager,
    mOLPManager,
    lOLPManager,
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
    Controller,
    PositionManager,
    SettlePriceFeed,
    FeeDistributor,
    FastPriceFeed,
    PositionValueFeed,
    SpotPriceFeed,
    ViewAggregator,
    getVaultContractByAddress,
    getOlpManagerContractByVaultAddress,
    getRewardDistributorContractByVaultAddress,
    getRewardRouterV2ContractByVaultAddress,
    getOlpQueueContractByVaultAddress
  }
}

export default initializeContracts;