
import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { ERC20_ABI } from "./abis.js";

async function testVaultBalance() {
    console.log("🔗 Connecting to RPC...");
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);

    // USDC Contract
    const usdc = new ethers.Contract(CONFIG.CONTRACTS.USDC, ERC20_ABI, provider);
    const decimals = await usdc.decimals();

    console.log(`USDC Decimals: ${decimals}`);

    // Map Vault Indices to Addresses (from getVaultAddress logic)
    // 0: S_VAULT, 1: M_VAULT, 2: L_VAULT
    const vaults = [
        { name: "S_VAULT", address: CONFIG.CONTRACTS.S_VAULT },
        { name: "M_VAULT", address: CONFIG.CONTRACTS.M_VAULT },
        { name: "L_VAULT", address: CONFIG.CONTRACTS.L_VAULT },
    ];

    for (const v of vaults) {
        try {
            const balance: bigint = await usdc.balanceOf(v.address);
            const formatted = ethers.formatUnits(balance, decimals);
            console.log(`🏦 ${v.name}: ${v.address} -> Available USDC: ${formatted}`);
        } catch (e) {
            console.error(`❌ Failed to fetch balance for ${v.name}:`, e);
        }
    }
}

testVaultBalance();
