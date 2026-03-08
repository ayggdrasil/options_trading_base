import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { assertToolSuccess, getToolJson } from "./verify_utils.ts";

type ChainsPayload = {
    expiries: Record<string, { call?: unknown[]; put?: unknown[] }>;
};

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["./build/index.js"]
    });

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    let exitCode = 0;

    try {
        await client.connect(transport);
        console.log("✅ Connected to MCP Server");

        // 1. List Tools to verify names
        const tools = await client.listTools();
        console.log("🛠️ Tools Found:");
        tools.tools.forEach(t => console.log(` - ${t.name}`));

        const expectedTools = [
            "callput_get_agent_bootstrap",
            "callput_get_available_assets",
            "callput_get_option_chains",
            "callput_validate_spread",
            "callput_request_quote",
            "callput_get_greeks"
        ];

        const missing = expectedTools.filter(t => !tools.tools.find(tool => tool.name === t));
        if (missing.length > 0) {
            console.error("❌ Missing expected tools:", missing);
            exitCode = 1;
            return;
        }
        console.log("✅ All new tool names present.");

        // 2. Call callput_get_available_assets
        console.log("\n🧪 Testing callput_get_available_assets...");
        const assets = await client.callTool({
            name: "callput_get_available_assets",
            arguments: {}
        });
        assertToolSuccess(assets, "callput_get_available_assets");
        console.log("Result:", JSON.stringify(assets, null, 2));

        // 3. Call callput_get_option_chains (BTC)
        console.log("\n🧪 Testing callput_get_option_chains (BTC)...");
        const chains = await client.callTool({
            name: "callput_get_option_chains",
            arguments: { underlying_asset: "BTC" }
        });
        assertToolSuccess(chains, "callput_get_option_chains");
        const chainContent = getToolJson<ChainsPayload>(chains);

        console.log(`✅ Fetched ${Object.keys(chainContent.expiries).length} expiries for BTC.`);

        // Check for MaxQty field
        const firstExpiry = Object.keys(chainContent.expiries)[0];
        if (firstExpiry) {
            const calls = chainContent.expiries[firstExpiry].call;
            if (calls && calls.length > 0) {
                const sample = calls[0] as unknown[];
                // [Strike, Price, Liquidity, MaxQty, ID]
                if (sample.length === 5) {
                    console.log(`✅ MaxQty field present: ${sample[3]}`);
                } else {
                    console.error("❌ MaxQty field MISSING in compact array:", sample);
                    exitCode = 1;
                    return;
                }
            }
        }

        console.log("\n✅ Verification SUCCESS!");

    } catch (error) {
        console.error("❌ Verification Failed:", error);
        exitCode = 1;
    } finally {
        try {
            await client.close();
        } catch {
            // ignore close errors
        }
        process.exit(exitCode);
    }
}

main();
