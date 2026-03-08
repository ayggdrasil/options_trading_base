# MCP Setup Guide (Callput Agent MCP)

## Important Runtime Path Rule
- `<repo_root>` is a documentation placeholder only.
- In real OpenClaw/Claude MCP config, replace `<repo_root>` with an absolute local path.
- Do not keep literal `<repo_root>` in `args` at runtime.
- Example runtime path: `/opt/options_trading_base/callput-agent-mcp/build/index.js`.

This guide configures the canonical Callput MCP server for Claude Desktop or custom agents.

`<repo_root>` means the local root directory where this GitHub repository is cloned.

## 1) Build Server

```bash
cd <repo_root>/callput-agent-mcp
npm install
npm run build
```

## 2) Configure MCP Client

### Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "callput": {
      "command": "node",
      "args": ["<repo_root>/callput-agent-mcp/build/index.js"],
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

This confirms tradable listing feed connectivity.

Recommended full verification bundle:
```bash
npm run verify:core
```

Extra validation/lifecycle checks:
```bash
npm run verify:settle
npm run verify:e2e
```

## 4) Minimal Tool Smoke Test

Run in MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

Then call:
1. `callput_get_agent_bootstrap`
2. `callput_get_available_assets`
3. `callput_get_option_chains` with `{"underlying_asset":"ETH","option_type":"Call","max_expiries":1,"max_strikes_per_side":6}`
4. `callput_validate_spread` with candidate legs
5. `callput_request_quote` with `slippage` (e.g. `0.5`)

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
7. Enforce input guards:
   - positive `amount` for `callput_approve_usdc`
   - 32-byte `tx_hash` for `callput_check_tx_status`
   - valid EVM `address` and positive `size` for `callput_close_position`
   - reject `callput_settle_position` before expiry
   - reject unknown `expiry_date` in `callput_get_option_chains` with explicit error

## 6) Canonical Tool Names

Use canonical names in prompts and orchestrators:

- `callput_get_available_assets`
- `callput_get_agent_bootstrap`
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

## 7) Asset Input Rules

Accepted inputs:
- canonical: `BTC`, `ETH`
- aliases: `WBTC`, `WETH`

For external agent memory/state, always normalize to `BTC`/`ETH`.
