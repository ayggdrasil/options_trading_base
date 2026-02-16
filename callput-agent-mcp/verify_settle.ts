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

    // Settle Test
    // Mock Option ID (Needs to be a valid BigInt string format usually, but any string works for ABI encoding test)
    // using a dummy valid looking ID
    const mockOptionId = "55993681498425244192662241641066060667026771343058869150495379654160416738917";
    // This is a random ID, likely not found in S3, but `settle` tool doesn't check S3? 
    // Wait, implementation checks `CONFIG.ASSETS[underlying_asset]`.

    console.log("Testing callput_settle_position...");
    try {
        const result = await client.callTool({
            name: "callput_settle_position",
            arguments: {
                option_id: mockOptionId,
                underlying_asset: "WETH"
            }
        });

        console.log("Result:", JSON.stringify(result, null, 2));

        if (result.isError) {
            console.error("Test Failed: Tool returned error.");
            process.exit(1);
        }

        const data = JSON.parse((result.content[0] as any).text);
        if (!data.to || !data.data) {
            console.error("Test Failed: Invalid transaction output.");
            process.exit(1);
        }
        console.log("Test Passed!");

    } catch (error) {
        console.error("Error calling tool:", error);
    }

    await client.close();
}

main().catch(console.error);
