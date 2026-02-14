
import { CONFIG } from "./config.js";

async function run() {
    console.log("Fetching S3 data...");
    const res = await fetch(CONFIG.S3_MARKET_DATA_URL);
    const data = await res.json();
    const market = data.data.market;

    const dustThreshold = 0.1;

    for (const asset of ["BTC", "ETH"]) {
        const assetMarket = market[asset];
        if (!assetMarket) {
            console.log(`❌ No market data for ${asset}`);
            continue;
        }
        console.log(`\n--- ${asset} Market ---`);
        console.log("Market Keys:", Object.keys(assetMarket));
        console.log("Spot Price:", assetMarket.spotPrice);

        // Check for liquidity-related fields at market level
        // Common names: poolValue, freeLiquidity, availableLiquidity, netAssetValue
        const potentialLiquidityKeys = ["liquidity", "freeLiquidity", "available", "cap", "tvl", "pool"];
        potentialLiquidityKeys.forEach(k => {
            if (k in assetMarket) console.log(`Found explicit key '${k}':`, assetMarket[k]);
        });

        console.log(`Expiries: ${assetMarket.expiries.join(", ")}`);

        for (const expiry of assetMarket.expiries) {
            const opts = assetMarket.options[expiry];
            const calls = opts.call || [];
            const puts = opts.put || [];
            console.log(`Expiry ${expiry}: ${calls.length} Calls, ${puts.length} Puts`);

            // Check first 5 calls to see why they might be filtered
            calls.slice(0, 1).forEach((c: any, i: number) => {
                console.log("Keys:", Object.keys(c));
                console.log("Full Object:", JSON.stringify(c, null, 2));
            });
            calls.slice(0, 5).forEach((c: any, i: number) => {
                const isAvail = c.isOptionAvailable;
                const price = c.markPrice || 0;
                const liq = c.liquidity || 0;
                const pass = isAvail && price >= dustThreshold;
                console.log(`  [Call ${i}] ID: ${c.optionId.slice(0, 10)}... | Strike: ${c.strikePrice} | Price: ${price} | Liq: ${liq} | Available: ${isAvail} -> ${pass ? "✅" : "❌"}`);
            });
        }
    }
}
run();
