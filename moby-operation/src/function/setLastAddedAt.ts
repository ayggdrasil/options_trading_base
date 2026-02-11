import {
    createWalletClient,
    createPublicClient,
    http,
    type Address,
    type Hash,
    type WalletClient,
    type PublicClient,
    formatEther,
    getContract
} from 'viem';
import { arbitrum } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { BN } from '../common/bignumber';
import { CONTRACT_ADDRESS } from '../common/address';
import fs from 'fs';
import path from 'path';

const outputDir = path.join(__dirname, '..', 'data', 'output', 'last_added_at');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

import OlpManagerAbi from '../abis/OlpManagerAbi.json';

export async function processSetLastAddedAt(
    chain: keyof typeof CONTRACT_ADDRESS,
    fileName: string
) {
    const RPC_URL = process.env.RPC_URL!;
    const DEPLOYER_KEY = process.env.DEPLOYER_KEY!;

    if (!RPC_URL || !DEPLOYER_KEY) {
        throw new Error('Required environment variables are missing');
    }

    const publicClient = createPublicClient({
        transport: http(RPC_URL)
    });
    const deployer = privateKeyToAccount(`0x${DEPLOYER_KEY}`);
    const walletClient = createWalletClient({
        account: deployer,
        transport: http(RPC_URL),
        chain: arbitrum
    });

    const sOlpManager = getContract({
        address: CONTRACT_ADDRESS[chain].S_OLP_MANAGER as `0x${string}`,
        abi: OlpManagerAbi,
        client: {
            public: publicClient,
            wallet: walletClient
        }
    })

    console.log("Start with account:", deployer.address);

    const [blockNumber, feeData] = await Promise.all([
        publicClient.getBlockNumber(),
        publicClient.estimateFeesPerGas()
    ]);

    console.log("Current block number:", blockNumber);
    console.log("Current fee data:", feeData);

    const filePath = `data/input/last_added_at/${fileName}.txt`;

    let inputData: { targetAddress: string; }[] = [];

    try {
        inputData = fs.readFileSync(filePath, 'utf-8')
            .split('\n')
            .filter(line => line.trim()) // 빈 줄 제거
            .map(line => {
                const [address] = line.split(',').map(item => item.trim());
                return {
                    targetAddress: address as `0x${string}`,
                };
            });
    } catch (error) {
        console.error('Error reading or parsing file:', error);
        throw error;
    }

    console.log("inputData", inputData);

    for (const data of inputData) {
        const { targetAddress } = data;

        console.log("Start to set last added at..");
        console.log("targetAddress", targetAddress);

        try {
            const hash = await walletClient.writeContract({
                address: sOlpManager.address as Address,
                abi: sOlpManager.abi,
                functionName: 'setLastAddedAt',
                args: [
                    targetAddress,
                    0n,
                ],
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            if (receipt.status === 'success') {
                console.log(`✅ Transfer successful to ${targetAddress} ${hash}`);
                fs.appendFileSync(
                    path.join(__dirname, '..', 'data', 'output', 'last_added_at', `${fileName}.txt`),
                    `${targetAddress},${hash},SUCCESS\n`
                );
            } else {
                console.error(`❌ Transfer failed to ${targetAddress} ${hash}`);
                fs.appendFileSync(
                    path.join(__dirname, '..', 'data', 'output', 'last_added_at', `${fileName}.txt`),
                    `${targetAddress},${hash},FAILED\n`
                );
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`❌ Transfer failed to ${targetAddress}`);
            fs.appendFileSync(
                path.join(__dirname, '..', 'data', 'output', 'last_added_at', `${fileName}.txt`),
                `${targetAddress},ERROR\n`
            );
        }
    }

    console.log("Operation completed");
}