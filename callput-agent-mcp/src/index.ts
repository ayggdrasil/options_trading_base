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

type OptionSide = {
    optionId: string;
    strikePrice: number;
    markPrice?: number;
    markIv?: number;
    iv?: number;
    delta?: number;
    gamma?: number;
    vega?: number;
    theta?: number;
    greeks?: {
        delta?: number;
        gamma?: number;
        vega?: number;
        theta?: number;
    };
    isOptionAvailable?: boolean;
};

type AssetMarket = {
    expiries?: string[];
    options?: Record<string, { call?: OptionSide[]; put?: OptionSide[] }>;
};

type MarketDataPayload = {
    data?: {
        market?: Record<string, AssetMarket>;
    };
    lastUpdatedAt?: string;
};

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

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
        isCall[i] = ((optionTokenId >> (146n - BigInt(i * 48))) & 0x1n) !== 0n; // 1 = Call
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
const DEFAULT_EXECUTION_FEE = 60000000000000n;
const warnedKeys = new Set<string>();

// Cache for decimals to avoid repeated calls
const decimalsCache: Record<string, number> = {};

async function getDecimals(tokenAddress: string): Promise<number> {
    const cacheKey = tokenAddress.toLowerCase();
    if (decimalsCache[cacheKey] !== undefined) return decimalsCache[cacheKey];

    // Hardcode known tokens to prevent RPC rate-limit issues causing fallback to 18
    if (cacheKey === CONFIG.CONTRACTS.USDC.toLowerCase()) {
        decimalsCache[cacheKey] = 6;
        return 6;
    }

    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    try {
        const decimals = await contract.decimals();
        decimalsCache[cacheKey] = Number(decimals);
        return Number(decimals);
    } catch (e) {
        console.error(`Failed to fetch decimals for ${tokenAddress}`, e);
        return 18; // Default
    }
}

function formatExpiry(expiryUnix: number): string {
    const expiryDate = new Date(expiryUnix * 1000);
    const day = String(expiryDate.getUTCDate()).padStart(2, "0");
    const month = MONTH_NAMES[expiryDate.getUTCMonth()];
    const year = String(expiryDate.getUTCFullYear()).slice(-2);
    return `${day}${month}${year}`;
}

function normalizeMarketAsset(asset: string): "BTC" | "ETH" | null {
    const normalized = asset.trim().toUpperCase();
    if (normalized === "BTC" || normalized === "WBTC") return "BTC";
    if (normalized === "ETH" || normalized === "WETH") return "ETH";
    return null;
}

function parseBigIntInput(raw: string, fieldName: string): bigint {
    const value = raw?.trim();
    if (!value) throw new Error(`${fieldName} is required.`);
    try {
        return BigInt(value);
    } catch {
        throw new Error(`Invalid ${fieldName}: ${raw}`);
    }
}

function parsePositiveBigIntInput(raw: string, fieldName: string): bigint {
    const value = parseBigIntInput(raw, fieldName);
    if (value <= 0n) throw new Error(`${fieldName} must be greater than 0.`);
    return value;
}

function ensureValidAddress(address: string, fieldName: string): void {
    if (!ethers.isAddress(address)) {
        throw new Error(`Invalid ${fieldName}: ${address}`);
    }
}

function ensureValidTxHash(txHash: string): void {
    if (!ethers.isHexString(txHash, 32)) {
        throw new Error(`Invalid tx_hash format: ${txHash}`);
    }
}

function isMarketDataPayload(data: unknown): data is MarketDataPayload {
    if (!data || typeof data !== "object") return false;
    const root = data as MarketDataPayload;
    return Boolean(root.data?.market && typeof root.data.market === "object");
}

function makeToolSuccess<T extends { [key: string]: unknown }>(payload: T, pretty = false): CallToolResult {
    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(payload, null, pretty ? 2 : 0),
        }],
        structuredContent: payload
    };
}

function makeToolError(message: string): CallToolResult {
    return {
        content: [{ type: "text" as const, text: message }],
        isError: true
    };
}

function warnOnce(key: string, message: string): void {
    if (process.env.CALLPUT_VERBOSE_WARNINGS === "1") {
        console.warn(message);
        return;
    }
    if (warnedKeys.has(key)) return;
    warnedKeys.add(key);
    console.warn(message);
}

async function getExecutionFeeWithFallback(): Promise<bigint> {
    try {
        return await positionManager.executionFee();
    } catch (e) {
        // Public RPCs often rate-limit eth_call; fallback keeps tx generation available.
        const message = e instanceof Error ? e.message : String(e);
        warnOnce("execution_fee_fallback", `Failed to fetch executionFee; using fallback (${message})`);
        return DEFAULT_EXECUTION_FEE;
    }
}

// Register Tools
server.registerTool(
    "callput_get_agent_bootstrap",
    {
        description: "Return a compact trading playbook for external agents with no prior context. Includes strict rules, minimal state template, and low-context execution sequence.",
        inputSchema: z.object({})
    },
    async () => {
        return await handleGetAgentBootstrap();
    }
);

