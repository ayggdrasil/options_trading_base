import BigNumber from "bignumber.js";
import initializeContracts from "../contract";
import { fetchDataFromS3Gzip, putS3Gzip } from "../utils/aws";
import { LogLevel } from "../utils/enums";
import { getHistoricalPriceFromBitfinex } from "../feed/apis/bitfinex";
import { getHistoricalPriceFromCoinGecko } from "../feed/apis/coingecko";
import { sendMessage } from "../utils/slack";
import { getOlpKeyByVaultIndex } from "../utils/helper";
import { MESSAGE_TYPE } from "../utils/messages";
import { ChainNames, isBuyStrategy, isCallStrategy, parseOptionTokenId, UA_INDEX_TO_TICKER, UA_TICKER_TO_DECIMAL, UnderlyingAssetIndex } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

const MAX_ITEMS = 8;

const initialData = {
  keyIndexToStart: 0, // key가 담긴 배열의 인덱스
  accumulatedNotionalVolume: 0, // 전체 Notional Volume
  accumulatedExecutionPrice: 0, // 전체 Execution Price
  totalNumberOfTraders: 0, // 전체 Trader 수
  totalTradeCount: 0, // 전체 Trade 수
  totalBtcSize: 0,
  totalEthSize: 0,
  vaults: {}, // Vault's Trade Info
  traders: {}, // Trader's Trade Info
  lastUpdatedAt: ""
}

function updateTraderAndVault(data, account, asset, size, spotPrice, executionPrice, optionTokenId, isOpen) {

  // when trader is not in the list, add trader to the list (initializing with asset)
  if (!data.traders[account]) {
    data.traders[account] = {
      ["BTC"]: {
        tradeCount: 0,
        tradeSize: 0,
        notionalVolume: 0,
        open: {
          call: {
            buy: 0,
            sell: 0
          },
          put: {
            buy: 0,
            sell: 0
          },
          type: {
            buyNakedCall: 0,
            buyCallSpread: 0,
            buyNakedPut: 0,
            buyPutSpread: 0,
            sellNakedCall: 0,
            sellCallSpread: 0,
            sellNakedPut: 0,
            sellPutSpread: 0,
          }
        },
        close: {
          call: {
            buy: 0,
            sell: 0
          },
          put: {
            buy: 0,
            sell: 0
          }
        },
        tradeSizeByTerm: {
          sVault: 0,
          mVault: 0,
          lVault: 0
        }
      },
      ["ETH"]: {
        tradeCount: 0,
        tradeSize: 0,
        notionalVolume: 0,
        open: {
          call: {
            buy: 0,
            sell: 0
          },
          put: {
            buy: 0,
            sell: 0
          },
          type: {
            buyNakedCall: 0,
            buyCallSpread: 0,
            buyNakedPut: 0,
            buyPutSpread: 0,
            sellNakedCall: 0,
            sellCallSpread: 0,
            sellNakedPut: 0,
            sellPutSpread: 0,
          }
        },
        close: {
          call: {
            buy: 0,
            sell: 0
          },
          put: {
            buy: 0,
            sell: 0
          }
        },
        tradeSizeByTerm: {
          sVault: 0,
          mVault: 0,
          lVault: 0
        }
      }
    };
    data.totalNumberOfTraders += 1;
  }
  
  const { strategy, length, vaultIndex } = parseOptionTokenId(BigInt(optionTokenId));

  if (!data.vaults[vaultIndex]) {
    data.vaults[vaultIndex] = {
      ["BTC"]: { tradeCount: 0, tradeSize: 0, notionalVolume: 0 },
      ["ETH"]: { tradeCount: 0, tradeSize: 0, notionalVolume: 0 }
    };
  }

  const notionalVolume = new BigNumber(size).multipliedBy(spotPrice).toNumber();
  
  for (let i = 0; i < length; i++) {
    data.traders[account][asset].notionalVolume += notionalVolume;
    data.vaults[vaultIndex][asset].notionalVolume += notionalVolume;
    data.accumulatedNotionalVolume += notionalVolume;
  }

  const totalExecutionPrice = new BigNumber(size).multipliedBy(executionPrice).toNumber();
  data.accumulatedExecutionPrice += totalExecutionPrice;

  data.traders[account][asset].tradeCount += 1;
  data.traders[account][asset].tradeSize += size;

  data.vaults[vaultIndex][asset].tradeCount += 1;
  data.vaults[vaultIndex][asset].tradeSize += size;

  if (isOpen) {
    if (isCallStrategy(strategy)) {
      if (isBuyStrategy(strategy)) {
        data.traders[account][asset].open.call.buy += size;
      } else {
        data.traders[account][asset].open.call.sell += size;
      }
    } else {
      if (isBuyStrategy(strategy)) {
        data.traders[account][asset].open.put.buy += size;
      } else {
        data.traders[account][asset].open.put.sell += size;
      }
    }

    switch (strategy) {
      case "BuyCall":
        data.traders[account][asset].open.type.buyNakedCall += size;
        break;
      case "BuyCallSpread":
        data.traders[account][asset].open.type.buyCallSpread += size;
        break;
      case "BuyPut":
        data.traders[account][asset].open.type.buyNakedPut += size;
        break;
      case "BuyPutSpread":
        data.traders[account][asset].open.type.buyPutSpread += size;
        break;
      case "SellCall":
        data.traders[account][asset].open.type.sellNakedCall += size;
        break;
      case "SellCallSpread":
        data.traders[account][asset].open.type.sellCallSpread += size;
        break;
      case "SellPut":
        data.traders[account][asset].open.type.sellNakedPut += size;
        break;
      case "SellPutSpread":
        data.traders[account][asset].open.type.sellPutSpread += size;
        break;
    }
  } else {
    if (isCallStrategy(strategy)) {
      if (isBuyStrategy(strategy)) {
        data.traders[account][asset].close.call.buy += size;
      } else {
        data.traders[account][asset].close.call.sell += size;
      }
    } else {
      if (isBuyStrategy(strategy)) {
        data.traders[account][asset].close.put.buy += size;
      } else {
        data.traders[account][asset].close.put.sell += size;
      }
    }
  }

  const olpKey = getOlpKeyByVaultIndex(vaultIndex);

  if (olpKey === "sOlp") {
    data.traders[account][asset].tradeSizeByTerm.sVault += size;
  } else if (olpKey === "mOlp") {
    data.traders[account][asset].tradeSizeByTerm.mVault += size;
  } else if (olpKey === "lOlp") {
    data.traders[account][asset].tradeSizeByTerm.lVault += size;
  }
}

