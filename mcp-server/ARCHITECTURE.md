# MCP Server Architecture - How AI Agents Trade on Callput

This document explains the architecture that enables AI agents (like OpenClaw) to trade options on the Callput protocol.

## 🏗️ System Architecture

```
┌─────────────────┐
│  OpenClaw Agent │ (Claude, GPT, or other AI)
│  - Strategy      │
│  - Wallet Mgmt   │
└────────┬────────┘
         │ MCP Protocol
         ↓
┌─────────────────┐
│   MCP Server    │ (This implementation)
│  - Query Options │
│  - Generate TX   │
└────────┬────────┘
         │ ethers.js (JSON-RPC)
         ↓
┌─────────────────┐
│   Base L2       │
│  - ViewAggregator
│  - PositionManager
│  - OptionsMarket
└─────────────────┘
```

## 📚 Layer Responsibilities

### Layer 1: AI Agent (OpenClaw)
**Role**: Trading strategy and fund management

**Responsibilities**:
- Private key management
- Transaction signing
- Gas fee configuration
- Transaction broadcasting

### Layer 2: MCP Server (This Project)
**Role**: Translate blockchain data into AI-readable format

**Capabilities**:
1. `get_option_chains` - Returns on-chain option data as JSON
2. `request_quote` - Generates unsigned transaction payloads

### Layer 3: Base L2 (Blockchain)
**Role**: Execute trades and store state

## 🔧 Core Components

### What is MCP (Model Context Protocol)?

```typescript
// MCP is a standard protocol for AI agents to call external tools
// Agents interact like this:
const options = await mcp.call("get_option_chains", {...});
```

**Why MCP?**
- AI agents struggle with raw ethers.js
- Converts blockchain data to AI-friendly JSON
- Provides standardized interface

### Data Flow: `get_option_chains`

```
Agent → MCP Server → ViewAggregator.getAllOptionToken()
                      ↓
                   [BigInt Arrays]
                      ↓
                   parseOptionTokenId() parsing
                      ↓
                   [{
                     option_token_id: "12345...",
                     strategy: "BuyCall",
                     strike_price: 3000,
                     expiry: 1730000000,
                     liquidity: "500000"
                   }] → Agent
```

**Implementation Key**:
```typescript
// Re-implemented Utils.sol bit-packing logic in JS
function parseOptionTokenId(optionTokenId: bigint): ParsedOption {
    // Parse 256-bit uint via bit shifting
    const underlyingAssetIndex = (optionTokenId >> 240n) & 0xFFFFn;
    const expiry = (optionTokenId >> 200n) & 0xFFFFFFFFFFn;
    // ...
}
```

### Transaction Generation: `request_quote`

```
Agent → "I want to buy a Call with 100 USDC"
  ↓
MCP Server → Prepare PositionManager.createOpenPosition() call
  ↓
1. Parse option_token_id
2. Reconstruct optionIds (bytes32[4])
3. Prepare parameters:
   - underlyingAssetIndex: 2 (WETH)
   - length: 1
   - isBuys: [true, false, false, false]
   - strikePrices: [3000, 0, 0, 0]
   - path: [USDC]
   - amountIn: 100 * 10^6
4. Encode calldata with ethers.Interface
  ↓
{
  to: "0x83B04...",       // PositionManager address
  data: "0x1a2b3c...",    // Encoded calldata
  value: "50000000000000", // execution fee (0.00005 ETH)
  chain_id: 8453
} → Agent
```

## 💡 Why This Architecture Works

### Problem: AI Agents Can't Directly Handle Smart Contracts

Challenges:
1. Complex bit-packing logic (256-bit uint encoding all data)
2. ABI encoding/decoding required
3. Gas fees and slippage calculations
4. Blockchain RPC communication

### Solution: MCP Server as Middleware

```
Before:
AI Agent → ??? → Smart Contract
(Impossible)

After:
AI Agent → [MCP: Natural commands] → [MCP Server: Blockchain translation] → Smart Contract
(Works!)
```

## 📖 Real Trading Flow Example

```typescript
// 1. Agent queries market
const options = await mcp.call("get_option_chains", { 
  underlying_asset: "WETH" 
});
// → [{option_token_id: "123...", strategy: "BuyCall", strike: 3000, ...}]

// 2. Agent decides strategy (AI logic)
const selected = options.find(o => 
  o.strategy === "BuyCall" && 
  o.strike_price === 3000 &&
  o.expiry > Date.now() / 1000 + 86400 * 7 // 7+ days remaining
);

// 3. Request transaction
const tx = await mcp.call("request_quote", {
  option_token_id: selected.option_token_id,
  amount: 100,
  is_buy: true
});

// 4. Agent executes (outside MCP scope)
const wallet = new ethers.Wallet(privateKey, provider);

// Approve USDC if needed
await usdc.approve(tx.to, amount);

// Sign & send transaction
const signedTx = await wallet.sendTransaction({
  to: tx.to,
  data: tx.data,
  value: tx.value,
  gasLimit: 500000
});

await signedTx.wait(); // ✅ Trade executed
```

## 🚧 What Agents Still Need to Implement

The MCP server handles **read operations + transaction generation**. Agents must implement:

1. **Wallet Management**: Private key storage and signing
2. **Approval Management**: Check if `USDC.approve(PositionManager, amount)` is needed
3. **Gas Estimation**: Call `estimateGas()` for optimal gas limits
4. **Price Verification**: Query market prices to prevent slippage
5. **Position Management**: Track existing positions and liquidations

## 🎯 Summary

**The MCP server acts as a "blockchain translator"**. AI agents communicate via simple JSON, and the server handles complex smart contract logic. Agents only need to focus on trading strategy!

---

## Technical Deep Dive

### Option Token ID Encoding

The Callput protocol uses a 256-bit `uint256` to encode complete option information:

```
Bit Layout:
[255:240] underlyingAssetIndex (16 bits)
[239:200] expiry (40 bits)
[199:196] strategy (4 bits)
[195:194] length (2 bits)
[193]     isBuy[0] (1 bit)
[192:147] strikePrice[0] (46 bits)
[146]     isCall[0] (1 bit)
... (repeated for 4 legs)
[1:0]     vaultIndex (2 bits)
```

This encoding allows a single `uint256` to represent complex multi-leg strategies (spreads, straddles, etc).

### Contract Interactions

**ViewAggregator**:
- `getAllOptionToken()` returns all active options across 3 vaults (S/M/L)
- Returns: `uint256[][][]` where `[vaultIndex][optionIndex] = [tokenId, liquidity]`

**PositionManager**:
- `createOpenPosition()` submits a new position request
- Request goes into a queue, executed by keeper when oracle prices are updated
- Returns a `bytes32` request key for tracking

**Why Queue-Based?**
- Prevents front-running
- Ensures fair pricing via oracle
- Batches gas costs

### Error Handling

The MCP server returns structured errors:
```typescript
{
  content: [{
    type: "text",
    text: "Error: Option ID not found"
  }],
  isError: true
}
```

Agents should handle:
- Invalid option IDs
- Insufficient liquidity
- Expired options
- Network failures
