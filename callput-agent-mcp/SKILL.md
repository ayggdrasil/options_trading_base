---
name: callput-option-trader
description: Compact Callput trading skill for Base L2. Enforce spread-only execution with strict validation, liquidity checks, and close/settle lifecycle rules.
license: MIT
---

# Callput Option Trader (Compact)

Use this skill when the user asks for:
- BTC/ETH options market read
- spread entry (bullish/bearish)
- open position management (close/settle)

## One-line Intent
`시장 분석 -> 방향 결정 -> 스프레드 후보 검증 -> 실행/포지션 정리`

## Non-Negotiable Rules

1. `callput_get_option_chains` output is for leg discovery, not direct single-leg execution.
2. Never attempt vanilla single-leg trading via MCP.
3. Always call `callput_validate_spread` before `callput_request_quote`.
4. Trade only if:
   - `status == "Valid"`
   - `details.maxTradableQuantity > 0`
5. After broadcast, always call `callput_check_tx_status`.
6. If `cancelled`, refresh legs and repeat validation.
7. For existing positions:
   - pre-expiry: `callput_close_position`
   - expired: `callput_settle_position`
8. Never expose private keys in MCP output.

## Context Overflow Guardrails

1. Do not keep raw chain responses in long conversation memory.
2. Immediately compress tool output into a compact state object and discard raw payload.
3. Keep candidate set small:
   - max 5 candidate spreads per cycle
   - max 6 Greeks lookups per cycle
4. Always filter chain queries as tightly as possible:
   - set `underlying_asset`
   - set `option_type` when known
   - set `expiry_date` once target tenor is chosen
5. Persist only minimal fields across turns:
   - `asset`, `bias`, `target_expiry`
   - `candidate_ids` (short list)
   - `selected_long_leg_id`, `selected_short_leg_id`
   - `validation_status`, `maxTradableQuantity`
   - `last_tx_hash`, `last_tx_status`
6. During status polling, only store latest status snapshot, not full history.
7. If context window grows, drop historical reasoning and re-bootstrap from the compact state object.

## 4-Step Flow

### 1) Market Analysis
- `callput_get_available_assets`
- `callput_get_market_trends`
- `callput_get_option_chains(underlying_asset, expiry_date?, option_type?)`

### 2) Direction Setup
- Bullish: usually start from `BuyCallSpread`
- Bearish: usually start from `BuyPutSpread`
- Advanced agents may use sell spreads, but validation rules still apply.

### 3) Tradable Spread Discovery
- Optional filtering: `callput_get_greeks(option_id)`
- Required feasibility: `callput_validate_spread(strategy, long_leg_id, short_leg_id)`

### 4) Execute or Adjust
- Open flow:
  - `callput_approve_usdc(amount)` (if needed)
  - `callput_request_quote(...)`
  - user signs and broadcasts
  - `callput_check_tx_status(tx_hash, is_open=true)` until terminal status
- Position adjustment:
  - `callput_get_my_positions(address)`
  - pre-expiry close: `callput_close_position(...)` then `callput_check_tx_status(..., is_open=false)`
  - expired settle: `callput_settle_position(option_id, underlying_asset)`

## Failure Handling Template

- Validation fails: pick new legs and retry validation.
- Tx status `pending`: poll again in 15-30 seconds.
- Tx status `cancelled`: refresh market data, re-select legs, re-validate, re-quote.
- Tx status `reverted`: check approval, params, and chain conditions.

## Short Commands for External Agents
- `ETH 약세 시나리오로 거래 가능한 Put Spread 1개만 검증해서 실행까지 진행해.`
- `포지션 점검 후 만기 전은 close, 만기 후는 settle로 정리해.`
- `시장 분석 + 검증 통과한 스프레드 후보만 보고하고 실행은 하지 마.`
