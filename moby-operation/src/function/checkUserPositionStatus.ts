import { writeFile } from "fs/promises";
import path from "path";
import request, { gql } from "graphql-request";
import {
    getMainOptionName,
    getMainOptionStrikePrice,
    getPairedOptionName,
    getPairedOptionStrikePrice,
    getStrategy,
    isCallStrategy,
    isNaked,
    isNakedCall,
    isSpreadStrategy,
    parseOptionTokenId,
} from "../common/helper";
import {
    TICKER_TO_DECIMAL,
    UA_INDEX_TO_DECIMAL,
    UA_INDEX_TO_NAME,
} from "../common/asset";
import { formatUnits } from "viem";
import { SETTLE_PRICES_S3_URL, SPOT_INDICES_S3_URL } from "../common/api";
import { BN } from "../common/bignumber";

export async function checkUserPositionStatus(
    isExpired: boolean,
    isSettled: boolean,
    fromExpiry: number,
    toExpiry?: number
) {
    let targetPositions: any;
    let prefix: string;

    if (isExpired && !isSettled) {
        targetPositions = await getUsersExpiredButNotSettledPositions(
            fromExpiry,
            toExpiry
        );
        prefix = "expired_but_not_settled_positions";
    } else {
        targetPositions = await getUsersNotExpiredPositions();
        prefix = "not_expired_positions";
    }

    // JSON 파일로 저장
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${prefix}_${timestamp}.json`;

    try {
        await writeFile(
            path.join(__dirname, "..", "..", "data", "output", fileName),
            JSON.stringify(targetPositions, null, 2) // 두 번째 인자는 replacer, 세 번째 인자는 들여쓰기 공백 수
        );
        console.log(`Results saved to ${fileName}`);
    } catch (error) {
        console.error("Error writing file:", error);
    }

    consoleStatusForExpiredButNotSettled(targetPositions);
    // consoleStatusForNotExpired(targetPositions);

    console.log("\nCompleted");
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
    subgraphUrl: string;
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

    // console.log(filter, 'filter')
    // console.log(items.pageInfo, 'items.pageInfo')
    // console.log(items.nodes.length, 'items.nodes.length')
    // console.log(endCursor, 'endCursor')
    // console.log(items.pageInfo.endCursor, 'items.pageInfo.endCursor')

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

enum PositionState {
    ALL,
    NOT_EXPIRED,
    EXPIRED,
}

enum SettleState {
    ALL,
    NOT_SETTLED,
    SETTLED,
}

const getPositionsQueryFilter = (
    positionState: PositionState,
    settleState: SettleState,
    fromExpiry?: number,
    toExpiry?: number
) => {
    let filter: any = {
        or: [
            { size: { greaterThan: "0" } },
            { sizeClosing: { greaterThan: "0" } },
        ],
        account: {
            notEqualTo: "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41",
        },
    };

    const currentTime = Math.floor(new Date().getTime() / 1000);

    if (positionState === PositionState.NOT_EXPIRED) {
        filter = {
            ...filter,
            expiry: { greaterThan: `${currentTime}` },
        };
    } else if (positionState === PositionState.EXPIRED) {
        filter = {
            ...filter,
            expiry: {
                lessThanOrEqualTo: `${toExpiry || currentTime}`,
                greaterThanOrEqualTo: `${fromExpiry || 0}`, // Add minimum expiry filter
            },
        };
    }

    if (settleState === SettleState.NOT_SETTLED) {
        filter = { ...filter, isSettled: { equalTo: false } };
    } else if (settleState === SettleState.SETTLED) {
        filter = { ...filter, isSettled: { equalTo: true } };
    }

    return filter;
};

const getPositionsWithFilter = async (filter: any, subgraphUrl: string) => {
    let document = gql`
        query ($first: Int, $after: Cursor, $filter: PositionFilter) {
            positions(first: $first, after: $after, filter: $filter) {
                pageInfo {
                    endCursor
                    hasNextPage
                }

                nodes {
                    id
                    account
                    underlyingAssetIndex
                    expiry
                    optionTokenId
                    length
                    isBuys
                    strikePrices
                    isCalls
                    optionNames
                    size
                    sizeOpened
                    sizeClosing
                    sizeClosed
                    sizeSettled
                    isBuy
                    executionPrice
                    openedToken
                    openedAmount
                    openedCollateralToken
                    openedCollateralAmount
                    openedAvgExecutionPrice
                    openedAvgSpotPrice
                    closedToken
                    closedAmount
                    closedCollateralToken
                    closedCollateralAmount
                    closedAvgExecutionPrice
                    closedAvgSpotPrice
                    settledToken
                    settledAmount
                    settledCollateralToken
                    settledCollateralAmount
                    settledPrice
                    isSettled
                    lastProcessBlockTime
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

const getUsersPositionsWithState = async (
    positionState: PositionState,
    settleState: SettleState = SettleState.ALL,
    subgraphUrl: string,
    fromExpiry?: number,
    toExpiry?: number
) => {
    const positionsQueryFilter = getPositionsQueryFilter(
        positionState,
        settleState,
        fromExpiry,
        toExpiry
    );
    const { nodes } = await getPositionsWithFilter(
        positionsQueryFilter,
        subgraphUrl
    );

    const [settlePricesRes, spotIndicesRes] = await Promise.all([
        fetch(SETTLE_PRICES_S3_URL),
        fetch(SPOT_INDICES_S3_URL),
    ]);

    if (!settlePricesRes.ok || !spotIndicesRes.ok) {
        throw new Error("Failed to fetch settle prices or spot indices");
    }

    const settlePrices = await settlePricesRes.json();
    const spotIndices = await spotIndicesRes.json();

    let result: Record<string, Record<string, any[]>> = {};
    // let resultParsed: any[] = [];

    nodes.forEach((node: any) => {
        const { account, expiry, ...nodeData } = node;
        const optionTokenId = BigInt(nodeData.optionTokenId);
        const {
            underlyingAssetIndex,
            strategy,
            length,
            isBuys,
            strikePrices,
            isCalls,
            vaultIndex,
        } = parseOptionTokenId(optionTokenId);

        const underlyingAsset = UA_INDEX_TO_NAME[underlyingAssetIndex];
        const isBuy = nodeData.isBuy;
        const isCall = isCallStrategy(strategy);
        const isCombo = isSpreadStrategy(strategy);
        const mainOptionName = getMainOptionName(
            optionTokenId,
            nodeData.optionNames
        );
        const pairedOptionName = getPairedOptionName(
            optionTokenId,
            nodeData.optionNames
        );
        const mainOptionStrikePrice = getMainOptionStrikePrice(optionTokenId);
        const pairedOptionStrikePrice =
            getPairedOptionStrikePrice(optionTokenId);

        const size = nodeData.size;
        const sizeParsed = formatUnits(
            nodeData.size,
            UA_INDEX_TO_DECIMAL[underlyingAssetIndex]
        );

        const sizeClosing = nodeData.sizeClosing;
        const sizeClosingParsed = formatUnits(
            nodeData.sizeClosing,
            UA_INDEX_TO_DECIMAL[underlyingAssetIndex]
        );

        const sizeSum = new BN(size).plus(new BN(sizeClosing)).toString();
        const sizeSumParsed = formatUnits(
            BigInt(sizeSum),
            UA_INDEX_TO_DECIMAL[underlyingAssetIndex]
        );

        const settlePrice = settlePrices[expiry][underlyingAsset];
        const underlyingAssetSpotIndex = spotIndices[underlyingAsset];
        const stableAssetSpotIndex = spotIndices["USDC"];

        const isITM = isCall
            ? mainOptionStrikePrice < settlePrice
            : mainOptionStrikePrice > settlePrice;

        if (!isITM) return;

        const payoffToken = isNakedCall(strategy) ? underlyingAsset : "USDC";
        let finalPayoffAmount = "0";
        let finalPayoffAmountParsed = 0;

        const settlePayoffUsd = isITM
            ? isCombo
                ? isCall
                    ? Math.min(
                          new BN(settlePrice)
                              .minus(mainOptionStrikePrice)
                              .toNumber(),
                          new BN(mainOptionStrikePrice)
                              .minus(pairedOptionStrikePrice)
                              .abs()
                              .toNumber()
                      )
                    : Math.min(
                          new BN(mainOptionStrikePrice)
                              .minus(settlePrice)
                              .toNumber(),
                          new BN(mainOptionStrikePrice)
                              .minus(pairedOptionStrikePrice)
                              .abs()
                              .toNumber()
                      )
                : isCall
                ? new BN(settlePrice).minus(mainOptionStrikePrice).toNumber()
                : new BN(mainOptionStrikePrice).minus(settlePrice).toNumber()
            : 0;

        const settlePayoffUsdWithSize = new BN(sizeSumParsed)
            .multipliedBy(settlePayoffUsd)
            .toNumber();

        const settlePayoffAmountWithSize = isNakedCall(strategy)
            ? new BN(settlePayoffUsdWithSize)
                  .dividedBy(underlyingAssetSpotIndex)
                  .toNumber() // Buy Call, Sell Call
            : new BN(settlePayoffUsdWithSize)
                  .dividedBy(stableAssetSpotIndex)
                  .toNumber(); // Buy Put, Sell Put, Buy CallSpread, Sell CallSpread, Buy PutSpread, Sell PutSpread

        if (isBuy) {
            if (isITM) {
                finalPayoffAmountParsed = settlePayoffAmountWithSize;
            }
        } else {
            const collateralAmount = isCombo
                ? new BN(mainOptionStrikePrice)
                      .minus(pairedOptionStrikePrice)
                      .abs()
                      .multipliedBy(sizeSumParsed)
                      .toNumber()
                : isNakedCall(strategy)
                ? Number(sizeSumParsed)
                : new BN(mainOptionStrikePrice)
                      .multipliedBy(sizeSumParsed)
                      .toNumber();
            const collateralUsd = isNakedCall(strategy)
                ? collateralAmount * underlyingAssetSpotIndex
                : collateralAmount * stableAssetSpotIndex;

            if (isITM) {
                finalPayoffAmountParsed =
                    collateralAmount - settlePayoffAmountWithSize;
            } else {
                finalPayoffAmountParsed = collateralAmount;
            }
        }

        finalPayoffAmount = isNakedCall(strategy)
            ? new BN(finalPayoffAmountParsed)
                  .multipliedBy(
                      new BN(10).pow(
                          TICKER_TO_DECIMAL[
                              underlyingAsset as keyof typeof TICKER_TO_DECIMAL
                          ]
                      )
                  )
                  .toFixed(0)
            : new BN(finalPayoffAmountParsed)
                  .multipliedBy(new BN(10).pow(6))
                  .toFixed(0);

        const dataObj = {
            underlyingAsset: underlyingAsset,
            type: length === 1 ? "Naked" : "Spread",
            isBuy: nodeData.isBuy,
            isCall: isCall,
            mainOptionName: mainOptionName,
            pairedOptionName: pairedOptionName,
            optionTokenId: nodeData.optionTokenId,
            size,
            sizeParsed,
            sizeClosing,
            sizeClosingParsed,
            sizeSum,
            sizeSumParsed,
            isSettled: nodeData.isSettled,
            settlePrice,
            isITM,
            payoffToken,
            finalPayoffAmount,
            finalPayoffAmountParsed,
        };

        // type 1
        if (!result[account]) {
            result[account] = {};
        }
        if (!result[account][expiry]) {
            result[account][expiry] = [dataObj];
        } else {
            result[account][expiry].push(dataObj);
        }

        // // type 2
        // const dataObjParsed = {
        //     ...dataObj,
        //     account,
        //     expiry
        // }
        // resultParsed.push(dataObjParsed);
    });

    return result;
    // return resultParsed;
};

// Original functions can now be simplified to use the common function
const getUsersNotExpiredPositions = () => {
    const subgraphUrl = process.env.OLD_GRAPHQL_URL;

    if (!subgraphUrl) {
        throw new Error("SubgraphUrl is not set");
    }

    return getUsersPositionsWithState(
        PositionState.NOT_EXPIRED,
        SettleState.ALL,
        subgraphUrl
    );
};

const getUsersExpiredButNotSettledPositions = (
    fromExpiry?: number,
    toExpiry?: number
) => {
    const subgraphUrl = process.env.OLD_GRAPHQL_URL;

    if (!subgraphUrl) {
        throw new Error("SubgraphUrl is not set");
    }

    return getUsersPositionsWithState(
        PositionState.EXPIRED,
        SettleState.NOT_SETTLED,
        subgraphUrl,
        fromExpiry,
        toExpiry
    );
};

const consoleStatusForExpiredButNotSettled = (
    targetPositions: Record<string, Record<string, any[]>>
) => {
    const status: Record<string, any> = {
        BTC: {
            userCount: 0,
            positionCount: 0,
            stablePayoff: 0,
            underlyingAssetPayoff: 0,
            size: {
                buyCall: 0n,
                buyPut: 0n,
                sellCall: 0n,
                sellPut: 0n,
                buyCallSpread: 0n,
                buyPutSpread: 0n,
                sellCallSpread: 0n,
                sellPutSpread: 0n,
                total: 0n,
            },
            users: [],
        },
        ETH: {
            userCount: 0,
            positionCount: 0,
            stablePayoff: 0,
            underlyingAssetPayoff: 0,
            size: {
                buyCall: 0n,
                buyPut: 0n,
                sellCall: 0n,
                sellPut: 0n,
                buyCallSpread: 0n,
                buyPutSpread: 0n,
                sellCallSpread: 0n,
                sellPutSpread: 0n,
                total: 0n,
            },
            users: [],
        }
    };

    Object.entries(targetPositions).forEach(([account, expiryMap]) => {
        Object.entries(expiryMap).forEach(([expiry, positions]) => {
            positions.forEach((position) => {
                const {
                    underlyingAsset,
                    type,
                    isBuy,
                    isCall,
                    mainOptionName,
                    pairedOptionName,
                    optionTokenId,
                    size,
                    sizeParsed,
                    sizeClosing,
                    sizeClosingParsed,
                    sizeSum,
                    sizeSumParsed,
                    isITM,
                    payoffToken,
                    finalPayoffAmount,
                    finalPayoffAmountParsed,
                } = position;

                if (!status[underlyingAsset as keyof typeof status].users.includes(account)) {
                    status[underlyingAsset as keyof typeof status].users.push(account);
                    status[underlyingAsset as keyof typeof status].userCount++;
                };

                status[underlyingAsset as keyof typeof status].positionCount++;
                status[underlyingAsset as keyof typeof status].size.total = status[underlyingAsset as keyof typeof status].size.total + sizeSum;
                
                if (payoffToken === "USDC") {
                    status[underlyingAsset as keyof typeof status].stablePayoff = status[underlyingAsset as keyof typeof status].stablePayoff + finalPayoffAmountParsed;
                } else {
                    status[underlyingAsset as keyof typeof status].underlyingAssetPayoff = status[underlyingAsset as keyof typeof status].underlyingAssetPayoff + finalPayoffAmountParsed;
                }

                const strategy = getStrategy(BigInt(optionTokenId));
                const isNakedStrategy = isNaked(strategy);

                if (isBuy && isCall && isNakedStrategy) {
                    // Buy Naked Call
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.buyCall =
                        status[underlyingAsset as keyof typeof status].size
                            .buyCall + BigInt(sizeSum);
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + BigInt(sizeSum);
                } else if (isBuy && isCall && !isNakedStrategy) {
                    // Buy Call Spread
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.buyCallSpread =
                        status[underlyingAsset as keyof typeof status].size
                            .buyCallSpread + BigInt(sizeSum);
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + BigInt(sizeSum);
                } else if (isBuy && !isCall && isNakedStrategy) {
                    // Buy Naked Put
                    status[underlyingAsset as keyof typeof status].size.buyPut =
                        status[underlyingAsset as keyof typeof status].size
                            .buyPut + BigInt(sizeSum);
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + BigInt(sizeSum);
                } else if (isBuy && !isCall && !isNakedStrategy) {
                    // Buy Put Spread
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.buyPutSpread =
                        status[underlyingAsset as keyof typeof status].size
                            .buyPutSpread + BigInt(sizeSum);
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + BigInt(sizeSum);
                } else if (!isBuy && isCall && isNakedStrategy) {
                    // Sell Naked Call
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.sellCall =
                        status[underlyingAsset as keyof typeof status].size
                            .sellCall + BigInt(sizeSum);
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + BigInt(sizeSum);
                } else if (!isBuy && isCall && !isNakedStrategy) {
                    // Sell Call Spread
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.sellCallSpread =
                        status[underlyingAsset as keyof typeof status].size
                            .sellCallSpread + BigInt(sizeSum);
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + BigInt(sizeSum);
                } else if (!isBuy && !isCall && isNakedStrategy) {
                    // Sell Naked Put
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.sellPut =
                        status[underlyingAsset as keyof typeof status].size
                            .sellPut + BigInt(sizeSum);
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + BigInt(sizeSum);
                } else if (!isBuy && !isCall && !isNakedStrategy) {
                    // Sell Put Spread
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.sellPutSpread =
                        status[underlyingAsset as keyof typeof status].size
                            .sellPutSpread + BigInt(sizeSum);
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + BigInt(sizeSum);
                }
            });
        });
    });

    console.log(status, "status");
};

const consoleStatusForNotExpired = (
    targetPositions: Record<string, Record<string, any[]>>
) => {
    const status = {
        BTC: {
            size: {
                buyCall: 0n,
                buyPut: 0n,
                sellCall: 0n,
                sellPut: 0n,
                buyCallSpread: 0n,
                buyPutSpread: 0n,
                sellCallSpread: 0n,
                sellPutSpread: 0n,
                total: 0n,
            },
            collateral: {
                olp: {
                    btc: 0n,
                    eth: 0n,
                    usdc: 0n,
                },
                user: {
                    btc: 0n,
                    eth: 0n,
                    usdc: 0n,
                },
            },
        },
        ETH: {
            size: {
                buyCall: 0n,
                buyPut: 0n,
                sellCall: 0n,
                sellPut: 0n,
                buyCallSpread: 0n,
                buyPutSpread: 0n,
                sellCallSpread: 0n,
                sellPutSpread: 0n,
                total: 0n,
            },
            collateral: {
                olp: {
                    btc: 0n,
                    eth: 0n,
                    usdc: 0n,
                },
                user: {
                    btc: 0n,
                    eth: 0n,
                    usdc: 0n,
                },
            },
        },
    };

    Object.values(targetPositions).forEach((expiryMap: any) => {
        Object.values(expiryMap).forEach((positions: any) => {
            positions.forEach((position: any) => {
                const {
                    underlyingAsset,
                    type,
                    isBuy,
                    isCall,
                    mainOptionName,
                    pairedOptionName,
                    optionTokenId,
                    size,
                    sizeParsed,
                    sizeClosing,
                    sizeClosingParsed,
                } = position;

                const sizeBigInt = BigInt(size);
                const sizeClosingBigInt = BigInt(sizeClosing);

                const strategy = getStrategy(BigInt(optionTokenId));
                const isNakedStrategy = isNaked(strategy);

                const mainStrikePrice = getMainOptionStrikePrice(
                    BigInt(optionTokenId)
                );

                if (underlyingAsset !== "BTC" && underlyingAsset !== "ETH") {
                    return;
                }

                const sizeSum = sizeBigInt + sizeClosingBigInt;

                if (isBuy && isCall && isNakedStrategy) {
                    // Buy Naked Call
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.buyCall =
                        status[underlyingAsset as keyof typeof status].size
                            .buyCall + sizeSum;
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + sizeSum;

                    const collateralAmount = sizeBigInt + sizeClosingBigInt;
                    const collateralToken =
                        underlyingAsset === "BTC" ? "btc" : "eth";
                    status[
                        underlyingAsset as keyof typeof status
                    ].collateral.olp[collateralToken] =
                        status[underlyingAsset as keyof typeof status]
                            .collateral.olp[collateralToken] + collateralAmount;
                } else if (isBuy && isCall && !isNakedStrategy) {
                    // Buy Call Spread
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.buyCallSpread =
                        status[underlyingAsset as keyof typeof status].size
                            .buyCallSpread + sizeSum;
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + sizeSum;

                    const pairedOptionStrikePrice = getPairedOptionStrikePrice(
                        BigInt(optionTokenId)
                    );
                    const collateralAmountPerSize =
                        BigInt(
                            Math.abs(mainStrikePrice - pairedOptionStrikePrice)
                        ) *
                        BigInt(10) ** BigInt(TICKER_TO_DECIMAL.USDC);
                    const collateralAmount =
                        ((sizeBigInt + sizeClosingBigInt) *
                            collateralAmountPerSize) /
                        BigInt(10) **
                            BigInt(
                                TICKER_TO_DECIMAL[
                                    underlyingAsset as keyof typeof TICKER_TO_DECIMAL
                                ]
                            );
                    status[
                        underlyingAsset as keyof typeof status
                    ].collateral.olp.usdc =
                        status[underlyingAsset as keyof typeof status]
                            .collateral.olp.usdc + collateralAmount;
                } else if (isBuy && !isCall && isNakedStrategy) {
                    // Buy Naked Put
                    status[underlyingAsset as keyof typeof status].size.buyPut =
                        status[underlyingAsset as keyof typeof status].size
                            .buyPut + sizeSum;
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + sizeSum;

                    const collateralAmount =
                        ((sizeBigInt + sizeClosingBigInt) *
                            BigInt(mainStrikePrice) *
                            BigInt(10) ** BigInt(TICKER_TO_DECIMAL.USDC)) /
                        BigInt(10) **
                            BigInt(
                                TICKER_TO_DECIMAL[
                                    underlyingAsset as keyof typeof TICKER_TO_DECIMAL
                                ]
                            );
                    status[
                        underlyingAsset as keyof typeof status
                    ].collateral.olp.usdc =
                        status[underlyingAsset as keyof typeof status]
                            .collateral.olp.usdc + collateralAmount;
                } else if (isBuy && !isCall && !isNakedStrategy) {
                    // Buy Put Spread
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.buyPutSpread =
                        status[underlyingAsset as keyof typeof status].size
                            .buyPutSpread + sizeSum;
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + sizeSum;

                    const pairedOptionStrikePrice = getPairedOptionStrikePrice(
                        BigInt(optionTokenId)
                    );
                    const collateralAmountPerSize =
                        BigInt(
                            Math.abs(mainStrikePrice - pairedOptionStrikePrice)
                        ) *
                        BigInt(10) ** BigInt(TICKER_TO_DECIMAL.USDC);
                    const collateralAmount =
                        ((sizeBigInt + sizeClosingBigInt) *
                            collateralAmountPerSize) /
                        BigInt(10) **
                            BigInt(
                                TICKER_TO_DECIMAL[
                                    underlyingAsset as keyof typeof TICKER_TO_DECIMAL
                                ]
                            );
                    status[
                        underlyingAsset as keyof typeof status
                    ].collateral.olp.usdc =
                        status[underlyingAsset as keyof typeof status]
                            .collateral.olp.usdc + collateralAmount;
                } else if (!isBuy && isCall && isNakedStrategy) {
                    // Sell Naked Call
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.sellCall =
                        status[underlyingAsset as keyof typeof status].size
                            .sellCall + sizeSum;
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + sizeSum;

                    const collateralAmount = sizeBigInt + sizeClosingBigInt;
                    const collateralToken =
                        underlyingAsset === "BTC" ? "btc" : "eth";
                    status[
                        underlyingAsset as keyof typeof status
                    ].collateral.user[collateralToken] =
                        status[underlyingAsset as keyof typeof status]
                            .collateral.user[collateralToken] +
                        collateralAmount;
                } else if (!isBuy && isCall && !isNakedStrategy) {
                    // Sell Call Spread
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.sellCallSpread =
                        status[underlyingAsset as keyof typeof status].size
                            .sellCallSpread + sizeSum;
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + sizeSum;

                    const pairedOptionStrikePrice = getPairedOptionStrikePrice(
                        BigInt(optionTokenId)
                    );
                    const collateralAmountPerSize =
                        BigInt(
                            Math.abs(mainStrikePrice - pairedOptionStrikePrice)
                        ) *
                        BigInt(10) ** BigInt(TICKER_TO_DECIMAL.USDC);
                    const collateralAmount =
                        ((sizeBigInt + sizeClosingBigInt) *
                            collateralAmountPerSize) /
                        BigInt(10) **
                            BigInt(
                                TICKER_TO_DECIMAL[
                                    underlyingAsset as keyof typeof TICKER_TO_DECIMAL
                                ]
                            );
                    status[
                        underlyingAsset as keyof typeof status
                    ].collateral.user.usdc =
                        status[underlyingAsset as keyof typeof status]
                            .collateral.user.usdc + collateralAmount;
                } else if (!isBuy && !isCall && isNakedStrategy) {
                    // Sell Naked Put
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.sellPut =
                        status[underlyingAsset as keyof typeof status].size
                            .sellPut + sizeSum;
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + sizeSum;

                    const collateralAmount =
                        ((sizeBigInt + sizeClosingBigInt) *
                            BigInt(mainStrikePrice) *
                            BigInt(10) ** BigInt(TICKER_TO_DECIMAL.USDC)) /
                        BigInt(10) **
                            BigInt(
                                TICKER_TO_DECIMAL[
                                    underlyingAsset as keyof typeof TICKER_TO_DECIMAL
                                ]
                            );
                    status[
                        underlyingAsset as keyof typeof status
                    ].collateral.user.usdc =
                        status[underlyingAsset as keyof typeof status]
                            .collateral.user.usdc + collateralAmount;
                } else if (!isBuy && !isCall && !isNakedStrategy) {
                    // Sell Put Spread
                    status[
                        underlyingAsset as keyof typeof status
                    ].size.sellPutSpread =
                        status[underlyingAsset as keyof typeof status].size
                            .sellPutSpread + sizeSum;
                    status[underlyingAsset as keyof typeof status].size.total =
                        status[underlyingAsset as keyof typeof status].size
                            .total + sizeSum;

                    const pairedOptionStrikePrice = getPairedOptionStrikePrice(
                        BigInt(optionTokenId)
                    );
                    const collateralAmountPerSize =
                        BigInt(
                            Math.abs(mainStrikePrice - pairedOptionStrikePrice)
                        ) *
                        BigInt(10) ** BigInt(TICKER_TO_DECIMAL.USDC);
                    const collateralAmount =
                        ((sizeBigInt + sizeClosingBigInt) *
                            collateralAmountPerSize) /
                        BigInt(10) **
                            BigInt(
                                TICKER_TO_DECIMAL[
                                    underlyingAsset as keyof typeof TICKER_TO_DECIMAL
                                ]
                            );
                    status[
                        underlyingAsset as keyof typeof status
                    ].collateral.user.usdc =
                        status[underlyingAsset as keyof typeof status]
                            .collateral.user.usdc + collateralAmount;
                }
            });
        });
    });

    //     ETH:
    //   Raw Size: 7239291562301335153512
    //   Parsed Size: 7239.291562301335153512
    //   From Parsed Total: 7239.291562301334863213
    // BTC:
    //   Raw Size: 20644393058
    //   Parsed Size: 206.44393058
    //   From Parsed Total: 206.44393058

    console.log("\nStatus");
    console.log("BTC:");
    console.log(`  Size:`);
    console.log(`    BuyCall: ${status.BTC.size.buyCall}`);
    console.log(`    BuyCallSpread: ${status.BTC.size.buyCallSpread}`);
    console.log(`    BuyPut: ${status.BTC.size.buyPut}`);
    console.log(`    BuyPutSpread: ${status.BTC.size.buyPutSpread}`);
    console.log(`    SellCall: ${status.BTC.size.sellCall}`);
    console.log(`    SellCallSpread: ${status.BTC.size.sellCallSpread}`);
    console.log(`    SellPut: ${status.BTC.size.sellPut}`);
    console.log(`    SellPutSpread: ${status.BTC.size.sellPutSpread}`);
    console.log(`    Total: ${status.BTC.size.total}`);
    console.log(`  Collateral:`);
    console.log(`    BTC-OLP: ${status.BTC.collateral.olp.btc}`);
    console.log(`    ETH-OLP: ${status.BTC.collateral.olp.eth}`);
    console.log(`    USDC-OLP: ${status.BTC.collateral.olp.usdc}`);
    console.log(`    BTC-User: ${status.BTC.collateral.user.btc}`);
    console.log(`    ETH-User: ${status.BTC.collateral.user.eth}`);
    console.log(`    USDC-User: ${status.BTC.collateral.user.usdc}`);
    console.log("ETH:");
    console.log(`  Size:`);
    console.log(`    BuyCall: ${status.ETH.size.buyCall}`);
    console.log(`    BuyCallSpread: ${status.ETH.size.buyCallSpread}`);
    console.log(`    BuyPut: ${status.ETH.size.buyPut}`);
    console.log(`    BuyPutSpread: ${status.ETH.size.buyPutSpread}`);
    console.log(`    SellCall: ${status.ETH.size.sellCall}`);
    console.log(`    SellCallSpread: ${status.ETH.size.sellCallSpread}`);
    console.log(`    SellPut: ${status.ETH.size.sellPut}`);
    console.log(`    SellPutSpread: ${status.ETH.size.sellPutSpread}`);
    console.log(`    Total: ${status.ETH.size.total}`);
    console.log(`  Collateral:`);
    console.log(`    BTC-OLP: ${status.ETH.collateral.olp.btc}`);
    console.log(`    ETH-OLP: ${status.ETH.collateral.olp.eth}`);
    console.log(`    USDC-OLP: ${status.ETH.collateral.olp.usdc}`);
    console.log(`    BTC-User: ${status.ETH.collateral.user.btc}`);
    console.log(`    ETH-User: ${status.ETH.collateral.user.eth}`);
    console.log(`    USDC-User: ${status.ETH.collateral.user.usdc}`);

    console.log("\nStatus");
    console.log("BTC:");
    console.log(`  Size:`);
    console.log(`    BuyCall: ${formatUnits(status.BTC.size.buyCall, 8)}`);
    console.log(
        `    BuyCallSpread: ${formatUnits(status.BTC.size.buyCallSpread, 8)}`
    );
    console.log(`    BuyPut: ${formatUnits(status.BTC.size.buyPut, 8)}`);
    console.log(
        `    BuyPutSpread: ${formatUnits(status.BTC.size.buyPutSpread, 8)}`
    );
    console.log(`    SellCall: ${formatUnits(status.BTC.size.sellCall, 8)}`);
    console.log(
        `    SellCallSpread: ${formatUnits(status.BTC.size.sellCallSpread, 8)}`
    );
    console.log(`    SellPut: ${formatUnits(status.BTC.size.sellPut, 8)}`);
    console.log(
        `    SellPutSpread: ${formatUnits(status.BTC.size.sellPutSpread, 8)}`
    );
    console.log(`    Total: ${formatUnits(status.BTC.size.total, 8)}`);
    console.log(`  Collateral:`);
    console.log(
        `    BTC-OLP: ${formatUnits(status.BTC.collateral.olp.btc, 8)}`
    );
    console.log(
        `    ETH-OLP: ${formatUnits(status.BTC.collateral.olp.eth, 18)}`
    );
    console.log(
        `    USDC-OLP: ${formatUnits(status.BTC.collateral.olp.usdc, 6)}`
    );
    console.log(
        `    BTC-User: ${formatUnits(status.BTC.collateral.user.btc, 8)}`
    );
    console.log(
        `    ETH-User: ${formatUnits(status.BTC.collateral.user.eth, 18)}`
    );
    console.log(
        `    USDC-User: ${formatUnits(status.BTC.collateral.user.usdc, 6)}`
    );
    console.log("ETH:");
    console.log(`  Size:`);
    console.log(`    BuyCall: ${formatUnits(status.ETH.size.buyCall, 18)}`);
    console.log(
        `    BuyCallSpread: ${formatUnits(status.ETH.size.buyCallSpread, 18)}`
    );
    console.log(`    BuyPut: ${formatUnits(status.ETH.size.buyPut, 18)}`);
    console.log(
        `    BuyPutSpread: ${formatUnits(status.ETH.size.buyPutSpread, 18)}`
    );
    console.log(`    SellCall: ${formatUnits(status.ETH.size.sellCall, 18)}`);
    console.log(
        `    SellCallSpread: ${formatUnits(status.ETH.size.sellCallSpread, 18)}`
    );
    console.log(`    SellPut: ${formatUnits(status.ETH.size.sellPut, 18)}`);
    console.log(
        `    SellPutSpread: ${formatUnits(status.ETH.size.sellPutSpread, 18)}`
    );
    console.log(`    Total: ${formatUnits(status.ETH.size.total, 18)}`);
    console.log(`  Collateral:`);
    console.log(
        `    BTC-OLP: ${formatUnits(status.ETH.collateral.olp.btc, 8)}`
    );
    console.log(
        `    ETH-OLP: ${formatUnits(status.ETH.collateral.olp.eth, 18)}`
    );
    console.log(
        `    USDC-OLP: ${formatUnits(status.ETH.collateral.olp.usdc, 6)}`
    );
    console.log(
        `    BTC-User: ${formatUnits(status.ETH.collateral.user.btc, 8)}`
    );
    console.log(
        `    ETH-User: ${formatUnits(status.ETH.collateral.user.eth, 18)}`
    );
    console.log(
        `    USDC-User: ${formatUnits(status.ETH.collateral.user.usdc, 6)}`
    );
};
