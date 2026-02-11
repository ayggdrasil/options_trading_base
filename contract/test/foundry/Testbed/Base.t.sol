// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import {OwnableUpgradeable} from "../../../contracts/proxy/OwnableUpgradeable.sol";
import {IVaultUtils} from "../../../contracts/interfaces/IVaultUtils.sol";
import {IPositionManager} from "../../../contracts/interfaces/IPositionManager.sol";
import {IOptionsAuthority} from "../../../contracts/interfaces/IOptionsAuthority.sol";
import {IOptionsToken} from "../../../contracts/tokens/interfaces/IOptionsToken.sol";
import {IWETH} from "../../../contracts/tokens/interfaces/IWETH.sol";
import {SettleManager} from "../../../contracts/SettleManager.sol";
import {PositionManager} from "../../../contracts/PositionManager.sol";
import {Referral} from "../../../contracts/peripherals/Referral.sol";
import {Controller} from "../../../contracts/Controller.sol";
import {Utils} from "../../../contracts/Utils.sol";
import {Vault} from "../../../contracts/Vault.sol";
import {VaultUtils} from "../../../contracts/VaultUtils.sol";
import {ViewAggregator} from "../../../contracts/ViewAggregator.sol";
import {OlpManager} from "../../../contracts/OlpManager.sol";
import {RewardDistributor} from "../../../contracts/staking/RewardDistributor.sol";
import {RewardTracker} from "../../../contracts/staking/RewardTracker.sol";
import {RewardRouterV2} from "../../../contracts/staking/RewardRouterV2.sol";
import {USDG} from "../../../contracts/tokens/USDG.sol";
import {OLP} from "../../../contracts/tokens/OLP.sol";
import {IERC20} from "../../../lib/forge-std/src/interfaces/IERC20.sol";
import {Setup} from "../Setup.t.sol";
import {MobyTestUtils} from "../MobyTestUtils.sol";
import {ProxyAdmin} from "../../../lib/openzeppelin-contracts/contracts/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "../../../lib/openzeppelin-contracts/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {IVaultUtils} from "../../../contracts/interfaces/IVaultUtils.sol";

enum VaultType {
    S,
    M,
    L
}

