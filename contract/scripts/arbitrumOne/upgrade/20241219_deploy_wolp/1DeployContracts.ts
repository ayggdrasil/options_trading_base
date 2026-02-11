
import BigNumber from 'bignumber.js';
import { ethers, upgrades } from "hardhat";
import { formatEther } from "ethers";
import { writeFileSync } from 'fs'
import { deployWOLP } from '../../deployContracts/deploy.wOlp';
import { CONTRACT_ADDRESS } from '../../constants';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

async function main() {
  const [
    DEPLOYER,
    KEEPER_OPTIONS_MARKET,
    KEEPER_POSITION_PROCESSOR,
    KEEPER_SETTLE_OPERATOR,
    KEEPER_POSITION_VALUE_FEEDER,
    KEEPER_POSITION_VALUE_FEEDER_SUB1,
    KEEPER_SPOT_PRICE_FEEDER,
    KEEPER_SPOT_PRICE_FEEDER_SUB1,
    KEEPER_FEE_DISTRIBUTOR,
    KEEPER_CLEARING_HOUSE,
    TEST_USER1, 
    TEST_USER2
  ] = await (ethers as any).getSigners()
  console.log("Deploying contracts with the account:", DEPLOYER.address);
  const deployerBalanceBefore = formatEther(await (ethers as any).provider.getBalance(DEPLOYER.address))

  const { wOlp } = await deployWOLP(ethers, { upgrades })

  writeFileSync(`latestAddress.${process.env.HARDHAT_NETWORK}.json`, JSON.stringify(CONTRACT_ADDRESS, null, 2))
  writeFileSync(`../shared/latestAddress.${process.env.HARDHAT_NETWORK}.json`, JSON.stringify(CONTRACT_ADDRESS, null, 2))

  const deployerBalanceAfter = formatEther(await (ethers as any).provider.getBalance(DEPLOYER.address))
  const diffBalance = new BigNumber(deployerBalanceBefore).minus(deployerBalanceAfter).toString()
  console.log(`${diffBalance} ETH used for running deploy script`)

  console.log('Deployment completed')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});