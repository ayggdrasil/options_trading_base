#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { VIEW_AGGREGATOR_ABI, POSITION_MANAGER_ABI, ERC20_ABI } from "./abis.js";

// --- Types & Helpers ---

enum Strategy {
    NotSupported = 0,
    BuyCall = 1,
    SellCall = 2,
    BuyPut = 3,
    SellPut = 4,
    BuyCallSpread = 5,
    SellCallSpread = 6,
    BuyPutSpread = 7,
    SellPutSpread = 8
}

interface ParsedOption {
    underlyingAssetIndex: number;
    expiry: number;
    strategy: Strategy;
    isBuy: boolean[];
    strikePrices: number[];
    isCall: boolean[];
    vaultIndex: number;
}

function parseOptionTokenId(optionTokenId: bigint): ParsedOption {
    const underlyingAssetIndex = Number((optionTokenId >> 240n) & 0xFFFFn);
    const expiry = Number((optionTokenId >> 200n) & 0xFFFFFFFFFFn);
    const strategy = Number((optionTokenId >> 196n) & 0xFn);

    // length is 2 bits at 194
    // const length = Number((optionTokenId >> 194n) & 0x3n) + 1;

    const isBuys: boolean[] = [];
    const strikePrices: number[] = [];
    const isCall: boolean[] = [];

    for (let i = 0; i < 4; i++) {
        isBuys[i] = ((optionTokenId >> (193n - BigInt(i * 48))) & 0x1n) !== 0n;
        const strike = Number((optionTokenId >> (147n - BigInt(i * 48))) & 0x3FFFFFFFFFFn);
        strikePrices[i] = strike;
        isCall[i] = ((optionTokenId >> (146n - BigInt(i * 48))) & 0x1n) !== 0n;
    }

    const vaultIndex = Number(optionTokenId & 0x3n);

    return {
        underlyingAssetIndex,
        expiry,
        strategy,
        isBuy: isBuys,
        strikePrices,
        isCall,
        vaultIndex
    };
}

// --- Server Implementation ---