export const collectTradeData = async () => {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  try {
    const { ViewAggregator } = await initializeContracts();

    const data = await fetchDataFromS3Gzip({
      Bucket: process.env.APP_DATA_BUCKET,
      Key: process.env.APP_DATA_TRADE_DATA_KEY + '.gz',
      initialData
    })

    let currentKeyIndexToStart = data.keyIndexToStart;

    const positionRequests = await ViewAggregator.positionRequestInfoWithRange(currentKeyIndexToStart, MAX_ITEMS); // view before the end index

    if (positionRequests.length == 0) {
      console.log('collect.tradeData.ts: no new data to process.')
      return;
    }

    let spotPrices = {
      btc: 0,
      btcTimestamp: 0,
      eth: 0,
      ethTimestamp: 0,
      usdc: 0,
      usdcTimestamp: 0,
    }

    for (const positionRequest of positionRequests) {
      try {
        const account = positionRequest[2].toLowerCase();
        const optionTokenId = positionRequest[3];
        const status = Number(positionRequest[6]);

        if (status === 0) {
          console.log("collect.tradeData.ts: position is in pending status")
          break;
        } else if (status === 1) {
          console.log("collect.tradeData.ts: position is cancelled, skipped")
          currentKeyIndexToStart += 1;
          continue;
        }

        const { underlyingAssetIndex } = parseOptionTokenId(BigInt(optionTokenId));
        const underlyingAsset = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];
        const decimals = UA_TICKER_TO_DECIMAL[chainName][underlyingAsset];

        const isOpen = Boolean(positionRequest[1]);
        
        const size = isOpen
          ? new BigNumber(positionRequest[7]).dividedBy(10 ** decimals).toNumber()
          : new BigNumber(positionRequest[4]).dividedBy(10 ** decimals).toNumber()

        const executionPrice = new BigNumber(positionRequest[8]).dividedBy(10 ** 30).toNumber();

        const processBlockTime = Number(positionRequest[9]);

        spotPrices = await getHistoricalPriceFromBitfinex(spotPrices, underlyingAsset, processBlockTime)
        let spotPrice = spotPrices[underlyingAsset.toLowerCase()];

        if (spotPrice === 0) {
          spotPrices = await getHistoricalPriceFromCoinGecko(spotPrices, underlyingAsset, processBlockTime) 
          spotPrice = spotPrices[underlyingAsset.toLowerCase()];
        }

        if (spotPrice === 0) {
          console.log("collect.tradeData.ts: spot price is zero");
          await sendMessage(
            `\`[Lambda][collect.tradeData.ts]\` ${MESSAGE_TYPE.THE_HISTORICAL_PRICE_IS_ZERO}`,
            LogLevel.WARN,
          )
          break;
        }

        updateTraderAndVault(
          data,
          account,
          underlyingAsset,
          size,
          spotPrice,
          executionPrice,
          optionTokenId,
          isOpen
        );
        
        data.totalTradeCount += 1;
        
        if (underlyingAsset === "BTC") {
          data.totalBtcSize += size;
        } else {
          data.totalEthSize += size;
        }

        currentKeyIndexToStart += 1;
      } catch (error) {
        console.log('Error processing collect trade data:', error)
        await sendMessage(
          `\`[Lambda][collect.tradeData.ts]\` ${MESSAGE_TYPE.ERROR_DURING_COLLECTING_TRADE_DATA_IN_WHILE}`,
          LogLevel.ERROR,
          {
            description: error?.message || error,
          }
        )
        break;
      }
      
    }

    data.keyIndexToStart = currentKeyIndexToStart;
    data.lastUpdatedAt = new Date().toISOString();
    
    await putS3Gzip({
      Bucket: process.env.APP_DATA_BUCKET,
      Key: process.env.APP_DATA_TRADE_DATA_KEY + '.gz',
      Data: JSON.stringify(data),
      CacheControl: 'no-cache'
    })
  } catch (error) {
    console.log('Error processing collect trade data:', error)
    await sendMessage(
      `\`[Lambda][collect.tradeData.ts]\` ${MESSAGE_TYPE.ERROR_DURING_COLLECTING_TRADE_DATA}`,
      LogLevel.ERROR,
      {
        description: error?.message || error,
      }
    )
  }
}