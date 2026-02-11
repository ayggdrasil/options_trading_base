import BigNumber from "bignumber.js";
import keccak256 from 'keccak256'
import { ASSET_ADDRESS_TO_DECIMALS, ASSET_ADDRESS_TO_TICKER, ASSET_TICKER_TO_DECIMALS } from "../constants"
import { ethers } from 'ethers';
import { appendValues } from '../utils/sheet';
import { sendMessage } from './slack';
import { getKoreanTimeFormatted } from "./helper";
import { CONTRACT_ADDRESSES } from "../constants/constants.addresses";
import { LogLevel } from "./enums";
import { MESSAGE_TYPE } from "./messages";
import { ChainNames, generateOptionTokenData, getMainOptionName, getMainOptionStrikePrice, getPairedOptionName, isBuyStrategy, isCallStrategy, parseOptionTokenId, UA_INDEX_TO_TICKER, UA_TICKER_TO_DECIMAL, VAULT_INDEX_TO_ADDRESS, VAULT_INDEX_TO_NAME, UnderlyingAssetIndex } from "@callput/shared";

const abiCoder = new ethers.AbiCoder()

// Position Manager
const CancelOpenPositionTopic = "0x" + keccak256("CancelOpenPosition(address,uint16,bytes32[4],uint40,uint256,address[],uint256,uint40)").toString("hex")
const CancelClosePositionTopic = "0x" + keccak256("CancelClosePosition(address,uint16,uint40,uint256,uint256,address[],uint40)").toString("hex")

// Controller
const OpenBuyPositionTopic= "0x" + keccak256("OpenBuyPosition(address,uint256,uint16,uint40,uint256,uint256,address,uint256,uint256,uint256)").toString('hex');
const OpenSellPositionTopic = "0x" + keccak256("OpenSellPosition(address,uint256,uint16,uint40,uint256,uint256,address,uint256,address,uint256,uint256,uint256)").toString('hex');
const CloseBuyPositionTopic = "0x" + keccak256("CloseBuyPosition(address,uint256,uint16,uint40,uint256,uint256,address,uint256,uint256,uint256)").toString('hex');
const CloseSellPositionTopic = "0x" + keccak256("CloseSellPosition(address,uint256,uint16,uint40,uint256,uint256,address,uint256,address,uint256,uint256,uint256)").toString('hex');

// Vault
const CollectPositionFeesTopic = "0x" + keccak256("CollectPositionFees(address,address,uint256,uint256,bool)").toString("hex");

