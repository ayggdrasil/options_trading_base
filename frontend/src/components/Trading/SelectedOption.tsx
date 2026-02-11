import BigNumber from "bignumber.js";
import Button from "../Common/Button";
import QuoteAssetDropDown from "../Common/QuoteAssetDropDown";
import { advancedFormatNumber, getPairedOptionStrikePriceByTermV2 } from "@/utils/helper";
import { OptionDirection, OrderSide } from "@/utils/types";
import { twJoin } from "tailwind-merge";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAccount } from "wagmi";
import { ZeroAddress } from "ethers";
import { sendCreateOpenPosition, writeApproveERC20 } from "@/utils/contract";
import { loadAllowanceForController, loadBalance } from "@/store/slices/UserSlice";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { initialOptionDetail } from "@/constants/constants.slices";
import SelectedOptionTitle from "./SelectedOptionTitle";
import SelectedOptionChart from "./SelectedOptionChart";
import SelectedOptionModeSelector from "./SelectedOptionComboMode";
import IconArrowOptionNotSelected from "@assets/icon-arrow-option-not-selected-2.svg"
import IconWalletGray from "@assets/icon-input-wallet-gray.svg";
import IconSymbolUSDC from "@assets/icon-symbol-usdc.svg";
import IconMinus from "@assets/icon-minus.svg";
import IconPlus from "@assets/icon-plus.svg";
import SelectedOptionDetail from "./SelectedOptionDetail";
import { QA_TICKER_TO_ADDRESS, QA_TICKER_TO_DECIMAL, QA_TICKER_TO_IMG, UA_TICKER_TO_MAX_OPEN_SIZE_FOR_SPREAD, UA_TICKER_TO_MAX_OPEN_SIZE_FOR_VANILLA, UA_TICKER_TO_QA_TICKER } from "@/networks/assets";
import { BaseQuoteAsset, calculateRiskPremiumRate, convertQuoteAssetToNormalizedSpotAsset, FEE_RATES, NetworkQuoteAsset, SpotAssetIndexMap, TRADE_FEE_CALCULATION_LIMIT_RATE, UnderlyingAsset, VolatilityScore } from "@callput/shared";
import { getOlpKeyByExpiry } from "@/networks/helpers";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { SupportedChains } from "@callput/shared";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { NetworkState } from "@/networks/types";
import { getPositionManagerAllowanceForQuoteAsset, getQuoteAssetBalance } from "@/store/selectors/userSelectors";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface SelectedOptionProps {
  underlyingFutures: number;
  selectedUnderlyingAsset: UnderlyingAsset;
  selectedOptionDirection: OptionDirection;
  selectedExpiry: number;
  selectedOption: IOptionDetail;
  selectedOrderSide: OrderSide;
  selectableOptionPairs: IOptionDetail[];
}

type FocusedInput = 'size' | 'pay' | null;

