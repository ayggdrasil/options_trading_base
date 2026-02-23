# MCP Setup Guide (Callput Agent MCP)

This guide configures the Callput MCP server for Claude Desktop or custom agents.

## 1) Build Server

```bash
cd /path/to/options_trading_base/callput-agent-mcp
npm install
npm run build
```

## 2) Configure MCP Client

### Claude Desktop config

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": ["/path/to/options_trading_base/callput-agent-mcp/build/index.js"],
      "env": {
        "RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

Config locations:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Restart the client after editing.

## 3) Verify Data Feed

```bash
node build/test_s3_fetch.js
```

This confirms the tradable listing feed. Do not treat `test_connection` as a tradability check.

## 4) Minimal Tool Smoke Test

Run in MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

Then call:
1. `callput_get_available_assets`
2. `callput_get_option_chains` with `{"underlying_asset":"WETH"}`
3. `callput_validate_spread` with candidate legs

## 5) Required Trading Contract of Behavior

Your external agent must enforce:

1. No single-leg vanilla execution.
2. Always validate before quote.
3. Require `status=Valid` and `maxTradableQuantity>0`.
4. Always check tx status after broadcast.
5. If `cancelled`, refresh legs and re-validate.
6. Use close vs settle correctly:
   - pre-expiry: `callput_close_position`
   - post-expiry: `callput_settle_position`

## 6) Canonical Tool Names

Use canonical names in prompts and orchestrators:

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

Legacy aliases exist only for backward compatibility.

## 7) Environment Variable

Optional:

```bash
RPC_URL=https://mainnet.base.org
```

