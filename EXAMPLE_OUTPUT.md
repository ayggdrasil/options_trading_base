# Example API Output - Enhanced Human-Readable Format

## `get_option_chains` Response

When an agent calls `get_option_chains` with `underlying_asset: "WETH"`, they now receive:

```json
{
  "underlying_asset": "WETH",
  "total_options": 2,
  "options": [
    {
      // Raw blockchain data
      "option_token_id": "12345678901234567890...",
      "underlying_asset": "WETH",
      "strategy": "BuyCall",
      "strike_price": 3000,
      "expiry": 1730000000,
      "liquidity": "500000000000000000",
      "vault_index": 0,
      
      // Human-readable display format
      "display": {
        "instrument": "WETH-20FEB24-3000-C",
        "type": "Call",
        "side": "Buy",
        "option_type": "Vanilla",
        "expiry_date": "2024-02-20",
        "expiry_formatted": "20FEB24",
        "days_to_expiry": 45,
        "strike": 3000,
        "paired_strike": null,
        "paired_instrument": null,
        "description": "Buy Call @ 3000 expiring 20FEB24",
        "liquidity_formatted": "0.5000 WETH"
      }
    },
    {
      "option_token_id": "98765432109876543210...",
      "underlying_asset": "WETH",
      "strategy": "BuyCallSpread",
      "strike_price": 3000,
      "expiry": 1730000000,
      "liquidity": "1200000000000000000",
      "vault_index": 0,
      
      "display": {
        "instrument": "WETH-20FEB24-3000-C",
        "type": "Call",
        "side": "Buy",
        "option_type": "Spread",
        "expiry_date": "2024-02-20",
        "expiry_formatted": "20FEB24",
        "days_to_expiry": 45,
        "strike": 3000,
        "paired_strike": 3200,
        "paired_instrument": "WETH-20FEB24-3200-C",
        "description": "Buy Call Spread (3000/3200) expiring 20FEB24",
        "liquidity_formatted": "1.2000 WETH"
      }
    }
  ]
}
```

## Agent-Friendly Features

### 1. **Instrument Naming**
- Matches callput.app frontend: `WETH-20FEB24-3000-C`
- Format: `{ASSET}-{DDMONTHYY}-{STRIKE}-{C|P}`

### 2. **Date Formatting**
- `expiry_date`: ISO date for machine parsing (`2024-02-20`)
- `expiry_formatted`: Human-readable (`20FEB24`)
- `days_to_expiry`: Time until expiration (45 days)

### 3. **Strategy Breakdown**
- `type`: Call or Put
- `side`: Buy or Sell
- `option_type`: Vanilla or Spread
- `strategy`: Full strategy name (BuyCall, SellPutSpread, etc.)

### 4. **Natural Language Description**
Agents can directly present to users:
- "Buy Call @ 3000 expiring 20FEB24"
- "Buy Call Spread (3000/3200) expiring 20FEB24"

### 5. **Spread Support**
For spread strategies:
- `paired_strike`: The second leg's strike price
- `paired_instrument`: Full instrument name for the paired option

## Usage in Agent Conversations

### Example 1: Simple Query
**User**: "Show me available WETH options"

**Agent** (using MCP):
```typescript
const data = await mcp.call("get_option_chains", { underlying_asset: "WETH" });
```

**Agent Response**:
"I found 2 WETH options on Base:
1. **Buy Call @ 3000** expiring 20FEB24 (45 days, 0.5 WETH liquidity)
2. **Buy Call Spread (3000/3200)** expiring 20FEB24 (45 days, 1.2 WETH liquidity)"

### Example 2: Filtering and Recommendation
**User**: "Find me a Call option expiring in about a month"

**Agent Logic**:
```typescript
const data = await mcp.call("get_option_chains", { underlying_asset: "WETH" });
const filtered = data.options.filter(o => 
  o.display.type === "Call" && 
  o.display.days_to_expiry >= 25 && 
  o.display.days_to_expiry <= 35
);
```

**Agent Response**:
"I recommend the **WETH-20FEB24-3000-C** option:
- Strategy: Buy Call
- Strike: $3000
- Expires in 30 days
- Available liquidity: 0.5 WETH"

## Benefits for Agents

1. **No additional formatting needed** - Display data is ready to present
2. **Easy filtering** - Use `display.days_to_expiry`, `display.type`, etc.
3. **Clear communication** - `description` field is ready for user presentation
4. **Full context** - Both raw data (for transactions) and human-readable format available
5. **Spread awareness** - Agents can understand multi-leg strategies

## Comparison: Before vs After

### Before (Raw Only)
```json
{
  "option_token_id": "12345...",
  "strategy": "BuyCall",
  "strike_price": 3000,
  "expiry": 1730000000,
  "liquidity": "500000000000000000"
}
```

Agent needs to:
- Convert timestamp to date
- Format liquidity (divide by 1e18)
- Generate description text
- Calculate days to expiry

### After (Enhanced)
```json
{
  ...,
  "display": {
    "description": "Buy Call @ 3000 expiring 20FEB24",
    "days_to_expiry": 45,
    "liquidity_formatted": "0.5000 WETH"
  }
}
```

Agent can immediately use these values! ✅
