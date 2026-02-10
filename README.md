# Callput Agent MCP Server

**MCP server enabling AI agents to trade on-chain options on Base L2.** Query real-time BTC & ETH option chains, generate transaction calldata, and execute DeFi strategies programmatically. Built for autonomous trading with human-readable data formatting.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Base L2](https://img.shields.io/badge/Base-L2-0052FF)](https://base.org/)

---

## 🚀 Quick Start

### For External Agent Developers

If you're building an AI agent (like OpenClaw) and want to connect to Callput's on-chain options:

```bash
# 1. Clone the repository
git clone https://github.com/ayggdrasil/options_trading_base.git
cd options_trading_base

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Test connection
node build/test_connection.js
```

Expected output:
```
✅ Connected! Current block: 41973480
✅ Fetched option data from ViewAggregator
✅ SUCCESS: Server can fetch real option data from Base L2!
```

---

## 🔌 Integration with Your Agent

### Method 1: Direct MCP Client (Recommended)

For custom agents (Telegram bots, Discord bots, etc.), use the MCP SDK:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Connect to MCP server
const transport = new StdioClientTransport({
  command: "node",
  args: ["./build/index.js"],
  env: { RPC_URL: "https://mainnet.base.org" }
});

const client = new Client({
  name: "my-agent",
  version: "1.0.0"
}, {
  capabilities: {}
});

await client.connect(transport);

// Query options
const result = await client.callTool({
  name: "get_option_chains",
  arguments: { underlying_asset: "WETH" }
});

console.log(result.content[0].text);
```

### Method 2: Claude Desktop

For Claude Desktop users, add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": ["/absolute/path/to/options_trading_base/build/index.js"],
      "env": {
        "RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

**Config file locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

---

## 📖 What This Does

This MCP server acts as a **translator between AI agents and on-chain options markets**. It:

1. **Fetches real option data** from Base L2 (BTC & ETH options)
2. **Formats data for AI** with human-readable descriptions
3. **Generates unsigned transactions** for agents to sign and broadcast

**Example agent interaction:**
```
User: "Show me WETH Call options expiring in the next month"
Agent: Uses MCP → "Found 3 options:
  1. Buy Call @ 3000 expiring 20FEB24 (15 days, 0.5 WETH liquidity)
  2. Buy Call Spread (3000/3200) expiring 28FEB24 (23 days, 1.2 WETH liquidity)
  ..."
```

---

## 🛠️ Available Tools

### `get_option_chains`
Fetch available option chains for BTC or ETH.

**Input:**
```json
{
  "underlying_asset": "WETH" // or "WBTC"
}
```

**Output:** Array of options with human-readable formatting:
```json
{
  "underlying_asset": "WETH",
  "total_options": 2,
  "options": [{
    "option_token_id": "123...",
    "underlying_asset": "WETH",
    "strategy": "BuyCall",
    "strike_price": 3000,
    "expiry": 1730000000,
    "liquidity": "500000000000000000",
    "display": {
      "instrument": "WETH-20FEB24-3000-C",
      "description": "Buy Call @ 3000 expiring 20FEB24",
      "type": "Call",
      "side": "Buy",
      "days_to_expiry": 15,
      "liquidity_formatted": "0.5000 WETH"
    }
  }]
}
```

### `request_quote`
Generate transaction calldata for opening a position.

**Input:**
```json
{
  "option_token_id": "123...",
  "amount": 100,
  "is_buy": true,
  "slippage": 0.5
}
```

**Output:** Unsigned transaction payload:
```json
{
  "to": "0x83B04...",
  "data": "0x1a2b3c...",
  "value": "50000000000000",
  "chain_id": 8453,
  "description": "Open Position for BuyCall..."
}
```

---

## 📚 Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - How the system works
- **[MCP Setup](./MCP_SETUP.md)** - Integration with AI agents
- **[Example Output](./EXAMPLE_OUTPUT.md)** - API response samples
- **[Contributing](./CONTRIBUTING.md)** - How to contribute

---

## 🔗 Smart Contracts (Base L2)

- **ViewAggregator**: `0x9060a53f764578230674074cbCa9Daa9fbCa85A8`
- **PositionManager**: `0x83B04701B227B045CBBAF921377137fF595a54af`
- **OptionsMarket**: `0xBD40a87CcBD20E44C45F19A074E7d67Ee85327c7`

---

## ⚠️ What Agents Must Handle

This server generates **unsigned transactions**. Your agent must:

1. ✅ Manage wallet private keys
2. ✅ Sign transactions
3. ✅ Broadcast to Base L2
4. ✅ Approve ERC20 spending (USDC/WETH → PositionManager)
5. ✅ Estimate gas fees

**Security Note:** Never expose private keys to the MCP server. Handle all signing client-side.

---

## 🏗️ Project Structure

```
options_trading_base/
├── src/
│   ├── index.ts          # MCP server implementation
│   ├── config.ts         # Contract addresses & RPC config
│   ├── abis.ts           # Minimal contract ABIs
│   └── test_connection.ts # Verification script
├── README.md
├── ARCHITECTURE.md       # System design deep dive
├── MCP_SETUP.md         # Integration guide
├── EXAMPLE_OUTPUT.md    # API examples
└── package.json
```

---

## 🧪 Testing

### Verify connection to Base L2:
```bash
npm run build
node build/test_connection.js
```

### Use MCP Inspector (manual testing):
```bash
npx @modelcontextprotocol/inspector node build/index.js
```

Opens a web UI at `http://localhost:6274` for manual testing.

---

## 🌐 Environment Variables

```bash
# Optional: Custom RPC endpoint (defaults to public Base RPC)
RPC_URL=https://your-base-rpc.com
```

Create a `.env` file in the project root:
```
RPC_URL=https://mainnet.base.org
```

---

## 💬 Example: Telegram Bot Integration

```python
# Python example for Telegram bot
import subprocess
import json

def query_options(asset="WETH"):
    # Start MCP server
    process = subprocess.Popen(
        ["node", "build/index.js"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Send MCP request
    request = {
        "method": "tools/call",
        "params": {
            "name": "get_option_chains",
            "arguments": {"underlying_asset": asset}
        }
    }
    
    process.stdin.write(json.dumps(request).encode())
    process.stdin.flush()
    
    # Read response
    response = process.stdout.readline()
    return json.loads(response)

# Use in Telegram handler
@bot.message_handler(commands=['options'])
def send_options(message):
    options = query_options("WETH")
    bot.reply_to(message, f"Found {len(options)} WETH options")
```

---

## 🛣️ Roadmap

- [x] BTC & ETH option chains
- [x] Human-readable formatting
- [x] Transaction generation
- [ ] Position closing support
- [ ] Greeks calculation
- [ ] Historical data
- [ ] U.S. stock options (future)

---

## 🐛 Troubleshooting

**"Connection failed" error:**
- Check your internet connection
- Verify RPC_URL is accessible
- Try alternative RPC: `https://base.llamarpc.com` or `https://base-rpc.publicnode.com`

**"No options found":**
- Markets may be inactive
- Check on callput.app if options are available

**MCP connection issues:**
- Ensure `npm run build` completed successfully
- Verify Node.js version >= 18

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

---

## 🔗 Links

- [Callput Protocol](https://callput.app)
- [Base L2](https://base.org)
- [MCP Protocol](https://modelcontextprotocol.io)
- [OpenClaw Agent](https://openclaw.ai) - Example integration

---

**Built for the agentic economy** 🤖⚡
