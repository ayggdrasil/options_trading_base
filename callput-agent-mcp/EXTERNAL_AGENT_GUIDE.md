# External Agent Integration Guide (Callput MCP)

This guide is for OpenClaw and other external agents integrating with `callput-agent-mcp`.

## Goal

Prevent common execution failures:
- trying to trade vanilla single legs directly
- skipping spread validation
- using stale legs with no executable liquidity

## Fast Setup

```bash
git clone https://github.com/ayggdrasil/options_trading_base.git
cd options_trading_base/callput-agent-mcp
npm install
npm run build
node build/test_s3_fetch.js
```

Expected result: active options count is returned.

## Client Connection

### Claude Desktop

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

### Node SDK

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["./options_trading_base/callput-agent-mcp/build/index.js"],
  env: { RPC_URL: "https://mainnet.base.org" }
});

const client = new Client({ name: "external-agent", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);
```

---

## Canonical Tools

### Discovery
- `callput_get_available_assets`
- `callput_get_market_trends`
- `callput_get_option_chains`
- `callput_get_greeks`

### Execution
- `callput_validate_spread`
- `callput_approve_usdc`
- `callput_request_quote`
- `callput_check_tx_status`

### Position Management
- `callput_get_my_positions`
- `callput_close_position`
- `callput_settle_position`

Legacy aliases exist, but new agents should use canonical names only.

---

## Mandatory Execution Contract

Your orchestrator must enforce all rules below.

1. `callput_get_option_chains` returns vanilla legs for discovery only.
2. Never try direct single-leg execution via MCP.
3. Always run `callput_validate_spread` before `callput_request_quote`.
4. Proceed only when:
   - `status = "Valid"`
   - `details.maxTradableQuantity > 0`
5. Always call `callput_check_tx_status` after broadcast.
6. If status is `cancelled`, do not replay same quote blindly.
7. For exits:
   - pre-expiry: `callput_close_position`
   - post-expiry: `callput_settle_position`

---

## Context Budget Contract (Required)

To reduce context overflow risk in long-running agent sessions:

1. Keep raw MCP payloads ephemeral.
   - Parse and summarize immediately.
   - Do not keep full `expiries` maps in persistent memory.
2. Maintain a compact execution state only:
   - `asset`, `bias`, `target_expiry`
   - `candidate_spreads` (max 5)
   - `selected_long_leg_id`, `selected_short_leg_id`
   - `validation_status`, `maxTradableQuantity`
   - `tx_hash`, `tx_status`
3. Bound per-cycle calls:
   - max 1 chain fetch
   - max 6 Greeks calls
   - max 5 validations
   - max 1 quote call
4. Narrow tool inputs early:
   - use `option_type` and `expiry_date` whenever available
   - avoid broad chain fetch loops across all expiries repeatedly
5. Polling mode:
   - keep only latest `callput_check_tx_status` snapshot
   - discard old polling responses
6. Logging policy:
   - never append full calldata repeatedly
   - log compact hash/IDs and terminal outcomes only
7. Recovery policy:
   - when context grows too large, rebuild from compact state and re-query fresh market data

---

## Recommended Flow (Production)

### Phase 1: Discovery

1. `callput_get_available_assets`
2. `callput_get_market_trends`
3. `callput_get_option_chains(underlying_asset, expiry_date?, option_type?)`

Notes:
- chain output format is `[Strike, Price, Liquidity, MaxQty, OptionID]`
- output is trimmed around spot strikes

### Phase 2: Candidate Selection

- Build spread candidates (long + short) from chain output.
- Prefer strikes near active liquidity zones.

### Phase 3: Validation (Required)

Call:
```json
{
  "name": "callput_validate_spread",
  "arguments": {
    "strategy": "BuyCallSpread",
    "long_leg_id": "...",
    "short_leg_id": "..."
  }
}
```

Required pass conditions:
- `status` is `Valid`
- `details.maxTradableQuantity > 0`

Validation checks include:
- same underlying and expiry
- strategy strike-direction consistency
- minimum spread price floor
  - BTC >= 60
  - ETH >= 3

### Phase 4: Approval

- If allowance is insufficient, run `callput_approve_usdc(amount)`.
- Sign and broadcast approval tx.

### Phase 5: Quote and Broadcast

- Run `callput_request_quote(...)`
- Sign and broadcast returned unsigned tx
- Save `tx_hash`

### Phase 6: Keeper Status Loop

- Run `callput_check_tx_status(tx_hash, is_open=true)`
- Poll every 15-30 seconds until terminal state

Terminal states:
- `executed`: open success
- `cancelled`: refresh legs and restart at Phase 1 or 2
- `reverted`: inspect approval/params and recover

### Phase 7: Position Lifecycle

- `callput_get_my_positions(address)` for monitoring
- pre-expiry close: `callput_close_position` + `callput_check_tx_status(..., false)`
- expired settle: `callput_settle_position`

---

## Common Failure Patterns and Fixes

### Symptom: "Option is not available"
Cause:
- stale legs or no executable liquidity at keeper execution time

Fix:
- refresh chain data
- choose new legs
- re-run validation
- request new quote

### Symptom: `cancelled`
Cause:
- liquidity shift or price movement between request and keeper execution

Fix:
- do not replay previous calldata
- restart candidate discovery and validation

### Symptom: direct vanilla attempts
Cause:
- orchestrator misread chain output as tradable instrument

Fix:
- hardcode spread-only execution contract in tool policy layer

### Symptom: allowance error
Cause:
- approval not done or wrong spender

Fix:
- run `callput_approve_usdc`
- verify spender and token from quote response

---

## OpenClaw System Prompt Block

Use `/Users/kang/Desktop/01_callput/80_callput_for_agent/callput-agent-mcp/OPENCLAW_SYSTEM_PROMPT.md` as the base policy block in your OpenClaw system prompt.

At minimum, include:
- spread-only execution
- validate-before-quote
- post-broadcast status polling
- close vs settle expiry split
- context budget contract

---

## Inspector Debugging

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

Suggested test order:
1. `callput_get_option_chains`
2. `callput_validate_spread`
3. `callput_request_quote`
4. `callput_check_tx_status`

---

## Security

- Never send private keys through MCP inputs.
- Keep signing and key custody in agent runtime.
- Treat MCP responses as unsigned transaction instructions only.
