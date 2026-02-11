import fs from "fs";

export const getDeployedContracts = async (ethers: any, addressMap: any) => {
  let contractAddress:any = {};
  
  if (addressMap) {
    contractAddress = addressMap;
  } else {
    contractAddress = JSON.parse(
      fs.readFileSync(`./latestAddress.${process.env.HARDHAT_NETWORK}.json`, "utf8")
    );
  }

  if (!contractAddress || Object.keys(contractAddress).length === 0) {
    throw new Error("Contract address not found");
  }

  let primaryOracle;

  switch (process.env.HARDHAT_NETWORK) {
    case "base":
      primaryOracle = "BasePrimaryOracle";
      break;
    case "arbitrumOne":
      primaryOracle = "ArbitrumPrimaryOracle";
      break;
    default:
      throw new Error("Primary Oracle not found");
  }

  if (primaryOracle === null) {
    throw new Error("Primary Oracle not found");
  }

  return {
    CONTRACT_ADDRESS: contractAddress,
    proxyAdmin: await ethers.getContractAt("ProxyAdmin", contractAddress.PROXY_ADMIN),
    wbtc: await ethers.getContractAt("ERC20", contractAddress.WBTC),
    weth: await ethers.getContractAt("ERC20", contractAddress.WETH),
    usdc: await ethers.getContractAt("ERC20", contractAddress.USDC),
    optionsAuthority: await ethers.getContractAt("OptionsAuthority", contractAddress.OPTIONS_AUTHORITY),
    vaultPriceFeed: await ethers.getContractAt("VaultPriceFeed", contractAddress.VAULT_PRICE_FEED),
    optionsMarket: await ethers.getContractAt("OptionsMarket", contractAddress.OPTIONS_MARKET),
    sVault: await ethers.getContractAt("Vault", contractAddress.S_VAULT), 
    mVault: await ethers.getContractAt("Vault", contractAddress.M_VAULT), 
    lVault: await ethers.getContractAt("Vault", contractAddress.L_VAULT),
    sVaultUtils: await ethers.getContractAt("VaultUtils", contractAddress.S_VAULT_UTILS),
    mVaultUtils: await ethers.getContractAt("VaultUtils", contractAddress.M_VAULT_UTILS),
    lVaultUtils: await ethers.getContractAt("VaultUtils", contractAddress.L_VAULT_UTILS),
    susdg: await ethers.getContractAt("USDG", contractAddress.S_USDG), 
    musdg: await ethers.getContractAt("USDG", contractAddress.M_USDG), 
    lusdg: await ethers.getContractAt("USDG", contractAddress.L_USDG),
    solp: await ethers.getContractAt("OLP", contractAddress.S_OLP), 
    molp: await ethers.getContractAt("OLP", contractAddress.M_OLP), 
    lolp: await ethers.getContractAt("OLP", contractAddress.L_OLP),
    sOlpManager: await ethers.getContractAt("OlpManager", contractAddress.S_OLP_MANAGER),
    mOlpManager: await ethers.getContractAt("OlpManager", contractAddress.M_OLP_MANAGER), 
    lOlpManager: await ethers.getContractAt("OlpManager", contractAddress.L_OLP_MANAGER),
    sRewardTracker: await ethers.getContractAt("RewardTracker", contractAddress.S_REWARD_TRACKER),
    mRewardTracker: await ethers.getContractAt("RewardTracker", contractAddress.M_REWARD_TRACKER),
    lRewardTracker: await ethers.getContractAt("RewardTracker", contractAddress.L_REWARD_TRACKER),
    sRewardDistributor: await ethers.getContractAt("RewardDistributor", contractAddress.S_REWARD_DISTRIBUTOR),
    mRewardDistributor: await ethers.getContractAt("RewardDistributor", contractAddress.M_REWARD_DISTRIBUTOR),
    lRewardDistributor: await ethers.getContractAt("RewardDistributor", contractAddress.L_REWARD_DISTRIBUTOR),
    sRewardRouterV2: await ethers.getContractAt("RewardRouterV2", contractAddress.S_REWARD_ROUTER_V2),
    mRewardRouterV2: await ethers.getContractAt("RewardRouterV2", contractAddress.M_REWARD_ROUTER_V2),
    lRewardRouterV2: await ethers.getContractAt("RewardRouterV2", contractAddress.L_REWARD_ROUTER_V2),
    sOlpQueue: await ethers.getContractAt("OlpQueue", contractAddress.S_OLP_QUEUE),
    mOlpQueue: await ethers.getContractAt("OlpQueue", contractAddress.M_OLP_QUEUE),
    lOlpQueue: await ethers.getContractAt("OlpQueue", contractAddress.L_OLP_QUEUE),
    controller: await ethers.getContractAt("Controller", contractAddress.CONTROLLER),
    positionManager: await ethers.getContractAt("PositionManager", contractAddress.POSITION_MANAGER),
    settleManager: await ethers.getContractAt("SettleManager", contractAddress.SETTLE_MANAGER),
    feeDistributor: await ethers.getContractAt("FeeDistributor", contractAddress.FEE_DISTRIBUTOR),
    btcOptionsToken: await ethers.getContractAt("OptionsToken", contractAddress.BTC_OPTIONS_TOKEN), 
    ethOptionsToken: await ethers.getContractAt("OptionsToken", contractAddress.ETH_OPTIONS_TOKEN),
    primaryOracle: await ethers.getContractAt(primaryOracle, contractAddress.PRIMARY_ORACLE),
    fastPriceEvents: await ethers.getContractAt("FastPriceEvents", contractAddress.FAST_PRICE_EVENTS),
    fastPriceFeed: await ethers.getContractAt("FastPriceFeed", contractAddress.FAST_PRICE_FEED), 
    positionValueFeed: await ethers.getContractAt("PositionValueFeed", contractAddress.POSITION_VALUE_FEED),
    settlePriceFeed: await ethers.getContractAt("SettlePriceFeed", contractAddress.SETTLE_PRICE_FEED),
    spotPriceFeed: await ethers.getContractAt("SpotPriceFeed", contractAddress.SPOT_PRICE_FEED),
    viewAggregator: await ethers.getContractAt("ViewAggregator", contractAddress.VIEW_AGGREGATOR),
    referral: await ethers.getContractAt("Referral", contractAddress.REFERRAL)
  };
};
