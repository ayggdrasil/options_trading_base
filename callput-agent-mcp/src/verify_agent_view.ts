import { ethers } from "ethers";
import { CONFIG } from "./config.js";

async function main() {
    console.log("🔍 Fetching WETH Options for 16FEB26...");

    // 1. Fetch S3 Data
    try {
        const response = await fetch(CONFIG.S3_MARKET_DATA_URL);
        const data = await response.json();

        if (!data.data || !data.data.market) {
            console.error("❌ Invalid Data Structure");
            return;
        }

        const asset = "WETH";
        const market = data.data.market[asset] || data.data.market["ETH"];

        if (!market) {
            console.error(`❌ Asset ${asset} not found.`);
            return;
        }

        // Find Expiry
        const targetDateStr = "16FEB26";
        let targetExpiryTimestamp = "";

        for (const expiry of market.expiries) {
            const d = new Date(Number(expiry) * 1000);
            const day = String(d.getUTCDate()).padStart(2, '0');
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const month = monthNames[d.getUTCMonth()];
            const year = String(d.getUTCFullYear()).slice(-2);
            const fmt = `${day}${month}${year}`;

            if (fmt === targetDateStr) {
                targetExpiryTimestamp = expiry;
                break;
            }
        }

        if (!targetExpiryTimestamp) {
            console.error(`❌ Expiry ${targetDateStr} not found in ${market.expiries}`);
            return;
        }

        console.log(`✅ Found Expiry: ${targetExpiryTimestamp}`);

        const spotPrice = market.spotPrice || 2000; // Estimated if missing
        console.log(`🔹 Spot Price: $${spotPrice}`);

        // Get Options
        const expiryOptions = market.options[targetExpiryTimestamp];
        if (!expiryOptions) {
            console.error("❌ No options for this expiry.");
            return;
        }

        // Logic from index.ts
        const formatOption = (o: any) => ({
            strike: o.strikePrice,
            price: o.markPrice,
            id: o.optionId,
            isAvailable: o.isOptionAvailable
        });

        // Calls
        const allCalls = (expiryOptions.call || [])
            .filter((o: any) => o.isOptionAvailable && (o.markPrice || 0) >= 0.01)
            .map(formatOption)
            .sort((a: any, b: any) => a.strike - b.strike);

        // Puts
        const allPuts = (expiryOptions.put || [])
            .filter((o: any) => o.isOptionAvailable && (o.markPrice || 0) >= 0.01)
            .map(formatOption)
            .sort((a: any, b: any) => a.strike - b.strike);

        // Slice Logic
        const range = 10;
        const sliceAroundSpot = (options: any[], spot: number) => {
            if (options.length <= range * 2) return options;
            let closestIdx = 0;
            let minDiff = Number.MAX_VALUE;
            for (let i = 0; i < options.length; i++) {
                const diff = Math.abs(options[i].strike - spot);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = i;
                }
            }
            const start = Math.max(0, closestIdx - range);
            const end = Math.min(options.length, closestIdx + range + 1);
            return options.slice(start, end);
        };

        const finalCalls = sliceAroundSpot(allCalls, spotPrice);
        const finalPuts = sliceAroundSpot(allPuts, spotPrice);

        console.log(`\n--- CALLS (${finalCalls.length}) ---`);
        finalCalls.forEach((c: any) =>
            console.log(`Strike: ${c.strike} | Price: $${c.price?.toFixed(2)} | Available: ${c.isAvailable}`)
        );

        console.log(`\n--- PUTS (${finalPuts.length}) ---`);
        finalPuts.forEach((p: any) =>
            console.log(`Strike: ${p.strike} | Price: $${p.price?.toFixed(2)} | Available: ${p.isAvailable}`)
        );

    } catch (e: any) {
        console.error("Error:", e);
    }
}

main();
