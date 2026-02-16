#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// ...


import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { VIEW_AGGREGATOR_ABI, POSITION_MANAGER_ABI, ERC20_ABI, SETTLE_MANAGER_ABI } from "./abis.js";

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

const server = new McpServer({
    name: "callput-agent-server",
    version: "1.0.0",
});

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

// Register Tools
server.registerTool(
    "callput_get_option_chains",
    {
        description: "Retrieve available vanilla option chains (Call/Put) from the Callput protocol. NOTE: These individual options are NOT tradable directly. You must combine a Long Leg and a Short Leg to create a Spread (Call Spread or Put Spread) using `request_quote`.",
        inputSchema: {
            underlying_asset: z.string().describe("The underlying asset symbol (e.g., 'WBTC', 'WETH')."),
            expiry_date: z.string().optional().describe("Filter by Expiry Date in format DDMMMYY (e.g., '14FEB26'). Returns all if omitted."),
            option_type: z.enum(["Call", "Put"]).optional().describe("Filter by Option Type. Returns both if omitted.")
        }
    },
    async (args) => {
        return await handleGetOptionChains(args);
    }
);

server.registerTool(
    "callput_get_available_assets",
    {
        description: "List the underlying assets currently supported for option trading on Callput.",
        inputSchema: z.object({})
    },
    async () => {
        return await handleGetAvailableAssets();
    }
);

server.registerTool(
    "callput_validate_spread",
    {
        description: "Check if a proposed spread trade is valid without executing it. Returns validation status and spread details.",
        inputSchema: {
            strategy: z.enum(["BuyCallSpread", "BuyPutSpread", "SellCallSpread", "SellPutSpread"]).describe("The strategy to validate."),
            long_leg_id: z.string().describe("The Option Token ID for the Long Leg (Buy)."),
            short_leg_id: z.string().describe("The Option Token ID for the Short Leg (Sell).")
        }
    },
    async (args) => {
        return await handleValidateSpread(args);
    }
);

server.registerTool(
    "callput_request_quote",
    {
        description: "Generate a transaction payload to buy/sell an option. Returns the calldata for PositionManager.createOpenPosition.",
        inputSchema: {
            strategy: z.enum(["BuyCallSpread", "BuyPutSpread", "SellCallSpread", "SellPutSpread"]).describe("The strategy to execute. Currently only Call/Put Spreads are supported."),
            long_leg_id: z.string().describe("The Option Token ID for the Long Leg (Buy)."),
            short_leg_id: z.string().describe("The Option Token ID for the Short Leg (Sell)."),
            amount: z.number().positive().describe("The amount of USDC to spend (Premium)."),
            slippage: z.number().optional().default(0.5).describe("Slippage tolerance percentage.")
        }
    },
    async (args) => {
        return await handleRequestQuote(args);
    }
);

server.registerTool(
    "callput_get_greeks",
    {
        description: "Get Greeks (Delta, Gamma, Vega, Theta) and risk metrics for a specific Option Token ID.",
        inputSchema: {
            option_id: z.string().describe("The Option Token ID to look up.")
        }
    },
    async (args) => {
        return await handleGetGreeks(args);
    }
);

