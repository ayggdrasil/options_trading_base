# Callput Agent MCP Server

**MCP server enabling AI agents to trade on-chain options on Base L2.** Query real-time BTC & ETH option chains, generate transaction calldata, and execute DeFi strategies programmatically. Built for autonomous trading with human-readable data formatting.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Base L2](https://img.shields.io/badge/Base-L2-0052FF)](https://base.org/)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": ["/path/to/callput-agent-mcp/build/index.js"],
      "env": {
        "RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

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
  "option_token_id": "123...",
  "display": {
    "instrument": "WETH-20FEB24-3000-C",
    "description": "Buy Call @ 3000 expiring 20FEB24",
    "days_to_expiry": 15,
    "liquidity_formatted": "0.5000 WETH"
  }
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
  "chain_id": 8453
}
```

---

## 📚 Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - How the system works
- **[MCP Setup](./MCP_SETUP.md)** - Integration with AI agents
- **[Example Output](./EXAMPLE_OUTPUT.md)** - API response samples

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

---

## 🏗️ Project Structure

```
callput-agent-mcp/
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

---

## 🌐 Environment Variables

```bash
# Optional: Custom RPC endpoint
RPC_URL=https://your-base-rpc.com
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

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

---

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

## 🔗 Links

- [Callput Protocol](https://callput.app)
- [Base L2](https://base.org)
- [MCP Protocol](https://modelcontextprotocol.io)

---

**Built for the agentic economy** 🤖⚡
