---
name: callput-option-trader
description: Comprehensive toolset for analyzing and trading on-chain options via the Callput protocol on Base L2. Use this skill when the user wants to trade options, analyze option market data (IV, Greeks), execute spread strategies (Bull Call, Bear Put, etc.), or manage existing positions (settle/close).
license: MIT
---

# Callput Option Trader

This skill provides specialized capability to trade on-chain options on the Callput protocol.

## Workflow overview

1.  **Market Analysis**: Identify opportunities using `callput_get_available_assets`.
2.  **Option Search**: Fetch option chains for a selected asset using `callput_get_option_chains`.
3.  **Strategy Selection & Filtering**:
    -   Select a strategy (e.g., Bull Call Spread).
    -   **Critical**: Filter candidates by Greeks (Delta, Gamma) using `callput_get_greeks` *before* decision.
4.  **Execution** (Open/Close/Settle):
    -   **Validation**: Use `callput_validate_spread` to check liquidity and validity.
    -   **Trade**: Use `callput_request_quote` to generate the transaction.
    -   **Settle**: Use `callput_settle_position` for expired positions.

## Core Principles

-   **Spreads Only**: The protocol (and this agent) specializes in Spreads (Vertical Spreads) for capital efficiency. Single leg trading is generally discouraged or not supported by these tools.
-   **Validation First**: Always dry-run a trade with `validate_spread` to check for Vault liquidity (`maxTradableQuantity`).
-   **Greek-Driven**: Do not just pick random strikes. Use Delta and Theta to align with the market view.

## Tools

### 1. Market Discovery
-   `callput_get_available_assets`: Returns list of supported assets (e.g., BTC, ETH) and their expiry dates.
    -   *Use when*: Starting a session to see what is tradable.

### 2. Option Chain & Analysis
-   `callput_get_option_chains(underlying_asset, expiry_date, option_type)`: Returns the option board.
    -   **Output**: `[Strike, Price, Liquidity, MaxQty, OptionID]`
    -   *Use when*: You need to see prices and available strikes.
-   `callput_get_greeks(option_id)`: **Crucial for professional trading**.
    -   **Returns**: Delta, Gamma, Vega, Theta, IV.
    -   *Use when*: Filtering strikes. Example: "Find me a Call with Delta 0.3".

### 3. Validation & Execution
-   `callput_validate_spread(strategy, long_leg_id, short_leg_id)`:
    -   *Purpose*: Checks if the spread is valid and if the Vault has enough liquidity.
    -   **Output**: `maxTradableQuantity`. If this is 0, **DO NOT PROCEED**.
-   `callput_request_quote(strategy, long_leg_id, short_leg_id, amount)`:
    -   *Purpose*: Generates the unsigned transaction to Open or Close a position.
    -   *Note*: Requires user approval to sign.

### 4. Settlement (Expired)
- `callput_settle_position(option_id, underlying_asset)`:
    - *Purpose*: Settle (claim profit/collateral) for an **expired** position.

### 5. Monitoring & Exit (Active)
- `callput_get_my_positions(address)`:
    - *Purpose*: View open positions, holding sizes, and real-time PnL.
- `callput_close_position(address, option_id, size, underlying_asset)`:
    - *Purpose*: Exit a position **before expiry** (Take Profit / Stop Loss).
- `callput_get_market_trends()`:
    - *Purpose*: Get a high-level summary of BTC/ETH IV and spot prices to decide on exits.

## Standard Operating Procedure (SOP)

> **IMPORTANT**: Every trade requires 3 mandatory steps: **Approve → Execute → Verify**. Skipping any step causes failures.

### Phase 1: Analysis & Selection
1.  `callput_get_available_assets()` → pick asset (BTC/ETH).
2.  `callput_get_option_chains(underlying_asset)` → browse strikes & expiries.
3.  `callput_get_greeks(option_id)` → pick legs with desired Delta.

### Phase 2: Strategy & Validation
1.  Pick strategy: `BuyCallSpread` (bullish), `BuyPutSpread` (bearish).
2.  `callput_validate_spread(strategy, long_leg_id, short_leg_id)` → ensure `maxTradableQuantity > 0`.

### Phase 3: USDC Approval (MANDATORY, first time only)
1.  `callput_approve_usdc(amount)` → generates approval tx.
2.  User signs the approval transaction.
3.  Without this step, the trade transaction **will revert**.

### Phase 4: Execution
1.  `callput_request_quote(strategy, long_leg_id, short_leg_id, amount)` → generates trade tx.
2.  User signs the trade transaction. **Save the tx hash.**

### Phase 5: Post-Trade Verification (MANDATORY)
1.  Wait ~15-30 seconds after tx is mined.
2.  `callput_check_tx_status(tx_hash, is_open=true)` → check status.
3.  If **"pending"**: wait 30s, try again.
4.  If **"executed"**: confirmed ✓.
5.  If **"cancelled"**: retry with fresh quote.

### Phase 6: Monitoring & Exit
-   `callput_get_my_positions(address)` → view PnL.
-   `callput_get_market_trends()` → check IV and spot prices.
-   To exit: `callput_close_position(...)` → then `callput_check_tx_status(tx_hash, is_open=false)`.
-   Post-expiry: `callput_settle_position(option_id, underlying_asset)`.

## Common Pitfalls
-   **No Approval = Revert**: Always `callput_approve_usdc` before the first trade.
-   **No Status Check = Blind**: Always `callput_check_tx_status` after submitting.
-   **Liquidity = 0**: Check `maxTradableQuantity` in validation.
-   **Deep ITM**: Wide spreads, prefer ATM or slightly OTM.
-   **Stop-Loss**: Track PnL with `get_my_positions`, exit with `close_position`.