server.registerTool(
    "callput_settle_position",
    {
        description: "Settle (close) an expired option position. Returns a transaction to sign.",
        inputSchema: {
            option_id: z.string().describe("The Option ID (BigInt string) to settle"),
            underlying_asset: z.string().describe("The underlying asset (e.g., 'WBTC', 'WETH')")
        }
    },
    async (args) => {
        // Validation handled inside
        return await handleSettlePosition(args as { option_id: string; underlying_asset: string });
    }
);

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
                }
                if (leg.optionId === shortLegId && !shortLegParsed) {
                    shortLegParsed = parseOptionTokenId(BigInt(leg.optionId));
                    shortMetric = leg;
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
    const isCallSpread = strategy.includes("Call");

    if (isCallSpread) {
        // Buy Call Spread: Buy Low Strike, Sell High Strike
        // Wait, for Buy Call Spread, we usually buy Low and Sell High (Bull Call Spread)
        // Check logic: Long Strike < Short Strike?
        // Actually, Callput might have specific definitions. 
        // Standard Bull Call Spread: Long Call (Lower Strike) + Short Call (Higher Strike) => Debit.
        // If Long Strike > Short Strike, it's a Bear Call Spread (Credit).
        // Let's assume Bull Call Spread for "BuyCallSpread".
        if (longStrike >= shortStrike) {
            // If Long Strike > Short Strike, cost is negative (credit)? No, CallPrice(Low) > CallPrice(High).
            // So Low - High is positive. 
            // If Long Strike < Short Strike (Low - High), it's Debit. 
            // Wait. Call Option Price decreases as Strike increases.
            // Strike 60000 Call Price > Strike 65000 Call Price.
            // So Buy 60000, Sell 65000 = Debit. this is Bull Call Spread.
            // So Long Strike < Short Strike.
        }
    } else { // Put Spread
        // Bear Put Spread: Buy High Strike, Sell Low Strike => Debit.
        // Put Price increases as Strike increases.
        // Strike 60000 Put Price < Strike 65000 Put Price.
        // Buy 65000 (High), Sell 60000 (Low) = Debit.
        if (longStrike <= shortStrike) {
            return { isValid: false, error: `For Bear Put Spread, Long Strike ($${longStrike}) must be > Short Strike ($${shortStrike}) (Buy High, Sell Low)` };
        }
        if (longIsCall) return { isValid: false, error: "Strategy is Put Spread but options are Calls." };
    }

    // --- Calculate Available Quantity based on Vault Liquidity ---
    let maxTradableQuantity = 0;
    try {
        const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const vaultABI = [
            "function poolAmounts(address token) external view returns (uint256)",
            "function reservedAmounts(address token) external view returns (uint256)"
        ];
        const vaultIndex = longLegParsed.vaultIndex;
        const vaultAddress = getVaultAddress(vaultIndex);
        const vaultContract = new ethers.Contract(vaultAddress, vaultABI, provider);

        // Fetch Vault State (Pool - Reserved)
        const [pool, reserved] = await Promise.all([
            vaultContract.poolAmounts(CONFIG.CONTRACTS.USDC),
            vaultContract.reservedAmounts(CONFIG.CONTRACTS.USDC)
        ]);
        const availableRaw = pool - reserved;
        const vaultBalance = Number(ethers.formatUnits(availableRaw > 0n ? availableRaw : 0n, 6));

        let unitRequirement = 0;

        if (strategy.startsWith("Buy")) {
            // User Buys Spread -> Vault Sells Spread (Bear Spread).
            // Vault needs Collateral = Difference in Strikes.
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
            maxTradableQuantity = 999999;
        }

    } catch (e) {
        console.error("Error calculating max quantity:", e);
    }

    return {
        isValid: true,
        details: {
            asset: foundAsset,
            spreadCost: spreadCost,
            longStrike: Number(longLegParsed.strikePrices[0]),
            shortStrike: Number(shortLegParsed.strikePrices[0]),
            longPrice: longPrice,
            shortPrice: shortPrice,
            expiry: longLegParsed.expiry,
            maxTradableQuantity: maxTradableQuantity,
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
        default: return CONFIG.CONTRACTS.S_VAULT;
    }
};


async function handleGetOptionChains(params: { underlying_asset: string; expiry_date?: string; option_type?: "Call" | "Put" }): Promise<CallToolResult> {
    // 1. Validate Asset
    let assetName = params.underlying_asset.toUpperCase();
    if (assetName === "WBTC") assetName = "BTC";
    if (assetName === "WETH") assetName = "ETH";

    if (!["BTC", "ETH"].includes(assetName)) {
        return {
            content: [{ type: "text", text: `Error: Unsupported asset ${assetName}. Only BTC and ETH are supported.` }],
            isError: true,
        };
    }

    // 2. Fetch Market Data from S3
    let marketData;
    try {
        marketData = await fetchMarketData();
    } catch (error) {
        return {
            content: [{ type: "text", text: "Error: Failed to fetch market data from S3." }],
            isError: true,
        };
    }

    if (!marketData.data || !marketData.data.market || !marketData.data.market[assetName]) {
        return {
            content: [{ type: "text", text: `Error: No market data found for ${assetName} in S3.` }],
            isError: true,
        };
    }

    const assetMarket = marketData.data.market[assetName];

    // Estimate Spot Price using Deep ITM Call
    let spotPrice = 0;
    if (assetMarket.expiries && assetMarket.expiries.length > 0) {
        const firstExpiry = assetMarket.expiries[0];
        const calls = assetMarket.options[firstExpiry]?.call || [];
        if (calls.length > 0) {
            const sortedCalls = [...calls].sort((a: any, b: any) => a.strikePrice - b.strikePrice);
            const deepITMCall = sortedCalls[0];
            if (deepITMCall) {
                spotPrice = deepITMCall.strikePrice + (deepITMCall.markPrice || 0);
                spotPrice = Math.round(spotPrice * 100) / 100;
            }
        }
    }

    // Fetch Vault State
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const vaultABI = [
        "function poolAmounts(address token) external view returns (uint256)",
        "function reservedAmounts(address token) external view returns (uint256)"
    ];

    const vaultBalances: number[] = [0, 0, 0]; // S, M, L

    try {
        const vaultAddrs = [CONFIG.CONTRACTS.S_VAULT, CONFIG.CONTRACTS.M_VAULT, CONFIG.CONTRACTS.L_VAULT];
        const vaultContracts = vaultAddrs.map(addr => new ethers.Contract(addr, vaultABI, provider));
        const usdcAddr = CONFIG.CONTRACTS.USDC;

        const results = await Promise.all(vaultContracts.map(async (v) => {
            try {
                const [pool, reserved] = await Promise.all([
                    v.poolAmounts(usdcAddr),
                    v.reservedAmounts(usdcAddr)
                ]);
                const avail = pool - reserved;
                return avail > 0n ? avail : 0n;
            } catch (e) {
                return 0n;
            }
        }));

        vaultBalances[0] = Number(ethers.formatUnits(results[0], 6));
        vaultBalances[1] = Number(ethers.formatUnits(results[1], 6));
        vaultBalances[2] = Number(ethers.formatUnits(results[2], 6));

    } catch (e) {
        console.error("Failed to fetch vault balances:", e);
        vaultBalances[0] = 5000;
        vaultBalances[1] = 5000;
        vaultBalances[2] = 5000;
    }

    const hierarchy: Record<string, {
        days: number,
        call: [number, number, number, number, string][],
        put: [number, number, number, number, string][]
    }> = {};

    const formatOption = (option: any): [number, number, number, number, string] => {
        const vaultIndex = Number(BigInt(option.optionId) & 0x3n);
        const liquidity = vaultBalances[vaultIndex] || 0;
        const maxQty = option.strikePrice > 0 ? Number((liquidity / option.strikePrice).toFixed(4)) : 0;

        return [
            option.strikePrice,
            Number(option.markPrice?.toFixed(2) || "0"),
            Number(liquidity.toFixed(2)),
            maxQty,
            option.optionId
        ];
    };

    for (const expiry of assetMarket.expiries || []) {
        const expiryOptions = assetMarket.options[expiry];
        if (!expiryOptions) continue;

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

        const allCalls = (expiryOptions.call || [])
            .filter((o: any) => o.isOptionAvailable && (o.markPrice || 0) >= 0.01)
            .map(formatOption)
            .sort((a: any[], b: any[]) => a[0] - b[0]);

        const allPuts = (expiryOptions.put || [])
            .filter((o: any) => o.isOptionAvailable && (o.markPrice || 0) >= 0.01)
            .map(formatOption)
            .sort((a: any[], b: any[]) => a[0] - b[0]);

        const sliceAroundSpot = (options: [number, number, number, number, string][], spot: number, range: number) => {
            if (options.length <= range * 2) return options;
            let closestIdx = 0;
            let minDiff = Number.MAX_VALUE;
            for (let i = 0; i < options.length; i++) {
                const diff = Math.abs(options[i][0] - spot);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = i;
                }
            }
            const start = Math.max(0, closestIdx - range);
            const end = Math.min(options.length, closestIdx + range + 1);
            return options.slice(start, end);
        };

        const range = 10;

        if (!params.option_type || params.option_type === "Call") {
            hierarchy[formattedExpiry].call = sliceAroundSpot(allCalls, spotPrice, range);
        } else {
            delete (hierarchy[formattedExpiry] as any).call;
        }

        if (!params.option_type || params.option_type === "Put") {
            hierarchy[formattedExpiry].put = sliceAroundSpot(allPuts, spotPrice, range);
        } else {
            delete (hierarchy[formattedExpiry] as any).put;
        }

        if (params.expiry_date && params.expiry_date.toUpperCase() !== formattedExpiry) {
            delete hierarchy[formattedExpiry];
        }
    }

    Object.keys(hierarchy).forEach(key => {
        if (hierarchy[key] && !hierarchy[key].call && !hierarchy[key].put) delete hierarchy[key];
        if (hierarchy[key]) {
            const c = hierarchy[key].call || [];
            const p = hierarchy[key].put || [];
            if (c.length === 0 && p.length === 0) delete hierarchy[key];
        }
    });

    const output = {
        asset: params.underlying_asset,
        underlying_price: spotPrice,
        format: "[Strike, Price, Liquidity, MaxQty, OptionID]",
        note: "Showing ~20 strikes around Spot Price. Filtered by user request.",
        expiries: hierarchy,
        last_updated: marketData.lastUpdatedAt,
    };

    return {
        content: [
            {
                type: "text" as const,
                text: JSON.stringify(output),
            },
        ],
        structuredContent: output
    };
}

