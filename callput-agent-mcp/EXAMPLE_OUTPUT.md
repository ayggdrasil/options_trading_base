# Example Outputs (Current MCP Schema)

All examples below use canonical tool names from `src/index.ts`.

## 1) `callput_get_option_chains`

Request:
```json
{
  "name": "callput_get_option_chains",
  "arguments": {
    "underlying_asset": "WETH"
  }
}
```

Example response:
```json
{
  "asset": "WETH",
  "underlying_price": 1996.12,
  "format": "[Strike, Price, Liquidity, MaxQty, OptionID]",
  "note": "Showing ~20 strikes around Spot Price. Filtered by user request.",
  "expiries": {
    "27FEB26": {
      "days": 6,
      "call": [
        [1800, 196.12, 15188.85, 8.4383, "111..."],
        [1850, 146.79, 15188.85, 8.2102, "112..."]
      ],
      "put": [
        [1800, 0.47, 15188.85, 8.4383, "211..."]
      ]
    }
  },
  "last_updated": "2026-02-18T11:06:42.457Z"
}
```

Important:
- This is leg discovery output.
- Do not directly execute single vanilla legs.

## 2) `callput_validate_spread`

Request:
```json
{
  "name": "callput_validate_spread",
  "arguments": {
    "strategy": "BuyCallSpread",
    "long_leg_id": "111...",
    "short_leg_id": "112..."
  }
}
```

Valid response:
```json
{
  "status": "Valid",
  "details": {
    "asset": "ETH",
    "spreadCost": 52.33,
    "longStrike": 1800,
    "shortStrike": 1850,
    "longPrice": 196.12,
    "shortPrice": 143.79,
    "expiry": 1772140800,
    "maxTradableQuantity": 289,
    "longLegParsed": {},
    "shortLegParsed": {}
  },
  "message": "Spread is valid and tradable."
}
```

Invalid response example:
```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Validation Failed: Spread Price too low ($1.40). Minimum allowed is $3 for ETH. Increase Long Strike or decrease Short Strike."
    }
  ]
}
```

## 3) `callput_request_quote`

Request:
```json
{
  "name": "callput_request_quote",
  "arguments": {
    "strategy": "BuyCallSpread",
    "long_leg_id": "111...",
    "short_leg_id": "112...",
    "amount": 100,
    "slippage": 0.5
  }
}
```

Example response:
```json
{
  "to": "0x83B04701B227B045CBBAF921377137fF595a54af",
  "data": "0x1a2b3c...",
  "value": "60000000000000",
  "chain_id": 8453,
  "description": "Open Position: BuyCallSpread on ETH (Long $1800 / Short $1850) | Cost: $52.33",
  "approval_target": "0xfc61ba50AE7B9C4260C9f04631Ff28D5A2Fa4EB2",
  "approval_token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "instruction": "Ensure you have approved 'approval_token' (USDC) for 'approval_target' (Router) to spend amount >= 'amount'"
}
```

## 4) `callput_check_tx_status`

Pending:
```json
{
  "status": "pending",
  "request_key": "0xabc...",
  "tx_hash": "0xdef...",
  "message": "Order is pending execution by the keeper. Check again in ~30 seconds."
}
```

Executed:
```json
{
  "status": "executed",
  "request_key": "0xabc...",
  "tx_hash": "0xdef...",
  "account": "0x123...",
  "option_token_id": "111...",
  "amount_in": "100000000",
  "size_out": "287000000000000000",
  "message": "Position opened successfully!"
}
```

Cancelled:
```json
{
  "status": "cancelled",
  "request_key": "0xabc...",
  "tx_hash": "0xdef...",
  "message": "Order was cancelled. This can happen due to price movement or insufficient liquidity. Funds are returned."
}
```

If cancelled, refresh legs and restart validation.

## 5) `callput_get_my_positions`

```json
{
  "account": "0x123...",
  "positions": [
    {
      "asset": "ETH",
      "expiry": "Fri, 27 Feb 2026 08:00:00 GMT",
      "option_id": "111...",
      "size": "287000000000000000",
      "avg_price": "52.33",
      "is_buy": true,
      "strategy": "BuyCallSpread",
      "is_settled": false,
      "pnl": 3.12
    }
  ],
  "total_active_count": 1
}
```

## 6) `callput_close_position` vs `callput_settle_position`

- use `callput_close_position` only for non-expired positions
- use `callput_settle_position` for expired positions

`callput_close_position` on expired option returns an error instructing settlement.

