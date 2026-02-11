
import BigNumber from 'bignumber.js';
import { ethers } from "hardhat";
import { formatEther, parseEther } from "ethers";

export async function initFund(ethers: any) {
  const [
    DEPLOYER,
    // KEEPER_OPTIONS_MARKET,
    // KEEPER_POSITION_PROCESSOR,
    // KEEPER_SETTLE_OPERATOR,
    // KEEPER_POSITION_VALUE_FEEDER,
    // KEEPER_POSITION_VALUE_FEEDER_SUB1,
    // KEEPER_SPOT_PRICE_FEEDER,
    // KEEPER_SPOT_PRICE_FEEDER_SUB1,
    // KEEPER_FEE_DISTRIBUTOR,
    // KEEPER_CLEARING_HOUSE,
    // TEST_USER1, 
    // TEST_USER2
  ] = await (ethers as any).getSigners()

  const KEEPER_OPTIONS_MARKET = { address: "0xa27422e990f291a443673fd9304a1bc6e3e7d6bb" }
  const KEEPER_POSITION_PROCESSOR = { address: "0x89a25d704844041238b1434dbdaa530bef346487" }
  const KEEPER_SETTLE_OPERATOR = { address: "0x56262395092018edc4b8cc7ec3816f4b44b13110" }
  const KEEPER_POSITION_VALUE_FEEDER = { address: "0xe1c4281a7cfef0431bd97d4985799a0e20360a64" }
  const KEEPER_POSITION_VALUE_FEEDER_SUB1 = { address: "0x31d477ed239adf6ea5073033ae58b5e4cca21abb" }
  const KEEPER_SPOT_PRICE_FEEDER = { address: "0xaf65fb4bac79ace1b3ea5b1ff8f153100641dea0" }
  const KEEPER_SPOT_PRICE_FEEDER_SUB1 = { address: "0x91ae87467bed7218b812919a753e10baf8b01eff" }
  const KEEPER_FEE_DISTRIBUTOR = { address: "0xff51df1aac5fed7682d88244ae7d0b2a3b426008" }
  const KEEPER_CLEARING_HOUSE = { address:  "0x0582393904a415bc6550cb020ee5524791e7ae3b" }

  console.log("Init fund with the account:", DEPLOYER.address);

  const deployerBalanceBefore = formatEther(
    await (ethers as any).provider.getBalance(DEPLOYER.address)
  )

  // const fundAmount = parseEther("0.4")
  const fundAmount = parseEther("0.005")

  await fundETH(ethers, KEEPER_OPTIONS_MARKET.address, fundAmount)
  await fundETH(ethers, KEEPER_SETTLE_OPERATOR.address, fundAmount)
  await fundETH(ethers, KEEPER_POSITION_VALUE_FEEDER.address, fundAmount)
  await fundETH(ethers, KEEPER_POSITION_VALUE_FEEDER_SUB1.address, fundAmount)
  await fundETH(ethers, KEEPER_SPOT_PRICE_FEEDER.address, fundAmount)
  await fundETH(ethers, KEEPER_SPOT_PRICE_FEEDER_SUB1.address, fundAmount)
  await fundETH(ethers, KEEPER_FEE_DISTRIBUTOR.address, fundAmount)
  await fundETH(ethers, KEEPER_CLEARING_HOUSE.address, fundAmount)
  await fundETH(ethers, KEEPER_POSITION_PROCESSOR.address, fundAmount)
  console.log("Init fund done");

  const deployerBalanceAfter = formatEther(
    await (ethers as any).provider.getBalance(DEPLOYER.address)
  )

  const txAfterFund = new BigNumber(deployerBalanceBefore).minus(deployerBalanceAfter).toString()
  console.log(`${txAfterFund} ETH used for funding`)
}

const fundETH = async (ethers: any, receiver: string, fundAmount: bigint) => {
  const [DEPLOYER] = await (ethers as any).getSigners();
  const balanceBefore = await ethers.provider.getBalance(receiver);
  const parsedBalanceBefore = formatEther(balanceBefore.toString());

  console.log(`funding to ${receiver}, balance: ${parsedBalanceBefore}`)

  if (balanceBefore >= fundAmount) {
    console.log(`funded already to ${receiver}`);
  } else {
    await DEPLOYER.sendTransaction({ to: receiver, value: fundAmount })
    const balanceAfter = await ethers.provider.getBalance(receiver);
    const parsedBalanceAfter = formatEther(balanceAfter.toString());
    console.log(`funded to ${receiver}, balance: ${parsedBalanceAfter}`)
  }
}

(async () => {
  await initFund(ethers)
})()