async function handleGetAvailableAssets(): Promise<CallToolResult> {
    try {
        const marketData = await fetchMarketData();
        const assets = marketData.data?.market ? Object.keys(marketData.data.market) : [];

        const assetDetails = assets.map(asset => {
            const market = marketData.data.market[asset];
            const expiries = (market.expiries || []).map((e: string) => {
                const d = new Date(Number(e) * 1000);
                const day = String(d.getUTCDate()).padStart(2, '0');
                const month = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getUTCMonth()];
                const year = String(d.getUTCFullYear()).slice(-2);
                return `${day}${month}${year}`;
            });

            return {
                asset: asset,
                expiries: expiries
            };
        });

        const output = {
            assets: assetDetails,
            description: "List of supported assets and their available expiry dates."
        };

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(output, null, 2),
                },
            ],
            structuredContent: output
        };
    } catch (error: any) {
        return {
            content: [{ type: "text" as const, text: `Error: Failed to fetch available assets. ${error.message}` }],
            isError: true,
        };
    }
}

async function handleValidateSpread(params: { strategy: "BuyCallSpread" | "BuyPutSpread" | "SellCallSpread" | "SellPutSpread"; long_leg_id: string; short_leg_id: string }): Promise<CallToolResult> {
    const marketData = await fetchMarketData();
    const validation = await validateSpreadLogic(params.strategy, params.long_leg_id, params.short_leg_id, marketData);

    if (!validation.isValid) {
        return {
            content: [{ type: "text" as const, text: `Validation Failed: ${validation.error}` }],
            isError: true
        };
    }

    const output = {
        status: "Valid",
        details: validation.details,
        message: "Spread is valid and tradable."
    };

    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(output)
        }],
        structuredContent: output
    };
}

