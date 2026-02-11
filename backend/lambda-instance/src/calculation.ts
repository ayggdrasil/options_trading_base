import BigNumber from "bignumber.js"
import { getS3 } from "./utils/aws"
import { getOlpKeyByVaultIndex } from "./utils/helper"
import { calculateRiskPremiumRate, calculateUnderlyingFutures, ChainNames, FEE_RATES, formatOptionTokenId, FuturesAssetIndexMap, generateOptionTokenData, getInstrumentMarkDataFromMarket, getMainOptionName, getMainOptionStrikePrice, getMarkIvAndPriceByInstrument, getMarkIvAndPriceByOptionTokenId, getPairedOptionName, getPairedOptionStrikePrice, OptionRiskPremiumInputData, SpotAssetIndexMap, TRADE_FEE_CALCULATION_LIMIT_RATE, UA_TICKER_TO_INDEX, UnderlyingAsset } from "@callput/shared"

export const getComboCollateralAmount = async (event) => {  
  const { items } = JSON.parse(event.body)
  const { data } = await getS3({ Bucket: process.env.APP_DATA_BUCKET, Key: process.env.APP_DATA_MARKET_DATA_KEY })

  return items.map(({
    underlyingAssetTicker,
    strikePrices,
    isCall,
    isBuy,
    size,
    expiry,
  }: {
    underlyingAssetTicker: UnderlyingAsset
    strikePrices: number[]
    isCall: boolean
    isBuy: boolean
    size: number
    expiry: number
  }) => {
    const { rpRate, markPrice } = _getCalculateComboRiskPremiumRate({ underlyingAsset: underlyingAssetTicker, strikePrices, isCall, isBuy, size, expiry, marketData: data })
    const result = _getComboCollateralAmount({ underlyingAsset: underlyingAssetTicker, size, isBuy, strikePrices, data, rpRate, markPrice })

    return result
  })
}

export const collateralAmountToSize = async (event) => {
  const { items } = JSON.parse(event.body)

  const { data } = await getS3({ Bucket: process.env.APP_DATA_BUCKET, Key: process.env.APP_DATA_MARKET_DATA_KEY })

  return items.map(({
    underlyingAssetTicker,
    strikePrices,
    isCall,
    isBuy,
    collateralAmount,
    expiry,
  }) => {

    const result = _collateralAmountToSize({ underlyingAsset: underlyingAssetTicker, strikePrices, isCall, isBuy, collateralAmount, expiry, data })

    return result
  })

}

const _collateralAmountToSize = ({
  underlyingAsset,
  strikePrices,
  isCall,
  isBuy,
  collateralAmount,
  expiry,
  data
}) => {
  let low = 0.00000001;
  let high = 100;
  let optimalSize = low;
  let closestDiff = Number.MAX_VALUE;
  const maxCount = 100;
  
  for (let i = 0; i < maxCount; i++) {
    const mid = (low + high) / 2;
    
    const { rpRate, markPrice } = _getCalculateComboRiskPremiumRate({ 
      underlyingAsset, 
      strikePrices, 
      isCall, 
      isBuy, 
      size: mid, 
      expiry, 
      marketData: data 
    })
    
    const calculatedCollateral = _getComboCollateralAmount({ 
      underlyingAsset, 
      size: mid, 
      isBuy, 
      strikePrices, 
      data, 
      rpRate, 
      markPrice 
    })
    
    const diff = Math.abs(Number(calculatedCollateral) - collateralAmount)
    
    if (diff < closestDiff) {
      closestDiff = diff;
      optimalSize = mid;
    }
    
    if (calculatedCollateral < collateralAmount) {
      low = mid;
    } else {
      high = mid;
    }
    
    if (diff < 0.0001 || (high - low) < 0.0000001) {
      break;
    }
  }
  
  return optimalSize
}

const _getComboCollateralAmount = ({ underlyingAsset, size, isBuy, strikePrices, data, rpRate, markPrice }: {
  underlyingAsset: UnderlyingAsset
  size: number
  isBuy: boolean
  strikePrices: number[]
  data: any
  rpRate: number
  markPrice: number
}) => {
  const tradeFeeRateAtComboMode = FEE_RATES.OPEN_COMBO_POSITION

  const spotIndices = data.spotIndices
  const underlyingAssetSpotPrice = spotIndices[underlyingAsset]

  const tradeFeeUsdAtComboMode = new BigNumber(underlyingAssetSpotPrice)
    .multipliedBy(size)
    .multipliedBy(tradeFeeRateAtComboMode).toNumber();

  const riskPremiumAtComboMode = markPrice * rpRate;
  const executionPriceAtComboMode = isBuy ? markPrice + riskPremiumAtComboMode : markPrice - riskPremiumAtComboMode;
  const totalExecutionPriceAtComboMode = Number(size) * executionPriceAtComboMode;

  const maxTradeFeeUsdAtComboMode = new BigNumber(totalExecutionPriceAtComboMode)
    .multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE)
    .toNumber()

  const tradeFeeUsdAtComboModeAfterMax = tradeFeeUsdAtComboMode > maxTradeFeeUsdAtComboMode 
    ? maxTradeFeeUsdAtComboMode 
    : tradeFeeUsdAtComboMode

  const collateralAssetAmountAtComboMode = new BigNumber(size)
    .multipliedBy(Math.abs(strikePrices[0] - strikePrices[1]))
    .div(spotIndices.usdc)
    .toFixed(6)

  const collateralAssetValueAtComboMode = new BigNumber(collateralAssetAmountAtComboMode)
    .multipliedBy(spotIndices.usdc)
    .plus(tradeFeeUsdAtComboModeAfterMax)
    .toNumber();

  const result = new BigNumber(collateralAssetValueAtComboMode)
    .dividedBy(spotIndices.usdc)
    .toString()

  return result
}

