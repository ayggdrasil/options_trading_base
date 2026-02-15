import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { VAULT_ABI } from "./abis.js";

async function main() {
    console.log("🔍 Checking Vault Pool State...");

    // Use a reliable RPC
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const sVault = new ethers.Contract(CONFIG.CONTRACTS.S_VAULT, VAULT_ABI, provider);
    const usdc = CONFIG.CONTRACTS.USDC;

    try {
        const pool = await sVault.poolAmounts(usdc);
        const reserved = await sVault.reservedAmounts(usdc);
        const buffer = await sVault.bufferAmounts(usdc);

        const poolFmt = ethers.formatUnits(pool, 6);
        const reservedFmt = ethers.formatUnits(reserved, 6);
        const bufferFmt = ethers.formatUnits(buffer, 6);

        const available = Number(poolFmt) - Number(reservedFmt);

        console.log(`\n--- S_VAULT (${CONFIG.CONTRACTS.S_VAULT}) ---`);
        console.log(`Available Liquidity (Pool - Reserved): ${available.toFixed(4)} USDC`);
        console.log(`-------------------------------------------`);
        console.log(`Pool Amounts:     ${poolFmt} USDC`);
        console.log(`Reserved Amounts: ${reservedFmt} USDC`);
        console.log(`Buffer Amounts:   ${bufferFmt} USDC`);

    } catch (e: any) {
        console.error("❌ Failed to fetch vault state:", e.message);
    }
}

main();