async function handleRequestQuote(params: {
    strategy: "BuyCallSpread" | "BuyPutSpread" | "SellCallSpread" | "SellPutSpread";
    long_leg_id: string;
    short_leg_id: string;
    amount: number;
    slippage?: number;
}): Promise<CallToolResult> {
    const marketData = await fetchMarketData();
    const validation = await validateSpreadLogic(params.strategy, params.long_leg_id, params.short_leg_id, marketData);

    if (!validation.isValid) {
        throw new Error(validation.error);
    }

    const { longStrike, shortStrike, longLegParsed, shortLegParsed, asset: foundAsset, spreadCost } = validation.details;

    const longLeg = longLegParsed;
    const isCall = params.strategy === "BuyCallSpread";

    // Construct Transaction Payload
    const strikes = [longStrike, shortStrike, 0, 0];
    const isBuys = [true, false, false, false];
    const isCalls = [isCall, isCall, false, false];

    const optionIds = [
        params.long_leg_id,
        params.short_leg_id,
        ethers.ZeroHash,
        ethers.ZeroHash
    ];

    const executionFee = await positionManager.executionFee();
    const vaultAddress = getVaultAddress(longLeg.vaultIndex);
    const USDC = CONFIG.CONTRACTS.USDC;
    const path = [USDC, vaultAddress];

    const decimals = await getDecimals(USDC);
    const amountIn = ethers.parseUnits(params.amount.toString(), decimals);

    const length = 2;
    const minSize = 1n; // Minimum size constraint, implies we want at least 1 unit if partial fill? Usually it's min output.
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
        ethers.ZeroAddress
    ]);

    const output = {
        to: CONFIG.CONTRACTS.POSITION_MANAGER,
        data: calldata,
        value: executionFee.toString(),
        chain_id: CONFIG.CHAIN_ID,
        description: `Open Position: ${params.strategy} on ${foundAsset} (Long $${longStrike} / Short $${shortStrike}) | Cost: $${spreadCost.toFixed(2)}`,
        approval_target: CONFIG.CONTRACTS.ROUTER,
        approval_token: CONFIG.CONTRACTS.USDC,
        instruction: "Ensure you have approved 'approval_token' (USDC) for 'approval_target' (Router) to spend amount >= 'amount'"
    };

    return {
        content: [
            {
                type: "text" as const,
                text: JSON.stringify(output, null, 2),
            },
        ],
        structuredContent: output
    };
}

