import dotenv from "dotenv";
dotenv.config();
export const CONFIG = {
    RPC_URL: process.env.RPC_URL || "https://mainnet.base.org", // Default to public Base RPC
    CHAIN_ID: 8453,
    S3_MARKET_DATA_URL: "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json",
    CONTRACTS: {
        // Base Mainnet Addresses
        VIEW_AGGREGATOR: "0x9060a53f764578230674074cbCa9Daa9fbCa85A8",
        OPTIONS_MARKET: "0xBD40a87CcBD20E44C45F19A074E7d67Ee85327c7",
        POSITION_MANAGER: "0x83B04701B227B045CBBAF921377137fF595a54af",
        USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        WETH: "0x4200000000000000000000000000000000000006",
    },
    ASSETS: {
        WBTC: {
            address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
            decimals: 8,
            index: 1, // BTC is index 1 in OptionsMarket
        },
        WETH: {
            address: "0x4200000000000000000000000000000000000006",
            decimals: 18,
            index: 2, // ETH is index 2 in OptionsMarket
        },
    },
};
