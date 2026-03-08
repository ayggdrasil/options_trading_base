# options_trading_base

This repository hosts the **Callput Agent MCP** package for external AI agents.

## Package
- `callput-agent-mcp`: MCP server for spread-only options execution on Base L2.

## OpenClaw External Agent Quick Start

### 1) Clone and build
```bash
git clone https://github.com/ayggdrasil/options_trading_base.git
cd options_trading_base/callput-agent-mcp
npm install
npm run build
npm run verify:core
```

### 2) Set runtime paths (required)
- `mcp_dir`: absolute local path to `callput-agent-mcp`
- `mcp_entry`: `<mcp_dir>/build/index.js`

Important:
- Use a real absolute path at runtime.
- Do **not** keep placeholders like `<mcp_dir>` or `<mcp_entry>` in agent config.
- Prefer paths without spaces.

### 3) Configure OpenClaw MCP
Use the same MCP config format your runtime expects. Core values:

```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/callput-agent-mcp/build/index.js"],
      "env": {
        "RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

### 4) Load OpenClaw policy block
Use:
- `callput-agent-mcp/OPENCLAW_SYSTEM_PROMPT.md`

### 5) Minimal tool loop (required)
1. `callput_get_agent_bootstrap`
2. `callput_get_available_assets` / `callput_get_market_trends`
3. `callput_get_option_chains`
4. `callput_validate_spread`
5. `callput_request_quote`
6. `callput_check_tx_status`
7. `callput_close_position` (pre-expiry) or `callput_settle_position` (post-expiry)

## Required execution rules
- Spread-only execution.
- Never execute single-leg vanilla directly.
- Validate before quote.
- Proceed only when validation is `Valid` and `maxTradableQuantity > 0`.
- If tx status is `cancelled`, refresh legs and re-validate before re-quote.

## Full docs
- `callput-agent-mcp/README.md`
- `callput-agent-mcp/EXTERNAL_AGENT_GUIDE.md`
- `callput-agent-mcp/MCP_SETUP.md`
- `callput-agent-mcp/SKILL.md`
