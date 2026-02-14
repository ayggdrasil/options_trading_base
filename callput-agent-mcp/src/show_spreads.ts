
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function showSpreads() {
    console.log("🚀 Fetching Tradable Spreads...");

    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"]
    });

    const client = new Client({
        name: "spread-viewer",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);

        const asset = "BTC"; // Can be changed to ETH
        const minSpreadPrice = asset === "BTC" ? 60 : 3;

        const chainsResult: any = await client.callTool({
            name: "get_option_chains",
            arguments: { underlying_asset: asset }
        });

        const contentStr = chainsResult.content[0].text;
        const result = JSON.parse(contentStr);
        const spotPrice = result.underlying_price;

        console.log(`\n📊 Asset: ${asset} | Spot Price: $${spotPrice}`);
        console.log(`Types: Bull Call Spread (Debit) / Bear Put Spread (Debit)`);
        console.log(`Constraint: Spread Price >= $${minSpreadPrice}\n`);

        const expiries = Object.keys(result.expiries);

        for (const expiry of expiries) {
            const e = result.expiries[expiry];
            console.log(`\n📅 Expiry: ${expiry} (Days: ${e.days})`);
            console.log("-------------------------------------------------------------------------------");
            console.log(`| Strategy         | Long Strike | Short Strike | Cost ($) | Breakeven ($) |`);
            console.log("-------------------------------------------------------------------------------");

            // Generate Bull Call Spreads (Buy Low Strike, Sell High Strike)
            const calls = e.call; // [Strike, Price, Liq, ID]
            let count = 0;

            for (let i = 0; i < calls.length; i++) {
                for (let j = i + 1; j < calls.length; j++) {
                    const long = calls[i];
                    const short = calls[j];

                    // Logic: Bull Call Spread -> Long < Short
                    // Verify strikes
                    if (long[0] >= short[0]) continue;

                    const cost = long[1] - short[1];

                    // Filter: Price Constraint
                    if (cost < minSpreadPrice) continue;

                    // Filter: Reasonable OTM/ATM (Don't show deep ITM garbage for demo)
                    // Show if Long Strike is within 10% of Spot or OTM
                    // if (long[0] < spotPrice * 0.9) continue; 

                    const breakeven = long[0] + cost;

                    console.log(`| Bull Call Spread | $${long[0].toString().padEnd(10)} | $${short[0].toString().padEnd(11)} | $${cost.toFixed(2).padEnd(7)} | $${breakeven.toFixed(2).padEnd(12)} |`);
                    count++;
                    if (count >= 5) break; // Limit to 5 per expiry for readability
                }
                if (count >= 5) break;
            }
            if (count === 0) console.log("| No valid Bull Call Spreads found.");

            // Generate Bear Put Spreads (Buy High Strike, Sell Low Strike)
            const puts = e.put;
            count = 0;
            for (let i = puts.length - 1; i >= 0; i--) {
                for (let j = i - 1; j >= 0; j--) {
                    const long = puts[i]; // High Strike
                    const short = puts[j]; // Low Strike

                    // Logic: Bear Put Spread -> Long > Short
                    if (long[0] <= short[0]) continue;

                    const cost = long[1] - short[1];

                    // Filter: Price Constraint
                    if (cost < minSpreadPrice) continue;

                    const breakeven = long[0] - cost;

                    console.log(`| Bear Put Spread  | $${long[0].toString().padEnd(10)} | $${short[0].toString().padEnd(11)} | $${cost.toFixed(2).padEnd(7)} | $${breakeven.toFixed(2).padEnd(12)} |`);
                    count++;
                    if (count >= 5) break; // Limit 5
                }
                if (count >= 5) break;
            }
            if (count === 0) console.log("| No valid Bear Put Spreads found.");

            console.log("-------------------------------------------------------------------------------");
        }

        process.exit(0);

    } catch (error: any) {
        console.error("❌ Failed:", error);
        process.exit(1);
    }
}

showSpreads();
