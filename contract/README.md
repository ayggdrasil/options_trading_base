# Contract Version Management

| Chain | Version | Last Update | Status |
|------|------|----------------|------|
| Base | 1.1.0 | 2024-12-20 | ✅ Latest |
| Arbitrum One | 1.0.0 | 2024-12-01 | ✅ Latest |

## Upgrade History

### 1.1.0 (2025-01-08)
- Chain: Arbitrum One, Base
- Changes: Modify settlePositions function in SettleManager.sol and olp rp apr related function in OlpManager.sol and VaultUtils.sol
- Targets: SettleManager.sol, OlpManager.sol, VaultUtils.sol

### 1.1.0 (2025-01-07)
- Chain: Base
- Changes: Increase MAX_UPDATE_DURATION from 30 minutes to 90 minutes, and set update duration from 180 to 3900
- Targets: PositionValueFeed.sol, SpotPriceFeed.sol