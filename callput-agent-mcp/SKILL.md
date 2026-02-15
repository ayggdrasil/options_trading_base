# Skill: Callput Option Trader

## Description
This skill grants the agent the capability to trade on-chain options via the Callput protocol on Base L2. It specializes in **Spread Trading** (Bull Call, Bear Put, Credit Spreads) to maximize capital efficiency and limit risk.

## Tools
The agent must have access to the following MCP tools:
- `get_available_assets`: Check supported tokens (BTC, ETH).
- `get_option_chains`: Fetch real-time option board (Strike, Price, Liquidity).
- `validate_spread`: **CRITICAL**. Checks spread validity, calculates collateral/premium, and determines `maxTradableQuantity` based on Vault liquidity.
- `request_quote`: Generates the unsigned transaction payload for execution.
- `get_greeks`: **NEW**. Check Delta, Gamma, Vega, Theta for specific Option IDs.

## Standard Operating Procedure (SOP)

### Phase 1: Market Analysis
1. **Fetch Data**: Call `get_option_chains(asset="WBTC")`.
2. **Analyze Board**: Look for liquidity (`Liquidity` field > 0) and favorable prices.
   - *Note*: `Liquidity` represents the Vault's available USDC balance.

### Phase 2: Strategy Selection
Select a strategy based on market view:
- **Bullish**: `BuyCallSpread` (Debit) or `SellPutSpread` (Credit).
- **Bearish**: `BuyPutSpread` (Debit) or `SellCallSpread` (Credit).

### Phase 2: Asset Discovery
1. Call `get_available_assets` to list supported tokens (e.g., BTC, ETH).
2. Call `get_option_chains` for a specific asset.
   - Response contains **available** individual options (filtered by `isOptionAvailable` from protocol).
   - Use these options to construct Spreads (Buy/Sell Call/Put Spreads).

### Phase 3: Constructing a Strategy
- **Bull Call Spread**: Buy Low Strike Call, Sell High Strike Call.
- **Bear Put Spread**: Buy High Strike Put, Sell Low Strike Put.
- **Bear Call Spread**: Sell Low Strike Call, Buy High Strike Call. (Credit Spread)
- **Bull Put Spread**: Sell High Strike Put, Buy High Strike Call. (Credit Spread)

### Phase 3: Risk Management (Greeks)
**Before Execution**:
- Use `get_greeks(option_id)` for the legs you are interested in.
- **Delta**: Measures directional risk.
- **Gamma**: Measures convexity (acceleration of Delta).
- **Theta**: Time decay (Sell strategies want high Theta).
- **Vega**: Volatility sensitivity.

### Phase 4: Pre-Trade Validation (Mandatory)
Before requesting a quote, you **MUST** validate the trade to check vault capacity.
1. Call `validate_spread` with your proposed `long_leg_id` and `short_leg_id`.
2. **Check `maxTradableQuantity`** in the response.
   - This value is calculated based on **OLP (Vault) Liquidity** and your Spread's collateral/premium requirement.
   - If `0`: The Vault has insufficient liquidity. **ABORT** or pick different strikes.
   - If `> 0`: You may proceed with an amount up to this limit.

### Phase 5: Execution
1. Call `request_quote` with the successful IDs and a valid `amount` (<= maxTradableQuantity).
2. The tool returns a transaction object (`to`, `data`).
3. **Action**: Sign and broadcast this transaction.

## Error Handling
- **"Spread Price too low"**: The spread is narrower than the minimum tick allowed. Widen the strikes.
- **"Liquidity is 0"**: The specific Vault for the Long Leg is empty. Try a different expiry or strike range that might map to a different Vault (S/M/L).
- **Rate Limits**: If tools fail/timeout, wait 2-5 seconds before retrying.

## Example Reasoning Loop
> "I want to long BTC. I see a Call Spread $63k/$64k.
> 1. `validate_spread` confirms it is valid and Max Qty is 16.
> 2. I have budget for 5 contracts. 5 < 16, so it's safe.
> 3. Calling `request_quote(amount=5)`.
> 4. Transaction generated. Sending..."
