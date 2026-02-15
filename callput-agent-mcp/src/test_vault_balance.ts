import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { ERC20_ABI } from "./abis.js";

async function main() {
    console.log("🔍 Checking Real Vault Balances...");

    // Use a reliable RPC if possible, or fallback to config
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const usdc = new ethers.Contract(CONFIG.CONTRACTS.USDC, ERC20_ABI, provider);

    const vaults = [
        { name: "S_VAULT", address: CONFIG.CONTRACTS.S_VAULT },
        { name: "M_VAULT", address: CONFIG.CONTRACTS.M_VAULT },
        { name: "L_VAULT", address: CONFIG.CONTRACTS.L_VAULT }
    ];

    for (const v of vaults) {
        try {
            const bal = await usdc.balanceOf(v.address);
            const fmt = ethers.formatUnits(bal, 6);
            console.log(`✅ ${v.name} (${v.address}): ${fmt} USDC`);
        } catch (e: any) {
            console.error(`❌ ${v.name} fetch failed:`, e.message);
        }
    }
}

main();