export const logPositionRequest = async (receipt, logsOpenQueue, logsCloseQueue) => {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  //////////////////////////////////
  // Collect Position Fees        //
  //////////////////////////////////

  const collectPositionFeesLogs = receipt.logs
    .filter(({ topics }) => {
      const topic = topics[0]
      return topic === CollectPositionFeesTopic
    })
    .map(({ data, topics }) => {
      const account = "0x" + topics[1].slice(-40);
      const token = "0x" + topics[2].slice(-40);

      // Decode non-indexed parameters from the data field
      const [feeUsd, feeAmount] = abiCoder.decode(
        ["uint256", "uint256"], // Types of the non-indexed parameters
        data
      );

      return {
        feePaidBy: account,
        feeToken: token,
        feeUsd: new BigNumber(feeUsd).div(10 ** 30).toNumber(),
        feeAmount: new BigNumber(feeAmount).div(10 ** ASSET_ADDRESS_TO_DECIMALS[chainId][token.toLowerCase()]).toNumber()
      };
    })


  //////////////////////////////////
  // Open/Close Position          //
  //////////////////////////////////

  const tradeLogs = receipt.logs
    .filter(({ topics }) => {
      const topic = topics[0]
      return topic == OpenBuyPositionTopic || topic == OpenSellPositionTopic || topic == CloseBuyPositionTopic || topic == CloseSellPositionTopic      
    })
    .filter(({ topics }) => {
      const account = "0x" + topics[1].slice(-40)
      return ![
        CONTRACT_ADDRESSES[chainId].S_VAULT.toLowerCase(), 
        CONTRACT_ADDRESSES[chainId].M_VAULT.toLowerCase(), 
        CONTRACT_ADDRESSES[chainId].L_VAULT.toLowerCase(),
      ].includes(account)
    })
    .map(({ topics, data, transactionHash }) => {
      const isOpen = topics[0] === OpenBuyPositionTopic || topics[0] === OpenSellPositionTopic;

      const account = "0x" + topics[1].slice(-40)
      
      const collectPositionFeesLogsItem: any = collectPositionFeesLogs.shift() || {}

      if (isOpen) {
        const decoded = topics[0] === OpenBuyPositionTopic 
          ? abiCoder.decode(
              // requestIndex, optionTokenId, size, quoteToken, amountPaid, executionPrice, spotPrice
              ["uint256", "uint256", "uint256", "address", "uint256", "uint256", "uint256"],
              data
            )
          : abiCoder.decode(
              // requestIndex, optionTokenId, size, quoteToken, amountReceived, collateralToken, collateralAmount, executionPrice, spotPrice
              ["uint256", "uint256", "uint256", "address", "uint256", "address", "uint256", "uint256", "uint256"],
              data
            )

        const isBuy = topics[0] === OpenBuyPositionTopic;

        const requestIndex = Number(decoded[0]);

        const optionTokenId = decoded[1];

        const { underlyingAssetIndex, expiry, strategy, length, isBuys, strikePrices, isCalls, vaultIndex } = parseOptionTokenId(optionTokenId);

        const underlyingAsset = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];

        const decimals = UA_TICKER_TO_DECIMAL[chainName][underlyingAsset];

        const { optionNames } = generateOptionTokenData(chainName, optionTokenId);

        const mainOptionName = getMainOptionName(optionTokenId, optionNames);

        const pairedOptionName = getPairedOptionName(optionTokenId, optionNames);

        const strikePrice = getMainOptionStrikePrice(optionTokenId);

        const isCall = isCallStrategy(strategy);

        const size = new BigNumber(decoded[2]).div(10 ** decimals).toNumber(); // to make decimals 0

        const executionPrice = topics[0] === OpenBuyPositionTopic
          ? new BigNumber(decoded[5]).div(10 ** 30).toNumber()
          : new BigNumber(decoded[7]).div(10 ** 30).toNumber();

        const quoteTokenTicker = ASSET_ADDRESS_TO_TICKER[chainId][decoded[3].toLowerCase()];
        
        const amountPaid = isBuy
          ? new BigNumber(decoded[4]).div(10 ** ASSET_TICKER_TO_DECIMALS[chainId][quoteTokenTicker]).toNumber()
          : "-";

        const amountReceived = isBuy
          ? "-"
          : new BigNumber(decoded[4]).div(10 ** ASSET_TICKER_TO_DECIMALS[chainId][quoteTokenTicker]).toNumber();

        const collateralTokenTicker = isBuy
          ? "-"
          : ASSET_ADDRESS_TO_TICKER[chainId][decoded[5].toLowerCase()];

        const collateralAmount = isBuy
          ? "-"
          : new BigNumber(decoded[6]).div(10 ** ASSET_TICKER_TO_DECIMALS[chainId][collateralTokenTicker]).toNumber();
        
        const spotPrice = isBuy
          ? new BigNumber(decoded[6]).div(10 ** 30).toNumber()
          : new BigNumber(decoded[8]).div(10 ** 30).toNumber();
        
        const vaultName = VAULT_INDEX_TO_NAME[chainName][vaultIndex];

        const vaultAddress = VAULT_INDEX_TO_ADDRESS[chainName][vaultIndex];

        return {
          account,
          underlyingAsset,
          spotPrice,
          isOpen: isOpen,
          isBuy: isBuy,
          mainOptionName,
          pairedOptionName,
          expiry,
          strikePrice,
          isCall,
          size,
          executionPrice,
          quoteTokenTicker,
          amountPaid,
          amountReceived,
          collateralTokenTicker,
          collateralAmount,
          transactionHash,
          requestIndex,
          vaultName,
          vaultAddress,
          feePaidBy: collectPositionFeesLogsItem.feePaidBy,
          feeToken: collectPositionFeesLogsItem.feeToken,
          feeUsd: collectPositionFeesLogsItem.feeUsd,
          feeAmount: collectPositionFeesLogsItem.feeAmount
        }
      } else {
        const decoded = topics[0] === CloseBuyPositionTopic
          ? abiCoder.decode(
              // requestIndex, optionTokenId, size, quoteToken, amountReceived, executionPrice, spotPrice
              ["uint256", "uint256", "uint256", "address", "uint256", "uint256", "uint256"],
              data
            )
          : abiCoder.decode(
              // requestIndex, optionTokenId, size, quoteToken, amountPaid, collateralToken, collateralAmount, executionPrice, spotPrice
              ["uint256", "uint256", "uint256", "address", "uint256", "address", "uint256", "uint256", "uint256"],
              data
            )
        
        const isBuy = topics[0] === CloseBuyPositionTopic;

        const requestIndex = Number(decoded[0]);

        const optionTokenId = decoded[1];

        const { underlyingAssetIndex, expiry, strategy, length, isBuys, strikePrices, isCalls, vaultIndex } = parseOptionTokenId(optionTokenId);

        const underlyingAsset = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];

        const decimals = UA_TICKER_TO_DECIMAL[chainName][underlyingAsset];

        const { optionNames } = generateOptionTokenData(chainName, optionTokenId);

        const mainOptionName = getMainOptionName(optionTokenId, optionNames);

        const pairedOptionName = getPairedOptionName(optionTokenId, optionNames);

        const strikePrice = getMainOptionStrikePrice(optionTokenId);

        const isCall = isCallStrategy(strategy);

        const size = new BigNumber(decoded[2]).div(10 ** decimals).toNumber(); // to make decimals 0

        const executionPrice = topics[0] === CloseBuyPositionTopic
          ? new BigNumber(decoded[5]).div(10 ** 30).toNumber()
          : new BigNumber(decoded[7]).div(10 ** 30).toNumber();

        const quoteTokenTicker = ASSET_ADDRESS_TO_TICKER[chainId][decoded[3].toLowerCase()];

        const amountPaid = isBuy
          ? "-"
          : new BigNumber(decoded[4]).div(10 ** ASSET_TICKER_TO_DECIMALS[chainId][quoteTokenTicker]).toNumber();

        const amountReceived = isBuy
          ? new BigNumber(decoded[4]).div(10 ** ASSET_TICKER_TO_DECIMALS[chainId][quoteTokenTicker]).toNumber()
          : "-";

        const collateralTokenTicker = isBuy
          ? "-"
          : ASSET_ADDRESS_TO_TICKER[chainId][decoded[5].toLowerCase()];

        const collateralAmount = isBuy
          ? "-"
          : new BigNumber(decoded[6]).div(10 ** ASSET_TICKER_TO_DECIMALS[chainId][collateralTokenTicker]).toNumber();
        
        const spotPrice = isBuy
          ? new BigNumber(decoded[6]).div(10 ** 30).toNumber()
          : new BigNumber(decoded[8]).div(10 ** 30).toNumber();

        const vaultName = VAULT_INDEX_TO_NAME[chainName][vaultIndex];

        const vaultAddress = VAULT_INDEX_TO_ADDRESS[chainName][vaultIndex];

        return {
          account,
          underlyingAsset,
          spotPrice,
          isOpen,
          isBuy,
          mainOptionName,
          pairedOptionName,
          expiry,
          strikePrice,
          isCall,
          size,
          executionPrice,
          quoteTokenTicker,
          amountPaid,
          amountReceived,
          collateralTokenTicker,
          collateralAmount,
          transactionHash,
          requestIndex,
          vaultName,
          vaultAddress,
          feePaidBy: collectPositionFeesLogsItem.feePaidBy,
          feeToken: collectPositionFeesLogsItem.feeToken,
          feeUsd: collectPositionFeesLogsItem.feeUsd,
          feeAmount: collectPositionFeesLogsItem.feeAmount  
        }
      }
    })

  const openPositionLogValues = tradeLogs
    .filter(({ isOpen }) => isOpen)
    .reduce((acc, {
      account,
      underlyingAsset,
      spotPrice,
      isOpen,
      isBuy,
      mainOptionName,
      pairedOptionName,
      expiry,
      strikePrice,
      isCall,
      size,
      executionPrice,
      quoteTokenTicker,
      amountPaid,
      amountReceived,
      collateralTokenTicker,
      collateralAmount,
      transactionHash,
      requestIndex,
      vaultName,
      vaultAddress,
      feePaidBy,
      feeToken,
      feeUsd,
      feeAmount
    }) => {
      const logDetail: any = logsOpenQueue.shift() || {}

      acc.push([
        getKoreanTimeFormatted(),
        new Date().toISOString(),
        account,
        underlyingAsset,
        spotPrice,
        isOpen,
        isBuy,
        mainOptionName,
        pairedOptionName,
        expiry,
        strikePrice,
        isCall,
        size,
        executionPrice,
        quoteTokenTicker,
        amountPaid,
        amountReceived,
        collateralTokenTicker,
        collateralAmount,
        transactionHash,
        requestIndex,
        vaultName,
        vaultAddress,
        feePaidBy,
        feeToken,
        feeUsd,
        feeAmount,
        
        isBuy ? logDetail.amountInTokenToExecute : "-", // it's paid token for buy (premium)
        isBuy ? logDetail.amountInToExecute : "-", // it's amount of paid token for buy (premium)
        isBuy ? "-" : logDetail.amountInTokenToExecute, // it's paid token for sell (collateral)
        isBuy ? "-" : logDetail.amountInToExecute, // it's amount of paid token for sell (collateral)

        logDetail.mainOptionIv,
        logDetail.pairedOptionIv,  
        logDetail.newTradeMoneyness,
        logDetail.underlyingFutures,
        logDetail.daysToExpiration,
        logDetail.olpDvToApply,
        logDetail.UR,
        logDetail.UR_Multiplier,
        
        logDetail.rpRate,
        logDetail.G0_delta,
        logDetail.G0_vega,
        logDetail.G0_theta,
        logDetail.G1_delta,
        logDetail.G1_vega,
        logDetail.G1_theta,
        logDetail.UG_delta,
        logDetail.UG_vega,
        logDetail.UG_theta,

        logDetail.markPrice,
        logDetail.riskPremium
      ])
      
      return acc
    }, [])

  await appendValues("OpenPosition!C2", openPositionLogValues)

  const closePositionLogValues = tradeLogs
    .filter(({ isOpen }) => !isOpen)
    .reduce((acc, {
      account,
      underlyingAsset,
      spotPrice,
      isOpen,
      isBuy,
      mainOptionName,
      pairedOptionName,
      expiry,
      strikePrice,
      isCall,
      size,
      executionPrice,
      quoteTokenTicker,
      amountPaid,
      amountReceived,
      collateralTokenTicker,
      collateralAmount,
      transactionHash,
      requestIndex,
      vaultName,
      vaultAddress,
      feePaidBy,
      feeToken,
      feeUsd,
      feeAmount
    }) => {
      const logDetail: any = logsCloseQueue.shift() || {}

      acc.push([
        getKoreanTimeFormatted(),
        new Date().toISOString(),
        account,
        underlyingAsset,
        spotPrice,
        isOpen,
        isBuy,
        mainOptionName,
        pairedOptionName,
        expiry,
        strikePrice,
        isCall,
        size,
        executionPrice,
        quoteTokenTicker,
        amountPaid,
        amountReceived,
        collateralTokenTicker,
        collateralAmount,
        transactionHash,
        requestIndex,
        vaultName,
        vaultAddress,
        feePaidBy,
        feeToken,
        feeUsd,
        feeAmount,

        logDetail.sizesToExecute,

        logDetail.mainOptionIv,
        logDetail.pairedOptionIv,  
        logDetail.newTradeMoneyness,
        logDetail.underlyingFutures,
        logDetail.daysToExpiration,
        logDetail.olpDvToApply,
        logDetail.UR,
        logDetail.UR_Multiplier,
        
        logDetail.rpRate,
        logDetail.G0_delta,
        logDetail.G0_vega,
        logDetail.G0_theta,
        logDetail.G1_delta,
        logDetail.G1_vega,
        logDetail.G1_theta,
        logDetail.UG_delta,
        logDetail.UG_vega,
        logDetail.UG_theta,

        logDetail.markPrice,
        logDetail.riskPremium
      ])
      
      return acc
    }, [])

  await appendValues("ClosePosition!C2", closePositionLogValues)


  //////////////////////////////////
  // Cancel Open/Close Position   //
  //////////////////////////////////

  const cancelPositionLogs = await Promise.all(receipt.logs
    .filter(({ topics }) => {
      const topic = topics[0]
      return topic === CancelOpenPositionTopic || topic === CancelClosePositionTopic
    })
    .map(async ({ topics, data, transactionHash }) => {
      const isOpen = topics[0] === CancelOpenPositionTopic;
      const account = "0x" + topics[1].slice(-40);

      const decoded = isOpen
        ? abiCoder.decode(
            // optionIds, optionTokenId, path, amountIn, timeGap
            ["bytes32[4]", "uint256", "address[]", "uint256", "uint40"],
            data  
          )
        : abiCoder.decode(
            // optionTokenId, size, path, timeGap
            ["uint256", "uint256", "address[]", "uint40"],
            data
          )
        
      const optionTokenId = isOpen ? decoded[1] : decoded[0];
      const path = decoded[2];
      const timeGap = isOpen ? Number(decoded[4]) : Number(decoded[3]);

      const { underlyingAssetIndex, expiry, strategy, length, isBuys, strikePrices, isCalls, vaultIndex } = parseOptionTokenId(optionTokenId);
      const underlyingAsset = UA_INDEX_TO_TICKER[chainName][underlyingAssetIndex as UnderlyingAssetIndex];
      const decimals = UA_TICKER_TO_DECIMAL[chainName][underlyingAsset];
      const isBuy = isBuyStrategy(strategy);
      const { optionNames } = generateOptionTokenData(chainName, optionTokenId);
      const mainOptionName = getMainOptionName(optionTokenId, optionNames);
      const pairedOptionName = getPairedOptionName(optionTokenId, optionNames);
      const vaultName = VAULT_INDEX_TO_NAME[chainName][vaultIndex];
      const vaultAddress = VAULT_INDEX_TO_ADDRESS[chainName][vaultIndex];

      const paidToken = isOpen ? path[0] : "";
      const paidTokenTicker = isOpen ? ASSET_ADDRESS_TO_TICKER[chainId][paidToken.toLowerCase()] : "-";
      const paidTokenDecimals = isOpen ? ASSET_TICKER_TO_DECIMALS[chainId][paidTokenTicker] : 0;
      const paidTokenAmount = isOpen ? new BigNumber(decoded[3]).div(10 ** paidTokenDecimals).toNumber() : "-";

      const optionTokenName = isOpen ? "-" : underlyingAsset + " Options Token";
      const optionTokenSize = isOpen ? "-" : new BigNumber(decoded[1]).div(10 ** decimals).toNumber();  

      return {
        account,
        underlyingAsset,
        isOpen,
        isBuy,
        mainOptionName,
        pairedOptionName,
        expiry,
        paidTokenTicker,
        paidTokenAmount,
        optionTokenName,
        optionTokenSize,
        timeGap,
        transactionHash,
        vaultName,
        vaultAddress
      }
    })
  )

  const cancelPositionLogValues = cancelPositionLogs.reduce((acc, {
    account,
    underlyingAsset,
    isOpen,
    isBuy,
    mainOptionName,
    pairedOptionName,
    expiry,
    paidTokenTicker,
    paidTokenAmount,
    optionTokenName,
    optionTokenSize,
    timeGap,
    transactionHash,
    vaultName,
    vaultAddress
  }) => {
    const logDetail: any = isOpen ? logsOpenQueue.shift() : logsCloseQueue.shift()

    acc.push([
      getKoreanTimeFormatted(),
      new Date().toISOString(),
      account,
      underlyingAsset,
      isOpen,
      isBuy,
      mainOptionName,
      pairedOptionName,
      expiry,
      paidTokenTicker,
      paidTokenAmount,
      optionTokenName,
      optionTokenSize,
      timeGap,
      transactionHash,
      vaultName,
      vaultAddress,

      isOpen ? logDetail.amountInTokenToExecute : "-", // premium or collateral
      isOpen ? logDetail.amountInToExecute : "-", // premium or collateral
      isOpen ? "-" : logDetail.sizesToExecute, // option token size

      logDetail.mainOptionIv,
      logDetail.pairedOptionIv,  
      logDetail.newTradeMoneyness,
      logDetail.underlyingFutures,
      logDetail.daysToExpiration,
      logDetail.olpDvToApply,
      logDetail.UR,
      logDetail.UR_Multiplier,
      
      logDetail.rpRate,
      logDetail.G0_delta,
      logDetail.G0_vega,
      logDetail.G0_theta,
      logDetail.G1_delta,
      logDetail.G1_vega,
      logDetail.G1_theta,
      logDetail.UG_delta,
      logDetail.UG_vega,
      logDetail.UG_theta,

      logDetail.markPrice,
      logDetail.riskPremium
    ])

    return acc
  }, [])

  await appendValues("CancelPosition!C2", cancelPositionLogValues)

  if (cancelPositionLogs.length > 0) {
    const canclePositionLogsMessage = cancelPositionLogs.reduce((acc, {
      account,
      underlyingAsset,
      isOpen,
      isBuy,
      mainOptionName,
      pairedOptionName,
      expiry,
      paidTokenTicker,
      paidTokenAmount,
      optionTokenName,
      optionTokenSize,
      timeGap,
      transactionHash,
      vaultName,
      vaultAddress
    }) => {
      if (isOpen) {
        acc = acc + "\n" + "- " + `isOpen: ${isOpen}, account: ${account}, mainOptionName: ${mainOptionName}, pairedOptionName: ${pairedOptionName}, isBuy: ${isBuy}, paid: ${paidTokenTicker} / ${new BigNumber(paidTokenAmount).toFixed(2)}`
      } else {
        acc = acc + "\n" + "- " + `isOpen: ${isOpen}, account: ${account}, mainOptionName: ${mainOptionName}, pairedOptionName: ${pairedOptionName}, isBuy: ${isBuy}, paid: ${optionTokenName} / ${new BigNumber(optionTokenSize).toFixed(2)}`
      }
      
      return acc
    }, "")

    await sendMessage(
      MESSAGE_TYPE.CANCEL_POSITION,
      LogLevel.INFO,
      {
        description: canclePositionLogsMessage,
      }
    )
  }
}