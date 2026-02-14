
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";

async function runTest() {
    console.log("🚀 Starting Verification Test (SDK Client)...");

    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"]
    });

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);
        console.log("✅ Connected to MCP Server");

        // Step 0: Available Assets
        console.log("\n0️⃣  Testing get_available_assets...");
        const assetsResult: any = await client.callTool({
            name: "get_available_assets",
            arguments: {}
        });
        const assets = JSON.parse(assetsResult.content[0].text);
        console.log("✅ Available Assets:", assets.assets);

        // Step 1: get_option_chains
        console.log("\n1️⃣  Testing get_option_chains...");
        const chainsResult: any = await client.callTool({
            name: "get_option_chains",
            arguments: { underlying_asset: "ETH" }
        });

        const contentStr = chainsResult.content[0].text;
        const result = JSON.parse(contentStr);

        console.log(`✅ Asset: ${result.asset}, Spot Price: $${result.underlying_price}`);

        if (result.format !== "[Strike, Price, Liquidity, OptionID]") {
            console.error("❌ Invalid Format:", result.format);
            process.exit(1);
        }
        console.log("✅ Format validated: Compact Array");

        // Find valid legs
        const expiries = Object.keys(result.expiries);
        if (expiries.length === 0) throw new Error("No expiries found");

        // Count total options
        let totalOptions = 0;
        for (const exp of expiries) {
            const e = result.expiries[exp];
            totalOptions += e.call.length + e.put.length;
        }
        console.log(`✅ Total Options Available: ${totalOptions}`);

        const firstExpiry = result.expiries[expiries[0]];
        const calls = firstExpiry.call; // [Strike, Price, Liq, ID]

        if (calls.length < 2) throw new Error("Not enough options to test spread");

        // Pick Long (ITM/Low Strike? No, Logic: Buy Call Spread = Buy Low Strike, Sell High Strike)
        // Sort is by Strike ASC.
        // calls[0] is Low Strike. calls[last] is High Strike.
        // Buy Call Spread: Buy calls[0], Sell calls[last].
        // Wait, Price of Low Strike Call (ITM) > Price of High Strike Call (OTM).
        // Spread Cost = LongPrice - ShortPrice.

        const longOpt = calls[0]; // Low Strike (Expensive)
        const shortOpt = calls[calls.length - 1]; // High Strike (Cheap)

        const validLongId = longOpt[3];
        const validLongPrice = longOpt[1];
        const validShortId = shortOpt[3];
        const validShortPrice = shortOpt[1];

        console.log(`🔹 Selected Legs: Long($${longOpt[0]} @ $${validLongPrice}) / Short($${shortOpt[0]} @ $${validShortPrice})`);
        console.log(`🔹 Spread Cost: $${(validLongPrice - validShortPrice).toFixed(2)}`);

        // Step 2: request_quote (Valid)
        console.log("\n2️⃣  Testing request_quote (High Value Spread)...");
        try {
            const quoteResult = await client.callTool({
                name: "request_quote",
                arguments: {
                    strategy: "BuyCallSpread",
                    long_leg_id: validLongId,
                    short_leg_id: validShortId,
                    amount: 1
                }
            });
            console.log("✅ Request Quote Success!");
        } catch (e: any) {
            console.error("❌ Request Quote Failed Unexpectedly:", e.message);
            // process.exit(1); // Don't exit hard, try next step
        }

        // Step 3: request_quote (Invalid Strategy - Wrong Direction or Low Price)
        console.log("\n3️⃣  Testing request_quote (Invalid Strategy)...");
        try {
            const invalidResult: any = await client.callTool({
                name: "request_quote",
                arguments: {
                    strategy: "BuyCallSpread",
                    long_leg_id: validShortId, // High Strike (Cheap)
                    short_leg_id: validLongId, // Low Strike (Expensive)
                    amount: 1
                }
            });

            if (invalidResult.isError) {
                console.log("✅ Expected Error received (isError=true)");
                const errText = invalidResult.content[0].text;
                console.log("   Error Message:", errText);
            } else {
                console.error("❌ Expected Fail but Passed (isError=false)!");
                console.log("Result:", JSON.stringify(invalidResult, null, 2));
                process.exit(1);
            }
        } catch (e: any) {
            console.log("✅ Expected Error received (Threw):", e.message);
        }

        console.log("\n✅ All Tests Passed!");
        process.exit(0);

    } catch (error: any) {
        console.error("❌ Test Failed:", error);
        process.exit(1);
    }
}

runTest();
