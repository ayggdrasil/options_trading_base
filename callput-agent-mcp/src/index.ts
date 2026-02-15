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
        isCall[i] = ((optionTokenId >> (146n - BigInt(i * 48))) & 0x1n) === 0n; // 0 = Call
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

    // Hardcode known tokens to prevent RPC rate-limit issues causing fallback to 18
    if (tokenAddress.toLowerCase() === CONFIG.CONTRACTS.USDC.toLowerCase()) return 6;

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
                name: "get_available_assets",
                description: "List the underlying assets currently supported for option trading on Callput.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "validate_spread",
                description: "Check if a proposed spread trade is valid without executing it. Returns validation status and spread details.",
                inputSchema: {
                    type: "object",
                    properties: {
                        strategy: {
                            type: "string",
                            enum: ["BuyCallSpread", "BuyPutSpread"],
                            description: "The strategy to validate.",
                        },
                        long_leg_id: {
                            type: "string",
                            description: "The Option Token ID for the Long Leg (Buy).",
                        },
                        short_leg_id: {
                            type: "string",
                            description: "The Option Token ID for the Short Leg (Sell).",
                        },
                    },
                    required: ["strategy", "long_leg_id", "short_leg_id"],
                },
            },
            {
                name: "request_quote",
                description: "Generate a transaction payload to buy/sell an option. Returns the calldata for PositionManager.createOpenPosition.",
                inputSchema: {
                    type: "object",
                    properties: {
                        strategy: {
                            type: "string",
                            enum: ["BuyCallSpread", "BuyPutSpread"],
                            description: "The strategy to execute. Currently only Call/Put Spreads are supported.",
                        },
                        long_leg_id: {
                            type: "string",
                            description: "The Option Token ID for the Long Leg (Buy).",
                        },
                        short_leg_id: {
                            type: "string",
                            description: "The Option Token ID for the Short Leg (Sell).",
                        },
                        amount: {
                            type: "number",
                            description: "The amount of USDC to spend (Premium).",
                        },
                    },
                    required: ["strategy", "long_leg_id", "short_leg_id", "amount"],
                },
            },
            {
                name: "get_greeks",
                description: "Get Greeks (Delta, Gamma, Vega, Theta) and risk metrics for a specific Option Token ID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        option_id: {
                            type: "string",
                            description: "The Option Token ID to look up.",
                        },
                    },
                    required: ["option_id"],
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

