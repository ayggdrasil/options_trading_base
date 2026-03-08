#!/usr/bin/env node

/**
 * Quick test script to verify the MCP server can fetch real data from Base L2
 */

import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { VIEW_AGGREGATOR_ABI } from "./abis.js";

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown): boolean {
    const e = error as any;
    const candidates = [
        String(error ?? ""),
        e?.message,
        e?.shortMessage,
        e?.info?.error?.message,
        e?.info?.error?.code,
    ];

    return candidates.some((value) => {
        const text = String(value ?? "").toLowerCase();
        return text.includes("rate limit") || text.includes("over rate limit") || text.includes("429") || text.includes("-32016");
    });
}

async function getAllOptionTokenWithRetry(viewAggregator: ethers.Contract, attempts = 3): Promise<bigint[][] | null> {
    let lastError: unknown;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await viewAggregator.getAllOptionToken();
        } catch (error) {
            lastError = error;
            if (!isRateLimitError(error) || i === attempts) break;
            const delayMs = i * 500;
            console.warn(`⚠️  ViewAggregator rate-limited (attempt ${i}/${attempts}), retrying in ${delayMs}ms...`);
            await sleep(delayMs);
        }
    }

    if (isRateLimitError(lastError)) {
        console.warn("⚠️  ViewAggregator call skipped due to persistent RPC rate-limit.");
        return null;
    }
    throw lastError;
}

async function testConnection() {
    console.log("🔗 Testing connection to Base L2...");
    console.log(`   RPC: ${CONFIG.RPC_URL}`);

    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);

    try {
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ Connected! Current block: ${blockNumber}`);
    } catch (error) {
        console.error("❌ Connection failed:", error);
        process.exit(1);
    }

    console.log("\n📊 Testing ViewAggregator contract...");
    const viewAggregator = new ethers.Contract(
        CONFIG.CONTRACTS.VIEW_AGGREGATOR,
        VIEW_AGGREGATOR_ABI,
        provider
    );

    try {
        const allOptions = await getAllOptionTokenWithRetry(viewAggregator);
        if (!allOptions) {
            console.log("✅ RPC connectivity is healthy (block query passed).");
            console.log("⚠️  Skipped option fetch because provider is currently rate-limited.");
            return;
        }
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
        } else {
            console.log("\n⚠️  WARNING: No options found on-chain. This may be normal if markets are inactive.");
        }
    } catch (error) {
        console.error("❌ Failed to fetch options:", error);
        process.exit(1);
    }
}

testConnection();
