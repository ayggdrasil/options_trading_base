import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"],
    });

    const client = new Client(
        { name: "test-client", version: "1.0.0" },
        { capabilities: {} }
    );

    await client.connect(transport);
    console.log("✅ Connected to MCP server.\n");

    // 1. Test USDC Approval
    console.log("=== Test: callput_approve_usdc ===");
    try {
        const result = await client.callTool({
            name: "callput_approve_usdc",
            arguments: { amount: "1000" } // $1000
        });
        const parsed = JSON.parse((result.content as any[])[0].text);
        console.log("  to:", parsed.to);
        console.log("  data prefix:", parsed.data.substring(0, 10));
        console.log("  ✅ Approval tx generated successfully.\n");
    } catch (e: any) { console.error("  ❌ Error:", e.message, "\n"); }

    // 2. Test Request Quote (verify fixed calldata)
    console.log("=== Test: callput_request_quote (BuyCallSpread) ===");
    try {
        // First get option chains to find valid IDs
        const chains = await client.callTool({
            name: "callput_get_option_chains",
            arguments: { underlying_asset: "ETH" }
        });
        const chainData = JSON.parse((chains.content as any[])[0].text);
        const firstExpiry = Object.keys(chainData.expiries)[0];
        const calls = chainData.expiries[firstExpiry]?.calls;
        if (calls && calls.length >= 2) {
            const longId = calls[0][4]; // OptionID
            const shortId = calls[1][4];
            console.log("  Long Leg ID:", longId);
            console.log("  Short Leg ID:", shortId);

            const result = await client.callTool({
                name: "callput_request_quote",
                arguments: {
                    strategy: "BuyCallSpread",
                    long_leg_id: longId,
                    short_leg_id: shortId,
                    amount: 10
                }
            });
            const parsed = JSON.parse((result.content as any[])[0].text);
            console.log("  to:", parsed.to);
            console.log("  value (exec fee):", parsed.value);
            console.log("  calldata length:", parsed.data.length);
            console.log("  ✅ Quote generated successfully.\n");
        } else {
            console.log("  ⚠️ Not enough options available to test spread.\n");
        }
    } catch (e: any) { console.error("  ❌ Error:", e.message, "\n"); }

    // 3. Test Check Tx Status (with dummy hash — should return not_found)
    console.log("=== Test: callput_check_tx_status ===");
    try {
        const result = await client.callTool({
            name: "callput_check_tx_status",
            arguments: {
                tx_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
                is_open: true
            }
        });
        const parsed = JSON.parse((result.content as any[])[0].text);
        console.log("  Status:", parsed.status);
        console.log("  Message:", parsed.message);
        console.log("  ✅ Tx status check works (expected: not_found).\n");
    } catch (e: any) { console.error("  ❌ Error:", e.message, "\n"); }

    await client.close();
    console.log("✅ All tests completed.");
}

main().catch(console.error);
