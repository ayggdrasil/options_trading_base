
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function runVerify() {
    console.log("🚀 Starting Option Chain Verification...");

    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"]
    });

    const client = new Client(
        { name: "verify-client", version: "1.0.0" },
        { capabilities: {} }
    );

    try {
        await client.connect(transport);
        console.log("✅ Connected to MCP Server");

        console.log("\n1️⃣  Fetching WBTC Options...");
        const result: any = await client.callTool({
            name: "get_option_chains",
            arguments: {
                underlying_asset: "WBTC"
            }
        });

        if (result.content && result.content[0].text) {
            const data = JSON.parse(result.content[0].text);
            console.log("Asset:", data.asset);
            console.log("Expiries Keys:", Object.keys(data.expiries));

            let totalCalls = 0;
            for (const exp of Object.keys(data.expiries)) {
                const e = data.expiries[exp];
                console.log(`Expiry ${exp} (${e.days} days): ${e.call.length} Calls, ${e.put.length} Puts`);
                totalCalls += e.call.length;
            }

            // Log samples
            const firstExpiry = Object.keys(data.expiries)[0];
            const calls = data.expiries[firstExpiry].call;
            console.log("\nSample Calls (First 5):");
            calls.slice(0, 5).forEach((c: any, i: number) => {
                // Format: [Strike, Price, Liquidity, ID]
                console.log(`[${i}] Strike: ${c[0]} | Price: ${c[1]} | Liquidity (Vault): ${c[2]}`);
            });

            if (totalCalls === 0) {
                console.log("❌ Result has 0 calls!");
            } else {
                console.log(`✅ Result has ${totalCalls} calls.`);
            }
        } else {
            console.log("❌ No text content in result:", result);
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        // await client.close(); // process.exit handles it
        process.exit(0);
    }
}

runVerify();