// Helper for Validation
async function validateSpreadLogic(
    strategy: string,
    longLegId: string,
    shortLegId: string,
    marketData: any
): Promise<{ isValid: boolean; error?: string; details?: any }> {

    let longLegParsed: ParsedOption | null = null;
    let shortLegParsed: ParsedOption | null = null;
    let longMetric: any = null;
    let shortMetric: any = null;
    let foundAsset = "";

    const assets = Object.keys(marketData.data.market);
    for (const asset of assets) {
        const market = marketData.data.market[asset];
        for (const expiry of market.expiries || []) {
            const opts = market.options[expiry];
            if (!opts) continue;

            for (const leg of [...(opts.call || []), ...(opts.put || [])]) {
                if (leg.optionId === longLegId && !longLegParsed) {
                    longLegParsed = parseOptionTokenId(BigInt(leg.optionId));
                    longMetric = leg;
                    foundAsset = asset;
                    // console.error(`[DEBUG] Long Leg: ${leg.optionId} | Price: ${leg.markPrice} | Strike: ${leg.strikePrice} | Vault: ${longLegParsed.vaultIndex}`);
                }
                if (leg.optionId === shortLegId && !shortLegParsed) {
                    shortLegParsed = parseOptionTokenId(BigInt(leg.optionId));
                    shortMetric = leg;
                    // console.error(`[DEBUG] Short Leg: ${leg.optionId} | Price: ${leg.markPrice} | Strike: ${leg.strikePrice} | Vault: ${shortLegParsed.vaultIndex}`);
                }
                if (longLegParsed && shortLegParsed) break;
            }
            if (longLegParsed && shortLegParsed) break;
        }
        if (longLegParsed && shortLegParsed) break;
    }

    if (!longLegParsed || !shortLegParsed || !longMetric || !shortMetric) {
        return { isValid: false, error: "One or both option legs not found in market data." };
    }

    // 2. Validate Consistency
    if (longLegParsed.underlyingAssetIndex !== shortLegParsed.underlyingAssetIndex) {
        return { isValid: false, error: "Legs must belong to the same underlying asset." };
    }
    // Expiry check
    if (longLegParsed.expiry !== shortLegParsed.expiry) {
        return { isValid: false, error: "Legs must have the same expiry." };
    }

    // Check if both are calls or both are puts
    const longIsCall = Boolean(longLegParsed.isCall[0]);
    const shortIsCall = Boolean(shortLegParsed.isCall[0]);

    if (longIsCall !== shortIsCall) {
        return { isValid: false, error: "Legs must be both Calls or both Puts." };
    }

    // 3. Validate Prices & Spread
    const longPrice = longMetric.markPrice || 0;
    const shortPrice = shortMetric.markPrice || 0;
    const spreadCost = longPrice - shortPrice;

    // Determine min spread price (BTC=60, ETH=3)
    const minSpreadPrice = foundAsset === "BTC" ? 60 : 3;

    if (spreadCost < minSpreadPrice) {
        return {
            isValid: false,
            error: `Spread Price too low ($${spreadCost.toFixed(2)}). Minimum allowed is $${minSpreadPrice} for ${foundAsset}. Increase Long Strike or decrease Short Strike.`,
            details: { spreadCost, minSpreadPrice }
        };
    }

    // 4. Validate Strategy Direction
    const longStrike = Number(longLegParsed.strikePrices[0]);
    const shortStrike = Number(shortLegParsed.strikePrices[0]);
    // 4. Strategy Type Check
    // "BuyCallSpread", "SellCallSpread", "BuyPutSpread", "SellPutSpread"
    const isCallSpread = strategy.includes("Call");

    if (isCallSpread) {
    } else { // Put Spread
        // Put Spread: Buy High Strike, Sell Low Strike
        if (longStrike <= shortStrike) {
            return { isValid: false, error: `For Bear Put Spread, Long Strike ($${longStrike}) must be > Short Strike ($${shortStrike}) (Buy High, Sell Low)` };
        }
        if (longIsCall) return { isValid: false, error: "Strategy is Put Spread but options are Calls." };
    }

    // --- NEW: Calculate Available Quantity based on Vault Liquidity ---
    let maxTradableQuantity = 0;
    try {
        const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const usdc = new ethers.Contract(CONFIG.CONTRACTS.USDC, ERC20_ABI, provider);

        const vaultIndex = longLegParsed.vaultIndex;
        const vaultAddress = getVaultAddress(vaultIndex);

        // Fetch Vault Balance (USDC 6 decimals)
        const balanceRaw = await usdc.balanceOf(vaultAddress);
        const vaultBalance = Number(ethers.formatUnits(balanceRaw, 6));

        let unitRequirement = 0;

        if (strategy.startsWith("Buy")) {
            // User Buys Spread -> Vault Sells Spread (Bear Spread).
            // Vault needs Collateral = Difference in Strikes.
            // (Conservatively ignoring premium received for now, or assume worst case)
            // Note: Strike prices in OptionID are scaled by 32.
            const tickSize = 32;
            const strikeDiff = Math.abs(Number(longLegParsed.strikePrices[0]) - Number(shortLegParsed.strikePrices[0])) / tickSize;
            unitRequirement = strikeDiff;
        } else if (strategy.startsWith("Sell")) {
            // User Sells Spread -> Vault Buys Spread.
            // Vault pays Premium = Spread Price.
            unitRequirement = Math.abs(spreadCost);
        }

        if (unitRequirement > 0) {
            maxTradableQuantity = Math.floor(vaultBalance / unitRequirement);
        } else {
            maxTradableQuantity = 999999; // No requirement? Should not happen for valid spread
        }

        console.error(`Debug MaxQty: VaultBalance=${vaultBalance}, StrikeDiff=${unitRequirement}, MaxQty=${maxTradableQuantity}`);
        // console.error(`Vault Balance: ${vaultBalance}, Unit Req: ${unitRequirement}, Max Qty: ${maxTradableQuantity}`);

    } catch (e) {
        console.error("Error calculating max quantity:", e);
    }

    return {
        isValid: true,
        details: {
            asset: foundAsset,
            spreadCost: spreadCost, // For Buy, this is debit. For Sell, this is credit.
            longStrike: Number(longLegParsed.strikePrices[0]),
            shortStrike: Number(shortLegParsed.strikePrices[0]),
            longPrice: longPrice,
            shortPrice: shortPrice,
            expiry: longLegParsed.expiry,
            maxTradableQuantity: maxTradableQuantity, // <--- Added
            longLegParsed,
            shortLegParsed
        }
    };
}

