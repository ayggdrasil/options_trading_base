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

### `get_option_chains`

**Input:**
```json
{
  "underlying_asset": "WETH"  // or "WBTC"
}
```

**Output Example:**
```json
{
  "total_options": 214,
  "data_source": "S3 Market Data (Updated Live)",
  "options": [
    {
      "instrument": "ETH-14FEB26-3200-C",
      "strike_price": 3200,
      "mark_price": 0.125,
      "mark_iv": 0.65,
      "delta": 0.48,
      "gamma": 0.0012,
      "display": {
        "description": "Call @ 3200 expiring 14FEB26",
        "days_to_expiry": 3
      }
    }
  ]
}
```

### `request_quote`

Generate transaction calldata for executing trades.

---

## ❓ Troubleshooting

**"I see 0 options"**
→ Run `node build/test_s3_fetch.js` to verify S3 connectivity.

**"Error: Cannot find module"**
→ Ensure you ran `npm install` and `npm run build` in the correct directory.

**"Connection failed"**
→ Verify your internet connection and RPC endpoint (default: https://mainnet.base.org).

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
