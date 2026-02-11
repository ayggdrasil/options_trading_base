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
import {WOLP} from "../../../contracts/staking/WOLP.sol";
contract WOLPTest is Setup, MobyTestUtils {
	WOLP public wolp;
	function _before() internal {
		console.log(block.chainid);
		console.log(block.timestamp);
		console.log(block.number);
		console.log(sRewardTracker.olpManager());
		
		// deal(address(weth), user, 10000 ether);
		// deal(address(usdc), user, 10000e6);
		// deal(address(weth), deployer, 10000 ether);
		// deal(address(usdc), deployer, 10000e6);


		vm.startPrank(deployer);
		wolp = WOLP(address(0xa3d64e4Cf50BACDc54db25fc63fAC667cA787F39));
		console.log("wolp", address(wolp));
		console.log("wolp", wolp.totalAssets());

		console.log("wolp", wolp.balanceOf(deployer));
		wolp.redeem(wolp.balanceOf(deployer), deployer, deployer);
		console.log("wolp", wolp.balanceOf(deployer));
    // WOLP _wolp = new WOLP();
		// wolp = WOLP(address(_makeProxy(proxyAdmin, address(_wolp))));
		// console.log("proxyAdmin", address(proxyAdmin));
		// console.log("WOLP", address(wolp));
		// console.log("_WOLP", address(_wolp));
		// weth.approve(address(wolp), 0.0001 ether);
		// wolp.initialize(
		// 	"Wrapped OLP",
		// 	"WOLP",
		// 	address(mRewardTracker),
		// 	address(mRewardRouterV2)
		// );

		// // TODO : setAuthorizedForTransfer
		// bool isTest = true;
		// if(isTest) {
		// 	mRewardTracker.setHandler(address(wolp), true);
		// } else {
		// 	mRewardTracker.setAuthorizedForTransfer(address(wolp), true);
		// }
		// vm.stopPrank();

		

		// vm.startPrank(user);
		// weth.approve(address(wolp), 10000 ether);
		// usdc.approve(address(wolp), 10000e6);
		// vm.stopPrank();


	}

	function _addRewards() internal {
		deal(address(weth), address(mRewardDistributor), 1 ether);
	}

	function testBasic() public {
		_before();
		// console.log("name", wolp.name());
		// console.log("symbol", wolp.symbol());
		// console.log("decimals", wolp.decimals());
		// console.log("asset", wolp.asset());
		// console.log("totalAssets", wolp.totalAssets());
		// console.log("totalSupply", wolp.totalSupply());
	}

	function testDeposit() public {
		_before();
		vm.startPrank(user);
		wolp.deposit(address(usdc), 1e6, user);
		console.log("1 usdc deposited");
		console.log("totalAssets", wolp.totalAssets());
		console.log("totalSupply", wolp.totalSupply());
		console.log("folp in wallet : ", IERC20(address(mRewardTracker)).balanceOf(user));
		console.log("WOLP in wallet : ", wolp.balanceOf(user));
		vm.stopPrank();
	}

	function testRedeem() public {
		testDeposit();
		vm.startPrank(user);
		wolp.redeem(wolp.balanceOf(user), user, user);
		console.log("all WOLP redeemed");
		console.log("totalAssets", wolp.totalAssets());
		console.log("totalSupply", wolp.totalSupply());
		console.log("folp in wallet : ", IERC20(address(mRewardTracker)).balanceOf(user));
		console.log("WOLP in wallet : ", wolp.balanceOf(user));
		console.log("redeem done");
		vm.stopPrank();
	}

}