server.registerTool(
    "callput_get_option_chains",
    {
        description: "Retrieve available vanilla option chains (Call/Put) from the Callput protocol. NOTE: These individual options are NOT tradable directly. You must combine a Long Leg and a Short Leg to create a Spread (Call Spread or Put Spread) using `callput_request_quote`.",
        inputSchema: {
            underlying_asset: z.string().describe("The underlying asset symbol (e.g., 'BTC' or 'ETH'). Legacy aliases 'WBTC'/'WETH' are accepted."),
            expiry_date: z.string().optional().describe("Filter by Expiry Date in format DDMMMYY (e.g., '14FEB26'). Returns all if omitted."),
            option_type: z.enum(["Call", "Put"]).optional().describe("Filter by Option Type. Returns both if omitted."),
            max_expiries: z.number().int().min(1).max(10).optional().describe("Optional compact mode. Limit number of expiries returned when expiry_date is omitted."),
            max_strikes_per_side: z.number().int().min(2).max(20).optional().describe("Optional compact mode. Number of strikes to keep on each side of spot per option side.")
        }
    },
    async (args) => {
        return await handleGetOptionChains(args);
    }
);

// Legacy aliases kept for backward compatibility with older clients.
server.registerTool(
    "get_option_chains",
    {
        description: "Legacy alias of callput_get_option_chains.",
        inputSchema: {
            underlying_asset: z.string().describe("The underlying asset symbol (e.g., 'BTC' or 'ETH'). Legacy aliases 'WBTC'/'WETH' are accepted."),
            expiry_date: z.string().optional().describe("Filter by Expiry Date in format DDMMMYY (e.g., '14FEB26'). Returns all if omitted."),
            option_type: z.enum(["Call", "Put"]).optional().describe("Filter by Option Type. Returns both if omitted."),
            max_expiries: z.number().int().min(1).max(10).optional().describe("Optional compact mode. Limit number of expiries returned when expiry_date is omitted."),
            max_strikes_per_side: z.number().int().min(2).max(20).optional().describe("Optional compact mode. Number of strikes to keep on each side of spot per option side.")
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
    "get_available_assets",
    {
        description: "Legacy alias of callput_get_available_assets.",
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
    "validate_spread",
    {
        description: "Legacy alias of callput_validate_spread.",
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
            slippage: z.number().min(0).max(100).optional().default(0.5).describe("Slippage tolerance percentage used to derive on-chain minSize protection.")
        }
    },
    async (args) => {
        return await handleRequestQuote(args);
    }
);

server.registerTool(
    "request_quote",
    {
        description: "Legacy alias of callput_request_quote.",
        inputSchema: {
            strategy: z.enum(["BuyCallSpread", "BuyPutSpread", "SellCallSpread", "SellPutSpread"]).describe("The strategy to execute. Currently only Call/Put Spreads are supported."),
            long_leg_id: z.string().describe("The Option Token ID for the Long Leg (Buy)."),
            short_leg_id: z.string().describe("The Option Token ID for the Short Leg (Sell)."),
            amount: z.number().positive().describe("The amount of USDC to spend (Premium)."),
            slippage: z.number().min(0).max(100).optional().default(0.5).describe("Slippage tolerance percentage used to derive on-chain minSize protection.")
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
    "get_greeks",
    {
        description: "Legacy alias of callput_get_greeks.",
        inputSchema: {
            option_id: z.string().describe("The Option Token ID to look up.")
        }
    },
    async (args) => {
        return await handleGetGreeks(args);
    }
);

server.registerTool(
    "callput_get_my_positions",
    {
        description: "Fetch current open option positions and PnL for a given wallet address.",
        inputSchema: {
            address: z.string().describe("The wallet address to fetch positions for.")
        }
    },
    async (args) => {
        return await handleGetMyPositions(args as { address: string });
    }
);

server.registerTool(
    "callput_close_position",
    {
        description: "Generate a transaction payload to close (exit) an open option position.",
        inputSchema: {
            address: z.string().describe("User's wallet address."),
            option_token_id: z.string().describe("The Option Token ID to close."),
            size: z.string().describe("The amount of the position to close (as a string)."),
            underlying_asset: z.string().describe("The underlying asset (e.g., 'BTC' or 'ETH'). Legacy aliases 'WBTC'/'WETH' are accepted.")
        }
    },
    async (args) => {
        return await handleClosePosition(args as { address: string; option_token_id: string; size: string; underlying_asset: string });
    }
);

server.registerTool(
    "callput_get_market_trends",
    {
        description: "Provide a high-level summary of current market trends, including BTC/ETH prices and IV levels.",
        inputSchema: z.object({})
    },
    async () => {
        return await handleGetMarketTrends();
    }
);

server.registerTool(
    "callput_approve_usdc",
    {
        description: "Generate a transaction to approve USDC spending for the Router contract. This MUST be done before any trade.",
        inputSchema: {
            amount: z.string().describe("Amount of USDC to approve (in human-readable units, e.g. '100' for $100). Use '115792089237316195423570985008687907853269984665640564039457584007913129639935' for max approval.")
        }
    },
    async (args) => {
        return await handleApproveUsdc(args as { amount: string });
    }
);

server.registerTool(
    "callput_check_tx_status",
    {
        description: "Check the execution status of a trade transaction. Parses GenerateRequestKey event from the tx receipt, then polls openPositionRequests/closePositionRequests to check if Pending/Executed/Cancelled.",
        inputSchema: {
            tx_hash: z.string().describe("The transaction hash to check."),
            is_open: z.boolean().optional().default(true).describe("True for open position trades, false for close position trades.")
        }
    },
    async (args) => {
        return await handleCheckTxStatus(args as { tx_hash: string; is_open: boolean });
    }
);

server.registerTool(
    "callput_settle_position",
    {
        description: "Settle (close) an expired option position. Returns a transaction to sign.",
        inputSchema: {
            option_id: z.string().describe("The Option ID (BigInt string) to settle"),
            underlying_asset: z.string().describe("The underlying asset (e.g., 'BTC' or 'ETH'). Legacy aliases 'WBTC'/'WETH' are accepted.")
        }
    },
    async (args) => {
        // Validation handled inside
        return await handleSettlePosition(args as { option_id: string; underlying_asset: string });
    }
);

// Helper to fetch S3 Data
async function fetchMarketData(): Promise<MarketDataPayload> {
    const S3_URL = "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json";
    const response = await fetch(S3_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

function getRequestStatusFlags(requestData: any): { status: "pending" | "cancelled" | "executed"; isExecuted: boolean; isCancelled: boolean } {
    if (requestData && requestData.status !== undefined && requestData.status !== null) {
        const enumStatus = Number(requestData.status);
        if (enumStatus === 2) return { status: "executed", isExecuted: true, isCancelled: false };
        if (enumStatus === 1) return { status: "cancelled", isExecuted: false, isCancelled: true };
        return { status: "pending", isExecuted: false, isCancelled: false };
    }

    const isExecuted = Boolean(requestData?.isExecuted);
    const isCancelled = Boolean(requestData?.isCancelled);
    if (isExecuted) return { status: "executed", isExecuted: true, isCancelled: false };
    if (isCancelled) return { status: "cancelled", isExecuted: false, isCancelled: true };
    return { status: "pending", isExecuted: false, isCancelled: false };
}

function optionTokenIdToString(optionTokenId: unknown): string {
    if (typeof optionTokenId === "bigint") return optionTokenId.toString();
    if (typeof optionTokenId === "number") return String(optionTokenId);
    if (typeof optionTokenId === "string") {
        if (optionTokenId.startsWith("0x")) {
            try {
                return BigInt(optionTokenId).toString();
            } catch {
                return optionTokenId;
            }
        }
        return optionTokenId;
    }
    return String(optionTokenId ?? "");
}

function normalizeUnderlyingAsset(asset: string): "WBTC" | "WETH" | null {
    const normalized = asset.trim().toUpperCase();
    if (normalized === "BTC" || normalized === "WBTC") return "WBTC";
    if (normalized === "ETH" || normalized === "WETH") return "WETH";
    return null;
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
    if (denominator <= 0n) throw new Error("Invalid denominator for ceilDiv");
    return (numerator + denominator - 1n) / denominator;
}

function buildBootstrapPayload() {
    return {
        version: "1.0.0",
        objective: "Trade Callput spreads safely with minimal context.",
        mandatory_sequence: [
            "callput_get_agent_bootstrap",
            "callput_get_available_assets",
            "callput_get_market_trends",
            "callput_get_option_chains",
            "callput_validate_spread",
            "callput_approve_usdc",
            "callput_request_quote",
            "callput_check_tx_status"
        ],
        hard_rules: [
            "Never trade a single vanilla leg directly.",
            "Always validate spread before requesting quote.",
            "Execute only when validation status is Valid and maxTradableQuantity > 0.",
            "If tx status is cancelled, refresh legs and re-validate before re-quote.",
            "Use close before expiry; use settle after expiry."
        ],
        compact_query_defaults: {
            max_expiries: 1,
            max_strikes_per_side: 6
        },
        context_budget: {
            max_candidates: 5,
            max_greeks_calls: 6,
            max_validations: 5,
            max_chain_fetches: 1,
            max_quote_calls: 1,
            keep_state_fields: [
                "asset",
                "bias",
                "target_expiry",
                "selected_long_leg_id",
                "selected_short_leg_id",
                "validation_status",
                "maxTradableQuantity",
                "tx_hash",
                "tx_status"
            ]
        },
        quick_commands: [
            "Analyze ETH bearish, find one valid put spread, execute with checks.",
            "Check positions, close pre-expiry, settle expired."
        ]
    } as const;
}

// Helper for Validation
async function validateSpreadLogic(
    strategy: string,
    longLegId: string,
    shortLegId: string,
    marketData: unknown
): Promise<{ isValid: boolean; error?: string; details?: any }> {

    let longLegParsed: ParsedOption | null = null;
    let shortLegParsed: ParsedOption | null = null;
    let longMetric: any = null;
    let shortMetric: any = null;
    let foundAsset = "";

    const supportedStrategies = new Set(["BuyCallSpread", "BuyPutSpread", "SellCallSpread", "SellPutSpread"]);
    if (!supportedStrategies.has(strategy)) {
        return { isValid: false, error: `Unsupported strategy: ${strategy}` };
    }

    if (longLegId === shortLegId) {
        return { isValid: false, error: "long_leg_id and short_leg_id must be different option IDs." };
    }

    if (!isMarketDataPayload(marketData)) {
        return { isValid: false, error: "Invalid market data response. Please retry." };
    }

    const expectedOptionType = strategy.includes("Call") ? "call" : "put";
    const assets = Object.keys(marketData.data!.market!);
    for (const asset of assets) {
        const market = marketData.data!.market![asset];
        for (const expiry of market.expiries || []) {
            const opts = market.options?.[expiry];
            if (!opts) continue;

            const legs = expectedOptionType === "call" ? (opts.call || []) : (opts.put || []);
            for (const leg of legs) {
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

    if (!longMetric.isOptionAvailable || !shortMetric.isOptionAvailable) {
        return {
            isValid: false,
            error: "One or both legs are currently unavailable. Refresh chain data and select new legs."
        };
    }

    // 2. Validate Consistency
    if (longLegParsed.underlyingAssetIndex !== shortLegParsed.underlyingAssetIndex) {
        return { isValid: false, error: "Legs must belong to the same underlying asset." };
    }
    // Expiry check
    if (longLegParsed.expiry !== shortLegParsed.expiry) {
        return { isValid: false, error: "Legs must have the same expiry." };
    }

    // 3. Validate Prices & Spread
    const longPrice = Number(longMetric.markPrice ?? 0);
    const shortPrice = Number(shortMetric.markPrice ?? 0);

    if (!Number.isFinite(longPrice) || !Number.isFinite(shortPrice)) {
        return { isValid: false, error: "Invalid pricing data for selected legs." };
    }

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
    // Use market-data strike values for user-facing output and direction checks.
    const longStrike = Number(longMetric.strikePrice);
    const shortStrike = Number(shortMetric.strikePrice);
    const isCallSpread = strategy.includes("Call");

    if (isCallSpread) {
        if (longStrike >= shortStrike) {
            return { isValid: false, error: `For Call Spread, Long Strike ($${longStrike}) must be < Short Strike ($${shortStrike}) (Buy Low, Sell High)` };
        }
    } else { // Put Spread
        if (longStrike <= shortStrike) {
            return { isValid: false, error: `For Bear Put Spread, Long Strike ($${longStrike}) must be > Short Strike ($${shortStrike}) (Buy High, Sell Low)` };
        }
    }

    // --- Calculate Available Quantity based on Vault Liquidity ---
    let maxTradableQuantity = 0;
    try {
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
        // Keep validation usable even when public RPC eth_call is flaky.
        // We intentionally mirror get_option_chains fallback behavior for consistency.
        const message = e instanceof Error ? e.message : String(e);
        warnOnce("max_qty_fallback", `Failed to calculate max quantity via RPC (${message}). Using fallback liquidity.`);

        let unitRequirement = 0;
        if (strategy.startsWith("Buy")) {
            const strikeDiff = Math.abs(longStrike - shortStrike);
            unitRequirement = strikeDiff;
        } else if (strategy.startsWith("Sell")) {
            unitRequirement = Math.abs(spreadCost);
        }

        const fallbackVaultBalance = 5000; // USDC
        if (unitRequirement > 0) {
            maxTradableQuantity = Math.floor(fallbackVaultBalance / unitRequirement);
        } else {
            maxTradableQuantity = 0;
        }
    }

    if (maxTradableQuantity <= 0) {
        return {
            isValid: false,
            error: "No executable liquidity for this spread right now (maxTradableQuantity=0). Select different legs or reduce risk.",
            details: {
                asset: foundAsset,
                spreadCost,
                longStrike,
                shortStrike,
                maxTradableQuantity
            }
        };
    }

    return {
        isValid: true,
        details: {
            asset: foundAsset,
            spreadCost: spreadCost,
            longStrike: longStrike,
            shortStrike: shortStrike,
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
        default: throw new Error(`Invalid vault index: ${index}`);
    }
};

async function handleGetAgentBootstrap(): Promise<CallToolResult> {
    return makeToolSuccess(buildBootstrapPayload(), true);
}

async function handleGetOptionChains(params: {
    underlying_asset: string;
    expiry_date?: string;
    option_type?: "Call" | "Put";
    max_expiries?: number;
    max_strikes_per_side?: number;
}): Promise<CallToolResult> {
    // 1. Validate Asset
    const assetName = normalizeMarketAsset(params.underlying_asset);
    const requestedExpiry = params.expiry_date?.trim().toUpperCase();
    const maxExpiries = Math.max(1, Math.min(10, params.max_expiries ?? 10));
    const strikeRange = Math.max(2, Math.min(20, params.max_strikes_per_side ?? 10));

    if (!assetName) {
        return makeToolError(`Error: Unsupported asset ${params.underlying_asset}. Only BTC and ETH are supported.`);
    }

    // 2. Fetch Market Data from S3
    let marketData;
    try {
        marketData = await fetchMarketData();
    } catch (error) {
        return makeToolError("Error: Failed to fetch market data from S3.");
    }

    if (!isMarketDataPayload(marketData) || !marketData.data?.market?.[assetName]) {
        return makeToolError(`Error: No market data found for ${assetName} in S3.`);
    }

    const assetMarket = marketData.data!.market![assetName];

    // Estimate Spot Price using Deep ITM Call
    let spotPrice = 0;
    if (assetMarket.expiries && assetMarket.expiries.length > 0) {
        const firstExpiry = assetMarket.expiries[0];
        const calls = assetMarket.options?.[firstExpiry]?.call || [];
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
    const vaultABI = [
        "function poolAmounts(address token) external view returns (uint256)",
        "function reservedAmounts(address token) external view returns (uint256)"
    ];

    const vaultBalances: number[] = [0, 0, 0]; // S, M, L

    try {
        const vaultAddrs = [CONFIG.CONTRACTS.S_VAULT, CONFIG.CONTRACTS.M_VAULT, CONFIG.CONTRACTS.L_VAULT];
        const vaultContracts = vaultAddrs.map(addr => new ethers.Contract(addr, vaultABI, provider));
        const usdcAddr = CONFIG.CONTRACTS.USDC;
        const fallbackVaultBalance = ethers.parseUnits("5000", 6);

        const results = await Promise.all(vaultContracts.map(async (v) => {
            try {
                const [pool, reserved] = await Promise.all([
                    v.poolAmounts(usdcAddr),
                    v.reservedAmounts(usdcAddr)
                ]);
                const avail = pool - reserved;
                return avail > 0n ? avail : 0n;
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                warnOnce("vault_balance_fallback", `Failed to fetch vault balance; using fallback (${message})`);
                return fallbackVaultBalance;
            }
        }));

        vaultBalances[0] = Number(ethers.formatUnits(results[0], 6));
        vaultBalances[1] = Number(ethers.formatUnits(results[1], 6));
        vaultBalances[2] = Number(ethers.formatUnits(results[2], 6));

    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        warnOnce("vault_balances_batch_fallback", `Failed to fetch vault balances; using fallback (${message})`);
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
        const expiryOptions = assetMarket.options?.[expiry];
        if (!expiryOptions) continue;

        const formattedExpiry = formatExpiry(Number(expiry));

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

        const range = strikeRange;

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

        if (requestedExpiry && requestedExpiry !== formattedExpiry) {
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

    if (requestedExpiry && !hierarchy[requestedExpiry]) {
        const availableExpiries = (assetMarket.expiries || []).map((e) => formatExpiry(Number(e)));
        return makeToolError(`Error: Expiry ${requestedExpiry} not found for ${assetName}. Available expiries: ${availableExpiries.join(", ")}`);
    }

    if (!requestedExpiry) {
        const limitedExpiryKeys = Object.entries(hierarchy)
            .sort((a, b) => a[1].days - b[1].days)
            .slice(0, maxExpiries)
            .map(([key]) => key);
        const limitedHierarchy: typeof hierarchy = {};
        for (const key of limitedExpiryKeys) {
            limitedHierarchy[key] = hierarchy[key];
        }
        Object.keys(hierarchy).forEach((key) => {
            if (!limitedHierarchy[key]) delete hierarchy[key];
        });
    }

    const output = {
        asset: assetName,
        underlying_price: spotPrice,
        format: "[Strike, Price, Liquidity, MaxQty, OptionID]",
        note: "Showing compact strikes around spot. Use max_expiries/max_strikes_per_side for tighter context control.",
        expiries: hierarchy,
        last_updated: marketData.lastUpdatedAt ?? null,
    };

    return makeToolSuccess(output);
}

async function handleGetAvailableAssets(): Promise<CallToolResult> {
    try {
        const marketData = await fetchMarketData();
        if (!isMarketDataPayload(marketData)) {
            throw new Error("Invalid market data response.");
        }
        const assets = Object.keys(marketData.data!.market!);

        const assetDetails = assets.map(asset => {
            const market = marketData.data!.market![asset];
            const expiries = (market.expiries || []).map((e: string) => formatExpiry(Number(e)));

            return {
                asset: asset,
                expiries: expiries
            };
        });

        const output = {
            assets: assetDetails,
            description: "List of supported assets and their available expiry dates."
        };

        return makeToolSuccess(output, true);
    } catch (error: any) {
        return makeToolError(`Error: Failed to fetch available assets. ${error.message}`);
    }
}

async function handleValidateSpread(params: { strategy: "BuyCallSpread" | "BuyPutSpread" | "SellCallSpread" | "SellPutSpread"; long_leg_id: string; short_leg_id: string }): Promise<CallToolResult> {
    try {
        const marketData = await fetchMarketData();
        const validation = await validateSpreadLogic(params.strategy, params.long_leg_id, params.short_leg_id, marketData);

        if (!validation.isValid) {
            return makeToolError(`Validation Failed: ${validation.error}`);
        }

        const d = validation.details;
        const output = {
            status: "Valid",
            details: {
                asset: d.asset,
                spreadCost: d.spreadCost,
                longStrike: d.longStrike,
                shortStrike: d.shortStrike,
                longPrice: d.longPrice,
                shortPrice: d.shortPrice,
                expiry: d.expiry,
                maxTradableQuantity: d.maxTradableQuantity
            },
            message: "Spread is valid and tradable."
        };

        return makeToolSuccess(output);
    } catch (error: any) {
        return makeToolError(`Error validating spread: ${error.message}`);
    }
}

async function handleRequestQuote(params: {
    strategy: "BuyCallSpread" | "BuyPutSpread" | "SellCallSpread" | "SellPutSpread";
    long_leg_id: string;
    short_leg_id: string;
    amount: number;
    slippage?: number;
}): Promise<CallToolResult> {
    try {
        const marketData = await fetchMarketData();
        const validation = await validateSpreadLogic(params.strategy, params.long_leg_id, params.short_leg_id, marketData);

        if (!validation.isValid) {
            return makeToolError(`Validation Failed: ${validation.error}`);
        }

        const { longStrike, shortStrike, longLegParsed, asset: foundAsset, spreadCost } = validation.details;

        const longLeg = longLegParsed;
        const slippagePct = params.slippage ?? 0.5;
        const normalizedUnderlying = normalizeUnderlyingAsset(foundAsset);
        if (!normalizedUnderlying) {
            throw new Error(`Unsupported validated asset: ${foundAsset}`);
        }
        const underlyingConfig = CONFIG.ASSETS[normalizedUnderlying];
        const underlyingDecimals = underlyingConfig.decimals;

        // Determine direction and type from strategy
        const isCall = params.strategy === "BuyCallSpread" || params.strategy === "SellCallSpread";
        const isBuy = params.strategy === "BuyCallSpread" || params.strategy === "BuyPutSpread";

        // Construct Transaction Payload (matching frontend getIsBuys/getIsCalls)
        const isBuys: [boolean, boolean, boolean, boolean] = [isBuy, !isBuy, false, false];
        const isCalls: [boolean, boolean, boolean, boolean] = [isCall, isCall, false, false];

        // Option IDs must be bytes32-padded
        const optionIds: [string, string, string, string] = [
            ethers.zeroPadValue(ethers.toBeHex(BigInt(params.long_leg_id)), 32),
            ethers.zeroPadValue(ethers.toBeHex(BigInt(params.short_leg_id)), 32),
            ethers.ZeroHash,
            ethers.ZeroHash
        ];

        const executionFee = await getExecutionFeeWithFallback();
        const USDC = CONFIG.CONTRACTS.USDC;
        // Path: single element [USDC] for USDC-denominated trades (matching frontend)
        const path = [USDC];

        const decimals = await getDecimals(USDC);
        const amountIn = ethers.parseUnits(params.amount.toString(), decimals);
        const spreadCostMicro = Math.max(1, Math.round(spreadCost * 1_000_000));
        const expectedSizeRaw = (amountIn * (10n ** BigInt(underlyingDecimals))) / BigInt(spreadCostMicro);
        if (expectedSizeRaw <= 0n) {
            throw new Error("Amount is too small for current spread price. Increase amount or choose tighter strikes.");
        }
        const slippageBps = Math.max(0, Math.min(10_000, Math.round(slippagePct * 100)));

        const length = 2;
        const minSize = slippageBps >= 10_000
            ? 0n
            : ceilDiv(expectedSizeRaw * BigInt(10_000 - slippageBps), 10_000n);
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
            slippage_pct: slippagePct,
            expected_size: ethers.formatUnits(expectedSizeRaw, underlyingDecimals),
            min_size: ethers.formatUnits(minSize, underlyingDecimals),
            expected_size_raw: expectedSizeRaw.toString(),
            min_size_raw: minSize.toString(),
            approval_target: CONFIG.CONTRACTS.ROUTER,
            approval_token: CONFIG.CONTRACTS.USDC,
            instruction: "Ensure you have approved 'approval_token' (USDC) for 'approval_target' (Router) to spend amount >= 'amount'."
        };

        return makeToolSuccess(output, true);
    } catch (error: any) {
        return makeToolError(`Error generating quote: ${error.message}`);
    }
}

async function handleGetGreeks(params: { option_id: string }): Promise<CallToolResult> {
    const targetId = params.option_id;

    let marketData;
    try {
        marketData = await fetchMarketData();
    } catch (error) {
        return makeToolError("Error: Failed to fetch market data.");
    }

    if (!isMarketDataPayload(marketData)) {
        return makeToolError("Error: Invalid market data response.");
    }

    let foundOption: any = null;
    let foundAsset = "";

    for (const asset of Object.keys(marketData.data!.market!)) {
        const market = marketData.data!.market![asset];
        for (const expiry of market.expiries || []) {
            const opts = market.options?.[expiry];
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

    if (!foundOption) {
        return makeToolError(`Error: Option ID ${targetId} not found in market data.`);
    }

    const output = {
        option_id: targetId,
        asset: foundAsset,
        strike: foundOption.strikePrice,
        price: foundOption.markPrice,
        greeks: {
            delta: foundOption.delta ?? foundOption.greeks?.delta ?? 0,
            gamma: foundOption.gamma ?? foundOption.greeks?.gamma ?? 0,
            vega: foundOption.vega ?? foundOption.greeks?.vega ?? 0,
            theta: foundOption.theta ?? foundOption.greeks?.theta ?? 0
        },
        iv: foundOption.markIv ?? foundOption.iv ?? 0
    };

    return makeToolSuccess(output, true);

}

async function handleSettlePosition(params: { option_id: string; underlying_asset: string }): Promise<CallToolResult> {
    try {
        const { option_id, underlying_asset } = params;
        const optionTokenId = parseBigIntInput(option_id, "option_id");
        const normalizedAsset = normalizeUnderlyingAsset(underlying_asset);
        if (!normalizedAsset) {
            throw new Error(`Invalid underlying asset: ${underlying_asset}`);
        }
        const assetName = normalizedAsset;
        const assetConfig = CONFIG.ASSETS[assetName];
        const parsed = parseOptionTokenId(optionTokenId);
        if (parsed.underlyingAssetIndex !== assetConfig.index) {
            throw new Error(`Underlying asset mismatch. Option belongs to asset index ${parsed.underlyingAssetIndex}, but ${assetName} was provided.`);
        }
        const now = Math.floor(Date.now() / 1000);
        if (now < parsed.expiry) {
            const expiryIso = new Date(parsed.expiry * 1000).toISOString();
            throw new Error(`Option is not expired yet (${expiryIso}). Use callput_close_position before expiry.`);
        }

        // Settle Params: address[] _path, uint16 _underlyingAssetIndex, uint256 _optionTokenId, uint256 _minOutWhenSwap, bool _withdrawNAT
        const path = [CONFIG.CONTRACTS.USDC];
        const minOutWhenSwap = 0n;
        const withdrawNAT = false;

        const iface = new ethers.Interface(SETTLE_MANAGER_ABI);

        const data = iface.encodeFunctionData("settlePosition", [
            path,
            assetConfig.index,
            optionTokenId,
            minOutWhenSwap,
            withdrawNAT
        ]);

        const output = {
            to: CONFIG.CONTRACTS.SETTLE_MANAGER,
            data: data,
            value: "0",
            chain_id: CONFIG.CHAIN_ID,
            description: `Settle Option ID ${option_id} for ${assetName}`,
            instruction: "Sign and broadcast this transaction to settle the position."
        };

        return makeToolSuccess(output, true);

    } catch (error: any) {
        return makeToolError(`Error generating settlement transaction: ${error.message}`);
    }
}

async function handleApproveUsdc(params: { amount: string }): Promise<CallToolResult> {
    try {
        const amount = params.amount?.trim();
        if (!amount) throw new Error("amount is required.");
        const iface = new ethers.Interface(ERC20_ABI);

        // If the amount looks like max uint256, use it raw. Otherwise parse as USDC (6 decimals).
        let approvalAmount: bigint;
        if (/^\d+$/.test(amount) && amount.length > 30) {
            approvalAmount = BigInt(amount);
        } else {
            approvalAmount = ethers.parseUnits(amount, 6);
        }
        if (approvalAmount <= 0n) {
            throw new Error("Approval amount must be greater than 0.");
        }

        const data = iface.encodeFunctionData("approve", [
            CONFIG.CONTRACTS.ROUTER,
            approvalAmount
        ]);

        const output = {
            status: "unsigned_transaction_generated",
            to: CONFIG.CONTRACTS.USDC,
            data: data,
            value: "0",
            chain_id: CONFIG.CHAIN_ID,
            description: `Approve USDC spending for Router (${CONFIG.CONTRACTS.ROUTER})`,
            instruction: "Sign this transaction BEFORE placing any trade. This allows the Router to pull USDC from your wallet."
        };

        return makeToolSuccess(output, true);
    } catch (error: any) {
        return makeToolError(`Error generating approval transaction: ${error.message}`);
    }
}

async function handleCheckTxStatus(params: { tx_hash: string; is_open: boolean }): Promise<CallToolResult> {
    try {
        const { tx_hash, is_open } = params;
        ensureValidTxHash(tx_hash);
        const generateRequestKeyTopic = ethers.id("GenerateRequestKey(address,bytes32,bool)");

        // 1. Get Transaction Receipt
        const receipt = await provider.getTransactionReceipt(tx_hash);
        if (!receipt) {
            return makeToolSuccess({ status: "not_found", message: "Transaction not found or not yet mined. Try again later." });
        }

        if (receipt.status === 0) {
            return makeToolError(JSON.stringify({ status: "reverted", message: "Transaction reverted on-chain. Check if USDC was approved and parameters were correct." }));
        }

        // 2. Parse GenerateRequestKey event from logs
        const iface = new ethers.Interface(POSITION_MANAGER_ABI);
        let requestKey: string | null = null;

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
                if (parsed && parsed.name === "GenerateRequestKey") {
                    requestKey = parsed.args.key;
                    break;
                }
            } catch {
                // Fallback for ABI variants where key/isOpen are indexed.
                if (log.topics?.[0] === generateRequestKeyTopic && log.topics.length >= 3) {
                    requestKey = log.topics[2];
                    break;
                }
            }
        }

        if (!requestKey) {
            return makeToolError(JSON.stringify({ status: "no_key", message: "Transaction succeeded but GenerateRequestKey event not found. This may not be a Callput position transaction." }));
        }

        // 3. Poll position request status
        let requestData: any;
        if (is_open) {
            requestData = await positionManager.openPositionRequests(requestKey);
        } else {
            requestData = await positionManager.closePositionRequests(requestKey);
        }

        const { status, isExecuted, isCancelled } = getRequestStatusFlags(requestData);

        const output: any = {
            status: status,
            request_key: requestKey,
            tx_hash: tx_hash,
            account: requestData.account,
            option_token_id: optionTokenIdToString(requestData.optionTokenId),
        };

        if (is_open && isExecuted) {
            if (requestData.amountIn !== undefined) output.amount_in = requestData.amountIn.toString();
            if (requestData.sizeOut !== undefined) output.size_out = requestData.sizeOut.toString();
            output.message = "Position opened successfully!";
        } else if (!is_open && isExecuted) {
            const closeSize = requestData.sizeDelta ?? requestData.size;
            if (closeSize !== undefined) output.size_delta = closeSize.toString();
            if (requestData.amountOut !== undefined) output.amount_out = requestData.amountOut.toString();
            output.message = "Position closed successfully!";
        } else if (isCancelled) {
            output.message = "Order was cancelled. This can happen due to price movement or insufficient liquidity. Funds are returned.";
        } else {
            output.message = "Order is pending execution by the keeper. Check again in ~30 seconds.";
        }

        return makeToolSuccess(output, true);
    } catch (error: any) {
        return makeToolError(`Error checking tx status: ${error.message}`);
    }
}

async function handleGetMyPositions(params: { address: string }): Promise<CallToolResult> {
    try {
        const { address } = params;
        ensureValidAddress(address, "address");
        const MY_POSITION_API = "https://4wfz19irck.execute-api.ap-southeast-1.amazonaws.com/default/app-lambda-base-prod-query?method=getMyPositions&address=";
        const response = await fetch(MY_POSITION_API + address);
        if (!response.ok) throw new Error("Failed to fetch positions from Lambda.");
        const result = await response.json();

        // format result for readability: Simplify the structure
        const positions: any[] = [];
        ["BTC", "ETH"].forEach((asset: string) => {
            const assetPositions = Array.isArray(result?.[asset]) ? result[asset] : [];
            assetPositions.forEach((gp: any) => {
                const groupedPositions = Array.isArray(gp?.positions) ? gp.positions : [];
                groupedPositions.forEach((pos: any) => {
                    positions.push({
                        asset,
                        expiry: new Date(Number(gp.expiry) * 1000).toUTCString(),
                        option_id: pos.optionTokenId,
                        size: pos.size,
                        avg_price: pos.executionPrice,
                        is_buy: pos.isBuy,
                        strategy: pos.strategy,
                        is_settled: pos.isSettled,
                        pnl: 0 // Calculation requires mark price from S3
                    });
                });
            });
        });

        // Enrich with PnL if possible using market data
        const marketData = await fetchMarketData();
        if (!isMarketDataPayload(marketData)) {
            throw new Error("Invalid market data response.");
        }
        positions.forEach(pos => {
            const assetMark = marketData.data!.market![pos.asset === "BTC" ? "BTC" : "ETH"];
            if (assetMark) {
                // Find mark price in S3
                for (const expiry of assetMark.expiries || []) {
                    const opts = assetMark.options?.[expiry];
                    if (!opts) continue;
                    const leg = [...(opts.call || []), ...(opts.put || [])].find(l => l.optionId === pos.option_id);
                    if (leg) {
                        const markPrice = leg.markPrice || 0;
                        const execPrice = Number(pos.avg_price);
                        pos.pnl = pos.is_buy ? (markPrice - execPrice) : (execPrice - markPrice);
                        break;
                    }
                }
            }
        });

        const output = {
            account: address,
            positions: positions,
            total_active_count: positions.length
        };

        return makeToolSuccess(output, true);
    } catch (error: any) {
        return makeToolError(`Error fetching positions: ${error.message}`);
    }
}

async function handleClosePosition(params: { address: string; option_token_id: string; size: string; underlying_asset: string }): Promise<CallToolResult> {
    try {
        const { address, option_token_id, size, underlying_asset } = params;
        ensureValidAddress(address, "address");
        const optionTokenId = parseBigIntInput(option_token_id, "option_token_id");
        const sizeDelta = parsePositiveBigIntInput(size, "size");
        const normalizedAsset = normalizeUnderlyingAsset(underlying_asset);
        if (!normalizedAsset) throw new Error(`Invalid underlying asset: ${underlying_asset}`);
        const assetName = normalizedAsset;
        const assetConfig = CONFIG.ASSETS[assetName];
        const parsed = parseOptionTokenId(optionTokenId);
        if (parsed.underlyingAssetIndex !== assetConfig.index) {
            throw new Error(`Underlying asset mismatch. Option belongs to asset index ${parsed.underlyingAssetIndex}, but ${assetName} was provided.`);
        }

        const now = Math.floor(Date.now() / 1000);
        if (now >= parsed.expiry) {
            const expiryIso = new Date(parsed.expiry * 1000).toISOString();
            throw new Error(`Option already expired (${expiryIso}). Use callput_settle_position instead of callput_close_position.`);
        }

        // Close Params: uint16 _underlyingAssetIndex, uint256 _optionTokenId, uint256 _size, address[] memory _path, uint256 _minAmountOut, uint256 _minOutWhenSwap, bool _withdrawNAT
        const USDC = CONFIG.CONTRACTS.USDC;
        const path = [USDC]; // Swap profit to USDC
        const minAmountOut = 0n;
        const minOutWhenSwap = 0n;
        const withdrawNAT = false;

        const iface = new ethers.Interface(POSITION_MANAGER_ABI);

        const data = iface.encodeFunctionData("createClosePosition", [
            assetConfig.index,
            optionTokenId,
            sizeDelta,
            path,
            minAmountOut,
            minOutWhenSwap,
            withdrawNAT
        ]);

        const executionFee = await getExecutionFeeWithFallback();

        const output = {
            to: CONFIG.CONTRACTS.POSITION_MANAGER,
            data: data,
            value: executionFee.toString(),
            chain_id: CONFIG.CHAIN_ID,
            account: address,
            description: `Close position for Option ID ${option_token_id} | Size: ${size}`,
            instruction: "Sign this transaction to exit the position."
        };

        return makeToolSuccess(output, true);
    } catch (error: any) {
        return makeToolError(`Error generating close transaction: ${error.message}`);
    }
}

async function handleGetMarketTrends(): Promise<CallToolResult> {
    try {
        const marketData = await fetchMarketData();
        if (!isMarketDataPayload(marketData)) {
            throw new Error("Invalid market data response.");
        }
        const trends: any = {};

        ["BTC", "ETH"].forEach(asset => {
            const m = marketData.data!.market![asset];
            if (!m) return;

            // Calculate Average IV across all expiries/strikes
            let totalIv = 0;
            let count = 0;
            for (const expiry of m.expiries || []) {
                const optionsAtExpiry = m.options?.[expiry] || {};
                const allOptions = [...(optionsAtExpiry.call || []), ...(optionsAtExpiry.put || [])];
                allOptions.forEach((o: any) => {
                    const optionIv = o.markIv ?? o.iv;
                    if (typeof optionIv === "number" && optionIv > 0) {
                        totalIv += optionIv;
                        count++;
                    }
                });
            }
            const avgIv = count > 0 ? (totalIv / count) : 0;

            // Spot Price Estimator (from chains)
            let spot = 0;
            if (m.expiries && m.expiries.length > 0) {
                const c = m.options?.[m.expiries[0]]?.call || [];
                if (c.length > 0) {
                    // Use At-The-Money or the first strike
                    const itm = [...c].sort((a: any, b: any) => a.strikePrice - b.strikePrice)[0];
                    spot = itm.strikePrice + (itm.markPrice || 0);
                }
            }

            trends[asset] = {
                spot_price: Math.round(spot * 100) / 100,
                avg_iv: Math.round(avgIv * 100) / 100,
                sentiment: avgIv > 0.8 ? "High Vola / Bearish" : (avgIv > 0 ? "Stable / Neutral" : "Low Vola / Sideways"),
                last_updated: marketData.lastUpdatedAt
            };
        });

        return makeToolSuccess(trends, true);
    } catch (error: any) {
        return makeToolError(`Error fetching trends: ${error.message}`);
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
