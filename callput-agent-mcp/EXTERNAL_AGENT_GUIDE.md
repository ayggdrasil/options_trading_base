# 🚀 External Agent Installation Guide

This guide explains how to connect the Callput MCP server to external agents such as OpenClaw, custom bots, or other AI frameworks.

---

## 📦 Step 1: Clone and Install

```bash
git clone https://github.com/ayggdrasil/options_trading_base.git
cd options_trading_base/callput-agent-mcp
npm install
npm run build
```

**Verify Connection:**
```bash
node build/test_s3_fetch.js
```

**Expected Output:**
```
✅ S3 fetch successful!
   Total active options available: 214
```

---

## 🔌 Step 2: Connect Your Agent

### Method A: Claude Desktop (Recommended for Personal Use)

**Config File Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

**Configuration Content:**
```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": [
        "/path/to/options_trading_base/callput-agent-mcp/build/index.js"
      ],
      "env": {
        "RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

> **IMPORTANT**: Replace `/path/to/` with your actual local path to the cloned repository!
> Example: `/Users/username/options_trading_base/callput-agent-mcp/build/index.js`

**Restart Claude Desktop** after updating the config.

---

### Method B: Direct Node.js Integration

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["./options_trading_base/callput-agent-mcp/build/index.js"]
});

const client = new Client({
  name: "my-agent",
  version: "1.0.0"
}, { capabilities: {} });

await client.connect(transport);

// Query options
const result = await client.callTool({
  name: "get_option_chains",
  arguments: { underlying_asset: "WETH" }
});

console.log(result); // 214 options found!
```

---

### Method C: Python Integration

```python
import subprocess
import json

# Start MCP server
process = subprocess.Popen(
    ["node", "./options_trading_base/callput-agent-mcp/build/index.js"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE
)

# Call tool
request = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "get_option_chains",
        "arguments": {"underlying_asset": "WETH"}
    }
}

process.stdin.write(json.dumps(request).encode() + b'\\n')
process.stdin.flush()

response = json.loads(process.stdout.readline())
print(f"Found options: {response}")  # 214 options!
```

---

## 🧪 Step 3: Testing with MCP Inspector

Highly recommended for debugging during development.

```bash
cd options_trading_base/callput-agent-mcp
npx @modelcontextprotocol/inspector node build/index.js
```

Open http://localhost:6274 in your browser:
1. Select the `get_option_chains` tool.
2. Enter `{"underlying_asset": "WETH"}` as arguments.
3. **Verify you see 200+ options!** ✅

---

## 📊 Available Tools

### 1. Get Option Chains (`get_option_chains`)

Retrieve available **Vanilla Option** chains for a given underlying asset.

> **⚠️ IMPORTANT TRADING RULE**:
> The options returned by this tool are **Vanilla Options** (Single Legs).
> However, **you cannot trade them individually**.
> You **MUST** combine two vanilla options (one Long, one Short) to execute a **Spread Trade** via `request_quote`.

**Request:**
```json
{
  "name": "get_option_chains",
  "arguments": {
    "underlying_asset": "ETH"
  }
}
```

**Response:**
Returns a hierarchical JSON object: `Asset -> Expiry -> Call/Put`.
**Note:** The option list is a **Compact Array** `[Strike, Price, Liquidity, OptionID]` to save tokens.

```json
{
  "content": [
    {
      "type": "text",
      "text": "{
        \"asset\": \"ETH\",
        \"underlying_price\": 2500.50,
        \"format\": \"[Strike, Price, Liquidity, OptionID]\",
        \"expiries\": {
          \"14FEB26\": {
            \"days\": 2,
            \"call\": [
              [2400, 150.2, 12000, \"38482...\"],
              [2500, 80.5, 5000, \"38491...\"]
            ],
            \"put\": [
              [2300, 40.1, 8000, \"38501...\"]
            ]
          }
        },
        \"last_updated\": 1707890000
      }"
    }
  ]
}
```

**Trading Rules & Strategy:**
1.  **Spread Only**: You MUST trade Spreads (Call Spread or Put Spread).
2.  **Use Spot Price**: The response includes `underlying_price`. **Always select Strikes close to the Spot Price (ATM) or Out-of-the-Money (OTM).**
    *   Avoid Deep In-The-Money (ITM) options (Strikes far below Spot for Calls, far above Spot for Puts) as they have low liquidity.
3.  **Price Floor**: Net Spread Price must be ≥ **$60 (BTC)** or **$3 (ETH)**.

### `request_quote`

Enforces **Spread Trading** (Callput.app style). Single leg trading is disabled to ensure safety.

**Input:**
```json
{
  "strategy": "BuyCallSpread",  // or "BuyPutSpread"
  "long_leg_id": "123...",      // Token ID for the Long Leg
  "short_leg_id": "124...",     // Token ID for the Short Leg
  "amount": 1,
  "slippage": 0.5
}
```

**Strategy Rules:**
- **BuyCallSpread (Bull Call):** `Long Strike < Short Strike` (Both Calls)
- **BuyPutSpread (Bear Put):** `Long Strike > Short Strike` (Both Puts)

**Output:**
Generates transaction calldata for `PositionManager.createOpenPosition`.


---

## ❓ Troubleshooting

**"I see 0 options"**
→ Run `node build/test_s3_fetch.js` to verify S3 connectivity.

**"Error: Cannot find module"**
→ Ensure you ran `npm install` and `npm run build` in the correct directory.

**"Connection failed"**
→ Verify your internet connection and RPC endpoint (default: https://mainnet.base.org).

**"ERC20: transfer amount exceeds allowance"**
→ **Critical:** You must approve **USDC** for the **PositionManager** contract.
→ Even if you are trading WBTC options, the MCP `request_quote` tool constructs transactions that pay with **USDC** (`path=[USDC]`).
→ **Action:** Approve `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC) for spender `0xfc61ba50AE7B9C4260C9f04631Ff28D5A2Fa4EB2` (Router).
→ The `request_quote` tool now returns these addresses in its response for easy verification.

---

## 📚 Additional Resources

- [README.md](./README.md) - Main documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [MCP_SETUP.md](./MCP_SETUP.md) - Detailed setup guide

---

## 💬 Support

- GitHub Issues: https://github.com/ayggdrasil/options_trading_base/issues
- Official Website: https://callput.app

---

**Start trading with 200+ active options!** 🚀
