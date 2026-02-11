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

const outputDir = path.join(__dirname, '..', 'data', 'output', 'olp_compensation');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

import ERC20_ABI from '../abis/ERC20Abi.json';
import REWARD_ROUTER_V2_ABI from '../abis/RewardRouterV2Abi.json';

export async function processOlpCompensation(
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

    const weth = getContract({
        address: CONTRACT_ADDRESS[chain].WETH as `0x${string}`,
        abi: ERC20_ABI,
        client: {
            public: publicClient,
            wallet: walletClient
        }
    });

    const usdc = getContract({
        address: CONTRACT_ADDRESS[chain].USDC as `0x${string}`,
        abi: ERC20_ABI,
        client: {
            public: publicClient,
            wallet: walletClient
        }
    });

    const sRewardRouterV2 = getContract({
        address: CONTRACT_ADDRESS[chain].S_REWARD_ROUTER_V2 as `0x${string}`,
        abi: REWARD_ROUTER_V2_ABI,
        client: {
            public: publicClient,
            wallet: walletClient
        }
    });

    console.log("Start with account:", deployer.address);

    const [blockNumber, feeData] = await Promise.all([
        publicClient.getBlockNumber(),
        publicClient.estimateFeesPerGas()
    ]);

    console.log("Current block number:", blockNumber);
    console.log("Current fee data:", feeData);

    const filePath = `data/input/olp_compensation/${fileName}.txt`;

    let fundData: { recipient: string; fundToken: string; fundTokenAmount: string }[] = [];

    try {
        fundData = fs.readFileSync(filePath, 'utf-8')
            .split('\n')
            .filter(line => line.trim()) // 빈 줄 제거
            .map(line => {
                const [address, token, amount] = line.split(',').map(item => item.trim());
                return {
                    recipient: address as `0x${string}`,
                    fundToken: token,
                    fundTokenAmount: amount
                };
            });
    } catch (error) {
        console.error('Error reading or parsing file:', error);
        throw error;
    }

    console.log(`Loaded ${fundData.length} records from file`);

    const fundTokenContracts = {
        WETH: weth,
        USDC: usdc
    }

    const fundTokenAllowances = {
        WETH: "0",
        USDC: "0"
    }

    const fundTokenDecimals = {
        WETH: 18,
        USDC: 6
    }

    const isApprovalFailed = {
        WETH: false,
        USDC: false
    }

    // Calculate allowances
    for (const data of fundData) {
        const { fundToken, fundTokenAmount } = data;
        const fundTokenAmountBN = new BN(fundTokenAmount)
            .multipliedBy(
                new BN(10).pow(fundTokenDecimals[fundToken as keyof typeof fundTokenDecimals])
            )
            .toString();
        
        if (fundToken in fundTokenAllowances) {
            fundTokenAllowances[fundToken as keyof typeof fundTokenAllowances] = new BN(fundTokenAllowances[fundToken as keyof typeof fundTokenAllowances])
                .plus(fundTokenAmountBN)
                .toString();
        }
    }

    console.log("fundTokenAllowances", fundTokenAllowances);

    // Approve tokens
    let approveTxCounter = 0;
    for (const [fundToken, allowanceAmount] of Object.entries(fundTokenAllowances)) {
        const allowanceAmountBN = new BN(allowanceAmount);

        if (allowanceAmountBN.isZero()) {
            continue;
        }

        console.log("approve fundToken", fundToken);
        console.log("approve fundTokenAllowance", allowanceAmount);

        try {
            // viem contract write
            const hash = await walletClient.writeContract({
                address: fundTokenContracts[fundToken as keyof typeof fundTokenContracts].address as Address,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [CONTRACT_ADDRESS[chain].S_OLP_MANAGER, allowanceAmountBN.toString()],
                chain: arbitrum
            });

            await publicClient.waitForTransactionReceipt({ hash });
            approveTxCounter++;
            console.log(`✅ Approve successful! ${hash}`);
        } catch (error) {
            isApprovalFailed[fundToken as keyof typeof isApprovalFailed] = true;
            console.error(`❌ Approve failed to ${fundToken}`, error);
        }
    }

    // Check for failures
    if (Object.values(isApprovalFailed).some(Boolean)) {
        console.log("Some approve transactions are failed");
        return;
    }

    if (approveTxCounter === 0) {
        console.log("Nothing to approve");
        return;
    }

    // Mint and stake tokens
    for (const data of fundData) {
        const { recipient, fundToken, fundTokenAmount } = data;
        const fundTokenAmountBN = new BN(fundTokenAmount)
            .multipliedBy(
                new BN(10).pow(fundTokenDecimals[fundToken as keyof typeof fundTokenDecimals])
            )
            .toString();

        console.log("Start to mint and stake..");
        console.log("recipient", recipient);
        console.log("fundToken", fundToken);
        console.log("fundTokenAmount", fundTokenAmount);
        console.log("fundTokenAmountBN", fundTokenAmountBN);

        const fundTokenContract = fundTokenContracts[fundToken as keyof typeof fundTokenContracts];
        const fundTokenContractAddress = fundTokenContract.address;

        try {
            // viem contract write
            const hash = await walletClient.writeContract({
                address: sRewardRouterV2.address as Address,
                abi: sRewardRouterV2.abi,
                functionName: 'mintAndStakeOlpTo',
                args: [
                    fundTokenContractAddress,
                    fundTokenAmountBN,
                    0n, // minUsdg
                    0n, // minOlp
                    recipient
                ],
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            if (receipt.status === 'success') {
                console.log(`✅ Transfer successful to ${recipient} ${hash}`);
                fs.appendFileSync(
                    path.join(__dirname, '..', 'data', 'output', 'olp_compensation', `${fileName}.txt`),
                    `${recipient},${hash},SUCCESS\n`
                );
            } else {
                console.error(`❌ Transfer failed to ${recipient} ${hash}`);
                fs.appendFileSync(
                    path.join(__dirname, '..', 'data', 'output', 'olp_compensation', `${fileName}.txt`),
                    `${recipient},${hash},FAILED\n`
                );
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`❌ Transfer failed to ${recipient}`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            fs.appendFileSync(
                path.join(__dirname, '..', 'data', 'output', 'olp_compensation', `${fileName}.txt`),
                `${recipient},ERROR,${errorMessage}\n`
            );
        }
    }

    console.log("Operation completed");
}