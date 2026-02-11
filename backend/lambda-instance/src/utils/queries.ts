import request, { gql } from "graphql-request"
import { CONFIG } from "../constants/constants.config"

// Positions Related Variables
export enum PositionState {
  ALL,
  NOT_EXPIRED,
  EXPIRED,
}

export enum SettleState {
  ALL,
  NOT_SETTLED,
  SETTLED,
}

export const getPositionQueryFilter = (address, positionState, settleState, underlyingAssetIndex) => {

  let filter: any = {
    account: { equalToInsensitive: address },
    size: { greaterThan: "0" },
  }

  if (underlyingAssetIndex) {
    filter = {
      ...filter,
      underlyingAssetIndex: { equalToInsensitive: underlyingAssetIndex },
    }
  }

  if (positionState == PositionState.ALL) {
    // DO NOTHING
  }

  if (positionState == PositionState.NOT_EXPIRED) {
    filter = {
      ...filter,
      expiry: { greaterThan: `${new Date().getTime() / 1000}` },
    }
  }
  
  if (positionState == PositionState.EXPIRED) {
    filter = {
      ...filter,
      expiry: { lessThanOrEqualTo: `${new Date().getTime() / 1000}` },
    }
  }

  if (settleState == SettleState.ALL) {
    // DO NOTHING
  }

  if (settleState == SettleState.NOT_SETTLED) {
    filter = { ...filter, isSettled: { equalTo: false } }
  }
  
  if (settleState == SettleState.SETTLED) {
    filter = { ...filter, isSettled: { equalTo: false } }
  }

  return filter
}

export const getAllResult = async ({
  filter, 
  document, 
  endCursor,
  subqlUrl, 
  accumulation = {
    pageInfo: {},
    nodes: []
  },
  first = 1000,
}) => {
  const response: any = await request(
    subqlUrl,
    document,
    {
      first,
      after: endCursor,
      filter,
    }
  )

  const itemKey = Object.keys(response)[0]
  const items = response[itemKey]

  // console.log(filter, 'filter')
  // console.log(items.pageInfo, 'items.pageInfo')
  // console.log(items.nodes.length, 'items.nodes.length')
  // console.log(endCursor, 'endCursor')
  // console.log(items.pageInfo.endCursor, 'items.pageInfo.endCursor')

  accumulation = {
    pageInfo: items.pageInfo,
    nodes: [
      ...accumulation.nodes,
      ...items.nodes,
    ]
  }

  if (!items.pageInfo.hasNextPage) {
    return accumulation
  }

  return await getAllResult({ 
    filter, 
    document, 
    endCursor: items.pageInfo.endCursor,
    subqlUrl,
    accumulation 
  })
}

export const getPositionsWithFilter = async (filter: any) => {
  let document = gql`
    query($first: Int, $after: Cursor, $filter: PositionFilter) {
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
  `

  const chainId = Number(process.env.CHAIN_ID);
  const subqlUrl = CONFIG[chainId].SUBQL_URL;

  return getAllResult({
    filter,
    document,
    endCursor: null,
    subqlUrl
  })
}

export const getPositionHistoryWithFilter = async (filter: any) => {
  let document = gql`
    query($first: Int, $after: Cursor, $filter: PositionHistoryFilter) {
      positionHistories(first: $first, after: $after, filter: $filter) {
          pageInfo {
            endCursor
            hasNextPage
          }

          nodes {
            id
            account
            requestIndex
            underlyingAssetIndex
            expiry
            type
            optionTokenId
            size
            quoteToken
            quoteAmount
            collateralToken
            collateralAmount
            executionPrice
            avgExecutionPrice
            settlePrice
            settlePayoff
            spotPrice
            cashFlow
            pnl
            roi
            processBlockTime
          }
      }
    }
  `

  const chainId = Number(process.env.CHAIN_ID);

  const result = await getAllResult({
    filter,
    document,
    endCursor: null,
    subqlUrl: CONFIG[chainId].SUBQL_URL
  });

  return {
    pageInfo: result.pageInfo,
    nodes: [
      ...result.nodes,
    ]
  }
}

export const getCopyTradePositionHistoryWithFilter = async (filter: any) => {
  let document = gql`
    query($first: Int, $after: Cursor, $filter: CopyTradePositionHistoryFilter) {
      copyTradePositionHistories(first: $first, after: $after, filter: $filter) {
          pageInfo {
            endCursor
            hasNextPage
          }

          nodes {
            id
            account
            requestIndex
            underlyingAssetIndex
            expiry
            optionTokenId
            size
            quoteToken
            quoteAmount
            executionPrice
            spotPrice
            processBlockTime
          }
      }
    }
  `

  const chainId = Number(process.env.CHAIN_ID);
  const subqlUrl = CONFIG[chainId].SUBQL_URL;

  return getAllResult({
    filter,
    document,
    endCursor: null,
    subqlUrl
  })
}

export const getAddLiquidityWithFilter = async (filter: any) => {
  let document = gql`
    query($first: Int, $after: Cursor, $filter: AddLiquidityFilter) {
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
  `

  const chainId = Number(process.env.CHAIN_ID);
  const subqlUrl = CONFIG[chainId].SUBQL_URL;

  return getAllResult({
    filter,
    document,
    endCursor: null,
    subqlUrl
  })
}

export const getVaultQueueItemsWithFilter = async (filter: any) => {
  let document = gql`
    query($first: Int, $after: Cursor, $filter: SpvActionItemFilter) {
      spvActionItems(first: $first, after: $after, filter: $filter) {
          pageInfo {
            endCursor
            hasNextPage
          }

          nodes {
            id
            actionType
            amount
            status
            user
            vaultAddress
            vaultQueueAddress
          }
      }
    }
  `

  const chainId = Number(process.env.CHAIN_ID);
  const subqlUrl = CONFIG[chainId].SUBQL_URL;

  return getAllResult({
    filter,
    document,
    endCursor: null,
    subqlUrl
  })
}

export const hasVaultQueueItemsWithFilter = async (filter: any, first: any) => {
  let document = gql`
    query($first: Int, $after: Cursor, $filter: SpvActionItemFilter) {
      spvActionItems(first: $first, after: $after, filter: $filter) {
          pageInfo {
            endCursor
            hasNextPage
          }

          nodes {
            id
            actionType
            amount
            status
            user
            vaultAddress
            vaultQueueAddress
          }
      }
    }
  `

  const chainId = Number(process.env.CHAIN_ID);
  const subqlUrl = CONFIG[chainId].SUBQL_URL;

  return getAllResult({
    first,
    filter,
    document,
    endCursor: null,
    subqlUrl
  })
}

export const getOlpQueueItemsWithFilter = async (filter: any) => {
  let document = gql`
    query($first: Int, $after: Cursor, $filter: OlpQueueItemFilter) {
      olpQueueItems(first: $first, after: $after, filter: $filter) {
          pageInfo {
            endCursor
            hasNextPage
          }

          nodes {
            id
            user
            queueIndex
            olpQueueAddress
            actionType
            token
            amount
            minOut
            receiver
            isNative
            status
            amountOut
            olpPrice
            blockTime
            processBlockTime
          }
      }
    }
  `

  const chainId = Number(process.env.CHAIN_ID);
  const subqlUrl = CONFIG[chainId].SUBQL_URL;

  return getAllResult({
    filter,
    document,
    endCursor: null,
    subqlUrl
  })
}