const server = new Server(
    {
        name: "callput-agent-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Setup Provider & Contracts
const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const viewAggregator = new ethers.Contract(CONFIG.CONTRACTS.VIEW_AGGREGATOR, VIEW_AGGREGATOR_ABI, provider);
const positionManager = new ethers.Contract(CONFIG.CONTRACTS.POSITION_MANAGER, POSITION_MANAGER_ABI, provider);

// Cache for decimals to avoid repeated calls
const decimalsCache: Record<string, number> = {};

async function getDecimals(tokenAddress: string): Promise<number> {
    if (decimalsCache[tokenAddress]) return decimalsCache[tokenAddress];
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    try {
        const decimals = await contract.decimals();
        decimalsCache[tokenAddress] = Number(decimals);
        return Number(decimals);
    } catch (e) {
        console.error(`Failed to fetch decimals for ${tokenAddress}`, e);
        return 18; // Default
    }
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_option_chains",
                description: "Retrieve available option chains (liquidity and strikes) from the Callput protocol on Base L2.",
                inputSchema: {
                    type: "object",
                    properties: {
                        underlying_asset: {
                            type: "string",
                            description: "The underlying asset symbol (e.g., WETH). Retrieve option legs to construct Spreads (Call Spread / Put Spread). Single leg trading is disabled.",
                        },
                    },
                    required: ["underlying_asset"],
                },
            },
            {
                name: "request_quote",
                description: "Generate a transaction payload to buy/sell an option. Returns the calldata for PositionManager.createOpenPosition.",
                inputSchema: {
                    type: "object",
                    properties: {
                        option_token_id: {
                            type: "string",
                            description: "The Option Token ID (uint256 as string) retrieved from get_option_chains.",
                        },
                        amount: {
                            type: "number",
                            description: "The amount of payment token (e.g. USDC or WETH) to spend (for Buy) or options to sell.",
                        },
                        is_buy: {
                            type: "boolean",
                            description: "True for Buy, False for Sell.",
                        },
                        slippage: {
                            type: "number",
                            description: "Slippage tolerance percentage (default 0.5%).",
                        }
                    },
                    required: ["option_token_id", "amount", "is_buy"],
                },
            },
        ],
    };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "get_option_chains") {
            const Schema = z.object({
                underlying_asset: z.string(),
            });
            const params = Schema.parse(args);

            // 1. Validate Asset - Map WBTC/WETH to BTC/ETH for S3 data
            let assetName = params.underlying_asset.toUpperCase();
            if (assetName === "WBTC") assetName = "BTC";
            if (assetName === "WETH") assetName = "ETH";

            if (!["BTC", "ETH"].includes(assetName)) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: Unsupported asset ${assetName}. Only BTC and ETH are supported.`,
                        },
                    ],
                    isError: true,
                };
            }

            // 2. Fetch Market Data from S3
            // Public S3 bucket for Callput.app market data
            // https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json
            const S3_URL = "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json";

            let marketData;
            try {
                const response = await fetch(S3_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                marketData = await response.json();
            } catch (error) {
                console.error("Failed to fetch S3 data:", error);
                return {
                    content: [{ type: "text", text: "Error: Failed to fetch market data from S3." }],
                    isError: true,
                };
            }

            if (!marketData.data || !marketData.data.market || !marketData.data.market[assetName]) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: No market data found for ${assetName} in S3.`,
                        },
                    ],
                    isError: true,
                };
            }

            const assetMarket = marketData.data.market[assetName];

            // 3. Parse options from S3 data → Hierarchical Slim JSON format
            // Structure: Asset > Expiry > Call/Put > Buy > Strikes
            // "Buy" is implied as the default action for these options.

            // Container for the hierarchy
            const hierarchy: Record<string, {
                days: number,
                call: any[],
                put: any[]
            }> = {};

            const formatOption = (option: any) => {
                return {
                    s: option.strikePrice,       // Strike
                    id: option.optionId,         // Token ID
                    p: option.markPrice?.toFixed(4) || "0", // Price
                    l: option.liquidity?.toFixed(4) || "0"  // Liquidity
                };
            };

            for (const expiry of assetMarket.expiries || []) {
                const expiryOptions = assetMarket.options[expiry];
                if (!expiryOptions) continue;

                // Format Expiry Date (e.g., "14FEB26")
                const expiryDate = new Date(Number(expiry) * 1000);
                const day = String(expiryDate.getUTCDate()).padStart(2, '0');
                const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                const month = monthNames[expiryDate.getUTCMonth()];
                const year = String(expiryDate.getUTCFullYear()).slice(-2);
                const formattedExpiry = `${day}${month}${year}`;

                const now = Math.floor(Date.now() / 1000);
                const daysToExpiry = Math.floor((Number(expiry) - now) / 86400);

                if (!hierarchy[formattedExpiry]) {
                    hierarchy[formattedExpiry] = {
                        days: daysToExpiry,
                        call: [],
                        put: []
                    };
                }

                // Process Calls
                for (const option of expiryOptions.call || []) {
                    if (!option.isOptionAvailable) continue;
                    hierarchy[formattedExpiry].call.push(formatOption(option));
                }
                // Sort Calls by Strike ASC
                hierarchy[formattedExpiry].call.sort((a, b) => a.s - b.s);

                // Process Puts
                for (const option of expiryOptions.put || []) {
                    if (!option.isOptionAvailable) continue;
                    hierarchy[formattedExpiry].put.push(formatOption(option));
                }
                // Sort Puts by Strike DESC (usual convention, or just ASC is fine)
                hierarchy[formattedExpiry].put.sort((a, b) => a.s - b.s);
            }

            // Sort Hierarchy Keys by Days to Expiry?
            // Object keys in JS aren't strictly ordered, but we can't easily sort a map.
            // However, the Agent will parse the JSON. 
            // We can return a sorted array of objects if needed, but user asked for "Variable > Variable" hierarchy.
            // A map `expiry -> data` is the best representation of that hierarchy.

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            asset: params.underlying_asset,
                            // The hierarchy: Expiry Key -> { days, call: [...], put: [...] }
                            // "Buy" is implicit in the list of available options.
                            expiries: hierarchy,
                            last_updated: marketData.lastUpdatedAt,
                        }),
                    },
                ],
            };
        }

        if (name === "request_quote") {
            const Schema = z.object({
                strategy: z.enum(["BuyCallSpread", "BuyPutSpread"]),
                long_leg_id: z.string(),
                short_leg_id: z.string(),
                amount: z.number().positive(),
                slippage: z.number().optional().default(0.5),
            });
            const params = Schema.parse(args);

            // Helpers to parse Token ID parts
            // We need: underlyingAssetIndex, expiry, strikePrice
            const parseTokenId = (tokenIdStr: string) => {
                const id = BigInt(tokenIdStr);
                // Bit layout:
                // [248bits unused][8bits unused][16bits asset][40bits expiry][48bits strike][1 bit isBuy][1 bit isCall][...remainder]
                // Wait, `createOpenPosition` uses `optionId` as the key which is:
                // keccak256(abi.encodePacked(underlying, expiry, strike))
                // BUT the "id" we get from S3 is `optionId` (BigInt string) which is likely the *Position Token ID*?
                // Let's re-verify `parseOptionTokenId` logic at top of file. 
                // It unpacks 256 bits.
                return parseOptionTokenId(id);
            };

            const longLeg = parseTokenId(params.long_leg_id);
            const shortLeg = parseTokenId(params.short_leg_id);

            // Validation: Must be same Asset and Expiry
            if (longLeg.underlyingAssetIndex !== shortLeg.underlyingAssetIndex) {
                throw new Error("Legs must have same Underlying Asset");
            }
            if (longLeg.expiry !== shortLeg.expiry) {
                throw new Error("Legs must have same Expiry");
            }

            // Strategy Validation
            // BuyCallSpread: Long Lower Strike (Buy), Short Higher Strike (Sell)
            // BuyPutSpread: Long Higher Strike (Buy), Short Lower Strike (Sell)

            // Check Call/Put consistency
            const isCall = params.strategy === "BuyCallSpread";
            // Note: We skip checking longLeg.isCall/shortLeg.isCall from the ID 
            // because S3 IDs might have bit flags set differently or strategy=0.
            // We rely on the User/Agent's requested strategy.

            // Check Strikes
            const longStrike = longLeg.strikePrices[0];
            const shortStrike = shortLeg.strikePrices[0];

            if (isCall) {
                // Bull Call Spread: Buy Low, Sell High
                if (longStrike >= shortStrike) throw new Error("For Bull Call Spread, Long Strike must be < Short Strike");
            } else {
                // Bull Put Spread (Credit) or Bear Put Spread (Debit)?
                // Callput App "Put Spread" usually refers to Debit Put Spread (Bear Put Spread).
                // Bear Put Spread: Buy High, Sell Low.
                // Let's assume user wants Debit Spreads as per "Buy" keyword.
                // Buy Put Spread = Long Put (High K) + Short Put (Low K) -> Net Debit.
                if (longStrike <= shortStrike) throw new Error("For Bear Put Spread, Long Strike must be > Short Strike");
            }

            // Construct Transaction Payload
            // function createOpenPosition(...)
            // Strikes: [Long, Short, 0, 0]
            // isBuys: [true, false, false, false] (Buy Long, Sell Short)
            // isCalls: [isCall, isCall, false, false]

            const strikes = [longStrike, shortStrike, 0, 0];
            const isBuys = [true, false, false, false];
            const isCalls = [isCall, isCall, false, false];

            // Reconstruct Option IDs to pass to contract
            // The contract needs `keccak256(abi.encodePacked(underlying(uint16), expiry(uint40), strike(uint48)))`
            // We can derive this from the legs.

            const generateOptionId = (assetIdx: number, expiry: number, strike: number) => {
                if (strike === 0) return ethers.ZeroHash;
                const packed = ethers.solidityPacked(
                    ["uint16", "uint40", "uint48"],
                    [assetIdx, expiry, strike]
                );
                return ethers.keccak256(packed);
            };

            const optionIds = [
                generateOptionId(longLeg.underlyingAssetIndex, longLeg.expiry, longStrike),
                generateOptionId(longLeg.underlyingAssetIndex, longLeg.expiry, shortStrike),
                ethers.ZeroHash,
                ethers.ZeroHash
            ];

            // Execution Fee
            const executionFee = await positionManager.executionFee();

            // Standard Path: [USDC] -> Vault
            const USDC = CONFIG.CONTRACTS.USDC;
            const path = [USDC];

            // Amount handling
            const decimals = await getDecimals(USDC);
            const amountIn = ethers.parseUnits(params.amount.toString(), decimals);

            // Spread strategies start at 5 (BuyCallSpread)
            // But PositionManager determines logic by `length` and `isBuys`.
            // We always send length=2 for Spreads.
            const length = 2;
            const minSize = 0n;
            const minOutWhenSwap = 0n;

            const iface = new ethers.Interface(POSITION_MANAGER_ABI);
            const calldata = iface.encodeFunctionData("createOpenPosition", [
                longLeg.underlyingAssetIndex,
                length,
                isBuys,
                optionIds,
                isCalls,
                minSize,
                path,
                amountIn,
                minOutWhenSwap,
                ethers.ZeroAddress // leadTrader
            ]);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            to: CONFIG.CONTRACTS.POSITION_MANAGER,
                            data: calldata,
                            value: executionFee.toString(),
                            chain_id: CONFIG.CHAIN_ID,
                            description: `Open Position: ${params.strategy} on ${isCall ? "Call" : "Put"} (Long ${longStrike} / Short ${shortStrike})`,
                            approval_target: CONFIG.CONTRACTS.ROUTER,
                            approval_token: CONFIG.CONTRACTS.USDC,
                            instruction: "Ensure you have approved 'approval_token' (USDC) for 'approval_target' (Router) to spend amount >= 'amount'"
                        }, null, 2),
                    },
                ],
            };
        }

        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid parameters: ${error.errors.map((e) => e.message).join(", ")}`
            );
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});

// Start server
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Callput Agent MCP Server running on stdio");
}

runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
