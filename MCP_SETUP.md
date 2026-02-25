# MCP Server Configuration Guide (Canonical)

This repository contains legacy MCP code and the current production MCP.

- Canonical server: `/Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp/build/index.js`
- Legacy server (do not use for new agents): `/Users/kang/Desktop/01_callput/80_callput_for_agent/mcp-server/build/index.js`

## Claude Desktop / MCP Client

1. Open your MCP config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Configure the server path to `callput-agent-mcp`:

```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": [
        "/Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp/build/index.js"
      ],
      "env": {
        "RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

3. Restart the MCP client.

## Canonical Tool Names

Use only `callput_*` names for new agents:

- `callput_get_available_assets`
- `callput_get_market_trends`
- `callput_get_option_chains`
- `callput_get_greeks`
- `callput_validate_spread`
- `callput_approve_usdc`
- `callput_request_quote`
- `callput_check_tx_status`
- `callput_get_my_positions`
- `callput_close_position`
- `callput_settle_position`

Legacy aliases (`get_option_chains`, `request_quote`, etc.) are for backward compatibility only.

## Quick Inspector Test

```bash
cd /Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp
npx @modelcontextprotocol/inspector node build/index.js
```

Run this sequence:
1. `callput_get_available_assets`
2. `callput_get_option_chains` with `{"underlying_asset":"ETH"}`
3. `callput_validate_spread` with candidate legs
4. `callput_request_quote` after validation success

## Trading Contract of Behavior

1. Option chains are for leg discovery only.
2. Do not execute single-leg vanilla trades.
3. Always run validation before quote.
4. Execute only when `status="Valid"` and `maxTradableQuantity > 0`.
5. Always run `callput_check_tx_status` after broadcast.
6. Pre-expiry -> `callput_close_position`, expired -> `callput_settle_position`.

## Asset Input Rules

The following inputs are accepted:
- Underlying query/settle/close: `BTC`, `ETH`
- Legacy aliases also accepted: `WBTC`, `WETH`

Standardize your own agent state to `BTC`/`ETH` to avoid confusion.
