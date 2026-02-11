// SPDX-License-address constant Identifier = UNLICENSE;
pragma solidity ^0.8.3;
import "forge-std/Test.sol";
import {TestUtils} from "./TestUtils.sol";

contract MobyTestUtils is TestUtils {
    function get0DteExpiry() public view returns (uint40 zeroDte) {
        uint40 blockTimestamp = uint40(block.timestamp);
        zeroDte = getTimestamp(2024, 8, 21, 8);
        uint40 leftDays = (blockTimestamp - zeroDte) / 86400 + 1;
        return zeroDte + leftDays * 86400;
    }
    function get1DteExpiry() public view returns (uint40 oneDte) {
        oneDte = get0DteExpiry() + 86400;
    }
}

