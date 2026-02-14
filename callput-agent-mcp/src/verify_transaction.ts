import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    console.log("🚀 Starting Transaction Verification...");

    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"],
    });

    const client = new Client(
        { name: "tx-verification-client", version: "1.0.0" },
        { capabilities: {} }
    );

    try {
        await client.connect(transport);
        console.log("✅ Connected to MCP Server");

        // 1. Fetch Option Chains to get valid IDs
        const chainRes = await client.callTool({
            name: "get_option_chains",
            arguments: { underlying_asset: "BTC" },
        });
        const chainData = JSON.parse((chainRes.content as any)[0].text);

        let targetIdLong = "";
        let targetIdShort = "";

        const expiries = Object.keys(chainData.expiries);
        if (expiries.length > 0) {
            const firstExp = expiries[0];
            const calls = chainData.expiries[firstExp].call;
            if (calls.length >= 2) {
                targetIdLong = calls[0][3];
                targetIdShort = calls[1][3];
            }
        }

        if (!targetIdLong || !targetIdShort) {
            console.error("❌ Failed to find options to test spread.");
            process.exit(1);
        }

        console.log(`Using IDs: Long=${targetIdLong}, Short=${targetIdShort}`);

        // 2. Request Quote
        const quoteRes = await client.callTool({
            name: "request_quote",
            arguments: {
                strategy: "BuyCallSpread",
                long_leg_id: targetIdLong,
                short_leg_id: targetIdShort,
                amount: 100
            },
        });

        const quoteData = JSON.parse((quoteRes.content as any)[0].text);
        console.log("✅ Quote Response:", JSON.stringify(quoteData, null, 2));

        if (quoteData.data) {
            console.log("✅ Calldata generated successfully.");
        } else {
            console.error("❌ Quote data missing calldata.");
        }

    } catch (error) {
        console.error("❌ Verification Failed:", error);
    } finally {
        await client.close();
    }
}

main();
