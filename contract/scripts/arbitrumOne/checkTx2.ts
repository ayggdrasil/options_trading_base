import BigNumber from "bignumber.js";

import { getDeployedContracts } from "./deployedContracts";
import { ethers } from "hardhat";
import { formatOptionTokenId, parseOptionTokenId } from "../../utils/format";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

type TokenTransfer = {
  underlyingAsset: string
  recipient: string
  amount: string
}

export async function checkTx(ethers: any, addressMap: any) {
  console.log("checkTx..")
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
    TEST_USER1, 
    // TEST_USER2
  ] = await (ethers as any).getSigners()
  const {
    CONTRACT_ADDRESS,
    wbtc,
    weth,
    usdc,
    usdt,
    optionsAuthority,
    vaultPriceFeed,
    optionsMarket,
    sVault,
    sVaultUtils,
    susdg,
    solp,
    sOlpManager,
    sRewardTracker,
    sRewardDistributor,
    sRewardRouterV2,
    controller,
    positionManager,
    feeDistributor,
    btcOptionsToken,
    ethOptionsToken,
    primaryOracle,
    fastPriceEvents,
    fastPriceFeed,
    positionValueFeed,
    settlePriceFeed,
    spotPriceFeed,
    viewAggregator,
    referral,
  } = await getDeployedContracts(ethers, addressMap);
  console.log("Start with the account:", TEST_USER1.address)

  const [blockNumber, feeData] = await Promise.all([
    ethers.provider.getBlockNumber(),
    ethers.provider.getFeeData()
  ])
  console.log("Current block number:", blockNumber)
  console.log("Current fee data:", feeData)

  // 가스 가격 설정
  const overrides = {
    maxFeePerGas: BigInt(feeData.maxFeePerGas) * BigInt(2), // BigNumber.from() 사용
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    type: 2
  };

  // TODO: 토큰 전송 데이터 추가
  const tokenTransfers: TokenTransfer[] = [
    {
      underlyingAsset: "USDT",
      recipient: "0xeD883E941C29987A4997C226953E0CC298eFa23F",
      amount: "1000",
    }
  ]

  for (const tokenTransfer of tokenTransfers) {
    const { underlyingAsset, recipient, amount } = tokenTransfer
    const token = 
    underlyingAsset === "USDT" ? usdt 
    : underlyingAsset === "WBTC" ? wbtc 
    : underlyingAsset === "WETH" ? weth
    : underlyingAsset === "USDC" ? usdc
    : undefined

    try {
      const tx = await token.connect(TEST_USER1).transfer(
        recipient,      // to 주소
        amount,               // 수량
        overrides
      );

      const receipt = await tx.wait();

      console.log(`✅ Transfer successful! ${underlyingAsset} to ${recipient} ${amount} ${receipt.transactionHash}`);
    } catch (error) {
      console.error(`❌ Transfer failed! ${underlyingAsset} to ${recipient} ${amount}`, error);
    }
  }

  console.log("Operation completed")
}

(async () => {
  await checkTx(ethers, null)
})()