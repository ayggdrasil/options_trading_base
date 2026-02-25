# MCP Update Guide (OpenClaw / External Agents)

## Current Canonical Target

Use this MCP server path:

`/Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp/build/index.js`

Do not use the legacy `mcp-server` path for new agent integrations.

## Apply Update

1. Build latest server

```bash
cd /Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp
npm install
npm run build
```

2. Update agent MCP config to canonical path.

3. Restart the agent process.

## Post-Update Smoke Test

### A) Feed + RPC checks

```bash
cd /Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp
node build/test_s3_fetch.js
node build/test_connection.js
```

### B) Tool behavior checks

```bash
node build/verify_get_options.js
node build/verify_validation.js
node build/verify_transaction.js
node build/verify_constraints.js
node build/verify_settle.js
```

## Required Tool Contract for External Agents

Always use canonical names:

- `callput_get_available_assets`
- `callput_get_market_trends`
- `callput_get_option_chains`
- `callput_validate_spread`
- `callput_request_quote`
- `callput_check_tx_status`
- `callput_close_position`
- `callput_settle_position`

Execution rules:
1. Spread-only execution (no vanilla single-leg execution).
2. `callput_validate_spread` must pass before `callput_request_quote`.
3. Execute only when `maxTradableQuantity > 0`.
4. Re-check status after broadcast; if cancelled, re-select legs and re-quote.

## Common Misconfiguration Checklist

- [ ] MCP path points to `callput-agent-mcp/build/index.js`
- [ ] Agent prompts use `callput_*` tool names
- [ ] Underlying symbol normalized to `BTC`/`ETH` in agent state
- [ ] Legacy aliases are not used in new orchestration logic
