# Callput Agent MCP Server

Model Context Protocol (MCP) server for Callput options on Base L2.

This server is for **spread trading execution support**. It provides market discovery, spread validation, quote generation, and position lifecycle tools.

## Critical Rules (Read First)

1. `callput_get_option_chains` returns **vanilla legs for discovery only**.
2. You **must not** trade single-leg vanilla options directly through this MCP.
3. You must run `callput_validate_spread` before `callput_request_quote`.
4. Only proceed when validation returns:
   - `status = "Valid"`
   - `details.maxTradableQuantity > 0`
5. After broadcast, you must run `callput_check_tx_status` until `executed` or `cancelled`.
6. For existing positions:
   - pre-expiry: `callput_close_position`
   - post-expiry: `callput_settle_position`

If status is `cancelled`, refresh chain data and re-select legs. Do not blindly retry with stale legs.

Input normalization:
- underlying assets: use `BTC`/`ETH` in agent state
- aliases `WBTC`/`WETH` are accepted by tools

Slippage behavior:
- `callput_request_quote.slippage` is now applied to on-chain `minSize` protection
- quote output includes `expected_size`, `min_size`, and raw values

---

## Data Source

Primary market listing source:
- `https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json`

Why this matters:
- Same listing source as frontend
- Includes mark price, IV, Greeks, availability flags
- Updated every few minutes

Important:
- On-chain `ViewAggregator.getAllOptionToken()` is **not** the canonical tradable listing source for agent discovery.
- Keep `test_connection` for RPC/contract connectivity checks only.

---

## Installation

```bash
git clone https://github.com/ayggdrasil/options_trading_base.git
cd options_trading_base/callput-agent-mcp
npm install
npm run build
```

## Quick Verification

```bash
node build/test_s3_fetch.js
```

Expected:
- S3 fetch succeeds
- Active options count is returned

Optional connectivity check (not a tradability check):
```bash
node build/test_connection.js
```

---

## MCP Client Integration

### Claude Desktop

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

### Node.js MCP SDK

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["./options_trading_base/callput-agent-mcp/build/index.js"],
  env: { RPC_URL: "https://mainnet.base.org" }
});

const client = new Client({ name: "my-agent", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);
```

---

## Canonical Tool Set

### Market and Discovery
- `callput_get_available_assets`
- `callput_get_market_trends`
- `callput_get_option_chains`
- `callput_get_greeks`

### Execution Guardrails
- `callput_validate_spread`
- `callput_approve_usdc`
- `callput_request_quote`
- `callput_check_tx_status`

### Position Lifecycle
- `callput_get_my_positions`
- `callput_close_position`
- `callput_settle_position`

Legacy aliases (backward compatibility only):
- `get_option_chains`, `get_available_assets`, `validate_spread`, `request_quote`, `get_greeks`

---

## Recommended Execution Loop

1. Discover
   - `callput_get_available_assets`
   - `callput_get_market_trends`
   - `callput_get_option_chains(underlying_asset, expiry_date?, option_type?)` (recommend `BTC`/`ETH`)
2. Choose two legs (long/short) for spread strategy.
3. Validate
   - `callput_validate_spread(strategy, long_leg_id, short_leg_id)`
4. Approve if needed
   - `callput_approve_usdc(amount)`
5. Quote and broadcast
   - `callput_request_quote(...)`
6. Verify async keeper status
   - `callput_check_tx_status(tx_hash, is_open=true)`
7. If cancelled
   - refresh chains
   - choose new legs
   - validate again
   - request quote again

---

## Validation Semantics

`callput_validate_spread` checks:
- same underlying
- same expiry
- strategy-consistent strike direction
  - Call spread: `longStrike < shortStrike`
  - Put spread: `longStrike > shortStrike`
- minimum spread price floor
  - BTC: `>= 60`
  - ETH: `>= 3`
- estimated vault-based `maxTradableQuantity`

If validation fails, do not quote.

---

## Contracts (Base L2)

- ViewAggregator: `0x9060a53f764578230674074cbCa9Daa9fbCa85A8`
- PositionManager: `0x83B04701B227B045CBBAF921377137fF595a54af`
- SettleManager: `0x81A58c7F737a18a8964F62A2C165675C1819E77C`
- Router: `0xfc61ba50AE7B9C4260C9f04631Ff28D5A2Fa4EB2`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

---

## Security and Responsibilities

This MCP server returns **unsigned transactions** only.

Agent side must handle:
- private key custody
- signing
- broadcasting
- gas policy
- retries and idempotency

Never send private keys into MCP tool arguments or logs.

---

## Troubleshooting

### "Option is not available" or repeated `cancelled`
- Selected legs are stale or no longer executable.
- Re-run chain query and validation, then select new legs closer to active liquidity.

### Validation says `maxTradableQuantity = 0`
- Current vault liquidity cannot support this structure.
- Use different strikes or smaller notional.

### `ERC20: transfer amount exceeds allowance`
- Run `callput_approve_usdc` first.
- Ensure spender is Router and token is USDC.

### No options returned
- Validate S3 connectivity with `node build/test_s3_fetch.js`.

---

## Documentation Index

- [MCP_SETUP.md](./MCP_SETUP.md)
- [SKILL.md](./SKILL.md)
- [EXTERNAL_AGENT_GUIDE.md](./EXTERNAL_AGENT_GUIDE.md)
- [EXTERNAL_AGENT_GUIDE_KR.md](./EXTERNAL_AGENT_GUIDE_KR.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [EXAMPLE_OUTPUT.md](./EXAMPLE_OUTPUT.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)

