
import dotenv from "dotenv";

dotenv.config();

export const CONFIG = {
    RPC_URL: process.env.RPC_URL || "https://mainnet.base.org", // Default to public Base RPC
    CHAIN_ID: 8453,
    S3_MARKET_DATA_URL: "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json",
    CONTRACTS: {
        // Core
        WBTC: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
        WETH: "0x4200000000000000000000000000000000000006",
        USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        OPTIONS_MARKET: "0xBD40a87CcBD20E44C45F19A074E7d67Ee85327c7",
        POSITION_MANAGER: "0x83B04701B227B045CBBAF921377137fF595a54af",
        ROUTER: "0xfc61ba50AE7B9C4260C9f04631Ff28D5A2Fa4EB2", // CONTROLLER in User List
        VIEW_AGGREGATOR: "0x9060a53f764578230674074cbCa9Daa9fbCa85A8",
        SETTLE_MANAGER: "0x81A58c7F737a18a8964F62A2C165675C1819E77C",

        // Vaults
        S_VAULT: "0xF9Ba07Ba4aD84D6Af640ebf28E2B98c135a207A3",
        M_VAULT: "0xa88F30D4b5F33A621A435f99a1d997Fa52f90c09",
        L_VAULT: "0xb2689994896cE5b73b4141E7A724581d414cAd81",

        // Utils
        S_VAULT_UTILS: "0x12180108505230FD5698fE8175F9697a53f389ff",
        M_VAULT_UTILS: "0xC1F589a742bB672585e043Ba1E4a6b60d35fAA13",
        L_VAULT_UTILS: "0x6FabB8978a449A77bB1713A055cb79e8a916D80e",

        // Oracles
        SPOT_PRICE_FEED: "0x9eFCa77b626021f98342721Eba1a936137583b19",
        PRIMARY_ORACLE: "0xf78ea59667c31a0C2B77757A2C2ab5d980D08536",
    },
    ASSETS: {
        WBTC: {
            address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
            decimals: 8, // Derived from User List? No, assumed.
            index: 1,
        },
        WETH: {
            address: "0x4200000000000000000000000000000000000006",
            decimals: 18,
            index: 2,
        },
    },
};
