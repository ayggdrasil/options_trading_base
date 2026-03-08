# External Agent Integration Guide (English-Only)

This file is intentionally kept in English for consistency.

For the full and maintained guide, use:
- `EXTERNAL_AGENT_GUIDE.md`

## Quick Rules

1. Use only canonical tools: `callput_*`.
2. Treat option-chain output as leg discovery, not direct single-leg execution.
3. Always run `callput_validate_spread` before `callput_request_quote`.
4. Execute only when validation is `Valid` and `maxTradableQuantity > 0`.
5. After broadcast, always poll `callput_check_tx_status`.
6. For lifecycle management:
   - pre-expiry: `callput_close_position`
   - expired: `callput_settle_position`

## Minimal Flow

1. Market analysis:
   - `callput_get_available_assets`
   - `callput_get_market_trends`
   - `callput_get_option_chains`
2. Direction setup:
   - Bullish -> `BuyCallSpread`
   - Bearish -> `BuyPutSpread`
3. Discovery and validation:
   - optional `callput_get_greeks`
   - required `callput_validate_spread`
4. Execute and manage:
   - `callput_approve_usdc` (if needed)
   - `callput_request_quote`
   - `callput_check_tx_status`
   - `callput_get_my_positions` + `close/settle`

## Security

- Never pass private keys through MCP tools.
- Keep signing and key custody inside the agent runtime or wallet layer.
- Treat MCP outputs as unsigned transaction instructions.
