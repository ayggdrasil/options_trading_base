import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"],
    });

    const client = new Client(
        {
            name: "test-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    await client.connect(transport);
    console.log("Connected to server.");

    const testAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC address as dummy or an active trader address

    // 1. Trends Test
    console.log("\n--- Testing callput_get_market_trends ---");
    try {
        const result = await client.callTool({
            name: "callput_get_market_trends",
            arguments: {}
        });
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) { console.error(e); }

    // 2. My Positions Test
    console.log("\n--- Testing callput_get_my_positions ---");
    try {
        const result = await client.callTool({
            name: "callput_get_my_positions",
            arguments: { address: testAddress }
        });
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) { console.error(e); }

    // 3. Close Position Test (Generation)
    console.log("\n--- Testing callput_close_position ---");
    try {
        const result = await client.callTool({
            name: "callput_close_position",
            arguments: {
                address: testAddress,
                option_token_id: "55993681498425244192662241641066060667026771343058869150495379654160416738917", // dummy same as verify_settle
                size: "100000000", // 1.0 (assuming 8 decimals for size?)
                underlying_asset: "WETH"
            }
        });
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) { console.error(e); }

    await client.close();
}

main().catch(console.error);
