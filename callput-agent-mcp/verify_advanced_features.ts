import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { assertToolSuccess, getToolJson } from "./verify_utils.ts";

function makeSyntheticOptionTokenId(underlyingAssetIndex: number, expirySeconds: number): string {
    // Minimal synthetic optionTokenId for payload-generation tests:
    // [underlyingAssetIndex(16 bits)] [expiry(40 bits)] [...rest]
    const id = (BigInt(underlyingAssetIndex) << 240n) + (BigInt(expirySeconds) << 200n) + 1n;
    return id.toString();
}

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

    const testAddress = "0x84B67bB8b023fc6640C37619cAe28447103b61a8";
    const now = Math.floor(Date.now() / 1000);
    const futureEthOptionId = makeSyntheticOptionTokenId(2, now + 30 * 24 * 60 * 60); // WETH index=2
    const expiredEthOptionId = makeSyntheticOptionTokenId(2, now - 24 * 60 * 60);

    // 1. Trends Test
    console.log("\n--- Testing callput_get_market_trends ---");
    try {
        const result = await client.callTool({
            name: "callput_get_market_trends",
            arguments: {}
        });
        assertToolSuccess(result, "callput_get_market_trends");
        getToolJson<Record<string, unknown>>(result);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e: unknown) {
        console.error(e instanceof Error ? e.message : String(e));
        process.exitCode = 1;
    }

    // 2. My Positions Test
    console.log("\n--- Testing callput_get_my_positions ---");
    try {
        const result = await client.callTool({
            name: "callput_get_my_positions",
            arguments: { address: testAddress }
        });
        assertToolSuccess(result, "callput_get_my_positions");
        getToolJson<Record<string, unknown>>(result);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e: unknown) {
        console.error(e instanceof Error ? e.message : String(e));
        process.exitCode = 1;
    }

    // 3. Close Position Success Test (Payload generation with valid future ID)
    console.log("\n--- Testing callput_close_position (valid synthetic future ID) ---");
    try {
        const result = await client.callTool({
            name: "callput_close_position",
            arguments: {
                address: testAddress,
                option_token_id: futureEthOptionId,
                size: "100000000",
                underlying_asset: "WETH"
            }
        });
        if (result.isError) {
            console.error("Expected success but got error:", JSON.stringify(result, null, 2));
            process.exitCode = 1;
        } else {
            getToolJson<Record<string, unknown>>(result);
            console.log("Result:", JSON.stringify(result, null, 2));
        }
    } catch (e: unknown) {
        console.error(e instanceof Error ? e.message : String(e));
        process.exitCode = 1;
    }

    // 4. Close Position Expired Guard Test
    console.log("\n--- Testing callput_close_position (expired should fail) ---");
    try {
        const result = await client.callTool({
            name: "callput_close_position",
            arguments: {
                address: testAddress,
                option_token_id: expiredEthOptionId,
                size: "100000000",
                underlying_asset: "WETH"
            }
        });
        if (!result.isError) {
            console.error("Expected expired option to fail, but it succeeded:", JSON.stringify(result, null, 2));
            process.exitCode = 1;
        } else {
            console.log("Result:", JSON.stringify(result, null, 2));
        }
    } catch (e: unknown) {
        console.error(e instanceof Error ? e.message : String(e));
        process.exitCode = 1;
    }

    await client.close();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