contract BaseTest is Setup, MobyTestUtils {
    function testTimestampUTC() public pure {
        uint40 ts = (getTimestamp(2024, 8, 22, 8));
        (uint16 year, uint8 month, uint8 day, uint8 hour) = getDate(ts);
        console.log(string(abi.encodePacked(uint256(ts), " - ", uint256(year), " - ", uint256(month), " - ", uint256(day), " - ", uint256(hour))));
    }

    function testOpenPosition() public {
        // 1. prepare
        deal(user, 100 ether);
        deal(address(usdc), user, 100000e6);

        uint16 underlyingIndex = 1; // BTC
        uint40 expiry = get0DteExpiry();
        (uint16 year, uint8 month, uint8 day, uint8 hour) = getDate(expiry);
        uint48 strikePrice = 100000;

        console.log(string(abi.encodePacked(
            "creatOpenPosition with expiry: ", 
            uintToString(uint256(year)), ".", 
            uintToString(uint256(month)), ".", 
            uintToString(uint256(day)), ".", 
            uintToString(uint256(hour)), ".", 
            "(UTC) strikePrice: ", 
            uintToString(uint256(strikePrice))
        )));

        // 2. User createOpenPosition
        vm.startPrank(user);
        {
            usdc.approve(address(controller), type(uint).max);

            uint16 _underlyingIndex = uint16(1);
            uint8 _length = uint8(1);
            bool[4] memory _isBuys;
            _isBuys[0] = true;
            bytes32[4] memory _optionIds;
            _optionIds[0] = optionsMarket.getOptionId(underlyingIndex, expiry, strikePrice);
            bool[4] memory _isCalls;
            _isCalls[0] = true;
            uint _minSize = 0;
            uint _amountIn = 10e6;
            uint _minOutWhenSwap = 0;
            address _leadTrader = address(0);
            address[] memory _path = new address[](1);
            _path[0] = address(usdc);

            positionManager.createOpenPosition{value: positionManager.executionFee()}(
                _underlyingIndex,
                _length,
                _isBuys,
                _optionIds,
                _isCalls,
                _minSize,
                _path,
                _amountIn,
                _minOutWhenSwap,
                _leadTrader
            );
            console.log("OpenPosition Requested");
        }
        vm.stopPrank();

        (uint requestIndex, uint optionTokenId) = getLastRequestIndexAndOptionTokenId();

        // 3. KP_POSITION_PROCESSOR executes position with feeding MP, RP
        _executePosition(requestIndex, optionTokenId, 1e30, 0.01e30);

        // 4. Option expired.
        _timeElapse(expiry - block.timestamp + 10);

        // 5. KP_SPOT_FEEDER_1 feeds spot price & settlePrice. Assume BTC price is increased.
        _feedSpotAndSettlePrice(strikePrice + 1000, expiry);

        // 6. User settelPosition
        vm.startPrank(user);
        {
            address[] memory _path = new address[](1);
            _path[0] = address(wbtc);
            uint16 _underlyingIndex = uint16(1);
            uint _optionTokenId = optionTokenId;
            uint _minOutWhenSwap = 0;
            bool _withdrawETH = false;
            
            settleManager.settlePosition(
                _path,
                _underlyingIndex,
                _optionTokenId,
                _minOutWhenSwap,
                _withdrawETH
            );
        }
        vm.stopPrank();
    }

    function getLastRequestIndexAndOptionTokenId() public returns (uint, uint) {
        (, uint requestLength,) = positionManager.getRequestQueueLengths();
        ViewAggregator.PositionRequestInfo memory lastPosition;
        vm.startPrank(KP_POSITION_PROCESSOR);
        {
            (ViewAggregator.PositionRequestInfo[] memory positionRequestInfo,,,,,,,) = viewAggregator.positionRequestInfoWithOlpUtilityRatio(30);
            lastPosition = positionRequestInfo[0];
        return (requestLength - 1, lastPosition.optionTokenId);
        }
    }

    function _executePosition(uint requestIndex, uint optionTokenId, uint markPrice, uint riskPremium) internal {
        vm.startPrank(KP_POSITION_PROCESSOR);
        {
            (, uint positionEndIndex,,,,,,) = viewAggregator.positionRequestInfoWithOlpUtilityRatio(30);
            uint[] memory _markPriceBitArray = new uint[](1);
            _markPriceBitArray[0] = markPrice;
            uint[] memory _riskPremiumBitArray = new uint[](1);
            _riskPremiumBitArray[0] = riskPremium;
            uint[] memory _optionTokenIds = new uint[](1);
            _optionTokenIds[0] = optionTokenId;
            uint[] memory _requestIndexes = new uint[](1);
            _requestIndexes[0] = requestIndex;

            fastPriceFeed.setPricesAndRiskPremiumsWithBitsAndExecute(
                address(positionManager),
                _markPriceBitArray,
                _riskPremiumBitArray,
                _optionTokenIds,
                _requestIndexes,
                block.timestamp,
                positionEndIndex,
                80
            );
            console.log("OpenPosition Executed");

        }
        vm.stopPrank();
    }

    function _feedSpotAndSettlePrice(uint newPrice, uint expiry) internal {
        // KP_SPOT_FEEDER_1 feed spot price of BTC.
        vm.startPrank(KP_SPOT_FEEDER_1);
        {
            address[] memory _tokens = new address[](1);
            _tokens[0] = address(wbtc);
            uint256[] memory _spotPrices = new uint256[](1);
            _spotPrices[0] = newPrice * 10e30;
            spotPriceFeed.feedSpotPrices(_tokens, _spotPrices, block.timestamp + 1000);
        }
        vm.stopPrank();

        // KP_SETTLE_OPERATOR feeds settlePrice
        vm.startPrank(KP_SETTLE_OPERATOR);
        {
            address[] memory _tokens = new address[](1);
            _tokens[0] = address(wbtc);
            uint256[] memory _settlePrices = new uint256[](1);
            _settlePrices[0] = newPrice * 10e30;
            settlePriceFeed.feedSettlePrices(_tokens, _settlePrices, uint256(expiry));
        }
        vm.stopPrank();
    }

    function testParams() public {
        _testAddress();
        _testOwnership();
        _testAuthority();
        _testOptionsAuthority();
        _testVaultPriceFeed();
        _testOptionsMarket();
        _testVault(VaultType.S);
        _testVault(VaultType.M);
        _testVault(VaultType.L);
        _testVaultUtils(VaultType.S);
        _testVaultUtils(VaultType.M);
        _testVaultUtils(VaultType.L);
        _testUSDG(VaultType.S);
        _testUSDG(VaultType.M);
        _testUSDG(VaultType.L);
        _testOlp(VaultType.S);
        _testOlp(VaultType.M);
        _testOlp(VaultType.L);
        _testOlpManager(VaultType.S);
        _testOlpManager(VaultType.M);
        _testOlpManager(VaultType.L);
        _testRewardDistributor(VaultType.S);
        _testRewardDistributor(VaultType.M);
        _testRewardDistributor(VaultType.L);
        _testRewardTracker(VaultType.S);
        _testRewardTracker(VaultType.M);
        _testRewardTracker(VaultType.L);
        _testRewardRouterV2(VaultType.S);
        _testRewardRouterV2(VaultType.M);
        _testRewardRouterV2(VaultType.L);
        _testController();
        _testPositionManager();
        _testSettleManager();
        _testFeeDistributor();
        _testBtcOptionsToken();
        _testEthOptionsToken();
        _testFastPriceEvents();
        _testFastPriceFeed();
        _testPositionValueFeed();
        _testSettlePriceFeed();
        _testSpotPriceFeed();
        _testPrimaryOracle();
        _testViewAggregator();
        _testReferral();
    }

     function _testAddress() private {
        console.log("==========Address==========");
        // console.log("proxyAdmin : ", address(proxyAdmin));
        // console.log("optionsAuthority : ", address(optionsAuthority));
        // console.log("vaultPriceFeed : ", address(vaultPriceFeed));
        // console.log("optionsMarket : ", address(optionsMarket));
        // console.log("sVault : ", address(sVault));
        // console.log("mVault : ", address(mVault));
        // console.log("lVault : ", address(lVault));
        // console.log("sVaultUtils : ", address(sVaultUtils));
        // console.log("mVaultUtils : ", address(mVaultUtils));
        // console.log("lVaultUtils : ", address(lVaultUtils));
        // console.log("sUSDG : ", address(sUSDG));
        // console.log("mUSDG : ", address(mUSDG));
        // console.log("lUSDG : ", address(lUSDG));
        // console.log("sOlp : ", address(sOlp));
        // console.log("mOlp : ", address(mOlp));
        // console.log("lOlp : ", address(lOlp));
        // console.log("sOlpManager : ", address(sOlpManager));
        // console.log("mOlpManager : ", address(mOlpManager));
        // console.log("lOlpManager : ", address(lOlpManager));
        // console.log("sRewardDistributor : ", address(sRewardDistributor));
        // console.log("mRewardDistributor : ", address(mRewardDistributor));
        // console.log("lRewardDistributor : ", address(lRewardDistributor));
        // console.log("sRewardTracker : ", address(sRewardTracker));
        // console.log("mRewardTracker : ", address(mRewardTracker));
        // console.log("lRewardTracker : ", address(lRewardTracker));
        // console.log("sRewardRouterV2 : ", address(sRewardRouterV2));
        // console.log("mRewardRouterV2 : ", address(mRewardRouterV2));
        // console.log("lRewardRouterV2 : ", address(lRewardRouterV2));
        // console.log("controller : ", address(controller));
        // console.log("positionManager : ", address(positionManager));
        // console.log("settleManager : ", address(settleManager));
        // console.log("feeDistributor : ", address(feeDistributor));
        // console.log("btcOptionsToken : ", address(btcOptionsToken));
        // console.log("ethOptionsToken : ", address(ethOptionsToken));
        // console.log("fastPriceEvents : ", address(fastPriceEvents));
        // console.log("fastPriceFeed : ", address(fastPriceFeed));
        // console.log("positionValueFeed : ", address(positionValueFeed));
        // console.log("settlePriceFeed : ", address(settlePriceFeed));
        // console.log("spotPriceFeed : ", address(spotPriceFeed));
        // console.log("viewAggregator : ", address(viewAggregator));
        // console.log("referral : ", address(referral));
    }

    function _testOwnership() private {
        console.log("==========Ownership==========");
        // console.log("proxyAdmin : ", proxyAdmin.owner());
        // console.log("optionsAuthority : ", optionsAuthority.owner());
        // console.log("vaultPriceFeed : ", vaultPriceFeed.owner());
        // console.log("optionsMarket : ", optionsMarket.owner());
        // console.log("sVault : ", sVault.owner());
        // console.log("mVault : ", mVault.owner());
        // console.log("lVault : ", lVault.owner());
        // console.log("sVaultUtils : ", sVaultUtils.owner());
        // console.log("mVaultUtils : ", mVaultUtils.owner());
        // console.log("lVaultUtils : ", lVaultUtils.owner());
        // console.log("sUSDG : ", sUSDG.owner());
        // console.log("mUSDG : ", mUSDG.owner());
        // console.log("lUSDG : ", lUSDG.owner());
        // console.log("sOlp : ", sOlp.owner());
        // console.log("mOlp : ", mOlp.owner());
        // console.log("lOlp : ", lOlp.owner());
        // console.log("sOlpManager : ", sOlpManager.owner());
        // console.log("mOlpManager : ", mOlpManager.owner());
        // console.log("lOlpManager : ", lOlpManager.owner());
        // console.log("sRewardDistributor : ", sRewardDistributor.owner());
        // console.log("mRewardDistributor : ", mRewardDistributor.owner());
        // console.log("lRewardDistributor : ", lRewardDistributor.owner());
        // console.log("sRewardTracker : ", sRewardTracker.owner());
        // console.log("mRewardTracker : ", mRewardTracker.owner());
        // console.log("lRewardTracker : ", lRewardTracker.owner());
        // console.log("sRewardRouterV2 : ", sRewardRouterV2.owner());
        // console.log("mRewardRouterV2 : ", mRewardRouterV2.owner());
        // console.log("lRewardRouterV2 : ", lRewardRouterV2.owner());
        // console.log("controller : ", controller.owner());
        // console.log("positionManager : ", positionManager.owner());
        // console.log("settleManager : ", settleManager.owner());
        // console.log("feeDistributor : ", feeDistributor.owner());
        // console.log("btcOptionsToken : ", btcOptionsToken.owner());
        // console.log("ethOptionsToken : ", ethOptionsToken.owner());
        // console.log("fastPriceEvents : ", fastPriceEvents.owner());
        // console.log("fastPriceFeed : ", fastPriceFeed.owner());
        // console.log("positionValueFeed : ", positionValueFeed.owner());
        // console.log("settlePriceFeed : ", settlePriceFeed.owner());
        // console.log("spotPriceFeed : ", spotPriceFeed.owner());
        // console.log("viewAggregator : ", viewAggregator.owner());
        // console.log("referral : ", referral.owner());

        require(proxyAdmin.owner() == SAFE_DEPLOYER);
        require(optionsAuthority.owner() == SAFE_DEPLOYER);
        require(vaultPriceFeed.owner() == SAFE_DEPLOYER);
        require(optionsMarket.owner() == SAFE_DEPLOYER);
        require(sVault.owner() == SAFE_DEPLOYER);
        require(mVault.owner() == SAFE_DEPLOYER);
        require(lVault.owner() == SAFE_DEPLOYER);
        require(sVaultUtils.owner() == SAFE_DEPLOYER);
        require(mVaultUtils.owner() == SAFE_DEPLOYER);
        require(lVaultUtils.owner() == SAFE_DEPLOYER);
        require(sUSDG.owner() == SAFE_DEPLOYER);
        require(mUSDG.owner() == SAFE_DEPLOYER);
        require(lUSDG.owner() == SAFE_DEPLOYER);
        require(sOlp.owner() == SAFE_DEPLOYER);
        require(mOlp.owner() == SAFE_DEPLOYER);
        require(lOlp.owner() == SAFE_DEPLOYER);
        require(sOlpManager.owner() == SAFE_DEPLOYER);
        require(mOlpManager.owner() == SAFE_DEPLOYER);
        require(lOlpManager.owner() == SAFE_DEPLOYER);
        require(sRewardDistributor.owner() == SAFE_DEPLOYER);
        require(mRewardDistributor.owner() == SAFE_DEPLOYER);
        require(lRewardDistributor.owner() == SAFE_DEPLOYER);
        require(sRewardTracker.owner() == SAFE_DEPLOYER);
        require(mRewardTracker.owner() == SAFE_DEPLOYER);
        require(lRewardTracker.owner() == SAFE_DEPLOYER);
        require(sRewardRouterV2.owner() == SAFE_DEPLOYER);
        require(mRewardRouterV2.owner() == SAFE_DEPLOYER);
        require(lRewardRouterV2.owner() == SAFE_DEPLOYER);
        require(controller.owner() == SAFE_DEPLOYER);
        require(positionManager.owner() == SAFE_DEPLOYER);
        require(settleManager.owner() == SAFE_DEPLOYER);
        require(feeDistributor.owner() == SAFE_DEPLOYER);
        require(btcOptionsToken.owner() == SAFE_DEPLOYER);
        require(ethOptionsToken.owner() == SAFE_DEPLOYER);
        require(fastPriceEvents.owner() == SAFE_DEPLOYER);
        require(fastPriceFeed.owner() == SAFE_DEPLOYER);
        require(positionValueFeed.owner() == SAFE_DEPLOYER);
        require(settlePriceFeed.owner() == SAFE_DEPLOYER);
        require(spotPriceFeed.owner() == SAFE_DEPLOYER);
        require(viewAggregator.owner() == SAFE_DEPLOYER);
        require(referral.owner() == SAFE_DEPLOYER);
    }

    function _testAuthority() private {
        console.log("==========Authority==========");
        // console.log("vaultPriceFeed : ", address(vaultPriceFeed.authority()));
        // console.log("optionsMarket : ", address(optionsMarket.authority()));
        // console.log("sVault : ", address(sVault.authority()));
        // console.log("mVault : ", address(mVault.authority()));
        // console.log("lVault : ", address(lVault.authority()));
        // console.log("sVaultUtils : ", address(sVaultUtils.authority()));
        // console.log("mVaultUtils : ", address(mVaultUtils.authority()));
        // console.log("lVaultUtils : ", address(lVaultUtils.authority()));
        // console.log("sUSDG : ", address(sUSDG.authority()));
        // console.log("mUSDG : ", address(mUSDG.authority()));
        // console.log("lUSDG : ", address(lUSDG.authority()));
        // console.log("sOlp : ", address(sOlp.authority()));
        // console.log("mOlp : ", address(mOlp.authority()));
        // console.log("lOlp : ", address(lOlp.authority()));
        // console.log("sOlpManager : ", address(sOlpManager.authority()));
        // console.log("mOlpManager : ", address(mOlpManager.authority()));
        // console.log("lOlpManager : ", address(lOlpManager.authority()));
        // console.log("sRewardDistributor : ", address(sRewardDistributor.authority()));
        // console.log("mRewardDistributor : ", address(mRewardDistributor.authority()));
        // console.log("lRewardDistributor : ", address(lRewardDistributor.authority()));
        // console.log("sRewardTracker : ", address(sRewardTracker.authority()));
        // console.log("mRewardTracker : ", address(mRewardTracker.authority()));
        // console.log("lRewardTracker : ", address(lRewardTracker.authority()));
        // console.log("sRewardRouterV2 : ", address(sRewardRouterV2.authority()));
        // console.log("mRewardRouterV2 : ", address(mRewardRouterV2.authority()));
        // console.log("lRewardRouterV2 : ", address(lRewardRouterV2.authority()));
        // console.log("controller : ", address(controller.authority()));
        // console.log("positionManager : ", address(positionManager.authority()));
        // console.log("settleManager : ", address(settleManager.authority()));
        // console.log("feeDistributor : ", address(feeDistributor.authority()));
        // console.log("btcOptionsToken : ", address(btcOptionsToken.authority()));
        // console.log("ethOptionsToken : ", address(ethOptionsToken.authority()));
        // console.log("fastPriceEvents : ", address(fastPriceEvents.authority()));
        // console.log("fastPriceFeed : ", address(fastPriceFeed.authority()));
        // console.log("positionValueFeed : ", address(positionValueFeed.authority()));
        // console.log("settlePriceFeed : ", address(settlePriceFeed.authority()));
        // console.log("spotPriceFeed : ", address(spotPriceFeed.authority()));
        // console.log("viewAggregator : ", address(viewAggregator.authority()));
        // console.log("referral : ", address(referral.authority()));
        

        require(address(optionsAuthority) == address(vaultPriceFeed.authority()));
        require(address(optionsAuthority) == address(optionsMarket.authority()));
        require(address(optionsAuthority) == address(sVault.authority()));
        require(address(optionsAuthority) == address(mVault.authority()));
        require(address(optionsAuthority) == address(lVault.authority()));
        require(address(optionsAuthority) == address(sVaultUtils.authority()));
        require(address(optionsAuthority) == address(mVaultUtils.authority()));
        require(address(optionsAuthority) == address(lVaultUtils.authority()));
        require(address(optionsAuthority) == address(sUSDG.authority()));
        require(address(optionsAuthority) == address(mUSDG.authority()));
        require(address(optionsAuthority) == address(lUSDG.authority()));
        require(address(optionsAuthority) == address(sOlp.authority()));
        require(address(optionsAuthority) == address(mOlp.authority()));
        require(address(optionsAuthority) == address(lOlp.authority()));
        require(address(optionsAuthority) == address(sOlpManager.authority()));
        require(address(optionsAuthority) == address(mOlpManager.authority()));
        require(address(optionsAuthority) == address(lOlpManager.authority()));
        require(address(optionsAuthority) == address(sRewardDistributor.authority()));
        require(address(optionsAuthority) == address(mRewardDistributor.authority()));
        require(address(optionsAuthority) == address(lRewardDistributor.authority()));
        require(address(optionsAuthority) == address(sRewardTracker.authority()));
        require(address(optionsAuthority) == address(mRewardTracker.authority()));
        require(address(optionsAuthority) == address(lRewardTracker.authority()));
        require(address(optionsAuthority) == address(sRewardRouterV2.authority()));
        require(address(optionsAuthority) == address(mRewardRouterV2.authority()));
        require(address(optionsAuthority) == address(lRewardRouterV2.authority()));
        require(address(optionsAuthority) == address(controller.authority()));
        require(address(optionsAuthority) == address(positionManager.authority()));
        require(address(optionsAuthority) == address(settleManager.authority()));
        require(address(optionsAuthority) == address(feeDistributor.authority()));
        require(address(optionsAuthority) == address(btcOptionsToken.authority()));
        require(address(optionsAuthority) == address(ethOptionsToken.authority()));
        require(address(optionsAuthority) == address(fastPriceEvents.authority()));
        require(address(optionsAuthority) == address(fastPriceFeed.authority()));
        require(address(optionsAuthority) == address(positionValueFeed.authority()));
        require(address(optionsAuthority) == address(settlePriceFeed.authority()));
        require(address(optionsAuthority) == address(spotPriceFeed.authority()));
        require(address(optionsAuthority) == address(viewAggregator.authority()));
        require(address(optionsAuthority) == address(referral.authority()));
    }

    function _testOptionsAuthority() private {
        console.log("==========OptionsAuthority==========");
        // console.log("safe address isAdmin : ", optionsAuthority.isAdmin(SAFE_DEPLOYER));
        require(optionsAuthority.isAdmin(SAFE_DEPLOYER), "safe address is not admin");
        require(optionsAuthority.isKeeper(KP_SPOT_FEEDER_1), "KP_SPOT_FEEDER_1 is not keeper");
        require(optionsAuthority.isKeeper(KP_SPOT_FEEDER_2), "KP_SPOT_FEEDER_2 is not keeper");
        require(optionsAuthority.isKeeper(KP_PV_FEEDER_1), "KP_PV_FEEDER_1 is not keeper");
        require(optionsAuthority.isKeeper(KP_PV_FEEDER_2), "KP_PV_FEEDER_2 is not keeper");
        require(optionsAuthority.isKeeper(KP_SETTLE_OPERATOR), "KP_SETTLE_OPERATOR is not keeper");
        require(optionsAuthority.isKeeper(KP_FEE_DISTRIBUTOR), "KP_FEE_DISTRIBUTOR is not keeper");
        require(optionsAuthority.isKeeper(KP_CLEARING_HOUSE), "KP_CLEARING_HOUSE is not keeper");
        require(optionsAuthority.isPositionKeeper(KP_POSITION_PROCESSOR), "KP_POSITION_PROCESSOR is not position keeper");
    }

    function _testVaultPriceFeed() private {
        console.log("==========VaultPriceFeed==========");
        console.log("isPrimaryOracleEnabled : ", vaultPriceFeed.isPrimaryOracleEnabled());
        console.log("isSecondarySpotEnabled : ", vaultPriceFeed.isSecondarySpotEnabled());
        console.log("maxStrictPriceDeviation : ", vaultPriceFeed.maxStrictPriceDeviation());
        console.log("MAX_SPREAD_BASIS_POINTS : ", vaultPriceFeed.MAX_SPREAD_BASIS_POINTS());
        console.log("spreadBasisPoints(WBTC) : ", vaultPriceFeed.spreadBasisPoints(address(wbtc)));
        console.log("spreadBasisPoints(WETH) : ", vaultPriceFeed.spreadBasisPoints(address(weth)));
        console.log("spreadBasisPoints(USDC) : ", vaultPriceFeed.spreadBasisPoints(address(usdc)));
        console.log("supportedTokens(WBTC) : ", vaultPriceFeed.supportedTokens(address(wbtc)));
        console.log("supportedTokens(WETH) : ", vaultPriceFeed.supportedTokens(address(weth)));
        console.log("supportedTokens(USDC) : ", vaultPriceFeed.supportedTokens(address(usdc)));
        console.log("strictStableTokens(USDC) : ", vaultPriceFeed.strictStableTokens(address(usdc)));
        console.log("minMarkPrices(1) : ", vaultPriceFeed.minMarkPrices(1));
        console.log("minMarkPrices(2) : ", vaultPriceFeed.minMarkPrices(2));
    }
    function _testOptionsMarket() private {
        console.log("==========OptionsMarket==========");
        // console.log("registeredOptionsCount : ", optionsMarket.registeredOptionsCount());
        // console.log("activeOptionsCount : ", optionsMarket.activeOptionsCount());
        // console.log("mainStableAsset : ", optionsMarket.mainStableAsset());
        // console.log("indexToUnderlyingAsset(1) : ", optionsMarket.indexToUnderlyingAsset(1));
        // console.log("indexToUnderlyingAsset(2) : ", optionsMarket.indexToUnderlyingAsset(2));
        // console.log("underlyingAssetToIndex(address(wbtc)) : ", optionsMarket.underlyingAssetToIndex(address(wbtc)));
        // console.log("underlyingAssetToIndex(address(weth)) : ", optionsMarket.underlyingAssetToIndex(address(weth)));
        // console.log("underlyingAssetToOptionsToken(address(wbtc)) : ", optionsMarket.underlyingAssetToOptionsToken(address(wbtc)));
        // console.log("underlyingAssetToOptionsToken(address(weth)) : ", optionsMarket.underlyingAssetToOptionsToken(address(weth)));
        // console.log("optionsTokenToUnderlyingAsset(address(btcOptionsToken)) : ", optionsMarket.optionsTokenToUnderlyingAsset(address(btcOptionsToken)));
        // console.log("optionsTokenToUnderlyingAsset(address(ethOptionsToken)) : ", optionsMarket.optionsTokenToUnderlyingAsset(address(ethOptionsToken)));
        console.log("isUnderlyingAssetActive(address(wbtc)) : ", optionsMarket.isUnderlyingAssetActive(address(wbtc)));
        console.log("isUnderlyingAssetActive(address(weth)) : ", optionsMarket.isUnderlyingAssetActive(address(weth)));   
    }

    function _testVault(VaultType _vaultType) private {
        Vault vault = Vault(_vaultType == VaultType.S ? sVault : _vaultType == VaultType.M ? mVault : lVault);
        string memory vaultName = _vaultType == VaultType.S ? "SVault" : _vaultType == VaultType.M ? "MVault" : "LVault";
        console.log("==========", vaultName, "==========");
        console.log("isPositionEnabled : ", vault.isPositionEnabled());
        console.log("isBuySellSwapEnabled : ", vault.isBuySellSwapEnabled());
        // console.log("useSwapPricing : ", vault.useSwapPricing());
        console.log("whitelistedTokenCount : ", vault.whitelistedTokenCount());
        console.log("bufferAmounts(WBTC) : ", vault.bufferAmounts(address(wbtc)));
        console.log("bufferAmounts(WETH) : ", vault.bufferAmounts(address(weth)));
        console.log("bufferAmounts(USDC) : ", vault.bufferAmounts(address(usdc)));
        
        console.log("decreaseToleranceAmount(WBTC) : ", vault.decreaseToleranceAmount(address(wbtc)));
        console.log("decreaseToleranceAmount(WETH) : ", vault.decreaseToleranceAmount(address(weth)));
        console.log("decreaseToleranceAmount(USDC) : ", vault.decreaseToleranceAmount(address(usdc)));
    }

    function _testVaultUtils(VaultType _vaultType) private {
        VaultUtils vaultUtils = VaultUtils(_vaultType == VaultType.S ? sVaultUtils : _vaultType == VaultType.M ? mVaultUtils : lVaultUtils);
        string memory vaultUtilsName = _vaultType == VaultType.S ? "SVaultUtils" : _vaultType == VaultType.M ? "MVaultUtils" : "LVaultUtils";
        console.log("==========", vaultUtilsName, "==========");
        console.log("OPEN_BUY_NAKED_POSITION_FEE : ", vaultUtils.OPEN_BUY_NAKED_POSITION_FEE());
        console.log("OPEN_SELL_NAKED_POSITION_FEE : ", vaultUtils.OPEN_SELL_NAKED_POSITION_FEE());
        console.log("OPEN_COMBO_POSITION_FEE : ", vaultUtils.OPEN_COMBO_POSITION_FEE());
        console.log("CLOSE_NAKED_POSITION_FEE : ", vaultUtils.CLOSE_NAKED_POSITION_FEE());
        console.log("CLOSE_COMBO_POSITION_FEE : ", vaultUtils.CLOSE_COMBO_POSITION_FEE());
        console.log("SETTLE_POSITION_FEE : ", vaultUtils.SETTLE_POSITION_FEE());
        console.log("TAX_FEE : ", vaultUtils.TAX_FEE());
        console.log("STABLE_TAX_FEE : ", vaultUtils.STABLE_TAX_FEE());
        console.log("MINT_BURN_FEE : ", vaultUtils.MINT_BURN_FEE());
        console.log("SWAP_FEE : ", vaultUtils.SWAP_FEE());
        console.log("STABLE_SWAP_FEE : ", vaultUtils.STABLE_SWAP_FEE());
        console.log("hasDynamicFees : ", vaultUtils.hasDynamicFees());

        // releaseDuration
        console.log("releaseDuration(MP, WBTC) : ", vaultUtils.releaseDuration(IVaultUtils.PriceType.MP, address(wbtc)));
        console.log("releaseDuration(MP, WETH) : ", vaultUtils.releaseDuration(IVaultUtils.PriceType.MP, address(weth)));
        console.log("releaseDuration(MP, USDC) : ", vaultUtils.releaseDuration(IVaultUtils.PriceType.MP, address(usdc)));
        console.log("releaseDuration(RP, WBTC) : ", vaultUtils.releaseDuration(IVaultUtils.PriceType.RP, address(wbtc)));
        console.log("releaseDuration(RP, WETH) : ", vaultUtils.releaseDuration(IVaultUtils.PriceType.RP, address(weth)));
        console.log("releaseDuration(RP, USDC) : ", vaultUtils.releaseDuration(IVaultUtils.PriceType.RP, address(usdc)));

    }

    function _testUSDG(VaultType _vaultType) private {
        USDG usdg = USDG(_vaultType == VaultType.S ? sUSDG : _vaultType == VaultType.M ? mUSDG : lUSDG);
        string memory usdgName = _vaultType == VaultType.S ? "SUSDG" : _vaultType == VaultType.M ? "MUSDG" : "LUSDG";
        console.log("==========", usdgName, "==========");
        console.log("name : ", usdg.name());
        console.log("symbol : ", usdg.symbol());
        console.log("decimals : ", usdg.decimals());
        console.log("inWhitelistMode : ", usdg.inWhitelistMode());
    }


    function _testOlp(VaultType _vaultType) private {
        OLP olp = OLP(_vaultType == VaultType.S ? sOlp : _vaultType == VaultType.M ? mOlp : lOlp);
        string memory olpName = _vaultType == VaultType.S ? "SOlp" : _vaultType == VaultType.M ? "MOlp" : "LOlp";
        console.log("==========", olpName, "==========");
    }

    function _testOlpManager(VaultType _vaultType) private {
        OlpManager olpManager = OlpManager(_vaultType == VaultType.S ? sOlpManager : _vaultType == VaultType.M ? mOlpManager : lOlpManager);
        string memory olpManagerName = _vaultType == VaultType.S ? "SOlpManager" : _vaultType == VaultType.M ? "MOlpManager" : "LOlpManager";
        console.log("==========", olpManagerName, "==========");
        console.log("MAX_COOLDOWN_DURATION : ", olpManager.MAX_COOLDOWN_DURATION());
        console.log("cooldownDuration : ", olpManager.cooldownDuration());
        console.log("aumAddition : ", olpManager.aumAddition());
        console.log("aumDeduction : ", olpManager.aumDeduction());
        console.log("inPrivateMode : ", olpManager.inPrivateMode());
    }

    function _testRewardDistributor(VaultType _vaultType) private {
        RewardDistributor rewardDistributor = RewardDistributor(_vaultType == VaultType.S ? sRewardDistributor : _vaultType == VaultType.M ? mRewardDistributor : lRewardDistributor);
        string memory rewardDistributorName = _vaultType == VaultType.S ? "SRewardDistributor" : _vaultType == VaultType.M ? "MRewardDistributor" : "LRewardDistributor";
        console.log("==========", rewardDistributorName, "==========");
        console.log("rewardToken : ", rewardDistributor.rewardToken());
    }

    function _testRewardTracker(VaultType _vaultType) private {
        RewardTracker rewardTracker = RewardTracker(_vaultType == VaultType.S ? sRewardTracker : _vaultType == VaultType.M ? mRewardTracker : lRewardTracker);
        string memory rewardTrackerName = _vaultType == VaultType.S ? "SRewardTracker" : _vaultType == VaultType.M ? "MRewardTracker" : "LRewardTracker";
        console.log("==========", rewardTrackerName, "==========");
        console.log("isSetup : ", rewardTracker.isSetup());
        console.log("name : ", rewardTracker.name());
        console.log("symbol : ", rewardTracker.symbol());
        console.log("inPrivateTransferMode : ", rewardTracker.inPrivateTransferMode());
        console.log("inPrivateStakingMode : ", rewardTracker.inPrivateStakingMode());
        console.log("inPrivateClaimingMode : ", rewardTracker.inPrivateClaimingMode());
    }

    function _testRewardRouterV2(VaultType _vaultType) private {
        RewardRouterV2 rewardRouterV2 = RewardRouterV2(_vaultType == VaultType.S ? sRewardRouterV2 : _vaultType == VaultType.M ? mRewardRouterV2 : lRewardRouterV2);
        string memory rewardRouterV2Name = _vaultType == VaultType.S ? "SRewardRouterV2" : _vaultType == VaultType.M ? "MRewardRouterV2" : "LRewardRouterV2";
        console.log("==========", rewardRouterV2Name, "==========");
    }

    function _testController() private {
        console.log("==========Controller==========");
        console.log("maxGasPrice : ", controller.maxGasPrice());
        console.log("isNATSupported : ", controller.isNATSupported());
    }

    function _testPositionManager() private {
        console.log("==========PositionManager==========");
        console.log("executionFee : ", positionManager.executionFee());
        console.log("maxTimeDelay : ", positionManager.maxTimeDelay());
        console.log("positionDeadlineBuffer : ", positionManager.positionDeadlineBuffer());
        console.log("copyTradeFeeRebateRate : ", positionManager.copyTradeFeeRebateRate());
        console.log("natTransferGasLimit : ", positionManager.natTransferGasLimit());
    }

    function _testSettleManager() private {
        console.log("==========SettleManager==========");
        console.log("natTransferGasLimit : ", settleManager.natTransferGasLimit());
    }

    function _testFeeDistributor() private {
        console.log("==========FeeDistributor==========");
        console.log("treasury : ", feeDistributor.treasury());
        console.log("gt : ", feeDistributor.gt());
        console.log("treasuryRate : ", feeDistributor.treasuryRate());
        console.log("gtRate : ", feeDistributor.gtRate());
        console.log("olpRewardRate : ", feeDistributor.olpRewardRate());
        console.log("distributionPeriod : ", feeDistributor.distributionPeriod());
        console.log("lastFeeDistribution : ", feeDistributor.lastFeeDistribution());
        console.log("lastOlpRewardsDistribution : ", feeDistributor.lastOlpRewardsDistribution());
    }

    function _testBtcOptionsToken() private {
        console.log("==========BtcOptionsToken==========");
        console.log("name : ", btcOptionsToken.name());
        console.log("underlyingAsset : ", btcOptionsToken.underlyingAsset());
    }

    function _testEthOptionsToken() private {
        console.log("==========EthOptionsToken==========");
        console.log("name : ", ethOptionsToken.name());
        console.log("underlyingAsset : ", ethOptionsToken.underlyingAsset());
    }

    function _testFastPriceEvents() private {
        console.log("==========FastPriceEvents==========");
    }

    function _testFastPriceFeed() private {
        console.log("==========FastPriceFeed==========");
        console.log("MAX_UPDATE_DURATION : ", fastPriceFeed.MAX_UPDATE_DURATION());
        console.log("updateDuration : ", fastPriceFeed.updateDuration());
        console.log("maxTimeDeviation : ", fastPriceFeed.maxTimeDeviation());
     
    }

    function _testPositionValueFeed() private {
        console.log("==========PositionValueFeed==========");
        console.log("description : ", positionValueFeed.description());
        console.log("pvLastUpdatedAt : ", positionValueFeed.pvLastUpdatedAt());
        console.log("apvLastUpdatedAt : ", positionValueFeed.apvLastUpdatedAt());
        console.log("updateDuration : ", positionValueFeed.updateDuration());
    }

    function _testSettlePriceFeed() private {
        console.log("==========SettlePriceFeed==========");
        console.log("description : ", settlePriceFeed.description());
    }

    function _testSpotPriceFeed() private {
        console.log("==========SpotPriceFeed==========");
        console.log("MAX_UPDATE_DURATION : ", spotPriceFeed.MAX_UPDATE_DURATION());
        console.log("description : ", spotPriceFeed.description());
        console.log("updateDuration : ", spotPriceFeed.updateDuration());
        console.log("maxDeviationBasisPoints : ", spotPriceFeed.maxDeviationBasisPoints());
        console.log("isMaxDeviationEnabled : ", spotPriceFeed.isMaxDeviationEnabled());
        console.log("isFavorFastPriceEnabled : ", spotPriceFeed.isFavorFastPriceEnabled());
        console.log("spotPrices(WBTC) : ", spotPriceFeed.spotPrices(address(wbtc)));
        console.log("spotPrices(WETH) : ", spotPriceFeed.spotPrices(address(weth)));
        console.log("spotPrices(USDC) : ", spotPriceFeed.spotPrices(address(usdc)));
    }

    function _testViewAggregator() private {
        console.log("==========ViewAggregator==========");
    }

    function _testReferral() private {
        console.log("==========Referral==========");
        console.log("referralDiscountRate : ", referral.referralDiscountRate());
        console.log("referralFeeRebateRate : ", referral.referralFeeRebateRate());
    }


    function _testPrimaryOracle() private {
        console.log("==========PrimaryOracle==========");
        console.log("chainlinkFlags : ", primaryOracle.chainlinkFlags());
        console.log("priceSampleSpace : ", primaryOracle.priceSampleSpace());
    }

}
