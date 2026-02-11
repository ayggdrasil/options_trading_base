import { writeFile } from "fs/promises";
import path from "path";
import request, { gql } from "graphql-request";
import { createPublicClient, formatUnits, http } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ADDRESS_TO_NAME } from "../common/address";
import ERC20_ABI from "../abis/ERC20Abi.json";

export async function checkUserOlpStatus(
    chain: keyof typeof CONTRACT_ADDRESS,
    olpAddress: string
) {
    const olpNetAmounts = await calculateNetAmounts(chain, olpAddress);
    console.log("olpNetAmounts", olpNetAmounts);
    console.log("Completed");
}

const getAllResult = async ({
    filter,
    document,
    endCursor,
    subgraphUrl,
    accumulation = {
        pageInfo: {},
        nodes: [],
    },
}: {
    filter: any;
    document: any;
    endCursor: any;
    subgraphUrl: any;
    accumulation?: {
        pageInfo: {};
        nodes: undefined[];
    };
}): Promise<{
    pageInfo: {};
    nodes: undefined[];
}> => {
    if (!subgraphUrl) {
        throw new Error("SubgraphUrl is not set");
    }

    const response: any = await request(subgraphUrl, document, {
        first: 1000,
        after: endCursor,
        filter,
    });

    const itemKey = Object.keys(response)[0];
    const items = response[itemKey];

    accumulation = {
        pageInfo: items.pageInfo,
        nodes: [...accumulation.nodes, ...items.nodes],
    };

    if (!items.pageInfo.hasNextPage) {
        return accumulation;
    }

    return await getAllResult({
        filter,
        document,
        endCursor: items.pageInfo.endCursor,
        subgraphUrl,
        accumulation,
    });
};

// Add Liquidity

const getAddLiquidityQueryFilter = (olpAddress: string) => {
    let filter: any = {
        olp: { equalToInsensitive: olpAddress },
    };

    return filter;
};

const getAddLiquidityWithFilter = async (filter: any, subgraphUrl: string) => {
    let document = gql`
        query ($first: Int, $after: Cursor, $filter: AddLiquidityFilter) {
            addLiquidities(first: $first, after: $after, filter: $filter) {
                pageInfo {
                    endCursor
                    hasNextPage
                }

                nodes {
                    id
                    account
                    olp
                    token
                    amount
                    aumInUsdg
                    olpSupply
                    usdgAmount
                    mintAmount
                    processBlockTime
                }
            }
        }
    `;

    return getAllResult({
        filter,
        document,
        endCursor: null,
        subgraphUrl,
    });
};

const getUserAddLiquidityWithState = async (
    olpAddress: string,
    subgraphUrl: string
) => {
    const olpQueryFilter = getAddLiquidityQueryFilter(olpAddress);
    const { nodes } = await getAddLiquidityWithFilter(
        olpQueryFilter,
        subgraphUrl
    );

    let result: Record<string, string> = {};

    nodes.forEach((node: any) => {
        const { account, ...nodeData } = node;

        if (!result[account]) {
            result[account] = BigInt(nodeData.mintAmount).toString();
        } else {
            result[account] = (
                BigInt(result[account]) + BigInt(nodeData.mintAmount)
            ).toString();
        }
    });

    return result;
};

// Remove Liquidity

const getRemoveLiquidityQueryFilter = (olpAddress: string) => {
    let filter: any = {
        olp: { equalToInsensitive: olpAddress },
    };

    return filter;
};

const getRemoveLiquidityWithFilter = async (
    filter: any,
    subgraphUrl: string
) => {
    let document = gql`
        query ($first: Int, $after: Cursor, $filter: RemoveLiquidityFilter) {
            removeLiquidities(first: $first, after: $after, filter: $filter) {
                pageInfo {
                    endCursor
                    hasNextPage
                }

                nodes {
                    id
                    account
                    olp
                    token
                    olpAmount
                    aumInUsdg
                    olpSupply
                    usdgAmount
                    amountOut
                    processBlockTime
                }
            }
        }
    `;

    return getAllResult({
        filter,
        document,
        endCursor: null,
        subgraphUrl,
    });
};

const getUserRemoveLiquidityWithState = async (
    olpAddress: string,
    subgraphUrl: string
) => {
    const olpQueryFilter = getRemoveLiquidityQueryFilter(olpAddress);
    const { nodes } = await getRemoveLiquidityWithFilter(
        olpQueryFilter,
        subgraphUrl
    );

    let result: Record<string, string> = {};

    nodes.forEach((node: any) => {
        const { account, ...nodeData } = node;

        if (!result[account]) {
            result[account] = BigInt(nodeData.olpAmount).toString();
        } else {
            result[account] = (
                BigInt(result[account]) + BigInt(nodeData.olpAmount)
            ).toString();
        }
    });

    return result;
};

