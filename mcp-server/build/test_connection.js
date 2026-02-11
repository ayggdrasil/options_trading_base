#!/usr/bin/env node
/**
 * Quick test script to verify the MCP server can fetch real data from Base L2
 */
import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { VIEW_AGGREGATOR_ABI } from "./abis.js";
async function testConnection() {
    console.log("🔗 Testing connection to Base L2...");
    console.log(`   RPC: ${CONFIG.RPC_URL}`);
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    try {
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ Connected! Current block: ${blockNumber}`);
    }
    catch (error) {
        console.error("❌ Connection failed:", error);
        process.exit(1);
    }
    console.log("\n📊 Testing ViewAggregator contract...");
    const viewAggregator = new ethers.Contract(CONFIG.CONTRACTS.VIEW_AGGREGATOR, VIEW_AGGREGATOR_ABI, provider);
    try {
        const allOptions = await viewAggregator.getAllOptionToken();
        console.log(`✅ Fetched option data from ViewAggregator`);
        console.log(`   Total vaults: ${allOptions.length}`);
        let totalOptions = 0;
        for (const vaultOptions of allOptions) {
            totalOptions += vaultOptions.length;
            console.log(`   Vault has ${vaultOptions.length} option tokens`);
        }
        console.log(`   Total option tokens across all vaults: ${totalOptions}`);
        if (totalOptions > 0) {
            console.log("\n✅ SUCCESS: Server can fetch real option data from Base L2!");
        }
        else {
            console.log("\n⚠️  WARNING: No options found on-chain. This may be normal if markets are inactive.");
        }
    }
    catch (error) {
        console.error("❌ Failed to fetch options:", error);
        process.exit(1);
    }
}
testConnection();
