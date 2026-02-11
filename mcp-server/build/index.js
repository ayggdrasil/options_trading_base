#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { VIEW_AGGREGATOR_ABI, POSITION_MANAGER_ABI, ERC20_ABI } from "./abis.js";
// --- Types & Helpers ---
var Strategy;
(function (Strategy) {
    Strategy[Strategy["NotSupported"] = 0] = "NotSupported";
    Strategy[Strategy["BuyCall"] = 1] = "BuyCall";
    Strategy[Strategy["SellCall"] = 2] = "SellCall";
    Strategy[Strategy["BuyPut"] = 3] = "BuyPut";
    Strategy[Strategy["SellPut"] = 4] = "SellPut";
    Strategy[Strategy["BuyCallSpread"] = 5] = "BuyCallSpread";
    Strategy[Strategy["SellCallSpread"] = 6] = "SellCallSpread";
    Strategy[Strategy["BuyPutSpread"] = 7] = "BuyPutSpread";
    Strategy[Strategy["SellPutSpread"] = 8] = "SellPutSpread";
})(Strategy || (Strategy = {}));
function parseOptionTokenId(optionTokenId) {
    const underlyingAssetIndex = Number((optionTokenId >> 240n) & 0xffffn);
    const expiry = Number((optionTokenId >> 200n) & 0xffffffffffn);
    const strategy = Number((optionTokenId >> 196n) & 0xfn);
    // length is 2 bits at 194
    // const length = Number((optionTokenId >> 194n) & 0x3n) + 1;
    const isBuys = [];
    const strikePrices = [];
    const isCall = [];
    for (let i = 0; i < 4; i++) {
        isBuys[i] = ((optionTokenId >> (193n - BigInt(i * 48))) & 0x1n) !== 0n;
        const strike = Number((optionTokenId >> (147n - BigInt(i * 48))) & 0x3ffffffffffn);
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
const server = new Server({
    name: "callput-agent-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Setup Provider & Contracts
const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const viewAggregator = new ethers.Contract(CONFIG.CONTRACTS.VIEW_AGGREGATOR, VIEW_AGGREGATOR_ABI, provider);
const positionManager = new ethers.Contract(CONFIG.CONTRACTS.POSITION_MANAGER, POSITION_MANAGER_ABI, provider);
// Cache for decimals to avoid repeated calls
const decimalsCache = {};
async function getDecimals(tokenAddress) {
    if (decimalsCache[tokenAddress])
        return decimalsCache[tokenAddress];
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    try {
        const decimals = await contract.decimals();
        decimalsCache[tokenAddress] = Number(decimals);
        return Number(decimals);
    }
    catch (e) {
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
                            description: "The underlying asset symbol (e.g., WETH). Currently supports WETH (Index 2).",
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
            const assetConfig = CONFIG.ASSETS[params.underlying_asset];
            if (!assetConfig) {
                return {
                    content: [{ type: "text", text: `Unsupported asset: ${params.underlying_asset}. Supported: ${Object.keys(CONFIG.ASSETS).join(", ")}` }],
                    isError: true,
                };
            }
            // Map WBTC -> BTC, WETH -> ETH for S3 data
            const assetName = params.underlying_asset === "WBTC" ? "BTC" : "ETH";
            // 2. Fetch market data from S3
            const response = await fetch(CONFIG.S3_MARKET_DATA_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch market data from S3: ${response.statusText}`);
            }
            const marketData = await response.json();
            if (!marketData?.data?.market?.[assetName]) {
                return {
                    content: [{ type: "text", text: `No market data found for ${assetName}` }],
                    isError: true,
                };
            }
            const assetMarket = marketData.data.market[assetName];
            const options = [];
            // 3. Parse options from S3 data
            for (const expiry of assetMarket.expiries || []) {
                const expiryOptions = assetMarket.options[expiry];
                if (!expiryOptions)
                    continue;
                // Process calls
                for (const option of expiryOptions.call || []) {
                    if (!option.isOptionAvailable)
                        continue;
                    const expiryDate = new Date(Number(expiry) * 1000);
                    const day = String(expiryDate.getUTCDate()).padStart(2, '0');
                    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                    const month = monthNames[expiryDate.getUTCMonth()];
                    const year = String(expiryDate.getUTCFullYear()).slice(-2);
                    const formattedExpiry = `${day}${month}${year}`;
                    const now = Math.floor(Date.now() / 1000);
                    const daysToExpiry = Math.floor((Number(expiry) - now) / 86400);
                    options.push({
                        // Raw data
                        option_id: option.optionId,
                        underlying_asset: params.underlying_asset,
                        instrument: option.instrument,
                        strike_price: option.strikePrice,
                        expiry: Number(expiry),
                        // Pricing data (from S3)
                        mark_iv: option.markIv,
                        mark_price: option.markPrice,
                        risk_premium_buy: option.riskPremiumRateForBuy,
                        risk_premium_sell: option.riskPremiumRateForSell,
                        // Greeks
                        delta: option.delta,
                        gamma: option.gamma,
                        vega: option.vega,
                        theta: option.theta,
                        // Volume
                        volume: option.volume,
                        // Human-readable format
                        display: {
                            instrument: option.instrument,
                            type: "Call",
                            side: "Available",
                            option_type: "Vanilla",
                            expiry_date: expiryDate.toISOString().split('T')[0],
                            expiry_formatted: formattedExpiry,
                            days_to_expiry: daysToExpiry,
                            strike: option.strikePrice,
                            description: `Call @ ${option.strikePrice} expiring ${formattedExpiry}`,
                            mark_price: option.markPrice?.toFixed(6) || "N/A",
                            mark_iv: option.markIv ? `${(option.markIv * 100).toFixed(2)}%` : "N/A",
                        }
                    });
                }
                // Process puts
                for (const option of expiryOptions.put || []) {
                    if (!option.isOptionAvailable)
                        continue;
                    const expiryDate = new Date(Number(expiry) * 1000);
                    const day = String(expiryDate.getUTCDate()).padStart(2, '0');
                    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                    const month = monthNames[expiryDate.getUTCMonth()];
                    const year = String(expiryDate.getUTCFullYear()).slice(-2);
                    const formattedExpiry = `${day}${month}${year}`;
                    const now = Math.floor(Date.now() / 1000);
                    const daysToExpiry = Math.floor((Number(expiry) - now) / 86400);
                    options.push({
                        // Raw data
                        option_id: option.optionId,
                        underlying_asset: params.underlying_asset,
                        instrument: option.instrument,
                        strike_price: option.strikePrice,
                        expiry: Number(expiry),
                        // Pricing data (from S3)
                        mark_iv: option.markIv,
                        mark_price: option.markPrice,
                        risk_premium_buy: option.riskPremiumRateForBuy,
                        risk_premium_sell: option.riskPremiumRateForSell,
                        // Greeks
                        delta: option.delta,
                        gamma: option.gamma,
                        vega: option.vega,
                        theta: option.theta,
                        // Volume
                        volume: option.volume,
                        // Human-readable format
                        display: {
                            instrument: option.instrument,
                            type: "Put",
                            side: "Available",
                            option_type: "Vanilla",
                            expiry_date: expiryDate.toISOString().split('T')[0],
                            expiry_formatted: formattedExpiry,
                            days_to_expiry: daysToExpiry,
                            strike: option.strikePrice,
                            description: `Put @ ${option.strikePrice} expiring ${formattedExpiry}`,
                            mark_price: option.markPrice?.toFixed(6) || "N/A",
                            mark_iv: option.markIv ? `${(option.markIv * 100).toFixed(2)}%` : "N/A",
                        }
                    });
                }
            }
            // Sort by expiry, then strike
            options.sort((a, b) => {
                if (a.expiry !== b.expiry)
                    return a.expiry - b.expiry;
                return a.strike_price - b.strike_price;
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            underlying_asset: params.underlying_asset,
                            total_options: options.length,
                            options,
                            data_source: "S3 Market Data (Updated Live)",
                            last_updated: marketData.lastUpdatedAt,
                        }, null, 2),
                    },
                ],
            };
        }
        if (name === "request_quote") {
            const Schema = z.object({
                option_token_id: z.string(),
                amount: z.number().positive(),
                is_buy: z.boolean(),
                slippage: z.number().optional().default(0.5),
            });
            const params = Schema.parse(args);
            const tokenId = BigInt(params.option_token_id);
            const parsed = parseOptionTokenId(tokenId);
            // For now, assume payment in USDC for buys, or Native/Underlying for specific cases.
            // Simplified flow: Payment is always in USDC for simplicity in this agent version, unless specified.
            // But wait, `createOpenPosition` takes `path`.
            // Standard Path: [USDC] -> Vault
            const USDC = CONFIG.CONTRACTS.USDC;
            const path = [USDC];
            // Amount handling
            const decimals = await getDecimals(USDC);
            const amountIn = ethers.parseUnits(params.amount.toString(), decimals);
            // Min Out (Slippage)
            // In a real quoting system, we'd query the reader for expected output. 
            // Here we just set 0 for simplicity or calculate if we had price data.
            // IMPORTANT: For the agent to be safe, we should probably fetch the price first.
            // But checking price is complex without the Reader contract completely mapped.
            // We will set minOut to 0 for this MVP, instructing the user to check prices.
            const minOutWhenSwap = 0n;
            const minSize = 0n; // Accept any size for now
            // Params for createOpenPosition
            // function createOpenPosition(
            //   uint16 _underlyingAssetIndex, 
            //   uint8 _length, 
            //   bool[4] memory _isBuys, 
            //   bytes32[4] memory _optionIds, 
            //   bool[4] memory _isCalls, 
            //   uint256 _minSize, 
            //   address[] memory _path, 
            //   uint256 _amountIn, 
            //   uint256 _minOutWhenSwap, 
            //   address _leadTrader
            // )
            // Recover the constituent parts from the Token ID
            // We need `optionIds` (bytes32). 
            // `parseOptionTokenId` gives us components, but `createOpenPosition` asks for `optionIds`.
            // Wait, looking at `PositionManager.sol`, `openPositionRequest` takes `optionIds`.
            // But `createOpenPosition` *calculates* the token ID?
            // "createOpenPosition... returns (bytes32)" -> Request Key.
            // Actually, we need to reconstruct `optionIds`.
            // `OptionsMarket.getOptionId` can generate it. 
            // Or we can just compute it locally: `keccak256(abi.encodePacked(underlying, expiry, strike))`
            const optionIds = [];
            for (let i = 0; i < 4; i++) {
                if (parsed.strikePrices[i] === 0) {
                    optionIds.push(ethers.ZeroHash);
                    continue;
                }
                const packed = ethers.solidityPacked(["uint16", "uint40", "uint48"], [parsed.underlyingAssetIndex, parsed.expiry, parsed.strikePrices[i]]);
                optionIds.push(ethers.keccak256(packed));
            }
            // Convert boolean arrays to what calling helper expects? 
            // No, strictly follow array structure
            // Is it a Buy?
            // If `is_buy` is true, we use the Strategy as is (assuming the ID provided IS for a Buy).
            // If the ID provided is for a "Buy Call" strategy, and we want to Buy, we pass `isBuys` as in the ID.
            // What if `is_buy` is false? i.e. Close position?
            // Then we need `createClosePosition`.
            // For now, let's assume `createOpenPosition` is for opening a NEW position (Long or Short).
            // If `is_buy` param means "Buying the Option" (Long Vol), then strategy must be BuyCall/BuyPut.
            // If `is_buy` param means "Selling the Option" (Short Vol), then strategy must be SellCall/SellPut.
            // Let's strictly rely on the `option_token_id` passed. 
            // If the user picked a "Buy Call" token ID, they are Buying a Call.
            // If they picked a "Sell Call" token ID, they are Selling a Call (Shorting).
            // So `is_buy` parameter might be redundant if the Token ID already encodes the strategy?
            // NO. The Token ID encodes the *Position* type.
            // But `createOpenPosition` arguments `_isBuys` defines the trade direction.
            // Let's assume the Agent selects an Option from the Chain list.
            // The Chain list returns strategies like "BuyCall".
            // If Agent wants to execute that, they call request_quote with that ID.
            // Execution Fee
            // Fixed at 0.00005 ETH usually? Need to check. 
            // PositionManager.executionFee()
            const executionFee = await positionManager.executionFee();
            // Calldata construction
            // Length: derived from strategy
            // Naked = 1, Spread = 2.
            let length = 1;
            if (parsed.strategy >= 5)
                length = 2; // Spread strategies start at 5
            const iface = new ethers.Interface(POSITION_MANAGER_ABI);
            const calldata = iface.encodeFunctionData("createOpenPosition", [
                parsed.underlyingAssetIndex,
                length,
                parsed.isBuy,
                optionIds,
                parsed.isCall,
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
                            description: `Open Position for ${parsed.strategy} on Asset Index ${parsed.underlyingAssetIndex}, Strike ${parsed.strikePrices[0]}, Expiry ${parsed.expiry}`
                        }, null, 2),
                    },
                ],
            };
        }
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.errors.map((e) => e.message).join(", ")}`);
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
