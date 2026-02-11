import fs from 'fs'
import BigNumber from "bignumber.js"

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

// Strategy enum values:
// NotSupported(0), BuyCall(1), SellCall(2), BuyPut(3), SellPut(4), 
// BuyCallSpread(5), SellCallSpread(6), BuyPutSpread(7), SellPutSpread(8)
export const ALLOWED_STRATEGIES = [5, 6, 7, 8];

export const TOKEN_INFO = {
  WBTC: {
    ADDRESS: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
    DECIMAL: 8
  },
  WETH: {
    ADDRESS: "0x4200000000000000000000000000000000000006",
    DECIMAL: 18
  },
  USDC: {
    ADDRESS: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    DECIMAL: 6
  }
}

// FEE DISTRIBUTOR
export const REWARD_TOKEN = {
  NAME: "USDC",
  ADDRESS: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  DECIMAL: 6
}

// The total reward rate should be 100
export const REWARD_RATE = {
  TREASURY: 50,
  GOVERNANCE: 50,
  OLP: 0
}
export const TREASURY = "0xe39cc7bca93fd99e24f074e9a8f49f16af77bd58"
export const GOVERNANCE = "0x6374ff26850e18bc49cb0ee4c978b52417fe3c03"

export const VAULT_THRESHOLD_DAYS = {
  S: 365 * 86400,
  M: 1099511627775,
  L: 1099511627775
}

export const OLP_TOKEN_INFO = {
  WBTC: {
    WEIGHT: 15000,
    BUFFER_AMOUNT: new BigNumber(4).multipliedBy(10 ** TOKEN_INFO.WBTC.DECIMAL).toString(), // 4_00000000
    MAX_USDG_AMOUNT: new BigNumber(0).multipliedBy(10 ** 18).toString(), // $0
    DECREASE_TOLERANCE_AMOUNT: 20000
  },
  WETH: {
    WEIGHT: 15000,
    BUFFER_AMOUNT: new BigNumber(65).multipliedBy(10 ** TOKEN_INFO.WETH.DECIMAL).toString(), // 65_000000000000000000
    MAX_USDG_AMOUNT: new BigNumber(0).multipliedBy(10 ** 18).toString(), // $0
    DECREASE_TOLERANCE_AMOUNT: 4000000000000000
  },
  USDC: {
    WEIGHT: 65000,
    BUFFER_AMOUNT: new BigNumber(150000).multipliedBy(10 ** TOKEN_INFO.USDC.DECIMAL).toString(), // 150000_000000
    MAX_USDG_AMOUNT: new BigNumber(1000000000).multipliedBy(10 ** 18).toString(), // $1,000,000,000
    DECREASE_TOLERANCE_AMOUNT: 10000000
  },
}

// VAULT UTILS
export const mpReleaseDuration = 0; // 0 days
export const rpReleaseDuration = 7 * 86400; // 7 days
export const tradeFeeCalculationLimitRate = 1250 // 12.5%
export const settleFeeCalculationLimitRate = 5000 // 50%

// OLP MANAGER
export const cooldownDuration = 7 * 86400;

// POSITION MANAGER
export const executionFee = new BigNumber(0.00006).multipliedBy(10 ** 18).toString();
export const copyTradeFeeRebateRate = 3000;

// REFERRAL
export const referralDiscountRate = 1000;
export const referralFeeRebateRate = 1500;

// VAULT PRICE FEED
export const MIN_MARK_PRICES = {
  BTC: {
    INDEX: 1,
    VALUE: new BigNumber(60).multipliedBy(new BigNumber(10).pow(30)).toString()
  },
  ETH: {
    INDEX: 2,
    VALUE: new BigNumber(3).multipliedBy(new BigNumber(10).pow(30)).toString()
  }
}

// KEEPERS
export const KP_OPTIONS_MARKET = { address: "0xdbd30f4571d848d053757ad98f47049ed9dcd27a" }
export const KP_POSITION_PROCESSOR = { address: "0x0c05a845f1c20a763789caceb6eca703cf200baa" }
export const KP_SETTLE_OPERATOR = { address: "0x7f2e7ecbc67f2c8e63a235854a1b266b0f97617c" }
export const KP_PV_FEEDER = { address: "0x0eab0a74b0a0be9c3dfe3c3581ed5528dec42873" }
export const KP_SPOT_FEEDER = { address: "0x67fb20aba46d22654a331537b6d0b5afe6e5dd60" }
export const KP_FEE_DISTRIBUTOR = { address: "0x41642ae117964cbab8d556b8e1944266fced36d9" }
export const KP_CLEARING_HOUSE = { address: "0x6dde430db2fb48ff604a8629c74f38f496aa307f" }
export const KP_OLP_PROCESSOR = { address: "0xad0867f80f866857abe0e6af64cfc56c3979d4bf" }















// VAULT PRICE FEED
// export const CHAINLINK_FLAGS = "0x3C14e07Edd0dC67442FA96f1Ec6999c57E810a83"
// export const CHAINLINK_PRICE_FEED_WBTC = "0x6ce185860a4963106506C203335A2910413708e9"
// export const CHAINLINK_PRICE_FEED_WETH = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612"
// export const CHAINLINK_PRICE_FEED_USDC = "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3"
// export const CHAINLINK_TOKEN_DECIMALS = 8


// export const btcTokenWeight = 15000;
// export const ethTokenWeight = 15000;
// export const usdcTokenWeight = 55000;
// export const honeyTokenWeight = 15000;

// export const wbtcBufferAmounts = new BigNumber(4).multipliedBy(10 ** WBTC_DECIMAL).toString() // 4_00000000
// export const wethBufferAmounts = new BigNumber(65).multipliedBy(10 ** WETH_DECIMAL).toString() // 65_000000000000000000
// export const usdcBufferAmounts = new BigNumber(150000).multipliedBy(10 ** USDC_DECIMAL).toString() // 150000_000000
// export const honeyBufferAmounts = new BigNumber(40000).multipliedBy(10 ** HONEY_DECIMAL).toString() // 40000_000000000000000000

// export const btcMaxUsdgAmount = new BigNumber(30000000).multipliedBy(10 ** 18).toString(); // $30,000,000
// export const ethMaxUsdgAmount = new BigNumber(30000000).multipliedBy(10 ** 18).toString();
// export const usdcMaxUsdgAmount = new BigNumber(70000000).multipliedBy(10 ** 18).toString();
// export const honeyMaxUsdgAmount = new BigNumber(30000000).multipliedBy(10 ** 18).toString();