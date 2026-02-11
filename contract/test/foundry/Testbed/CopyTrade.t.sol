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
import {IERC20} from "../../../lib/forge-std/src/interfaces/IERC20.sol";

import {Setup} from "../Setup.t.sol";
import {MobyTestUtils} from "../MobyTestUtils.sol";

import {TransparentUpgradeableProxy} from "../../../lib/openzeppelin-contracts/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract CopyTradeTest is Setup, MobyTestUtils {

    // function _upgrade() internal {
    //     vm.startPrank(deployer);

    //     {
    //         SettleManager _settleManager = new SettleManager();
    //         settleManager = SettleManager(_makeProxy(proxyAdmin, address(_settleManager)));
    //     }
    //     settleManager.initialize(address(optionsMarket), address(controller), address(weth), IOptionsAuthority(optionsAuthority));
    //     console.log("settleManager deployed");

    //     Vault _vault = new Vault();
    //     console.log("vault logic deployed");
    //     _upgradeProxy(proxyAdmin, address(sVault), address(_vault));
    //     _upgradeProxy(proxyAdmin, address(mVault), address(_vault));
    //     _upgradeProxy(proxyAdmin, address(lVault), address(_vault));
    //     console.log("Vaults upgraded");

    //     sVault.setContracts(IVaultUtils(sVaultUtils), address(optionsMarket), address(settleManager), address(controller), address(vaultPriceFeed), address(sUSDG));
    //     mVault.setContracts(IVaultUtils(mVaultUtils), address(optionsMarket), address(settleManager), address(controller), address(vaultPriceFeed), address(mUSDG));
    //     lVault.setContracts(IVaultUtils(lVaultUtils), address(optionsMarket), address(settleManager), address(controller), address(vaultPriceFeed), address(lUSDG));

    //     VaultUtils _vaultUtils = new VaultUtils();

    //     _upgradeProxy(proxyAdmin, address(sVaultUtils), address(_vaultUtils));
    //     _upgradeProxy(proxyAdmin, address(mVaultUtils), address(_vaultUtils));
    //     _upgradeProxy(proxyAdmin, address(lVaultUtils), address(_vaultUtils));
    //     console.log("VaultUtils upgraded");

    //     sVaultUtils.setPositionManager(address(positionManager));
    //     mVaultUtils.setPositionManager(address(positionManager));
    //     lVaultUtils.setPositionManager(address(positionManager));

    //     sVault.setManager(address(settleManager), true);
    //     mVault.setManager(address(settleManager), true);
    //     lVault.setManager(address(settleManager), true);

    //     PositionManager _positionManager = new PositionManager();
    //     _upgradeProxy(proxyAdmin, address(positionManager), address(_positionManager));
    //     console.log("PositionManager upgraded");


    //     Controller _controller = new Controller();
    //     _upgradeProxy(proxyAdmin, address(controller), address(_controller));
    //     console.log("Controller upgraded");

    //     controller.addPlugin(address(settleManager));

    //     positionManager.setCopyTradeFeeRebateRate(3000);

    //     vm.stopPrank();
    // }
    function testCopyTrade() public {
        // 1. prepare
        // _upgrade(); // upgraded
        address leadTrader = address(0xbeef);
        deal(user, 100 ether);
        deal(address(usdc), user, 100000e6);

        // 2. User createOpenPosition with following leadTrader
        uint16 underlyingIndex = 1; // BTC
        uint40 expiry = get0DteExpiry();
        (uint16 year, uint8 month, uint8 day, uint8 hour) = getDate(expiry);
        uint48 strikePrice = 60000;
        console.log(string(abi.encodePacked(
            "creatOpenPosition with expiry: ", 
            uint256(year), 
            uint256(month), 
            uint256(day), 
            uint256(hour), 
            "(UTC) strikePrice: ", 
            uint256(strikePrice))));
        vm.startPrank(user);
        {
            IWETH(address(weth)).deposit{value: 50 ether}();
            usdc.approve(address(controller), type(uint).max);

            uint16 _underlyingIndex = uint16(1);
            uint8 _length = uint8(1);
            bool[4] memory _isBuys;
            _isBuys[0] = true;
            bytes32[4] memory _optionIds;
            _optionIds[0] = optionsMarket.getOptionId(underlyingIndex, expiry, strikePrice);
            console.log("available? ", optionsMarket.isOptionAvailable(_optionIds[0]));
            // (uint16 currentUnderlyingAssetIndex, , uint40 currentExpiry,) = optionsMarket.getOptionDetail(_optionIds[0]);
            // console.logBytes32(_optionIds[0]);
            bool[4] memory _isCalls;
            _isCalls[0] = true;
            uint _minSize = 0;
            uint _amountIn = 10e6;
            uint _minOutWhenSwap = 0;
            address _leadTrader = leadTrader;
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

        uint requestIndex;
        {
            (, uint requestLength,) = positionManager.getRequestQueueLengths();
            requestIndex = requestLength - 1;
            assertEq(positionManager.leadTrader(requestLength - 1), leadTrader, "Test: leadTrader not eq");
            console.log("requestIndex : ", requestIndex);
        }
        uint leadTraderBalanceBefore = usdc.balanceOf(leadTrader);

        // 3. KP_POSITION_PROCESSOR executes position with feeding MP, RP
        ViewAggregator.PositionRequestInfo memory lastPosition;
        vm.startPrank(KP_POSITION_PROCESSOR);
        {
            (ViewAggregator.PositionRequestInfo[] memory positionRequestInfo,uint positionEndIndex,,,,,,) = viewAggregator.positionRequestInfoWithOlpUtilityRatio(30);
            lastPosition = positionRequestInfo[0];
            uint[] memory _markPriceBitArray = new uint[](1);
            _markPriceBitArray[0] = 1e30;
            uint[] memory _riskPremiumBitArray = new uint[](1);
            _riskPremiumBitArray[0] = 0.01e30;
            uint[] memory _optionTokenIds = new uint[](1);
            _optionTokenIds[0] = lastPosition.optionTokenId;
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

        uint rebate = usdc.balanceOf(leadTrader) - leadTraderBalanceBefore;
        assertGt(rebate, 0);
        console.log("leadTrader received a rebate of ", rebate, " USDC");

        // 4. Option expired.
        _timeElapse(expiry - block.timestamp + 10);

        // 5. KP_SPOT_FEEDER_1 feed spot price of BTC.
        vm.startPrank(KP_SPOT_FEEDER_1);
        {
            address[] memory _tokens = new address[](1);
            _tokens[0] = address(wbtc);
            uint256[] memory _spotPrices = new uint256[](1);
            _spotPrices[0] = 67000 * 10e30;
            spotPriceFeed.feedSpotPrices(_tokens, _spotPrices, block.timestamp + 1000);
        }
        vm.stopPrank();

        // 5. KP_SETTLE_OPERATOR feeds settlePrice
        vm.startPrank(KP_SETTLE_OPERATOR);
        {
            address[] memory _tokens = new address[](1);
            _tokens[0] = address(wbtc);
            uint256[] memory _settlePrices = new uint256[](1);
            _settlePrices[0] = 67000 * 10e30;
            settlePriceFeed.feedSettlePrices(_tokens, _settlePrices, uint256(expiry));
        }
        vm.stopPrank();

        // 6. User settelPosition
        vm.startPrank(user);
        {
            address[] memory _path = new address[](1);
            _path[0] = address(wbtc);
            uint16 _underlyingIndex = uint16(1);
            uint _optionTokenId = lastPosition.optionTokenId;
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
}

