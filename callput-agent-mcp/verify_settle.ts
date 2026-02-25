import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function makeDummyOptionId(underlyingAssetIndex: number): string {
    const id = (BigInt(underlyingAssetIndex) << 240n) + 1n;
    return id.toString();
}

function parseJsonText(result: any): any {
    const text = result?.content?.[0]?.text;
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function expectSettleOk(client: Client, optionId: string, asset: string) {
    const res: any = await client.callTool({
        name: "callput_settle_position",
        arguments: { option_id: optionId, underlying_asset: asset }
    });
    if (res.isError) {
        throw new Error(`Expected success for underlying_asset=${asset}, but got error: ${res.content?.[0]?.text || "unknown"}`);
    }
    const payload = parseJsonText(res);
    if (!payload?.to || !payload?.data) {
        throw new Error(`Invalid settlement tx payload for underlying_asset=${asset}`);
    }
    console.log(`✅ settle accepted: ${asset}`);
}

async function expectSettleError(client: Client, optionId: string, asset: string) {
    const res: any = await client.callTool({
        name: "callput_settle_position",
        arguments: { option_id: optionId, underlying_asset: asset }
    });
    if (!res.isError) {
        throw new Error(`Expected error for mismatched underlying_asset=${asset}, but call succeeded.`);
    }
    console.log(`✅ settle rejected mismatched asset: ${asset}`);
}

async function main() {
    const transport = new StdioClientTransport({ command: "node", args: ["build/index.js"] });
    const client = new Client({ name: "verify-settle", version: "1.0.0" }, { capabilities: {} });

    try {
        await client.connect(transport);
        console.log("Connected to server.");

        const btcOptionId = makeDummyOptionId(1);
        const ethOptionId = makeDummyOptionId(2);

        await expectSettleOk(client, btcOptionId, "BTC");
        await expectSettleOk(client, btcOptionId, "WBTC");
        await expectSettleOk(client, ethOptionId, "ETH");
        await expectSettleOk(client, ethOptionId, "WETH");

        await expectSettleError(client, ethOptionId, "BTC");

        console.log("✅ Settlement normalization verification passed.");
    } catch (error) {
        console.error("❌ Settlement verification failed:", error);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}

main();