// Helper to get Vault Address
const getVaultAddress = (index: number) => {
    switch (index) {
        case 0: return CONFIG.CONTRACTS.S_VAULT;
        case 1: return CONFIG.CONTRACTS.M_VAULT;
        case 2: return CONFIG.CONTRACTS.L_VAULT;
        default: return CONFIG.CONTRACTS.S_VAULT; // Default to S
    }
};


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

            // Fetch Vault Balances (Real Liquidity)
            const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
            const usdc = new ethers.Contract(CONFIG.CONTRACTS.USDC, ERC20_ABI, provider);
            const vaultBalances: number[] = [0, 0, 0]; // S, M, L

            try {
                const vaults = [CONFIG.CONTRACTS.S_VAULT, CONFIG.CONTRACTS.M_VAULT, CONFIG.CONTRACTS.L_VAULT];
                const balances = await Promise.all(vaults.map(addr => usdc.balanceOf(addr)));

                // USDC has 6 decimals
                vaultBalances[0] = Number(ethers.formatUnits(balances[0], 6));
                vaultBalances[1] = Number(ethers.formatUnits(balances[1], 6));
                vaultBalances[2] = Number(ethers.formatUnits(balances[2], 6));

                // console.error(`Vault Liquidity: S=${vaultBalances[0]}, M=${vaultBalances[1]}, L=${vaultBalances[2]}`);
            } catch (e) {
                console.error("Failed to fetch vault balances:", e);
                // Continue with fallback liquidity so agent doesn't stop.
                // Validate Spread tool will perform the strict check later.
                vaultBalances[0] = 5000;
                vaultBalances[1] = 5000;
                vaultBalances[2] = 5000;
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
                // Parse Vault Index from Option ID (Last 2 bits)
                // We use BigInt to handle the full ID logic properly if needed, but for index masking,
                // taking the last byte or so is safe enough in JS numbers if ID was string?
                // OptionID is hex string.
                const vaultIndex = Number(BigInt(option.optionId) & 0x3n);
                const liquidity = vaultBalances[vaultIndex] || 0;

                return [
                    option.strikePrice,                                // Strike
                    Number(option.markPrice?.toFixed(2) || "0"),       // Price
                    Number(liquidity.toFixed(2)),                      // Liquidity (Vault Balance)
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

        if (name === "get_available_assets") {
            // Currently static, but could dynamically check S3 in future
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            assets: ["BTC", "ETH"],
                            description: "Currently supports Bitcoin (BTC) and Ethereum (ETH) options on Base L2."
                        }),
                    },
                ],
            };
        }

        if (name === "validate_spread") {
            const Schema = z.object({
                strategy: z.enum(["BuyCallSpread", "BuyPutSpread", "SellCallSpread", "SellPutSpread"]),
                long_leg_id: z.string(),
                short_leg_id: z.string(),
            });
            const params = Schema.parse(args);

            const marketData = await fetchMarketData();
            const validation = await validateSpreadLogic(params.strategy, params.long_leg_id, params.short_leg_id, marketData);

            if (!validation.isValid) {
                return {
                    content: [{ type: "text", text: `Validation Failed: ${validation.error}` }],
                    isError: true
                };
            }

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        status: "Valid",
                        details: validation.details,
                        message: "Spread is valid and tradable."
                    })
                }]
            };
        }

        if (name === "request_quote") {
            const Schema = z.object({
                strategy: z.enum(["BuyCallSpread", "BuyPutSpread", "SellCallSpread", "SellPutSpread"]),
                long_leg_id: z.string(),
                short_leg_id: z.string(),
                amount: z.number().positive(),
                slippage: z.number().optional().default(0.5),
            });
            const params = Schema.parse(args);

            // Fetch Market Data & Validate
            const marketData = await fetchMarketData();
            const validation = await validateSpreadLogic(params.strategy, params.long_leg_id, params.short_leg_id, marketData);

            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            const { longStrike, shortStrike, longLegParsed, shortLegParsed, asset: foundAsset, spreadCost } = validation.details;

            const longLeg = longLegParsed;
            const shortLeg = shortLegParsed;
            const isCall = params.strategy === "BuyCallSpread";

            // Construct Transaction Payload
            const strikes = [longStrike, shortStrike, 0, 0];
            const isBuys = [true, false, false, false];
            const isCalls = [isCall, isCall, false, false];

            // Use the provided Option IDs directly (S3 IDs are already correct packed integers)
            // DO NOT regenerate them with keccak256, as that creates a hash mismatch.
            const optionIds = [
                params.long_leg_id,
                params.short_leg_id,
                ethers.ZeroHash,
                ethers.ZeroHash
            ];

            // Execution Fee
            const executionFee = await positionManager.executionFee();

            // Determine Vault from Long Leg Index
            const vaultAddress = getVaultAddress(longLeg.vaultIndex);

            // Path: [USDC, Vault]
            const USDC = CONFIG.CONTRACTS.USDC;
            const path = [USDC, vaultAddress];

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

        if (name === "get_greeks") {
            const Schema = z.object({
                option_id: z.string(),
            });
            const params = Schema.parse(args);
            const targetId = params.option_id;

            let marketData;
            try {
                marketData = await fetchMarketData();
            } catch (error) {
                return {
                    content: [{ type: "text", text: "Error: Failed to fetch market data." }],
                    isError: true,
                };
            }

            let foundOption: any = null;
            let foundAsset = "";

            if (marketData.data && marketData.data.market) {
                for (const asset of Object.keys(marketData.data.market)) {
                    const market = marketData.data.market[asset];
                    for (const expiry of market.expiries || []) {
                        const opts = market.options[expiry];
                        if (!opts) continue;

                        // Check Calls and Puts
                        const allOpts = [...(opts.call || []), ...(opts.put || [])];
                        foundOption = allOpts.find((o: any) => o.optionId === targetId);

                        if (foundOption) {
                            foundAsset = asset;
                            break;
                        }
                    }
                    if (foundOption) break;
                }
            }

            if (!foundOption) {
                return {
                    content: [{ type: "text", text: `Error: Option ID ${targetId} not found in current market data.` }],
                    isError: true,
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            asset: foundAsset,
                            instrument: foundOption.instrument,
                            strike: foundOption.strikePrice,
                            expiry: foundOption.expiry,
                            type: foundOption.instrument.endsWith("-C") ? "Call" : "Put",
                            mark_price: foundOption.markPrice,
                            mark_iv: foundOption.markIv,
                            greeks: {
                                delta: foundOption.delta,
                                gamma: foundOption.gamma,
                                vega: foundOption.vega,
                                theta: foundOption.theta
                            },
                            risk_premium_buy: foundOption.riskPremiumRateForBuy,
                            risk_premium_sell: foundOption.riskPremiumRateForSell
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
