
export const VIEW_AGGREGATOR_ABI = [
    "function getAllOptionToken() public view returns (uint256[][][] memory result)",
    "function getOptionDetail(bytes32 _id) public view returns (uint16, address, uint40, uint48)",
];

export const OPTIONS_MARKET_ABI = [
    "function getOptionDetail(bytes32 _id) public view returns (uint16, address, uint40, uint48)",
];

export const VAULT_ABI = [
    "function poolAmounts(address token) external view returns (uint256)",
    "function reservedAmounts(address token) external view returns (uint256)",
    "function bufferAmounts(address token) external view returns (uint256)",
    "function tokenDecimals(address token) external view returns (uint256)"
];

export const POSITION_MANAGER_ABI = [
    "function createOpenPosition(uint16 _underlyingAssetIndex, uint8 _length, bool[4] memory _isBuys, bytes32[4] memory _optionIds, bool[4] memory _isCalls, uint256 _minSize, address[] memory _path, uint256 _amountIn, uint256 _minOutWhenSwap, address _leadTrader) external payable returns (bytes32)",
    "function executionFee() view returns (uint256)",
];

export const SETTLE_MANAGER_ABI = [
    "function settlePosition(address[] memory _path, uint16 _underlyingAssetIndex, bytes32 _optionId, uint256 _minOut, bool _withdrawETH) external payable"
];

export const ERC20_ABI = [
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function balanceOf(address account) view returns (uint256)",
];
