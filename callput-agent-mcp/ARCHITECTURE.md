# Callput Agent MCP Architecture

This document describes how external agents execute Callput spread trades safely through MCP.

## 1. System Overview

```text
Agent Runtime (strategy, wallet, signing)
        |
        | MCP
        v
Callput MCP Server (this project)
  - discovery from S3 market feed
  - spread validation and liquidity checks
  - unsigned tx generation
  - async status tracking
        |
        | JSON-RPC + HTTP
        v
Base L2 contracts + S3 market data
```

## 2. Responsibility Split

### Agent Runtime
- user intent handling
- strategy selection
- private key custody
- transaction signing and broadcast
- retry and risk policy

### MCP Server
- market discovery (`callput_get_option_chains`)
- validation (`callput_validate_spread`)
- quote generation (`callput_request_quote`)
- position tools (`close`, `settle`, `status`, `positions`)

### On-chain and Data Sources
- S3 market feed: primary tradable listing context
- contracts: execution, request status, vault liquidity, settlement

## 3. Key Architectural Rule

`callput_get_option_chains` returns vanilla legs for **selection**, not direct single-leg execution.

Execution path is spread-only via:
- `callput_validate_spread`
- `callput_request_quote`

## 4. Core Data Flow

### 4.1 Discovery

```text
Agent -> callput_get_option_chains
      -> MCP fetches S3 market-data.json
      -> filters available options and spot-adjacent strikes
      -> returns compact arrays [Strike, Price, Liquidity, MaxQty, OptionID]
```

### 4.2 Validation

`callput_validate_spread` checks:
- both legs exist in S3 market snapshot
- same underlying and expiry
- strike-direction constraints by strategy
- minimum spread price floor
  - BTC >= 60
  - ETH >= 3
- estimated vault-constrained `maxTradableQuantity`

Validation output is the gate for execution.

### 4.3 Quote Generation

`callput_request_quote`:
- re-runs spread validation internally
- encodes `PositionManager.createOpenPosition` calldata
- returns unsigned tx payload + approval metadata

### 4.4 Async Execution Status

`callput_check_tx_status`:
- reads receipt
- parses `GenerateRequestKey`
- checks `openPositionRequests` or `closePositionRequests`
- returns `pending | executed | cancelled` (+ details)

## 5. Position Lifecycle

- Open: validate -> quote -> sign/broadcast -> status polling
- Close (pre-expiry): `callput_close_position` -> status polling (`is_open=false`)
- Settle (post-expiry): `callput_settle_position`

The server enforces expiry guardrails (expired positions must settle, not close).

## 6. Failure Modes and Recovery

### 6.1 `cancelled`
Likely price/liquidity drift before keeper execution.

Recovery:
1. refresh chains
2. re-select legs
3. re-validate
4. request new quote

### 6.2 Validation fails
Do not quote. Choose different legs/size and retry.

### 6.3 Allowance failures
Run `callput_approve_usdc` before quote execution.

## 7. Why This Design

- keeps private keys outside MCP
- makes trading policy explicit and auditable
- blocks most agent misinterpretations (vanilla direct trading, stale legs)
- supports deterministic orchestration loops for external agents

## 8. Tool Map

Canonical tools:
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

Legacy aliases remain for backward compatibility only.

