import { expect } from "chai";
import { ethers } from "hardhat";

describe("WhitelistTest", function () {
  let whitelistTest: any;
  let mockVault: any;
  let owner: any;

  before(async function () {
    [owner] = await ethers.getSigners();
    const MockVault = await ethers.getContractFactory("MockVault");

    // Mock Vault contract to use for testing
    mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment(); // Wait for deployment to be mined

    const WhitelistTest = await ethers.getContractFactory("WhitelistTest");
    whitelistTest = await WhitelistTest.deploy(mockVault.address);
    await whitelistTest.waitForDeployment(); // Wait for deployment to be mined
  });

  it("should correctly change the array length using mstore", async function () {
    const beforeAndAfter = await whitelistTest.testMstore();
    expect(beforeAndAfter[0]).to.equal(5);
    expect(beforeAndAfter[1]).to.equal(3);
  });

  it("should correctly retrieve whitelisted tokens", async function () {
    const whitelistedTokens = await whitelistTest.getWhitelistedTokens();
    expect(whitelistedTokens.length).to.equal(2);
    expect(whitelistedTokens).to.include("0x0000000000000000000000000000000000000001");
    expect(whitelistedTokens).to.include("0x0000000000000000000000000000000000000003");
    expect(whitelistedTokens).to.not.include("0x0000000000000000000000000000000000000002");
  });
});