import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { VAULT_ABI } from "./abis.js";

async function main() {
    console.log("🔍 Debugging WETH-16FEB26-2075-C...");

    // 1. Fetch S3 Data to get the ID
    const response = await fetch(CONFIG.S3_MARKET_DATA_URL);
    const data = await response.json();
    if (!data.data || !data.data.market) {
        console.error("❌ Invalid Data Structure:", Object.keys(data));
        return;
    }
    console.log("Available Assets:", Object.keys(data.data.market));
    const wethMarket = data.data.market["WETH"] || data.data.market["ETH"]; // Try both


    // Find 16FEB26 expiry (approx timestamp)
    // 14FEB26 is usually the Fri? Let's check all expiries
    let targetOption = null;
    let targetExpiry = "";

    for (const expiry of wethMarket.expiries) {
        const d = new Date(Number(expiry) * 1000);
        // Custom simple format check
        console.log(`Checking expiry: ${expiry} -> ${d.toDateString()}`);

        const options = wethMarket.options[expiry].call || [];
        const found = options.find((o: any) => o.strikePrice === 2075);
        if (found) {
            targetOption = found;
            targetExpiry = expiry;
            console.log("✅ Found Target Option!");
            break;
        }
    }

    if (!targetOption) {
        console.error("❌ Could not find WETH Call Strike 2075 in S3 data.");
        return;
    }

    console.log("Option Details:", targetOption);
    const optionId = targetOption.optionId;
    console.log(`Option ID: ${optionId}`);

    // 2. Decode Vault Index
    const vaultIndex = Number(BigInt(optionId) & 0x3n);
    console.log(`Vault Index (ID & 3): ${vaultIndex}`);

    const vaultAddrs = [CONFIG.CONTRACTS.S_VAULT, CONFIG.CONTRACTS.M_VAULT, CONFIG.CONTRACTS.L_VAULT];
    const targetVault = vaultAddrs[vaultIndex];
    console.log(`Target Vault Address: ${targetVault}`);

    // 3. Check On-Chain Liquidity
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const vault = new ethers.Contract(targetVault, VAULT_ABI, provider);
    const usdc = CONFIG.CONTRACTS.USDC;

    try {
        const pool = await vault.poolAmounts(usdc);
        const reserved = await vault.reservedAmounts(usdc);
        const buffer = await vault.bufferAmounts(usdc);

        const poolFmt = Number(ethers.formatUnits(pool, 6));
        const reservedFmt = Number(ethers.formatUnits(reserved, 6));
        const avail = poolFmt - reservedFmt;

        console.log(`\n--- Vault State ---`);
        console.log(`Pool:     ${poolFmt} USDC`);
        console.log(`Reserved: ${reservedFmt} USDC`);
        console.log(`Available: ${avail} USDC`);

        if (avail < 10) {
            console.error("⚠️ CRITICAL: Available liquidity is less than 10 USDC!");
        } else {
            console.log("✅ Liquidity seems sufficient (> 10 USDC).");
        }

    } catch (e: any) {
        console.error("Error fetching vault state:", e);
    }
}

main();
