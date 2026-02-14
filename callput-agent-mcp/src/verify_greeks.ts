import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    console.log("🚀 Starting Greeks Tool Verification...");

    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"],
    });

    const client = new Client(
        { name: "greeks-verification-client", version: "1.0.0" },
        { capabilities: {} }
    );

    try {
        await client.connect(transport);
        console.log("✅ Connected to MCP Server");

        // 1. Fetch Option Chains to get a valid Option ID
        console.log("\n1️⃣  Fetching BTC Options to find a valid ID...");
        const chainRes = await client.callTool({
            name: "get_option_chains",
            arguments: { underlying_asset: "BTC" },
        });

        const chainData = JSON.parse((chainRes.content as any)[0].text);

        // Find first valid option ID
        let targetId = "";
        const expiries = Object.keys(chainData.expiries);
        if (expiries.length > 0) {
            const firstExp = expiries[0];
            const calls = chainData.expiries[firstExp].call;
            if (calls.length > 0) {
                targetId = calls[0][3]; // [Strike, Price, Liquidity, OptionID]
                console.log(`✅ Found Option ID: ${targetId} (Strike: ${calls[0][0]})`);
            }
        }

        if (!targetId) {
            console.error("❌ Failed to find any option ID to test.");
            process.exit(1);
        }

        // 2. Call get_greeks
        console.log(`\n2️⃣  Fetching Greeks for ${targetId}...`);
        const greeksRes = await client.callTool({
            name: "get_greeks",
            arguments: { option_id: targetId },
        });

        const greeksData = JSON.parse((greeksRes.content as any)[0].text);
        console.log("✅ Greeks Response:", JSON.stringify(greeksData, null, 2));

        if (greeksData.greeks && typeof greeksData.greeks.delta === 'number') {
            console.log("✅ Success: Delta found and is a number.");
        } else {
            console.error("❌ Failure: Delta missing or invalid.");
        }

    } catch (error) {
        console.error("❌ Verification Failed:", error);
    } finally {
        await client.close();
    }
}

main();
