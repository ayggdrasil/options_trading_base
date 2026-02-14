
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function runTest() {
    console.log("🚀 Starting Validation Tool Verification...");

    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"]
    });

    const client = new Client({
        name: "validation-test",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);
        console.log("✅ Connected to MCP Server");

        const asset = "BTC";
        console.log(`\n1️⃣  Fetching ${asset} Options...`);

        const chainsResult: any = await client.callTool({
            name: "get_option_chains",
            arguments: { underlying_asset: asset }
        });
        const result = JSON.parse(chainsResult.content[0].text);

        // Find valid legs for a spread
        const expiry = Object.keys(result.expiries)[0];
        const calls = result.expiries[expiry].call; // [Strike, Price, Liq, ID]

        let validLong: any = null;
        let validShort: any = null;

        for (let i = 0; i < calls.length; i++) {
            for (let j = i + 1; j < calls.length; j++) {
                const long = calls[i];
                const short = calls[j];
                const cost = long[1] - short[1];
                // BTC needs >= 60
                if (cost >= 60) {
                    validLong = long;
                    validShort = short;
                    break;
                }
            }
            if (validLong) break;
        }

        if (!validLong) {
            console.error("❌ No valid spread found to test.");
            process.exit(0);
        }

        console.log(`🔹 Testing Bull Call Spread: Buy $${validLong[0]} / Sell $${validShort[0]} (Cost: $${(validLong[1] - validShort[1]).toFixed(2)})`);

        /*
        // Test 1: Valid Spread
        console.log("\n2️⃣  Testing validate_spread (Valid Case)...");
        const validRes: any = await client.callTool({
            name: "validate_spread",
            arguments: {
                strategy: "BuyCallSpread",
                long_leg_id: validLong[3],
                short_leg_id: validShort[3]
            }
        });
        if (validRes.content && validRes.content[0].text) {
            try {
                const text = JSON.parse(validRes.content[0].text);
                const details = text.details;
                if (details && details.longLegParsed) {
                    console.log(`🔹 Long Leg Vault Index: ${details.longLegParsed.vaultIndex}`);
                    console.log(`🔹 Max Tradable Qty: ${details.maxTradableQuantity}`);
                }
            } catch (e) {
                console.log("❌ Error parsing response details:", e);
            }
        }
        console.log("Response:", validRes.content[0].text);

        // Test 2: Invalid Spread (Wrong Order)
        console.log("\n3️⃣  Testing validate_spread (Invalid Case: Wrong Strike Order)...");
        try {
            const invalidRes: any = await client.callTool({
                name: "validate_spread",
                arguments: {
                    strategy: "BuyCallSpread",
                    long_leg_id: validShort[3], // Higher Strike (Wrong for Bull Call)
                    short_leg_id: validLong[3]  // Lower Strike
                }
            });
            console.log("Response:", invalidRes.content[0].text);
        } catch (e: any) {
            console.log("✅ Caught Expected Error/Invalid Response:", e.message || e);
            // Note: validate_spread returns isError: true, which SDK might throw or return.
            // SDK Client throws on isError: true usually? No, it returns result but we need to check isError property if exposed or content.
            // Actually, CallToolResultSchema says isError is boolean. SDK callTool returns CallToolResult.
            // If tool returns isError: true, SDK `callTool` might NOT throw, but return the object.
            // Let's check output.
        }

        // Test 4: Sell Call Spread (Credit Spread)
        // User Sells Low Strike (Long Leg here becomes Short in strategy terms? No.)
        // In Callput:
        // BuyCallSpread: Buy Long(Low) + Sell Short(High). Net Debit.
        // SellCallSpread: Sell Long(Low) + Buy Short(High). Net Credit.
        // So the "Long Leg" parameter should still be the Lower Strike one?
        // Let's assume standard conventions: Legs are passed, Strategy dictates direction.
        console.log("\n4️⃣  Testing validate_spread (Sell Check - Credit Spread)...");
        const sellRes: any = await client.callTool({
            name: "validate_spread",
            arguments: {
                strategy: "SellCallSpread",
                long_leg_id: validLong[3], // Lower Strike (User Sells this)
                short_leg_id: validShort[3]  // Higher Strike (User Buys this)
            }
        });
        if (sellRes.content && sellRes.content[0].text) {
            console.log("Response:", sellRes.content[0].text);
        } else {
            console.log("Response (Raw):", sellRes);
        }
        */

        // Wait to avoid rate limit
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Test 5: Request Quote (Transaction Generation)
        console.log("\n5️⃣  Testing request_quote (Generate Transaction)...");
        const quoteRes: any = await client.callTool({
            name: "request_quote",
            arguments: {
                strategy: "BuyCallSpread",
                long_leg_id: validLong[3], // Option ID
                short_leg_id: validShort[3], // Option ID
                amount: 1 // 1 Contract
            }
        });

        if (quoteRes.content && quoteRes.content[0].text) {
            const quoteData = JSON.parse(quoteRes.content[0].text);
            console.log("Full Quote Response:", JSON.stringify(quoteData, null, 2));

            if (quoteData.to && quoteData.data) {
                console.log("✅ Transaction Generated Successfully!");
                console.log(`   To: ${quoteData.to}`);
                console.log(`   Data Length: ${quoteData.data.length} bytes`);
                console.log(`   Value: ${quoteData.value}`);
                console.log(`   Approval Target: ${quoteData.approval_target}`);
            } else {
                console.log("❌ Transaction missing 'to' or 'data' fields.");
            }
        } else {
            console.log("Response (Raw):", quoteRes);
        }

    } catch (error: any) {
        console.error("❌ Test Failed:", error);
    } finally {
        // process.exit(0); // Clean exit? The transport might hang if not closed
    }
}

runTest();
