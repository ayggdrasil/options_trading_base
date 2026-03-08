import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getToolErrorText, getToolJson } from "./verify_utils.ts";
import type { ToolResultLike } from "./verify_utils.ts";

function makeDummyOptionId(underlyingAssetIndex: number, expirySeconds = 1): string {
    const id = (BigInt(underlyingAssetIndex) << 240n) + (BigInt(expirySeconds) << 200n) + 1n;
    return id.toString();
}

async function expectSettleOk(client: Client, optionId: string, asset: string) {
    const res = await client.callTool({
        name: "callput_settle_position",
        arguments: { option_id: optionId, underlying_asset: asset }
    }) as ToolResultLike;
    if (res.isError) {
        throw new Error(`Expected success for underlying_asset=${asset}, but got error: ${getToolErrorText(res)}`);
    }
    const payload = getToolJson<{ to?: string; data?: string }>(res);
    if (!payload?.to || !payload?.data) {
        throw new Error(`Invalid settlement tx payload for underlying_asset=${asset}`);
    }
    console.log(`✅ settle accepted: ${asset}`);
}

async function expectSettleError(client: Client, optionId: string, asset: string) {
    const res = await client.callTool({
        name: "callput_settle_position",
        arguments: { option_id: optionId, underlying_asset: asset }
    }) as ToolResultLike;
    if (!res.isError) {
        throw new Error(`Expected error for mismatched underlying_asset=${asset}, but call succeeded.`);
    }
    console.log(`✅ settle rejected mismatched asset: ${asset}`);
}

async function expectSettleNotExpiredError(client: Client, optionId: string, asset: string) {
    const res = await client.callTool({
        name: "callput_settle_position",
        arguments: { option_id: optionId, underlying_asset: asset }
    }) as ToolResultLike;
    if (!res.isError) {
        throw new Error(`Expected not-expired rejection for underlying_asset=${asset}, but call succeeded.`);
    }
    const text = getToolErrorText(res);
    if (!String(text).includes("not expired yet")) {
        throw new Error(`Expected not-expired message, got: ${text}`);
    }
    console.log(`✅ settle rejected not-expired option: ${asset}`);
}

async function main() {
    const transport = new StdioClientTransport({ command: "node", args: ["build/index.js"] });
    const client = new Client({ name: "verify-settle", version: "1.0.0" }, { capabilities: {} });

    try {
        await client.connect(transport);
        console.log("Connected to server.");

        const btcOptionId = makeDummyOptionId(1);
        const ethOptionId = makeDummyOptionId(2);
        const futureExpiry = Math.floor(Date.now() / 1000) + 86400;
        const futureBtcOptionId = makeDummyOptionId(1, futureExpiry);

        await expectSettleOk(client, btcOptionId, "BTC");
        await expectSettleOk(client, btcOptionId, "WBTC");
        await expectSettleOk(client, ethOptionId, "ETH");
        await expectSettleOk(client, ethOptionId, "WETH");

        await expectSettleError(client, ethOptionId, "BTC");
        await expectSettleNotExpiredError(client, futureBtcOptionId, "BTC");

        console.log("✅ Settlement normalization verification passed.");
    } catch (error) {
        console.error("❌ Settlement verification failed:", error);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}

main();