const SelectedOption: React.FC<SelectedOptionProps> = ({
  underlyingFutures,
  selectedUnderlyingAsset,
  selectedOptionDirection,
  selectedExpiry,
  selectedOption,
  selectedOrderSide,
  selectableOptionPairs,
}) => {
  const { address, connector, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  
  const dispatch = useAppDispatch();

  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;
  const olpStats = useAppSelector((state: any) => state.market.olpStats)
  const volatilityScore = useAppSelector((state: any) => state.market.volatilityScore) as VolatilityScore;

  const [currentOptionId, setCurrentOptionId] = useState<string>("");
  const [currentTradeType, setCurrentTradeType] = useState<OrderSide>("Buy");
  const [pairedOption, setPairedOption] = useState<IOptionDetail>(initialOptionDetail);
  const [selectedQuoteAsset, setSelectedQuoteAsset] = useState<NetworkQuoteAsset<SupportedChains>>(BaseQuoteAsset.USDC);
  const [isComboMode, setIsComboMode] = useState<boolean>(true);
  const [isComboModePossible, setIsComboModePossible] = useState<boolean>(true);

  const [markPrice, setMarkPrice] = useState<number>(0);
  const [markPriceAtComboMode, setMarkPriceAtComboMode] = useState<number>(0);
  const [basedExecutionPrice, setBasedExecutionPrice] = useState<number>(0);
  const [basedExecutionPriceAtComboMode, setBasedExecutionPriceAtComboMode] = useState<number>(0);
  const [riskPremium, setRiskPremium] = useState<number>(0);
  const [riskPremiumAtComboMode, setRiskPremiumAtComboMode] = useState<number>(0);
  const [executionPrice, setExecutionPrice] = useState<number>(0);
  const [executionPriceAtComboMode, setExecutionPriceAtComboMode] = useState<number>(0);
  
  const [size, setSize] = useState<string>("0");
  const [sizeAtComboMode, setSizeAtComboMode] = useState<string>("0");
  const [availableSize, setAvailableSize] = useState<number>(0);
  const [availableSizeAtComboMode, setAvailableSizeAtComboMode] = useState<number>(0);
  const [quoteAssetAmount, setQuoteAssetAmount] = useState<string>("0");
  const [quoteAssetAmountAtComboMode, setQuoteAssetAmountAtComboMode] = useState<string>("0");
  const [quoteAssetValue, setQuoteAssetValue] = useState<number>(0);
  const [quoteAssetValueAtComboMode, setQuoteAssetValueAtComboMode] = useState<number>(0);
  const [collateralAsset, setCollateralAsset] = useState<NetworkQuoteAsset<SupportedChains>>(
    selectedOptionDirection === "Call"
      ? UA_TICKER_TO_QA_TICKER[chain][selectedUnderlyingAsset as UnderlyingAsset] as NetworkQuoteAsset<SupportedChains>
      : BaseQuoteAsset.USDC
  )
  const [collateralAssetAtComboMode, setCollateralAssetComboMode] = useState<NetworkQuoteAsset<SupportedChains>>(BaseQuoteAsset.USDC); 
  const [collateralAssetAmount, setCollateralAssetAmount] = useState<string>("0");
  const [collateralAssetAmountAtComboMode, setCollateralAssetAmountAtComboMode] = useState<string>("0");
  const [collateralAssetValue, setCollateralAssetValue] = useState<number>(0);
  const [collateralAssetValueAtComboMode, setCollateralAssetValueAtComboMode] = useState<number>(0);
  const [tradeFeeUsd, setTradeFeeUsd] = useState<number>(0);
  const [tradeFeeUsdAtComboMode, setTradeFeeUsdAtComboMode] = useState<number>(0);

  const [isChartSet, setIsChartSet] = useState(false);
  const [focusedInput, setFocusedInput] = useState<FocusedInput>(null);
  const [slippage, setSlippage] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWaitingForTrade, setIsWaitingForTrade] = useState<boolean>(false);

  const quoteAssetBalance = useAppSelector(state => getQuoteAssetBalance(state, selectedQuoteAsset));
  const isQuoteAssetApproved = useAppSelector(state => getPositionManagerAllowanceForQuoteAsset(state, selectedQuoteAsset, isComboMode ? quoteAssetAmountAtComboMode : quoteAssetAmount));
  const collateralAssetBalance = useAppSelector(state => getQuoteAssetBalance(state, collateralAsset));
  const isCollateralAssetApproved = useAppSelector(state => getPositionManagerAllowanceForQuoteAsset(state, collateralAsset, collateralAssetAmount));
  const collateralAssetBalanceAtComboMode = useAppSelector(state => getQuoteAssetBalance(state, collateralAssetAtComboMode));
  const isCollateralAssetApprovedAtComboMode = useAppSelector(state => getPositionManagerAllowanceForQuoteAsset(state, collateralAssetAtComboMode, collateralAssetAmountAtComboMode));

  const handleInputFocus = (inputType: FocusedInput) => {
    setFocusedInput(inputType);
  };

  const handleInputBlur = () => {
    setFocusedInput(null);
  };

  const handleMaxValue = (): string => {
    if (isNaN(Number(quoteAssetBalance))) return "0";
    return quoteAssetBalance;
  };

  // Initialize values that are affected by input
  const handleInitializeInputValues = () => {
    setRiskPremium(0);
    setRiskPremiumAtComboMode(0);
    setExecutionPrice(0);
    setExecutionPriceAtComboMode(0);
    setSize("0");
    setSizeAtComboMode("0");
    setQuoteAssetAmount("0");
    setQuoteAssetAmountAtComboMode("0");
    setQuoteAssetValue(0);
    setQuoteAssetValueAtComboMode(0);
    setCollateralAssetAmount("0");
    setCollateralAssetAmountAtComboMode("0");
    setCollateralAssetValue(0);
    setCollateralAssetValueAtComboMode(0);
    setTradeFeeUsd(0);
    setTradeFeeUsdAtComboMode(0);
  }

  const handleCalculateRiskPremium = (size: number, isBuy: boolean, isComboMode: boolean) => {    
    const isCall = selectedOptionDirection === "Call";

    const olpKey = getOlpKeyByExpiry(chain, selectedExpiry);
    const olpGreeks = olpStats[olpKey].greeks[selectedUnderlyingAsset];
    const olpUtilityRatio = {
      sOlp: {
        utilizedUsd: olpStats.sOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.sOlp.utilityRatio.depositedUsd
      },
      mOlp: {
        utilizedUsd: olpStats.mOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.mOlp.utilityRatio.depositedUsd
      },
      lOlp: {
        utilizedUsd: olpStats.lOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.lOlp.utilityRatio.depositedUsd
      }
    }

    const underlyingAssetSpotIndex = spotAssetIndexMap[selectedUnderlyingAsset];
    const underlyingAssetVolatilityScore = volatilityScore[selectedUnderlyingAsset];

    let rpRate = 0;

    if (isComboMode) {
      const { RP_rate } = calculateRiskPremiumRate({
        underlyingAsset: selectedUnderlyingAsset,
        expiry: selectedExpiry,
        isOpen: true,
        orderSide: isBuy ? "Buy" : "Sell",
        optionDirection: isCall ? "Call" : "Put",
        mainOption: selectedOption,
        pairedOption: pairedOption,
        size: size,
        underlyingFutures,
        underlyingAssetSpotIndex,
        underlyingAssetVolatilityScore,
        olpKey,
        olpGreeks,
        olpUtilityRatio,
      })

      rpRate = RP_rate;
    } else {
      const { RP_rate } = calculateRiskPremiumRate({
        underlyingAsset: selectedUnderlyingAsset,
        expiry: selectedExpiry,
        isOpen: true,
        orderSide: isBuy ? "Buy" : "Sell",
        optionDirection: isCall ? "Call" : "Put",
        mainOption: selectedOption,
        pairedOption: null,
        size: size,
        underlyingFutures,
        underlyingAssetSpotIndex,
        underlyingAssetVolatilityScore,
        olpKey,
        olpGreeks,
        olpUtilityRatio,
      })

      rpRate = RP_rate;
    }

    return rpRate;
  }

  const handleApproveForQuoteAsset = async (ticker: NetworkQuoteAsset<SupportedChains>) => {
    setIsLoading(true);

    const tokenAddress = QA_TICKER_TO_ADDRESS[chain][ticker as keyof typeof NetworkQuoteAsset[typeof chain]] as `0x${string}`
    const spender = CONTRACT_ADDRESSES[chain].CONTROLLER;

    const amountToApprove = selectedOrderSide === "Buy"
    ? BigNumber(isComboMode ? quoteAssetAmountAtComboMode : quoteAssetAmount)
      .multipliedBy(1.5)
      .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][ticker as keyof typeof NetworkQuoteAsset[typeof chain]])
      .toFixed(0)
    : BigNumber(isComboMode ? collateralAssetAmountAtComboMode : collateralAssetAmount)
      .multipliedBy(1.5)
      .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][ticker as keyof typeof NetworkQuoteAsset[typeof chain]])
      .toFixed(0);

    const result = await writeApproveERC20(tokenAddress, spender, BigInt(amountToApprove));

    if (result) {
      dispatch(loadAllowanceForController({ chain, address }));
    }

    setIsLoading(false);
  }

  const handleCreateOpenPosition = async () => {
    setIsWaitingForTrade(true);

    const result = await sendCreateOpenPosition(
      chain,
      address as string,
      selectedOrderSide === "Buy",
      selectedUnderlyingAsset,
      selectedExpiry,
      isComboMode ? "2" : "1",
      selectedOption,
      pairedOption,
      selectedOptionDirection === "Call",
      isComboMode ? sizeAtComboMode : size,
      slippage,
      selectedOrderSide === "Buy"
        ? selectedQuoteAsset as keyof typeof NetworkQuoteAsset[typeof chain]
        : isComboMode
          ? collateralAssetAtComboMode as keyof typeof NetworkQuoteAsset[typeof chain]
          : collateralAsset as keyof typeof NetworkQuoteAsset[typeof chain],
      selectedOrderSide === "Buy"
        ? isComboMode ? quoteAssetAmountAtComboMode : quoteAssetAmount
        : isComboMode ? collateralAssetAmountAtComboMode : collateralAssetAmount,
      ZeroAddress
    )

    if (result && address) {
      dispatch(loadBalance({ chain, address }));
      handleInitializeInputValues();
      setIsChartSet(false);
    }

    setIsWaitingForTrade(false);
  }

  useEffect(() => {
    handleInitializeInputValues();
    setIsChartSet(false);
    setIsComboMode(true);
  }, [currentOptionId, currentTradeType, selectedQuoteAsset])

  // Initialize default values related to selected option
  useEffect(() => {
    const markPrice = selectedOption.markPrice;

    const basedRiskPremium = selectedOrderSide === "Buy"
      ? markPrice * selectedOption.riskPremiumRateForBuy
      : markPrice * selectedOption.riskPremiumRateForSell

    const basedExecutionPrice = selectedOrderSide === "Buy"
      ? markPrice + basedRiskPremium
      : markPrice - basedRiskPremium

    setMarkPrice(markPrice);
    setBasedExecutionPrice(basedExecutionPrice);

    if (selectedOption.optionId !== currentOptionId || selectedOrderSide !== currentTradeType) {
      setCurrentOptionId(selectedOption.optionId);
      setCurrentTradeType(selectedOrderSide);
      setPairedOption(initialOptionDetail);
    }
  }, [selectedOption, selectedOrderSide])

  // Validate combo mode and initialize paired option
  useEffect(() => {
    if (selectableOptionPairs.length === 0) {
      setPairedOption(initialOptionDetail);
      setIsComboModePossible(false);
      setIsComboMode(false);
      return;
    }

    if (pairedOption.optionId !== "") return;

    const pairedOptionIndex = getPairedOptionStrikePriceByTermV2(
      selectedExpiry,
      selectedOption.strikePrice,
      selectableOptionPairs,
      selectedOptionDirection === "Call"
    )

    setPairedOption(selectableOptionPairs[pairedOptionIndex]);
    setIsComboModePossible(true);
  }, [selectableOptionPairs])

  // Initialize default values related to paired option
  useEffect(() => {
    if (pairedOption.optionId === "") {
      setMarkPriceAtComboMode(0)
      setBasedExecutionPriceAtComboMode(0)
    }

    const markPriceAtComboMode = Math.max(selectedOption.markPrice - pairedOption.markPrice, 0);
    
    const basedRiskPremiumAtComboMode = selectedOrderSide === "Buy"
      ? markPriceAtComboMode * handleCalculateRiskPremium(Number(1), true, true)
      : markPriceAtComboMode * handleCalculateRiskPremium(Number(1), false, true)

    const basedExecutionPriceAtComboMode = selectedOrderSide === "Buy"
      ? markPriceAtComboMode + basedRiskPremiumAtComboMode
      : markPriceAtComboMode - basedRiskPremiumAtComboMode

    setMarkPriceAtComboMode(markPriceAtComboMode);
    setBasedExecutionPriceAtComboMode(basedExecutionPriceAtComboMode)
  }, [pairedOption])

  // Update collateral asset
  useEffect(() => {
    if (selectedOptionDirection === "Call") {
      setCollateralAsset(UA_TICKER_TO_QA_TICKER[chain][selectedUnderlyingAsset as UnderlyingAsset] as NetworkQuoteAsset<SupportedChains>)
    } else {
      setCollateralAsset(BaseQuoteAsset.USDC)
    }
  }, [selectedOptionDirection, selectedUnderlyingAsset])

  // calculate availableSize and availableSizeAtComboMode
  useEffect(() => {
    const olpKey = getOlpKeyByExpiry(chain, selectedExpiry);
    const olpAssetAmounts = olpStats[olpKey].assetAmounts;

    let availableSize = 0;
    const savedUsdcAmountForClose = new BigNumber(olpAssetAmounts.usdc.depositedAmount).multipliedBy(0.03).toNumber();
    const parsedOlpUsdcAvailableAmounts = new BigNumber(olpAssetAmounts.usdc.availableAmount).minus(savedUsdcAmountForClose).toNumber();

    if (selectedOrderSide === "Buy" && selectedOptionDirection === "Call") {
      availableSize =  selectedUnderlyingAsset === UnderlyingAsset.BTC ? olpAssetAmounts.wbtc.availableAmount : olpAssetAmounts.weth.availableAmount;
    } else {
      if (selectedOrderSide === "Buy" && selectedOptionDirection === "Put") {
        const strikePriceAmounts = new BigNumber(selectedOption.strikePrice).dividedBy(spotAssetIndexMap.usdc).toNumber();
        availableSize = new BigNumber(parsedOlpUsdcAvailableAmounts).div(strikePriceAmounts).toNumber();
      } else {
        const appliedExecutionPrice = executionPrice === 0 ? basedExecutionPrice : executionPrice;
        const appliedExecutionPriceAmounts = new BigNumber(appliedExecutionPrice).dividedBy(spotAssetIndexMap.usdc).toNumber();
        availableSize = appliedExecutionPriceAmounts === 0 ? 0 : new BigNumber(parsedOlpUsdcAvailableAmounts).div(appliedExecutionPriceAmounts).toNumber();
      }
    }

    setAvailableSize(Math.max(availableSize, 0));

    let availableSizeAtComboMode = 0;
    const parsedOlpUsdcAvailableAmountsAtComboMode = new BigNumber(olpAssetAmounts.usdc.availableAmount).minus(savedUsdcAmountForClose).toNumber();

    if (selectedOrderSide === "Buy") {
      const diffStrikePrice = Math.abs(selectedOption.strikePrice - pairedOption.strikePrice);
      const diffStrikePriceAmounts = new BigNumber(diffStrikePrice).dividedBy(spotAssetIndexMap.usdc).toNumber();
      availableSizeAtComboMode = new BigNumber(parsedOlpUsdcAvailableAmountsAtComboMode).div(diffStrikePriceAmounts).toNumber();
    } else {
      const appliedExecutionPrice = executionPriceAtComboMode === 0 ? basedExecutionPriceAtComboMode : basedExecutionPriceAtComboMode;
      const appliedExecutionPriceAmountsAtComboMode = new BigNumber(appliedExecutionPrice).dividedBy(spotAssetIndexMap.usdc).toNumber();
      availableSizeAtComboMode = appliedExecutionPriceAmountsAtComboMode === 0 ? 0 : new BigNumber(parsedOlpUsdcAvailableAmountsAtComboMode).div(appliedExecutionPriceAmountsAtComboMode).toNumber();
    } 

    setAvailableSizeAtComboMode(Math.max(availableSizeAtComboMode, 0));
  }, [selectedOption, selectedOptionDirection, selectedOrderSide, olpStats, executionPrice, executionPriceAtComboMode, isComboMode])  

  // update value when focused input is size
  useEffect(() => {
    if (focusedInput !== 'size') return;

    if (size === "0" || sizeAtComboMode === "0") {
      handleInitializeInputValues();
      return;
    }

    const isBuy = selectedOrderSide === "Buy"

    const rpRate = handleCalculateRiskPremium(Number(size), isBuy, false);
    const rpRateAtComboMode = handleCalculateRiskPremium(Number(sizeAtComboMode), isBuy, true);

    const riskPremium = markPrice * rpRate;
    const riskPremiumAtComboMode = markPriceAtComboMode * rpRateAtComboMode;

    const executionPrice = isBuy
      ? markPrice + riskPremium
      : markPrice - riskPremium;
    const executionPriceAtComboMode = isBuy
      ? markPriceAtComboMode + riskPremiumAtComboMode
      : markPriceAtComboMode - riskPremiumAtComboMode;

    const totalExecutionPrice = Number(size) * executionPrice;
    const totalExecutionPriceAtComboMode = Number(sizeAtComboMode) * executionPriceAtComboMode;

    setRiskPremium(riskPremium)
    setRiskPremiumAtComboMode(riskPremiumAtComboMode)
    setExecutionPrice(executionPrice)
    setExecutionPriceAtComboMode(executionPriceAtComboMode)

    const underlyingAssetSpotPrice = spotAssetIndexMap[selectedUnderlyingAsset];

    const tradeFeeRate = isBuy ? FEE_RATES.OPEN_BUY_NAKED_POSITION : FEE_RATES.OPEN_SELL_NAKED_POSITION;
    const tradeFeeRateAtComboMode = FEE_RATES.OPEN_COMBO_POSITION;

    const tradeFeeUsd = new BigNumber(underlyingAssetSpotPrice).multipliedBy(size).multipliedBy(tradeFeeRate).toNumber();
    const tradeFeeUsdAtComboMode = new BigNumber(underlyingAssetSpotPrice).multipliedBy(sizeAtComboMode).multipliedBy(tradeFeeRateAtComboMode).toNumber();

    const maxTradeFeeUsd = new BigNumber(totalExecutionPrice).multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE).toNumber()
    const maxTradeFeeUsdAtComboMode = new BigNumber(totalExecutionPriceAtComboMode).multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE).toNumber()

    const tradeFeeUsdAfterMax = tradeFeeUsd > maxTradeFeeUsd ? maxTradeFeeUsd : tradeFeeUsd;
    const tradeFeeUsdAtComboModeAfterMax = tradeFeeUsdAtComboMode > maxTradeFeeUsdAtComboMode ? maxTradeFeeUsdAtComboMode : tradeFeeUsdAtComboMode;

    setTradeFeeUsd(tradeFeeUsdAfterMax);
    setTradeFeeUsdAtComboMode(tradeFeeUsdAtComboModeAfterMax);

    const quoteAssetValue = isBuy
      ? new BigNumber(size).multipliedBy(executionPrice).plus(tradeFeeUsdAfterMax).toNumber()
      : new BigNumber(size).multipliedBy(executionPrice).toNumber();
    const quoteAssetValueAtComboMode = isBuy
      ? new BigNumber(sizeAtComboMode).multipliedBy(executionPriceAtComboMode).plus(tradeFeeUsdAtComboModeAfterMax).toNumber()
      : new BigNumber(sizeAtComboMode).multipliedBy(executionPriceAtComboMode).toNumber()

    const normalizedQuoteAsset = convertQuoteAssetToNormalizedSpotAsset(selectedQuoteAsset, false);

    if (!normalizedQuoteAsset) return;

    const quoteAssetSpotPrice = spotAssetIndexMap[normalizedQuoteAsset];

    const quoteAssetAmount = new BigNumber(quoteAssetValue).dividedBy(quoteAssetSpotPrice).toString();
    const quoteAssetAmountAtComboMode = new BigNumber(quoteAssetValueAtComboMode).dividedBy(quoteAssetSpotPrice).toString();

    setQuoteAssetValue(quoteAssetValue);
    setQuoteAssetValueAtComboMode(quoteAssetValueAtComboMode);
    setQuoteAssetAmount(quoteAssetAmount);
    setQuoteAssetAmountAtComboMode(quoteAssetAmountAtComboMode);

    if (!isBuy) {
      let collateralAssetAmount = selectedOptionDirection === "Call"
        ? size
        : new BigNumber(size)
            .multipliedBy(selectedOption.strikePrice)
            .div(spotAssetIndexMap.usdc)
            .toFixed(QA_TICKER_TO_DECIMAL[chain][BaseQuoteAsset.USDC])
      let collateralAssetAmountAtComboMode = new BigNumber(sizeAtComboMode)
        .multipliedBy(Math.abs(selectedOption.strikePrice - pairedOption.strikePrice))
        .div(spotAssetIndexMap.usdc)
        .toFixed(QA_TICKER_TO_DECIMAL[chain][BaseQuoteAsset.USDC])
  
      const collateralAssetValue = selectedOptionDirection === 'Call'
        ? new BigNumber(collateralAssetAmount).multipliedBy(spotAssetIndexMap[selectedUnderlyingAsset]).plus(tradeFeeUsdAfterMax).toNumber()
        : new BigNumber(collateralAssetAmount).multipliedBy(spotAssetIndexMap.usdc).plus(tradeFeeUsdAfterMax).toNumber()

      const collateralAssetValueAtComboMode = new BigNumber(collateralAssetAmountAtComboMode).multipliedBy(spotAssetIndexMap.usdc).plus(tradeFeeUsdAfterMax).toNumber();

      const normalizedCollateralAsset = convertQuoteAssetToNormalizedSpotAsset(collateralAsset, false);
      const normalizedCollateralAssetAtComboMode = convertQuoteAssetToNormalizedSpotAsset(collateralAssetAtComboMode, false);

      if (!normalizedCollateralAsset || !normalizedCollateralAssetAtComboMode) return;

      const collateralAssetSpotPrice = spotAssetIndexMap[normalizedCollateralAsset];
      const collateralAssetSpotPriceAtComboMode = spotAssetIndexMap[normalizedCollateralAssetAtComboMode];

      collateralAssetAmount = new BigNumber(collateralAssetValue).dividedBy(collateralAssetSpotPrice).toString();
      collateralAssetAmountAtComboMode = new BigNumber(collateralAssetValueAtComboMode).dividedBy(collateralAssetSpotPriceAtComboMode).toString();

      setCollateralAssetValue(collateralAssetValue);
      setCollateralAssetValueAtComboMode(collateralAssetValueAtComboMode);
      setCollateralAssetAmount(collateralAssetAmount);
      setCollateralAssetAmountAtComboMode(collateralAssetAmountAtComboMode);
    }
  }, [size, sizeAtComboMode])

  // update value when focused input is pay
  useEffect(() => {
    if (focusedInput !== 'pay' || selectedOrderSide === 'Sell') return;

    if (quoteAssetAmount === "0" || quoteAssetAmountAtComboMode === "0") {
      handleInitializeInputValues();
      return;
    }

    const isBuy = selectedOrderSide === "Buy"

    const normalizedQuoteAsset = convertQuoteAssetToNormalizedSpotAsset(selectedQuoteAsset, false);

    if (!normalizedQuoteAsset) return;

    const quoteAssetSpotPrice = spotAssetIndexMap[normalizedQuoteAsset];

    const quoteAssetValue = new BigNumber(quoteAssetAmount).multipliedBy(quoteAssetSpotPrice).toNumber();
    const quoteAssetValueAtComboMode = new BigNumber(quoteAssetAmountAtComboMode).multipliedBy(quoteAssetSpotPrice).toNumber();

    setQuoteAssetValue(quoteAssetValue);
    setQuoteAssetValueAtComboMode(quoteAssetValueAtComboMode);

    const estimatedSize = basedExecutionPrice === 0 ? 0 : quoteAssetValue / basedExecutionPrice;
    const estimatedSizeAtComboMode = basedExecutionPriceAtComboMode === 0 ? 0 : quoteAssetValueAtComboMode / basedExecutionPriceAtComboMode;

    const rpRate = handleCalculateRiskPremium(estimatedSize, isBuy, false);
    const rpRateAtComboMode = handleCalculateRiskPremium(estimatedSizeAtComboMode, isBuy, true);

    const riskPremium = isBuy
      ? markPrice * rpRate
      : markPrice * -rpRate

    const riskPremiumAtComboMode = isBuy
      ? markPriceAtComboMode * rpRateAtComboMode
      : markPriceAtComboMode * -rpRateAtComboMode

    const executionPrice = markPrice + riskPremium;
    const executionPriceAtComboMode = markPriceAtComboMode + riskPremiumAtComboMode;

    setRiskPremium(riskPremium)
    setRiskPremiumAtComboMode(riskPremiumAtComboMode)
    setExecutionPrice(executionPrice)
    setExecutionPriceAtComboMode(executionPriceAtComboMode)

    const underlyingAssetSpotPrice = spotAssetIndexMap[selectedUnderlyingAsset];

    const tradeFeeRate = isBuy ? FEE_RATES.OPEN_BUY_NAKED_POSITION : FEE_RATES.OPEN_SELL_NAKED_POSITION;
    const tradeFeeRateAtComboMode = FEE_RATES.OPEN_COMBO_POSITION;

    const tradeFeeUsd = new BigNumber(underlyingAssetSpotPrice).multipliedBy(estimatedSize).multipliedBy(tradeFeeRate).toNumber();
    const tradeFeeUsdAtComboMode = new BigNumber(underlyingAssetSpotPrice).multipliedBy(estimatedSizeAtComboMode).multipliedBy(tradeFeeRateAtComboMode).toNumber();

    const maxTradeFeeUsd = new BigNumber(quoteAssetValue).multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE).toNumber()
    const maxTradeFeeUsdAtComboMode = new BigNumber(quoteAssetValueAtComboMode).multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE).toNumber()

    const tradeFeeUsdAfterMax = tradeFeeUsd > maxTradeFeeUsd ? maxTradeFeeUsd : tradeFeeUsd;
    const tradeFeeUsdAtComboModeAfterMax = tradeFeeUsdAtComboMode > maxTradeFeeUsdAtComboMode ? maxTradeFeeUsdAtComboMode : tradeFeeUsdAtComboMode;

    setTradeFeeUsd(tradeFeeUsdAfterMax);
    setTradeFeeUsdAtComboMode(tradeFeeUsdAtComboModeAfterMax);

    const feeAmount = new BigNumber(tradeFeeUsdAfterMax).dividedBy(quoteAssetSpotPrice).toNumber()
    const feeAmountAtComboMode = new BigNumber(tradeFeeUsdAtComboModeAfterMax).dividedBy(quoteAssetSpotPrice).toNumber()

    const payoutAmountAfterFee = new BigNumber(quoteAssetAmount).minus(feeAmount).toNumber()
    const payoutAmountAfterFeeAtComboModeA = new BigNumber(quoteAssetAmountAtComboMode).minus(feeAmountAtComboMode).toNumber()

    const size = executionPrice === 0 ? "0" : new BigNumber(payoutAmountAfterFee).multipliedBy(quoteAssetSpotPrice).dividedBy(executionPrice).toString();
    const sizeAtComboMode = executionPriceAtComboMode === 0 ? "0" : new BigNumber(payoutAmountAfterFeeAtComboModeA).multipliedBy(quoteAssetSpotPrice).dividedBy(executionPriceAtComboMode).toString();

    setSize(size);
    setSizeAtComboMode(sizeAtComboMode)
  }, [quoteAssetAmount, quoteAssetAmountAtComboMode, basedExecutionPrice, basedExecutionPriceAtComboMode])

  useEffect(() => {
    setIsChartSet(false);
  }, [selectedOption, pairedOption, selectedOrderSide])

  const renderButton = () => {
    if (isLoading || isWaitingForTrade) return (
      <div className="h-[48px]">
        <Button
          name="..."
          color="default"
          disabled
          onClick={() => {}}
        />
      </div>
    )

    if (!connector || !isConnected) return (
      <div className="h-[48px]">
        <Button
          name="Connect Wallet"
          color="blue"
          onClick={() => {
            setIsLoading(true);
            if (openConnectModal) openConnectModal();
            setIsLoading(false);
          }}
        />
      </div>
    )

    // Check approval
    if (selectedOrderSide === "Buy") {
      if (!isQuoteAssetApproved) {
        return (
          <div className="h-[48px]">
            <Button
              name={`Approve ${selectedQuoteAsset}`}
              color="default"
              onClick={() => handleApproveForQuoteAsset(selectedQuoteAsset)}
            />
          </div>
        )
      }
    } else {
      if (isComboMode && !isCollateralAssetApprovedAtComboMode) {
        return (
          <div className="h-[48px]">
            <Button
              name={`Approve ${collateralAssetAtComboMode}`}
              color="default"
              onClick={() => handleApproveForQuoteAsset(collateralAssetAtComboMode)}
            />
          </div>
        )
      } else if (!isComboMode && !isCollateralAssetApproved) {
        return (
          <div className="h-[48px]">
            <Button
              name={`Approve ${collateralAsset}`}
              color="default"
              onClick={() => handleApproveForQuoteAsset(collateralAsset)}
            />
          </div>
        )
      }
    }

    // Check entered amount
    if (
      isComboMode && sizeAtComboMode === "0" ||
      !isComboMode && size === "0"
    ) {
      return (
        <div className="h-[48px]">
          <Button
            name="Enter Amount to Buy"
            color="default"
            disabled={true}
            onClick={() => {}}
          />
        </div>
      )
    }

    // Check disable and error
    const isButtonDisabled = !address || BigNumber(size).lte(0) || BigNumber(sizeAtComboMode).lte(0) ||
      selectedOrderSide === "Buy"
        ? isComboMode
          ? quoteAssetAmount === "0"
          : quoteAssetAmountAtComboMode === "0"
        : isComboMode
          ? collateralAssetAmountAtComboMode === "0"
          : collateralAssetAmount === "0"

    if (isButtonDisabled) {
      return (
        <div className="h-[48px]">
          <Button
            name="Trade Unavailable for Given Size"
            color="default"
            disabled={isButtonDisabled}
            onClick={() => {}}
          />
        </div>
      )
    }

    const isAvailableExceeded = isComboMode
      ? Number(sizeAtComboMode) > Number(availableSizeAtComboMode)
      : Number(size) > Number(availableSize);  
    
    const isMaxOpenSizeExceeded = isComboMode
      ? Number(sizeAtComboMode) > UA_TICKER_TO_MAX_OPEN_SIZE_FOR_SPREAD[chain][selectedUnderlyingAsset as UnderlyingAsset]
      : Number(size) > UA_TICKER_TO_MAX_OPEN_SIZE_FOR_VANILLA[chain][selectedUnderlyingAsset as UnderlyingAsset]
    
    const isInsufficientBalance = selectedOrderSide === "Buy"
      ? isComboMode
        ? BigNumber(quoteAssetAmountAtComboMode).gt(quoteAssetBalance)
        : BigNumber(quoteAssetAmount).gt(quoteAssetBalance)
      : isComboMode
        ? BigNumber(collateralAssetAmountAtComboMode).gt(collateralAssetBalanceAtComboMode)
        : BigNumber(collateralAssetAmount).gt(collateralAssetBalance)

    const isButtonError = isAvailableExceeded || isMaxOpenSizeExceeded || isInsufficientBalance
    const targetAsset = selectedOrderSide === "Buy"
      ? selectedQuoteAsset
      : isComboMode
        ? collateralAssetAtComboMode
        : collateralAsset

    const buttonNameForError = isAvailableExceeded
      ? "Exceeded Available Size"
      : isMaxOpenSizeExceeded
        ? "Exceeded Max Open Size"
        : `Insufficient ${targetAsset}`

    if (isButtonError) {
      return (
        <div className="h-[48px]">
          <Button
            name={buttonNameForError}
            color="default"
            onClick={() => {}}
            isError={isButtonError}
          />
        </div>
      )
    }

    let buttonName = `${selectedOrderSide} ${selectedOptionDirection} ${isComboMode ? "Spread" :""}`

    return (
      <div className="h-[48px]">
        <Button
          name={buttonName}
          color={selectedOrderSide === "Buy" ? "green" : "red"}
          onClick={handleCreateOpenPosition}
        />
      </div>
    )
  }

  if (selectedOption.optionId === "") {
    return (
      <div className="flex flex-col items-center w-full h-[1204px] px-[40px] pt-[108px]">
        <p className="text-[20px] text-greenc1 text-center font-bold">Select an option to trade</p>
        <p className="text-[15px] font-[600] text-whitee0 text-center leading-4 mt-[12px]">Buy/Sell option by choosing call/put, strike price, and expiry</p>
        <img className="w-[64px] h-[64px] min-w-[64px] min-h-[64px] mt-[24px]" src={IconArrowOptionNotSelected} />
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-fit pb-[28px]">
      <div className="h-fit px-[28px] pt-[32px] pb-[28px]">
        <SelectedOptionTitle
          isComboMode={isComboMode}
          selectedOptionDirection={selectedOptionDirection}
          selectedOption={selectedOption}
          selectedOrderSide={selectedOrderSide}
          selectableOptionPairs={selectableOptionPairs}
          pairedOption={pairedOption}
          setPairedOption={setPairedOption}
          handleInitializeInputValues={handleInitializeInputValues}
        />

        <SelectedOptionModeSelector
          isComboModePossible={isComboModePossible}
          isComboMode={isComboMode}
          setIsComboMode={setIsComboMode}
          selectedUnderlyingAsset={selectedUnderlyingAsset}
          underlyingFutures={underlyingFutures}
          selectedOptionDirection={selectedOptionDirection}
          selectedOption={selectedOption}
          selectedOrderSide={selectedOrderSide}
          pairedOption={pairedOption}
        />

        {/* Option Size Input */}
        <div className="mt-[24px] h-[107px]">
          <div className={twJoin(
            "flex flex-col",
            "w-full h-full px-[18px] py-[16px]",
            "rounded-[6px] bg-black17"
          )}>
            <div className="flex flex-row justify-between items-center h-[26px]">
              <p className="text-[14px] text-gray80 font-semibold">
                <span>Option Size</span>
              </p>  
              <div className="flex flex-row justify-end">
                <div className="flex flex-row justify-center items-center">
                  <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
                    <p className="text-whitee0 text-[12px] hover:text-greenc1 ">{`Available : ${advancedFormatNumber(isComboMode ? availableSizeAtComboMode : availableSize, 4, "")}`}</p>
                    <div className={twJoin(
                      "w-max h-[40px] z-20",
                      "absolute hidden px-[11px] py-[6px] bottom-[24px] -right-[16px]",
                      "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                      "group-hover:block"
                    )}>
                      <p className="text-[12px] text-gray80 leading-[0.85rem]">
                        Max Amount OLPs allowed for traders <br/>
                        to open positions depending on free liquidity.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-row justify-center items-center mt-[20px]">
              <input
                value={isComboMode ? sizeAtComboMode : size}
                placeholder="0"
                className={twJoin(
                  "w-full",
                  "text-[20px] text-greenc1 font-bold bg-transparent",
                  "focus:outline-none",
                  "placeholder:text-[20px] placeholder-gray80 placeholder:font-bold")}
                onChange={(e) => {
                  if (e.target.value.includes(" ")) return;
                  if (isNaN(Number(e.target.value))) return;
                  if (e.target.value === "") {
                    setSize("0");
                    setSizeAtComboMode("0");
                    return;
                  }

                  setSize(e.target.value.replace(/^0+(?=\d)/, ''));
                  setSizeAtComboMode(e.target.value.replace(/^0+(?=\d)/, ''));
                }}
                onFocus={() => handleInputFocus('size')}
                onBlur={handleInputBlur}
              />
              <div>
                <p className="ml-[16px] text-[16px] text-[#525252] font-semibold">Contracts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Option Payamount Input */}
        <div className="mt-[16px] h-[107px]">  
          <div
            className={twJoin(
              "flex flex-col",
              "w-full h-full",
              "rounded-[6px]",
              "px-[18px] py-[16px]",
              `${selectedOrderSide === "Buy" ? "bg-black17" : "border-[1px] border-solid border-opacity-40 border-gray52 bg-opacity-50"}`,
            )}
          >
            {
              selectedOrderSide === "Buy" ?
              <>
                <div className="flex flex-row justify-between items-center h-[26px]">
                  <p className="text-[14px] text-gray80 font-semibold">
                    <span>Pay</span>
                  </p>
                  <div className="flex flex-row justify-end">
                    <div className="flex flex-row justify-center items-center">
                      <img className="w-[14px] h-[14px]" src={IconWalletGray}/>
                      <p className="text-[12px] text-whitee0 font-semibold ml-[6px]">
                        {advancedFormatNumber(Number(quoteAssetBalance), 4, "")}
                      </p>
                    </div>
                    <div
                      className={twJoin(
                        "cursor-pointer",
                        "flex flex-row justify-center items-center",
                        "w-[55px] h-[22px] ml-[10px] rounded-[11px] bg-black2e",
                        "text-[12px] text-greenc1 font-semibold"
                      )}
                      onClick={() => {
                        const newValue = handleMaxValue();
                        if (isNaN(Number(newValue))) return;

                        setQuoteAssetAmount(newValue);
                        setQuoteAssetAmountAtComboMode(newValue);
                        handleInputFocus('pay');
                      }}
                    >
                      MAX
                    </div>
                  </div>
                </div>
                <div className="flex flex-row justify-center items-center mt-[20px]">
                  <img className="w-[32px] h-[32px] min-w-[32px] min-h-[32px]" src={QA_TICKER_TO_IMG[chain][selectedQuoteAsset as keyof typeof QA_TICKER_TO_IMG[typeof chain]]} />
                  <input
                    value={isComboMode ? quoteAssetAmountAtComboMode : quoteAssetAmount}
                    placeholder="0"
                    className={twJoin(
                      "w-full ml-[16px]",
                      "text-[20px] text-greenc1 font-bold bg-transparent",
                      "focus:outline-none",
                      "placeholder:text-[20px] placeholder-gray80 placeholder:font-bold"
                    )}
                    onChange={(e) => {
                      if (e.target.value.includes(" ")) return;
                      if (isNaN(Number(e.target.value))) return;
                      if (e.target.value === "") {
                        setQuoteAssetAmount("0");
                        setQuoteAssetAmountAtComboMode("0");
                        return;
                      }

                      setQuoteAssetAmount(e.target.value.replace(/^0+(?=\d)/, ''));
                      setQuoteAssetAmountAtComboMode(e.target.value.replace(/^0+(?=\d)/, ''));
                    }}
                    onFocus={() => handleInputFocus('pay')}
                    onBlur={handleInputBlur}
                  />
                  <QuoteAssetDropDown
                    selectedQuoteAsset={selectedQuoteAsset}
                    setSelectedQuoteAsset={setSelectedQuoteAsset}
                    scale="medium"
                  />
                </div>
              </>
              :
              <>

                <div className="flex flex-col gap-[6px]">
                  <div className="flex flex-row items-center justify-between font-semibold h-[18px]">
                    <div className="flex flex-row items-center gap-[6px]">
                      <img className="w-[14px] h-[14px] min-w-[14px] min-h-[14px]" src={IconMinus} />
                      <div className="text-[13px] text-gray98">Collateral</div>
                    </div>
                    <div className="flex flex-row items-center">
                      <p className="text-[16px] text-whitee0">{advancedFormatNumber(Number(isComboMode ? collateralAssetAmountAtComboMode : collateralAssetAmount), 4, "")}</p>
                      {
                        isComboMode
                          ? <img src={QA_TICKER_TO_IMG[chain][collateralAssetAtComboMode as keyof typeof QA_TICKER_TO_IMG[typeof chain]]} className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] ml-[8px]"/>
                          : <img src={QA_TICKER_TO_IMG[chain][collateralAsset as keyof typeof QA_TICKER_TO_IMG[typeof chain]]} className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] ml-[8px]"/>
                      }
                    </div>
                  </div>
                  <div className="flex flex-row justify-end items-center text-[12px] text-gray80 font-semibold h-[14px]">
                    <img className="w-[14px] h-[14px]" src={IconWalletGray}/>
                    <p className="pl-[4px]">Balance </p>
                    <p className="ml-[6px]">{advancedFormatNumber(Number(isComboMode ? collateralAssetBalanceAtComboMode : collateralAssetBalance), 4, "")}</p>
                  </div>
                </div>
                
                <div className="flex flex-row items-center justify-between font-semibold h-[20px] mt-[16px]">
                  <div className="flex flex-row items-center gap-[6px]">
                    <img className="w-[14px] h-[14px] min-w-[14px] min-h-[14px]" src={IconPlus}/>
                    <div className="text-[13px] text-gray98">Options Premium</div>
                  </div>
                  <div className="flex flex-row items-center">
                    {
                      isComboMode
                        ? <p className="text-[16px] text-whitee0">{advancedFormatNumber(quoteAssetValueAtComboMode, 4, "")}</p>  
                        : <p className="text-[16px] text-whitee0">{advancedFormatNumber(quoteAssetValue, 4, "")}</p>
                    }
                    <img className="w-[20px] h-[20px] min-w-[20px] min-h-[20px] ml-[8px]" src={IconSymbolUSDC}/>
                  </div>
                </div>
                
              </>
            }
          </div>
        </div>

        <SelectedOptionDetail
          isComboMode={isComboMode}
          selectedOrderSide={selectedOrderSide}
          markPrice={markPrice}
          markPriceAtComboMode={markPriceAtComboMode}
          riskPremium={riskPremium}
          riskPremiumAtComboMode={riskPremiumAtComboMode}
          tradeFeeUsd={tradeFeeUsd}
          tradeFeeUsdAtComboMode={tradeFeeUsdAtComboMode}
          size={size}
          sizeAtComboMode={sizeAtComboMode}
          slippage={slippage}
          setSlippage={setSlippage}
        />

        {/* Option Buy/Sell Button */}
        <div className={twJoin(
          "w-full h-fit min-h-[48px] mt-[28px]",
        )}>
          {renderButton()}
        </div>
      </div>
      <div className="w-full h-[2px] bg-black29" />
      <SelectedOptionChart
        isComboMode={isComboMode}
        underlyingFutures={underlyingFutures}
        selectedUnderlyingAsset={selectedUnderlyingAsset}
        selectedOptionDirection={selectedOptionDirection}
        selectedExpiry={selectedExpiry}
        selectedOption={selectedOption}
        selectedOrderSide={selectedOrderSide}
        pairedOption={pairedOption}
        executionPrice={executionPrice}
        executionPriceAtComboMode={executionPriceAtComboMode}
        size={size}
        sizeAtComboMode={sizeAtComboMode}
        isChartSet={isChartSet}
        setIsChartSet={setIsChartSet}
      />
    </div>
  );
};

export default SelectedOption;