const _getCalculateComboRiskPremiumRate = ({
  underlyingAsset,
  strikePrices,
  isCall,
  isBuy,
  size,
  expiry,
  marketData,
}: {
  underlyingAsset: UnderlyingAsset
  strikePrices: number[]
  isCall: boolean
  isBuy: boolean
  size: number
  expiry: number
  marketData: any
}) => {
  const chainId = Number(process.env.CHAIN_ID);
  const chainName = ChainNames[chainId];

  const olpKey = getOlpKeyByVaultIndex(0)

  const length = strikePrices.length
  
  if (length != 2) {
    throw new Error('Invalid length')
  }

  // sorted
  const sortedStirkePrices = strikePrices.sort((a, b) => a - b)

  // const isBuys = isCall 
  //   ? [false, true, false, false]
  //   : [true, false, false, false]
  
  const isBuys = isCall
    ? [isBuy, !isBuy, false, false]
    : [!isBuy, isBuy, false, false]

  const optionTokenId = formatOptionTokenId(
    UA_TICKER_TO_INDEX[chainName]["BTC"],
    expiry,
    length, // length
    isBuys, // isBuys
    [...sortedStirkePrices, 0, 0], // strikePrices
    [isCall, isCall, false, false], // isCalls
    0, // sVault
  )

  // market data
  const data = marketData

  const spotAssetIndexMap = data.spotIndices as SpotAssetIndexMap;
  const olpGreeks = data.olpStats[olpKey].greeks[underlyingAsset]
  const olpUtilityRatio = { [olpKey]: data.olpStats[olpKey].utilityRatio }
  const futuresAssetIndexMap = data.futuresIndices as FuturesAssetIndexMap
  const riskFreeRates = data.riskFreeRates
  const volatilityScore = data.volatilityScore

  console.log(riskFreeRates, '@riskFreeRates')

  
  console.log(underlyingAsset, 'underlyingAsset')
  const underlyingFutures = calculateUnderlyingFutures(underlyingAsset, expiry, futuresAssetIndexMap, riskFreeRates);

  console.log(underlyingAsset, 'underlyingAsset')
  
  const underlyingAssetSpotIndex = spotAssetIndexMap[underlyingAsset];
  
  const underlyingAssetVolatilityScore = volatilityScore[underlyingAsset];

  const instrumentMarkData = getInstrumentMarkDataFromMarket(data.market)

  const { markPrice } = getMarkIvAndPriceByOptionTokenId(chainName, optionTokenId, instrumentMarkData, underlyingFutures)

  const { optionNames } = generateOptionTokenData(chainName, optionTokenId);
  const mainOptionName = getMainOptionName(optionTokenId, optionNames);
  const pairedOptionName = getPairedOptionName(optionTokenId, optionNames);
  const mainOptionStrikePrice = getMainOptionStrikePrice(optionTokenId);
  const pairedOptionStrikePrice = getPairedOptionStrikePrice(optionTokenId);
  const mainOptionMarkIvAndPrice = getMarkIvAndPriceByInstrument(mainOptionName, instrumentMarkData, underlyingFutures);
  const pairedOptionMarkIvAndPrice = getMarkIvAndPriceByInstrument(pairedOptionName, instrumentMarkData, underlyingFutures);

  const mainOption: OptionRiskPremiumInputData = {
    strikePrice: mainOptionStrikePrice,
    markIv: mainOptionMarkIvAndPrice.markIv,
    markPrice: mainOptionMarkIvAndPrice.markPrice
  }

  const pairedOption: OptionRiskPremiumInputData = {
    strikePrice: pairedOptionStrikePrice,
    markIv: pairedOptionMarkIvAndPrice.markIv,
    markPrice: pairedOptionMarkIvAndPrice.markPrice
  }

  const { RP_rate: rpRate, } = calculateRiskPremiumRate({
    underlyingAsset: underlyingAsset,
    expiry: expiry,
    isOpen: true,
    orderSide: isBuy ? "Buy" : "Sell",
    optionDirection: isCall ? "Call" : "Put",
    mainOption: mainOption,
    pairedOption: pairedOption,
    size: size,
    underlyingFutures,
    underlyingAssetSpotIndex,
    underlyingAssetVolatilityScore,
    olpKey,
    olpGreeks: olpGreeks,
    olpUtilityRatio,
  })

  return {
    markPrice,
    rpRate,
  }
}