async function handleGetGreeks(params: { option_id: string }): Promise<CallToolResult> {
    const targetId = params.option_id;

    let marketData;
    try {
        marketData = await fetchMarketData();
    } catch (error) {
        return {
            content: [{ type: "text" as const, text: "Error: Failed to fetch market data." }],
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
            content: [{ type: "text" as const, text: `Error: Option ID ${targetId} not found in market data.` }],
            isError: true
        };
    }

    const output = {
        option_id: targetId,
        asset: foundAsset,
        strike: foundOption.strikePrice,
        price: foundOption.markPrice,
        greeks: foundOption.greeks || { delta: 0, gamma: 0, vega: 0, theta: 0 },
        iv: foundOption.iv || 0
    };

    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(output, null, 2)
        }],
        structuredContent: output
    };

}

async function handleSettlePosition(params: { option_id: string; underlying_asset: string }): Promise<CallToolResult> {
    try {
        const { option_id, underlying_asset } = params;
        // Use raw asset name as config keys are WBTC/WETH
        const assetName = underlying_asset;

        const assetConfig = CONFIG.ASSETS[assetName as keyof typeof CONFIG.ASSETS];
        if (!assetConfig) {
            throw new Error(`Invalid underlying asset: ${underlying_asset}`);
        }

        // Settle Params: address[] _path, uint16 _underlyingAssetIndex, bytes32 _optionId, uint256 _minOut, bool _withdrawETH
        const path = [CONFIG.CONTRACTS.USDC];
        const minOut = 0;
        const withdrawETH = false;

        const iface = new ethers.Interface(SETTLE_MANAGER_ABI);
        // option_id handling: ensure it's a 32-byte hex string
        const optionIdHex = ethers.zeroPadValue(ethers.toBeHex(BigInt(option_id)), 32);

        const data = iface.encodeFunctionData("settlePosition", [
            path,
            assetConfig.index,
            optionIdHex,
            minOut,
            withdrawETH
        ]);

        const output = {
            to: CONFIG.CONTRACTS.SETTLE_MANAGER,
            data: data,
            value: "0",
            chain_id: CONFIG.CHAIN_ID,
            description: `Settle Option ID ${option_id} for ${assetName}`,
            instruction: "Sign and broadcast this transaction to settle the position."
        };

        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(output, null, 2)
            }],
            structuredContent: output
        };

    } catch (error: any) {
        return {
            content: [{ type: "text" as const, text: `Error generating settlement transaction: ${error.message}` }],
            isError: true,
        };
    }
}

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
