// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import {IERC20} from "../../../lib/forge-std/src/interfaces/IERC20.sol";
import {Setup} from "../Setup.t.sol";
import {SettleManager} from "../../../contracts/SettleManager.sol";
import {MobyTestUtils} from "../MobyTestUtils.sol";
import {TransparentUpgradeableProxy} from "../../../lib/openzeppelin-contracts/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {BaseTest} from "./Base.t.sol";
import {ViewAggregator} from "../../../contracts/ViewAggregator.sol";
import {PositionManager} from "../../../contracts/PositionManager.sol";
import {IPositionManager} from "../../../contracts/interfaces/IPositionManager.sol";
contract SettleManagerTest is BaseTest {
	function _before() internal {
		vm.startPrank(deployer);
		SettleManager _settleManager = new SettleManager();
		_upgradeProxy(proxyAdmin, address(settleManager), address(_settleManager));
		vm.stopPrank();
	}

	function testSettlePosition() public {
		_before();
		testOpenPosition();
	}

	function testSettlePositions() public {
		_before();
			// 1. prepare
			deal(user, 100 ether);
			deal(address(usdc), user, 100000e6);

			uint16 underlyingIndex = 1; // BTC
			uint40 expiry = get0DteExpiry();
			uint48 strikePrice = 100000;

			// 2. User createOpenPosition
			bytes32 key1;
			bytes32 key2;


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
					uint _amountIn = 100e6;
					uint _minOutWhenSwap = 0;
					address _leadTrader = address(0);
					address[] memory _path = new address[](1);
					_path[0] = address(usdc);
					key1 = positionManager.createOpenPosition{value: positionManager.executionFee()}(
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

			(, uint requestLength,) = positionManager.getRequestQueueLengths();
			(address account1,uint16 underlyingAssetIndex1,,uint256 optionTokenId1,,,,,,IPositionManager.RequestStatus status1,,,,) = positionManager.openPositionRequests(key1);
			_executePosition(requestLength - 2, optionTokenId1, 1e30, 0.01e30);
			console.log("OpenPosition Executed");
			(,,,,,,,,,status1,,,,) = positionManager.openPositionRequests(key1);


			vm.startPrank(user);
			{
					usdc.approve(address(controller), type(uint).max);

					uint16 _underlyingIndex = uint16(1);
					uint8 _length = uint8(1);
					bool[4] memory _isBuys;
					_isBuys[0] = true;
					bytes32[4] memory _optionIds;
					_optionIds[0] = optionsMarket.getOptionId(underlyingIndex, expiry, strikePrice + 1000);
					bool[4] memory _isCalls;
					_isCalls[0] = true;
					uint _minSize = 0;
					uint _amountIn = 100e6;
					uint _minOutWhenSwap = 0;
					address _leadTrader = address(0);
					address[] memory _path = new address[](1);
					_path[0] = address(usdc);
					key2 = positionManager.createOpenPosition{value: positionManager.executionFee()}(
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
			
			(, requestLength,) = positionManager.getRequestQueueLengths();
			(address account2,uint16 underlyingAssetIndex2,,uint256 optionTokenId2,,,,,,IPositionManager.RequestStatus status2,,,,) = positionManager.openPositionRequests(key2);
			// 3. KP_POSITION_PROCESSOR executes position with feeding MP, RP
			_executePosition(requestLength - 1, optionTokenId2, 1e30, 0.01e30);
			console.log("OpenPosition Executed");
			(,,,,,,,,,status2,,,,) = positionManager.openPositionRequests(key2);

			// 4. Option expired.
			_timeElapse(expiry - block.timestamp + 10);
			console.log("Option Expired");

			// 5. KP_SPOT_FEEDER_1 feeds spot price & settlePrice. Assume BTC price is increased.
			_feedSpotAndSettlePrice(strikePrice + 1000, expiry);
			console.log("Spot Price Feeded");
			// 6. User settelPosition
			vm.startPrank(user);
			{
				address[][] memory _paths = new address[][](2);	
				_paths[0] = new address[](1);
				_paths[0][0] = address(wbtc);
				_paths[1] = new address[](1);
				_paths[1][0] = address(wbtc);
        uint16 _underlyingAssetIndex = uint16(1);
				uint256[] memory _optionTokenIds = new uint256[](2);
				_optionTokenIds[0] = optionTokenId1;
				_optionTokenIds[1] = optionTokenId2;
				uint256[] memory _minOutWhenSwaps = new uint256[](2);
				bool _withdrawNAT = false;
				_minOutWhenSwaps[0] = 0;
				_minOutWhenSwaps[1] = 0;
				settleManager.settlePositions(
							_paths,
							_underlyingAssetIndex,
							_optionTokenIds,
							_minOutWhenSwaps,
							_withdrawNAT
				);
			}
			vm.stopPrank();
			console.log("SettlePosition Executed");
    }
}


