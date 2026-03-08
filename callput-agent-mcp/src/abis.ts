
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
    "function createClosePosition(uint16 _underlyingAssetIndex, uint256 _optionTokenId, uint256 _size, address[] memory _path, uint256 _minAmountOut, uint256 _minOutWhenSwap, bool _withdrawNAT) external payable returns (bytes32)",
    "function executionFee() view returns (uint256)",
    "function openPositionRequests(bytes32 key) view returns (address account, uint16 underlyingAssetIndex, uint40 expiry, uint256 optionTokenId, uint256 minSize, uint256 amountIn, uint256 minOutWhenSwap, bool isDepositedInNAT, uint40 blockTime, uint8 status, uint256 sizeOut, uint256 executionPrice, uint40 processBlockTime, uint256 amountOut)",
    "function closePositionRequests(bytes32 key) view returns (address account, uint16 underlyingAssetIndex, uint40 expiry, uint256 optionTokenId, uint256 size, uint256 minAmountOut, uint256 minOutWhenSwap, bool withdrawNAT, uint40 blockTime, uint8 status, uint256 amountOut, uint256 executionPrice, uint40 processBlockTime)",
    "event GenerateRequestKey(address indexed account, bytes32 indexed key, bool indexed isOpen)",
];

export const SETTLE_MANAGER_ABI = [
    "function settlePosition(address[] memory _path, uint16 _underlyingAssetIndex, uint256 _optionTokenId, uint256 _minOutWhenSwap, bool _withdrawNAT) external payable"
];

export const ERC20_ABI = [
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
];