// Integrate

const calculateNetAmounts = async (
    chain: keyof typeof CONTRACT_ADDRESS,
    olpAddress: string
) => {
    const subgraphUrl = process.env.OLD_GRAPHQL_URL;

    if (!subgraphUrl) {
        throw new Error("SubgraphUrl is not set");
    }

    const addLiquidityPositions = await getUserAddLiquidityWithState(
        olpAddress,
        subgraphUrl
    );
    const removeLiquidityPositions = await getUserRemoveLiquidityWithState(
        olpAddress,
        subgraphUrl
    );

    const netPositions: Record<string, string> = {};

    // Process add liquidity positions
    Object.entries(addLiquidityPositions).forEach(
        ([account, amount]: [string, string]) => {
            netPositions[account] = BigInt(amount).toString();
        }
    );

    // Subtract remove liquidity positions
    Object.entries(removeLiquidityPositions).forEach(
        ([account, amount]: [string, string]) => {
            if (netPositions[account]) {
                netPositions[account] = (
                    BigInt(netPositions[account]) - BigInt(amount)
                ).toString();
            } else {
                console.log(
                    `Account ${account} has remove liquidity position but no add liquidity position`
                );
            }
        }
    );

    const RPC_URL = process.env.RPC_URL!;

    if (!RPC_URL) {
        throw new Error("Required environment variables are missing");
    }

    const publicClient = createPublicClient({
        transport: http(RPC_URL),
    });

    const olpName = CONTRACT_ADDRESS_TO_NAME[chain][olpAddress];
    const fOlpAddress =
        olpName === "S_OLP"
            ? CONTRACT_ADDRESS[chain].S_REWARD_TRACKER
            : olpName === "M_OLP"
            ? CONTRACT_ADDRESS[chain].M_REWARD_TRACKER
            : CONTRACT_ADDRESS[chain].L_REWARD_TRACKER;

    // Check actual balances using balanceOf
    const balanceChecks = await Promise.all(
        Object.entries(netPositions)
            .filter(([_, amount]) => amount !== "0")
            .map(async ([account, calculatedAmount]) => {
                try {
                    const actualBalance = await publicClient.readContract({
                        address: fOlpAddress as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: "balanceOf",
                        args: [account as `0x${string}`],
                    });

                    return {
                        account,
                        calculatedAmount: BigInt(calculatedAmount),
                        actualBalance: actualBalance as bigint,
                        matches: BigInt(calculatedAmount) === actualBalance,
                    };
                } catch (error) {
                    console.error(
                        `Error checking balance for ${account}:`,
                        error
                    );
                    return {
                        account,
                        calculatedAmount: BigInt(calculatedAmount),
                        actualBalance: BigInt(0),
                        matches: false,
                        error: true,
                    };
                }
            })
    );

    const sortedPositions = balanceChecks
        .map(({ account, calculatedAmount, actualBalance, matches }) => ({
            account,
            formattedCalculatedAmount: formatUnits(calculatedAmount, 18),
            formattedActualBalance: formatUnits(actualBalance, 18),
            rawCalculatedAmount: calculatedAmount.toString(),
            rawActualBalance: actualBalance.toString(),
            matches,
        }))
        .sort((a, b) =>
            Number(
                BigInt(b.rawCalculatedAmount) - BigInt(a.rawCalculatedAmount)
            )
        );

    // CSV 파일로 저장
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${olpName}_Holders_List_${timestamp}.csv`;
    const csvContent = [
        "account,calculatedAmount,actualBalance,matches,rawCalculatedAmount,rawActualBalance",
        ...sortedPositions.map(
            ({
                account,
                formattedCalculatedAmount,
                formattedActualBalance,
                matches,
                rawCalculatedAmount,
                rawActualBalance,
            }) =>
                `${account},${formattedCalculatedAmount},${formattedActualBalance},${matches},${rawCalculatedAmount},${rawActualBalance}`
        ),
    ].join("\n");

    try {
        await writeFile(
            path.join(__dirname, "..", "..", "data", "output", fileName),
            csvContent
        );
        console.log(`Results saved to ${fileName}`);
    } catch (error) {
        console.error("Error writing file:", error);
    }

    const formattedPositions = sortedPositions.reduce(
        (
            acc,
            {
                account,
                formattedCalculatedAmount,
                formattedActualBalance,
                matches,
            }
        ) => {
            acc[account] = {
                calculated: formattedCalculatedAmount,
                actual: formattedActualBalance,
                matches,
            };
            return acc;
        },
        {} as Record<
            string,
            { calculated: string; actual: string; matches: boolean }
        >
    );

    return formattedPositions;
};
