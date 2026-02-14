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
                description: "Retrieve available vanilla option chains (Call/Put) from the Callput protocol. NOTE: These individual options are NOT tradable directly. You must combine a Long Leg and a Short Leg to create a Spread (Call Spread or Put Spread) using `request_quote`.",
                inputSchema: {
                    type: "object",
                    properties: {
                        underlying_asset: {
                            type: "string",
                            description: "The underlying asset symbol (e.g., WETH). Returns a list of vanilla options to be used as legs for constructing Spreads.",
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

// Helper to fetch S3 Data
async function fetchMarketData() {
    const S3_URL = "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json";
    const response = await fetch(S3_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

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
            let marketData;
            try {
                marketData = await fetchMarketData();
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

            // Estimate Spot Price using Deep ITM Call (Lowest Strike)
            // Logic: For Deep ITM Call, Option Price ~= Spot Price - Strike Price
            // So, Spot Price ~= Option Price + Strike Price
            let spotPrice = 0;
            if (assetMarket.expiries && assetMarket.expiries.length > 0) {
                const firstExpiry = assetMarket.expiries[0];
                const calls = assetMarket.options[firstExpiry]?.call || [];
                if (calls.length > 0) {
                    // Sort by strike to find lowest (Deep ITM)
                    const sortedCalls = [...calls].sort((a: any, b: any) => a.strikePrice - b.strikePrice);
                    const deepITMCall = sortedCalls[0];
                    if (deepITMCall) {
                        spotPrice = deepITMCall.strikePrice + (deepITMCall.markPrice || 0);
                        // Clean to 2 decimals
                        spotPrice = Math.round(spotPrice * 100) / 100;
                    }
                }
            }

            // Min Price for *Short* legs can be lower, as long as the *Spread* is valuable.
            // We set a dust threshold to avoid completely worthless options.
            const dustThreshold = 0.1;

            // 3. Parse options from S3 data → Compact Array format
            // Structure: Asset > Expiry > Call/Put > [Strike, Price, Liquidity, ID]

            const hierarchy: Record<string, {
                days: number,
                // [Strike, Price, Liquidity, ID]
                call: [number, number, number, string][],
                put: [number, number, number, string][]
            }> = {};

            const formatOption = (option: any): [number, number, number, string] => {
                return [
                    option.strikePrice,                                // Strike
                    Number(option.markPrice?.toFixed(2) || "0"),       // Price (2 decimals sufficient for high level view)
                    Number(option.liquidity?.toFixed(2) || "0"),       // Liquidity
                    option.optionId                                    // Token ID
                ];
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
                    if (!option.isOptionAvailable || (option.markPrice || 0) < dustThreshold) continue;
                    hierarchy[formattedExpiry].call.push(formatOption(option));
                }
                // Sort Calls by Strike ASC
                hierarchy[formattedExpiry].call.sort((a, b) => a[0] - b[0]);

                // Process Puts
                for (const option of expiryOptions.put || []) {
                    if (!option.isOptionAvailable || (option.markPrice || 0) < dustThreshold) continue;
                    hierarchy[formattedExpiry].put.push(formatOption(option));
                }
                // Sort Puts by Strike ASC
                hierarchy[formattedExpiry].put.sort((a, b) => a[0] - b[0]);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            asset: params.underlying_asset,
                            underlying_price: spotPrice,
                            format: "[Strike, Price, Liquidity, OptionID]",
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
            const parseTokenId = (tokenIdStr: string) => {
                const id = BigInt(tokenIdStr);
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

            // Strategy Validation & Price Check
            // 1. Fetch latest prices to validate Spread Value
            let marketData;
            try {
                marketData = await fetchMarketData();
            } catch (error) {
                throw new Error("Failed to fetch fresh market data for price validation.");
            }

            const assetIndex = longLeg.underlyingAssetIndex;
            // Map index to name (approximate, relying on config or just searching)
            // But we can search data by Expiry directly if we knew the asset name.
            // S3 structure keys are "BTC", "ETH".
            // 1 = BTC, 2 = ETH (Usually, need to confirm).
            // Let's deduce asset name from S3 data by checking which asset has this expiry & option ID.

            let foundAsset: string | null = null;
            let longOptionPrice = 0;
            let shortOptionPrice = 0;
            let foundLong = false;
            let foundShort = false;

            const assets = ["BTC", "ETH"];
            for (const asset of assets) {
                if (!marketData.data.market[asset]) continue;
                const expiryStr = longLeg.expiry.toString(); // S3 expiry is string
                const options = marketData.data.market[asset].options[expiryStr];
                if (!options) continue;

                // Search in Call and Put
                const allOptions = [...(options.call || []), ...(options.put || [])];

                const lOpt = allOptions.find((o: any) => o.optionId === params.long_leg_id);
                if (lOpt) {
                    foundAsset = asset;
                    longOptionPrice = lOpt.markPrice || 0;
                    foundLong = true;
                }
                const sOpt = allOptions.find((o: any) => o.optionId === params.short_leg_id);
                if (sOpt) {
                    shortOptionPrice = sOpt.markPrice || 0;
                    foundShort = true;
                }
                if (foundLong && foundShort) break;
            }

            if (!foundLong || !foundShort || !foundAsset) {
                throw new Error("Could not find Option IDs in latest market data. Options may be expired or invalid.");
            }

            // Check Spread Value
            // Debit Spread Cost = Long Price - Short Price
            const spreadCost = longOptionPrice - shortOptionPrice;

            // Constraints
            const minSpreadPrice = foundAsset === "BTC" ? 60 : 3;

            if (spreadCost < minSpreadPrice) {
                throw new Error(`Spread Price too low ($${spreadCost.toFixed(2)}). Minimum allowed is $${minSpreadPrice} for ${foundAsset}. Increase Long Strike or decrease Short Strike.`);
            }

            // Check Call/Put consistency
            const isCall = params.strategy === "BuyCallSpread";
            const longStrike = longLeg.strikePrices[0];
            const shortStrike = shortLeg.strikePrices[0];

            if (isCall) {
                // Bull Call Spread: Buy Low (Long), Sell High (Short)
                if (longStrike >= shortStrike) throw new Error("For Bull Call Spread, Long Strike must be < Short Strike (Buy Low, Sell High)");
            } else {
                // Bear Put Spread: Buy High (Long), Sell Low (Short)
                if (longStrike <= shortStrike) throw new Error("For Bear Put Spread, Long Strike must be > Short Strike (Buy High, Sell Low)");
            }

            // Construct Transaction Payload
            const strikes = [longStrike, shortStrike, 0, 0];
            const isBuys = [true, false, false, false];
            const isCalls = [isCall, isCall, false, false];

            // Reconstruct Option IDs to pass to contract
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
                            description: `Open Position: ${params.strategy} on ${foundAsset} (Long $${longStrike} / Short $${shortStrike}) | Cost: $${spreadCost.toFixed(2)}`,
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
