import { createSafeClient, SafeClient } from '@safe-global/sdk-starter-kit';
import { Interface } from 'ethers';
import { ethers, upgrades } from "hardhat";
import dotenv from 'dotenv';
import { CONTRACT_ADDRESS } from '../constants';

export async function safeTx(safeClient: SafeClient, data: {
	to: string, 
	abi: string,
	params: any[],
	value?: string
}[]) {
    
	const txs = []
	const nonce = await safeClient.getNonce()
	for (const [index, item] of data.entries()) {
		if (item.to === "0x0000000000000000000000000000000000000000") {
			throw new Error("Zero address is not allowed for safeTx.")
		}
		console.log(`item.abi: ${item.abi}`)
		const contractInterface = new Interface([item.abi]);
		const functionFragment = ethers.FunctionFragment.from(item.abi)
		const encodedData = contractInterface.encodeFunctionData(functionFragment, item.params);
		txs.push({
			to: item.to,
			data: encodedData,
			value: item.value ?? "0",
			nonce: nonce + index
		})
		console.log(`nonce: ${nonce + index}`)
	}
	
  const txResult = await safeClient.send({ transactions: txs })
  const safeTxHash = txResult.transactions?.ethereumTxHash
  console.log(JSON.stringify(txResult, null, 2))
  console.log(`status: ${txResult.status}`)
  console.log(`txHash: ${safeTxHash}`)
}

export const upgradeProxyWithSafe = async () => {
    const safeClient = await createSafeClient({
        provider: String(process.env.RPC_URL),
        signer: String(process.env.SAFE_SIGNER_PRIVATE_KEY),
        safeAddress: String(process.env.SAFE_ADDRESS) // safeAddress
    })
    const nonce = await safeClient.getNonce()
    console.log(`nonce: ${nonce}`)

    const PROXY_ADMIN = "0x09967AaCBE1D760d6C44823480fa50e884ef1733"

    const spotPriceFeedProxyAddress = CONTRACT_ADDRESS.SPOT_PRICE_FEED;
    const SpotPriceFeed = await ethers.getContractFactory("SpotPriceFeed")
    const spotPriceFeed = await SpotPriceFeed.deploy()
    await spotPriceFeed.waitForDeployment()
    const spotPriceFeedImplementationAddress = await spotPriceFeed.getAddress()

    const positionValueFeedProxyAddress = CONTRACT_ADDRESS.POSITION_VALUE_FEED;
    const PositionValueFeed = await ethers.getContractFactory("PositionValueFeed")
    const positionValueFeed = await PositionValueFeed.deploy()
    await positionValueFeed.waitForDeployment()
    const positionValueFeedImplementationAddress = await positionValueFeed.getAddress()

    // Batch Transaction 
    await safeTx(safeClient, [
        {
            to: PROXY_ADMIN,
            abi: "function upgrade(address,address)", // by contract
            params: [spotPriceFeedProxyAddress, spotPriceFeedImplementationAddress],
        },
        {
            to: PROXY_ADMIN,
            abi: "function upgrade(address,address)", // by contract
            params: [positionValueFeedProxyAddress, positionValueFeedImplementationAddress],
        },
    ])
}

(async () => {
    await upgradeProxyWithSafe()
})()