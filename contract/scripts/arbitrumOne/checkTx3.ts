import BigNumber from "bignumber.js";
import { getDeployedContracts } from "./deployedContracts";
import { ethers } from "hardhat";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export async function checkTx3(ethers: any, addressMap: any) {
  const [ 
    DEPLOYER,
    TEST_USER1
  ] = await (ethers as any).getSigners()
  
  const {
    CONTRACT_ADDRESS,
    wbtc,
    weth,
    usdc,
    sRewardRouterV2
  } = await getDeployedContracts(ethers, addressMap);
  
  console.log("Start with the accounts:", DEPLOYER.address, TEST_USER1.address)

  const [blockNumber, feeData] = await Promise.all([
    ethers.provider.getBlockNumber(),
    ethers.provider.getFeeData()
  ])
  console.log("Current block number:", blockNumber)
  console.log("Current fee data:", feeData)

  const overrides = {
    maxFeePerGas: BigInt(feeData.maxFeePerGas) * BigInt(2), // BigNumber.from() 사용
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    type: 2
  };

  type OLPTokenToMintAndStake = {
    recipient: string
    fundToken: string
    fundTokenAddress: string
    fundTokenAmount: string
  }

  const fundTokenToContract = {
    USDC: usdc,
    WBTC: wbtc,
    WETH: weth,
  }

  const fundTokenAllowances = {
    USDC: "0",
    WBTC: "0",
    WETH: "0",
  }

  const isApproveFailed = {
    USDC: false,
    WBTC: false,
    WETH: false,
  }

  const olpTokenToMintAndStakes: OLPTokenToMintAndStake[] = [
    {
      recipient: "0x47b034B668fe6abDB9755e2c1533a01b05eb1CdA",
      fundToken: "USDC",
      fundTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      fundTokenAmount: "1000"
    }
  ]

  // Calculate the allowance for each fund token
  for (const olpTokenToMintAndStake of olpTokenToMintAndStakes) {
    const { fundToken, fundTokenAmount } = olpTokenToMintAndStake;
    const fundTokenAmountBigNumber = new BigNumber(fundTokenAmount);

    if (fundToken === "USDC") {
      fundTokenAllowances[fundToken] = new BigNumber(fundTokenAllowances[fundToken]).plus(fundTokenAmountBigNumber).toString();
    } else if (fundToken === "WBTC") {
      fundTokenAllowances[fundToken] = new BigNumber(fundTokenAllowances[fundToken]).plus(fundTokenAmountBigNumber).toString();
    } else if (fundToken === "WETH") {
      fundTokenAllowances[fundToken] = new BigNumber(fundTokenAllowances[fundToken]).plus(fundTokenAmountBigNumber).toString();
    }
  }

  let approveTxCounter = 0;

  for (const [fundToken, fundTokenAllowance] of Object.entries(fundTokenAllowances)) {
    const fundTokenAmountBigNumber = new BigNumber(fundTokenAllowance);

    if (fundTokenAmountBigNumber.isZero()) {
      continue;
    }

    console.log("approve fundToken", fundToken)
    console.log("approve fundTokenAllowance", fundTokenAllowance)

    try {
      const approveTx = await fundTokenToContract[fundToken as keyof typeof fundTokenToContract].connect(DEPLOYER).approve(
        CONTRACT_ADDRESS.S_OLP_MANAGER,
        fundTokenAmountBigNumber.toString()
      );
  
      await approveTx.wait();
      approveTxCounter++;
      console.log(`✅ Approve successful! ${approveTx.hash}`);
    } catch (error) {
      isApproveFailed[fundToken as keyof typeof isApproveFailed] = true;
      console.error(`❌ Approve failed to ${fundToken}`, error);
    }
  }

  // 하나라도 실패하는 경우
  if (Object.values(isApproveFailed).some(Boolean)) {
    console.log("Some approve transactions are failed")
    return;
  }

  if (approveTxCounter === 0) {
    console.log("Nothing to approve")
    return;
  }
  
  for (const olpTokenToMintAndStake of olpTokenToMintAndStakes) {
    const { recipient, fundToken, fundTokenAddress, fundTokenAmount } = olpTokenToMintAndStake;

    console.log("Start to mint and stake..")
    console.log("recipient", recipient)
    console.log("fundToken", fundToken)
    console.log("fundTokenAmount", fundTokenAmount)

    const fundTokenContract = fundTokenToContract[fundToken as keyof typeof fundTokenToContract];
    const fundTokenContractAddress = await fundTokenContract.getAddress();

    if (fundTokenContractAddress !== fundTokenAddress) {
      console.log("fundTokenContractAddress is not equal to fundTokenAddress")
      return;
    }

    try {
      const mintAndStakeTx = await sRewardRouterV2.connect(DEPLOYER).mintAndStakeOlpTo(
        fundTokenAddress,
        fundTokenAmount,
        0, // minUsdg
        0, // minOlp
        String(recipient),
        overrides
      );

      await mintAndStakeTx.wait();

      console.log(`✅ Transfer successful to ${recipient} ${mintAndStakeTx.hash}`);
    } catch (error) {
      console.error(`❌ Transfer failed to ${recipient}`, error);
    }
  }

  console.log("Operation completed")
}

(async () => {
  await checkTx3(ethers, null)
})()