#!/usr/bin/env node
/**
 * Test script to verify S3 market data can be fetched successfully
 */
import { CONFIG } from "./config.js";
async function testS3Fetch() {
    console.log("🔗 Testing S3 market data fetch...");
    console.log(`   URL: ${CONFIG.S3_MARKET_DATA_URL}`);
    try {
        const response = await fetch(CONFIG.S3_MARKET_DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        console.log("✅ S3 fetch successful!");
        console.log(`   BTC expiries: ${json.data.market.BTC.expiries.length}`);
        console.log(`   ETH expiries: ${json.data.market.ETH.expiries.length}`);
        let totalOptions = 0;
        for (const asset of ["BTC", "ETH"]) {
            for (const expiry of json.data.market[asset].expiries) {
                const calls = json.data.market[asset].options[expiry].call.filter((o) => o.isOptionAvailable).length;
                const puts = json.data.market[asset].options[expiry].put.filter((o) => o.isOptionAvailable).length;
                totalOptions += calls + puts;
            }
        }
        console.log(`   Total active options available: ${totalOptions}`);
        if (totalOptions > 0) {
            console.log("\n✅ SUCCESS: S3 market data contains active options!");
        }
        else {
            console.log("\n⚠️  WARNING: No active options found in S3 data.");
        }
    }
    catch (error) {
        console.error("❌ Failed to fetch S3 data:", error);
        process.exit(1);
    }
}
testS3Fetch();
