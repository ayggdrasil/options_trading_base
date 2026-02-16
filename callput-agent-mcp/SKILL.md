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

### Phase 1: Analysis & Selection

1.  **Identify Asset**: `callput_get_available_assets()` -> User selects e.g., "BTC".
2.  **Fetch Chain**: `callput_get_option_chains(underlying_asset="BTC")`.
3.  **Analyze Greeks**:
    -   Iterate through interesting strikes.
    -   Call `callput_get_greeks(option_id)` for candidates.
    -   *Example*: "I want a Long Call Leg with Delta ~0.5".

### Phase 2: Strategy Construction

Select a Spread Strategy based on Greeks and View:

| View | Strategy | Structure |
| :--- | :--- | :--- |
| **Bullish** | **Bull Call Spread** | Buy Low Strike Call + Sell High Strike Call |
| **Bearish** | **Bear Put Spread** | Buy High Strike Put + Sell Low Strike Put |
| **Neutral/Range** | *Credit Spreads* | (Advanced) Sell OTM Put Spread or Call Spread |

### Phase 3: Pre-Trade Validation (MANDATORY)

**Before requesting a quote**, you MUST run validation:

```javascript
// Example: Checking a Bull Call Spread
const validation = await callput_validate_spread({
  strategy: "BuyCallSpread",
  long_leg_id: "0x123...", 
  short_leg_id: "0x456..."
});

if (validation.maxTradableQuantity > 0) {
  // Safe to proceed
}
```

### Phase 4: Execution

1.  Call `callput_request_quote` with the IDs and Amount.
2.  Output the transaction to the user for signing.

### Phase 5: Monitoring & Risk Management
1.  Periodically call `callput_get_my_positions(address)`.
2.  Check PnL and Delta exposure.
3.  Check `callput_get_market_trends()` for IV spikes. If IV is extremely high, consider selling (closing) long positions to harvest "IV Crush".

### Phase 6: Exit (Close or Settle)
-   **Manual Exit**: Call `callput_close_position` if PnL target is reached or Stop-Loss is triggered.
-   **Expiry**: If held until expiry, call `callput_settle_position`.

## Common Pitfalls

-   **Stop-Loss**: Agents should implement their own stop-loss logic using `get_my_positions` and `close_position`.

-   **Liquidity = 0**: The `Liquidity` field in option chains is the Vault's USDC balance. If it's low, large trades will fail. Always check `maxTradableQuantity` in validation.
-   **Deep ITM**: Deep In-The-Money options often have wide spreads or low liquidity. Prefer ATM (At-The-Money) or slightly OTM (Out-of-The-Money).
-   **Approvals**: The user must approve the `ROUTER` to spend their USDC before the first trade.
