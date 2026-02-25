import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ethers } from "ethers";

const CREATE_OPEN_POSITION_ABI = [
    "function createOpenPosition(uint16 _underlyingAssetIndex, uint8 _length, bool[4] memory _isBuys, bytes32[4] memory _optionIds, bool[4] memory _isCalls, uint256 _minSize, address[] memory _path, uint256 _amountIn, uint256 _minOutWhenSwap, address _leadTrader)"
];

type OptionRow = [number, number, number, number, string];

function parseJsonText(result: any): any {
    const text = result?.content?.[0]?.text;
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function boolArrayEquals(actual: readonly boolean[], expected: boolean[]): boolean {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
        if (Boolean(actual[i]) !== expected[i]) return false;
    }
    return true;
}

function findValidCallSpread(calls: OptionRow[]): { longLegId: string; shortLegId: string; longStrike: number; shortStrike: number } {
    for (let i = 0; i < calls.length; i++) {
        for (let j = i + 1; j < calls.length; j++) {
            const longLeg = calls[i];
            const shortLeg = calls[j];
            const longStrike = Number(longLeg[0]);
            const shortStrike = Number(shortLeg[0]);
            const spreadCost = Number(longLeg[1]) - Number(shortLeg[1]);
            if (longStrike < shortStrike && spreadCost >= 60) {
                return {
                    longLegId: String(longLeg[4]),
                    shortLegId: String(shortLeg[4]),
                    longStrike,
                    shortStrike
                };
            }
        }
    }
    throw new Error("No valid call spread pair found for transaction verification.");
}

async function main() {
    console.log("🚀 Starting Transaction Verification...");

    const transport = new StdioClientTransport({ command: "node", args: ["build/index.js"] });
    const client = new Client({ name: "tx-verification-client", version: "1.0.0" }, { capabilities: {} });

    try {
        await client.connect(transport);
        console.log("✅ Connected to MCP Server");

        const chainRes = await client.callTool({
            name: "callput_get_option_chains",
            arguments: { underlying_asset: "BTC", option_type: "Call" }
        });
        const chainResAny: any = chainRes;
        if (chainResAny.isError) {
            throw new Error(chainResAny.content?.[0]?.text || "callput_get_option_chains failed");
        }

        const chainData = parseJsonText(chainResAny);
        const expiries = Object.keys(chainData.expiries || {});
        if (expiries.length === 0) throw new Error("No expiries returned for BTC calls.");
        const calls = chainData.expiries[expiries[0]]?.call as OptionRow[];
        if (!Array.isArray(calls) || calls.length < 2) throw new Error("Insufficient call legs for verification.");

        const target = findValidCallSpread(calls);
        console.log(`Using spread: Long $${target.longStrike} / Short $${target.shortStrike}`);

        const iface = new ethers.Interface(CREATE_OPEN_POSITION_ABI);
        const strategies: Array<{ strategy: "BuyCallSpread" | "SellCallSpread"; expectedIsBuys: boolean[] }> = [
            { strategy: "BuyCallSpread", expectedIsBuys: [true, false, false, false] },
            { strategy: "SellCallSpread", expectedIsBuys: [false, true, false, false] }
        ];

        for (const tc of strategies) {
            console.log(`\n🧪 Testing ${tc.strategy}...`);

            const validateRes: any = await client.callTool({
                name: "callput_validate_spread",
                arguments: {
                    strategy: tc.strategy,
                    long_leg_id: target.longLegId,
                    short_leg_id: target.shortLegId
                }
            });
            if (validateRes.isError) {
                throw new Error(`Validation failed for ${tc.strategy}: ${validateRes.content?.[0]?.text || "unknown"}`);
            }

            const quoteRes: any = await client.callTool({
                name: "callput_request_quote",
                arguments: {
                    strategy: tc.strategy,
                    long_leg_id: target.longLegId,
                    short_leg_id: target.shortLegId,
                    amount: 100,
                    slippage: 5
                }
            });
            if (quoteRes.isError) {
                throw new Error(`Quote failed for ${tc.strategy}: ${quoteRes.content?.[0]?.text || "unknown"}`);
            }

            const quote = parseJsonText(quoteRes);
            if (!quote?.data) throw new Error(`Missing calldata for ${tc.strategy}`);

            const decoded = iface.decodeFunctionData("createOpenPosition", quote.data);
            const isBuys = decoded[2] as readonly boolean[];
            const isCalls = decoded[4] as readonly boolean[];
            const minSize = decoded[5] as bigint;

            if (!boolArrayEquals(isCalls, [true, true, false, false])) {
                throw new Error(`${tc.strategy} encoded wrong isCalls: ${JSON.stringify(isCalls)}`);
            }
            if (!boolArrayEquals(isBuys, tc.expectedIsBuys)) {
                throw new Error(`${tc.strategy} encoded wrong isBuys: ${JSON.stringify(isBuys)}`);
            }
            if (minSize <= 0n) {
                throw new Error(`${tc.strategy} minSize must be > 0 for slippage=5; got ${minSize.toString()}`);
            }

            console.log(`✅ ${tc.strategy} calldata verified (minSize=${minSize.toString()})`);
        }

        console.log("\n✅ Transaction verification completed.");
    } catch (error) {
        console.error("❌ Verification Failed:", error);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}

main();
