import BigNumber from "bignumber.js";
import Button from "../../Common/Button";
import {
  advancedFormatNumber,
  getPairedOptionStrikePriceByTermV2,
} from "@/utils/helper";
import { OptionDirection, OrderSide } from "@/utils/types";
import { twJoin } from "tailwind-merge";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAccount } from "wagmi";
import { MaxUint256, ZeroAddress } from "ethers";
import { sendCreateOpenPosition, writeApproveERC20 } from "@/utils/contract";
import {
  loadAllowanceForController,
  loadBalance,
} from "@/store/slices/UserSlice";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { TradeOptionType } from "./constant";
import { initialOptionDetail } from "@/constants/constants.slices";
import {
  setPairedOption,
  setSize,
  setSizeAtComboMode,
  setRiskPremium,
  setRiskPremiumAtComboMode,
  setExecutionPrice,
  setExecutionPriceAtComboMode,
  setQuoteAssetAmount,
  setQuoteAssetAmountAtComboMode,
  setQuoteAssetValue,
  setQuoteAssetValueAtComboMode,
  setCollateralAssetAmount,
  setCollateralAssetAmountAtComboMode,
  setTradeFeeUsd,
  setTradeFeeUsdAtComboMode,
  resetInput,
  setIsScrollToSlippage,
} from "@/store/slices/SelectedOption";
import SelectedOptionModeSelector from "./SelectedOptionComboMode";
import IconArrowOptionNotSelected from "@assets/icon-arrow-option-not-selected.svg";
import IconSymbolUSDC from "@assets/icon-symbol-usdc.svg";
import IconWalletWhite from "@assets/mobile/icon-wallet-white.svg";
import IconArrowDownE6 from "@assets/mobile/icon-arrow-down-e6.svg";
import IconOptionSizeAddition from "@assets/mobile/icon-option-size-addition.svg";
import IconOptionSizeSubtraction from "@assets/mobile/icon-option-size-subtraction.svg";
import IconArrowDownPay from "@assets/mobile/icon-arrow-down-pay.svg";
import IconCollateral from "@assets/mobile/icon-collateral.svg";
import IconOptionsPremium from "@assets/mobile/icon-options-premium.svg";
import IconSlippage from "@assets/mobile/icon-slippage.svg";
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
});

interface SelectedOptionHighLevelProps {
  underlyingFutures: number;
  selectedUnderlyingAsset: UnderlyingAsset;
  selectedOptionDirection: OptionDirection;
  selectedExpiry: number;
  selectedOption: IOptionDetail;
  selectedOrderSide: OrderSide;
  setShowPairedOptionPopup: (value: any) => void;
  setShowQuoteAssetPopup: (value: any) => void;
  setShowSlippageTolerancePopup: (value: any) => void;
}

type FocusedInput = "size" | "pay" | null;

const SelectedOptionHighLevel: React.FC<SelectedOptionHighLevelProps> = ({
  underlyingFutures,
  selectedUnderlyingAsset,
  selectedOptionDirection,
  selectedExpiry,
  selectedOption,
  selectedOrderSide,
  setShowPairedOptionPopup,
  setShowQuoteAssetPopup,
  setShowSlippageTolerancePopup,
}) => {
  const { address, connector, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const dispatch = useAppDispatch();

  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;
  const olpStats = useAppSelector((state: any) => state.market.olpStats);
  const volatilityScore = useAppSelector((state: any) => state.market.volatilityScore) as VolatilityScore;

  const [currentOptionId, setCurrentOptionId] = useState<string>("");
  const [currentTradeType, setCurrentTradeType] = useState<OrderSide>("Buy");
  const pairedOption = useAppSelector(
    (state: any) => state.selectedOption.pairedOption || initialOptionDetail
  );
  const selectedQuoteAsset = useAppSelector(
    (state: any) => state.selectedOption.selectedQuoteAsset
  );
  const isComboMode = useAppSelector(
    (state: any) => state.selectedOption.isComboMode
  );
  const selectableOptionPairs = useAppSelector(
    (state: any) => state.selectedOption.selectableOptionPairs
  );
  const size = useAppSelector((state: any) => state.selectedOption.size);
  const sizeAtComboMode = useAppSelector(
    (state: any) => state.selectedOption.sizeAtComboMode
  );
  const riskPremium = useAppSelector(
    (state: any) => state.selectedOption.riskPremium
  );
  const riskPremiumAtComboMode = useAppSelector(
    (state: any) => state.selectedOption.riskPremiumAtComboMode
  );
  const executionPrice = useAppSelector(
    (state: any) => state.selectedOption.executionPrice
  );
  const executionPriceAtComboMode = useAppSelector(
    (state: any) => state.selectedOption.executionPriceAtComboMode
  );
  const quoteAssetAmount = useAppSelector(
    (state: any) => state.selectedOption.quoteAssetAmount
  );
  const quoteAssetAmountAtComboMode = useAppSelector(
    (state: any) => state.selectedOption.quoteAssetAmountAtComboMode
  );
  const quoteAssetValue = useAppSelector(
    (state: any) => state.selectedOption.quoteAssetValue
  );
  const quoteAssetValueAtComboMode = useAppSelector(
    (state: any) => state.selectedOption.quoteAssetValueAtComboMode
  );
  const collateralAssetAmount = useAppSelector(
    (state: any) => state.selectedOption.collateralAssetAmount
  );
  const collateralAssetAmountAtComboMode = useAppSelector(
    (state: any) => state.selectedOption.collateralAssetAmountAtComboMode
  );
  const tradeFeeUsd = useAppSelector(
    (state: any) => state.selectedOption.tradeFeeUsd
  );
  const tradeFeeUsdAtComboMode = useAppSelector(
    (state: any) => state.selectedOption.tradeFeeUsdAtComboMode
  );

  const [markPrice, setMarkPrice] = useState<number>(0);
  const [markPriceAtComboMode, setMarkPriceAtComboMode] = useState<number>(0);
  const [basedExecutionPrice, setBasedExecutionPrice] = useState<number>(0);
  const [basedExecutionPriceAtComboMode, setBasedExecutionPriceAtComboMode] =
    useState<number>(0);
  const [availableSize, setAvailableSize] = useState<number>(0);
  const [availableSizeAtComboMode, setAvailableSizeAtComboMode] =
    useState<number>(0);
  const [collateralAsset, setCollateralAsset] = useState<NetworkQuoteAsset<SupportedChains>>(
    selectedOptionDirection === "Call"
      ? UA_TICKER_TO_QA_TICKER[chain][selectedUnderlyingAsset as UnderlyingAsset]
      : BaseQuoteAsset.USDC
  );
  const [collateralAssetAtComboMode, setCollateralAssetComboMode] =
    useState<NetworkQuoteAsset<SupportedChains>>(BaseQuoteAsset.USDC);
  const [focusedInput, setFocusedInput] = useState<FocusedInput>(null);
  const slippage = useAppSelector(
    (state: any) => state.selectedOption.slippage
  );
  const isScrollToSlippage = useAppSelector(
    (state: any) => state.selectedOption.isScrollToSlippage
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWaitingForTrade, setIsWaitingForTrade] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const slippageRef = useRef<HTMLDivElement>(null);

  const isBuy = selectedOrderSide === "Buy";
  const executionPriceOptionDetail = isBuy
    ? markPrice + riskPremium
    : markPrice - riskPremium;
  const executionPriceAtComboModeOptionDetail = isBuy
    ? markPriceAtComboMode + riskPremiumAtComboMode
    : markPriceAtComboMode - riskPremiumAtComboMode;

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

  const handleCalculateRiskPremium = (
    size: number,
    isBuy: boolean,
    isComboMode: boolean
  ) => {
    const isCall = selectedOptionDirection === "Call";

    const olpKey = getOlpKeyByExpiry(chain, selectedExpiry);
    const olpGreeks = olpStats[olpKey].greeks[selectedUnderlyingAsset];

    const olpUtilityRatio = {
      sOlp: {
        utilizedUsd: olpStats.sOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.sOlp.utilityRatio.depositedUsd,
      },
      mOlp: {
        utilizedUsd: olpStats.mOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.mOlp.utilityRatio.depositedUsd,
      },
      lOlp: {
        utilizedUsd: olpStats.lOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.lOlp.utilityRatio.depositedUsd,
      },
    };

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
  };

  const handleApproveForQuoteAsset = async (ticker: NetworkQuoteAsset<SupportedChains>) => {
    setIsLoading(true);

    const tokenAddress = QA_TICKER_TO_ADDRESS[chain][
      ticker as keyof typeof NetworkQuoteAsset[typeof chain]
    ] as `0x${string}`;
    const spender = CONTRACT_ADDRESSES[chain].CONTROLLER;

    const result = await writeApproveERC20(tokenAddress, spender, MaxUint256);

    if (result) {
      dispatch(
        loadAllowanceForController({ chain, address })
      );
    }

    setIsLoading(false);
  };

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
        ? selectedQuoteAsset
        : isComboMode
        ? collateralAssetAtComboMode
        : collateralAsset,
      selectedOrderSide === "Buy"
        ? isComboMode
          ? quoteAssetAmountAtComboMode
          : quoteAssetAmount
        : isComboMode
        ? collateralAssetAmountAtComboMode
        : collateralAssetAmount,
      ZeroAddress
    );

    if (result && address) {
      dispatch(
        loadBalance({ chain, address })
      );
      dispatch(resetInput());
    }

    setIsWaitingForTrade(false);
  };

  // Initialize default values related to selected option
  useEffect(() => {
    const markPrice = selectedOption.markPrice;

    const basedRiskPremium =
      selectedOrderSide === "Buy"
        ? markPrice * selectedOption.riskPremiumRateForBuy
        : markPrice * selectedOption.riskPremiumRateForSell;

    const basedExecutionPrice =
      selectedOrderSide === "Buy"
        ? markPrice + basedRiskPremium
        : markPrice - basedRiskPremium;

    setMarkPrice(markPrice);
    setBasedExecutionPrice(basedExecutionPrice);

    if (
      selectedOption.optionId !== currentOptionId ||
      selectedOrderSide !== currentTradeType
    ) {
      setCurrentOptionId(selectedOption.optionId);
      setCurrentTradeType(selectedOrderSide);
    }
  }, [selectedOption, selectedOrderSide]);

  // Validate combo mode and initialize paired option
  useEffect(() => {
    if (pairedOption.optionId !== "") return;

    const pairedOptionIndex = getPairedOptionStrikePriceByTermV2(
      selectedExpiry,
      selectedOption.strikePrice,
      selectableOptionPairs,
      selectedOptionDirection === "Call"
    );

    dispatch(setPairedOption(selectableOptionPairs[pairedOptionIndex]));
  }, [selectableOptionPairs]);

  // Initialize default values related to paired option
  useEffect(() => {
    if (pairedOption.optionId === "") {
      setMarkPriceAtComboMode(0);
      setBasedExecutionPriceAtComboMode(0);
    }

    const markPriceAtComboMode = Math.max(
      selectedOption.markPrice - pairedOption.markPrice,
      0
    );

    const basedRiskPremiumAtComboMode =
      selectedOrderSide === "Buy"
        ? markPriceAtComboMode *
          handleCalculateRiskPremium(Number(1), true, true)
        : markPriceAtComboMode *
          handleCalculateRiskPremium(Number(1), false, true);

    const basedExecutionPriceAtComboMode =
      selectedOrderSide === "Buy"
        ? markPriceAtComboMode + basedRiskPremiumAtComboMode
        : markPriceAtComboMode - basedRiskPremiumAtComboMode;

    setMarkPriceAtComboMode(markPriceAtComboMode);
    setBasedExecutionPriceAtComboMode(basedExecutionPriceAtComboMode);
  }, [pairedOption]);

  // Update collateral asset
  useEffect(() => {
    if (selectedOptionDirection === "Call") {
      setCollateralAsset(UA_TICKER_TO_QA_TICKER[chain][selectedUnderlyingAsset as UnderlyingAsset]);
    } else {
      setCollateralAsset(BaseQuoteAsset.USDC);
    }
  }, [selectedOptionDirection, selectedUnderlyingAsset]);

  // calculate availableSize and availableSizeAtComboMode
  useEffect(() => {
    const olpKey = getOlpKeyByExpiry(chain, selectedExpiry);
    const olpAssetAmounts = olpStats[olpKey].assetAmounts;

    let availableSize = 0;

    const savedUsdcAmountForClose = new BigNumber(olpAssetAmounts.usdc.depositedAmount).multipliedBy(0.03).toNumber();
    const parsedOlpUsdcAvailableAmounts = new BigNumber(olpAssetAmounts.usdc.availableAmount).minus(savedUsdcAmountForClose).toNumber();

    if (selectedOrderSide === "Buy" && selectedOptionDirection === "Call") {
      availableSize =
        selectedUnderlyingAsset === UnderlyingAsset.BTC
          ? olpAssetAmounts.wbtc.availableAmount
          : olpAssetAmounts.weth.availableAmount;
    } else {
      if (selectedOrderSide === "Buy" && selectedOptionDirection === "Put") {
        const strikePriceAmounts = new BigNumber(selectedOption.strikePrice)
          .dividedBy(spotAssetIndexMap.usdc)
          .toNumber();
        availableSize = new BigNumber(parsedOlpUsdcAvailableAmounts)
          .div(strikePriceAmounts)
          .toNumber();
      } else {
        const appliedExecutionPrice =
          executionPrice === 0 ? basedExecutionPrice : executionPrice;
        const appliedExecutionPriceAmounts = new BigNumber(
          appliedExecutionPrice
        )
          .dividedBy(spotAssetIndexMap.usdc)
          .toNumber();
        availableSize =
          appliedExecutionPriceAmounts === 0
            ? 0
            : new BigNumber(parsedOlpUsdcAvailableAmounts)
                .div(appliedExecutionPriceAmounts)
                .toNumber();
      }
    }

    setAvailableSize(Math.max(availableSize, 0));

    let availableSizeAtComboMode = 0;
    const parsedOlpUsdcAvailableAmountsAtComboMode = new BigNumber(olpAssetAmounts.usdc.availableAmount).minus(savedUsdcAmountForClose).toNumber();

    if (selectedOrderSide === "Buy") {
      const diffStrikePrice = Math.abs(
        selectedOption.strikePrice - pairedOption.strikePrice
      );
      const diffStrikePriceAmounts = new BigNumber(diffStrikePrice)
        .dividedBy(spotAssetIndexMap.usdc)
        .toNumber();
      availableSizeAtComboMode = new BigNumber(
        parsedOlpUsdcAvailableAmountsAtComboMode
      )
        .div(diffStrikePriceAmounts)
        .toNumber();
    } else {
      const appliedExecutionPrice =
        executionPriceAtComboMode === 0
          ? basedExecutionPriceAtComboMode
          : basedExecutionPriceAtComboMode;
      const appliedExecutionPriceAmountsAtComboMode = new BigNumber(
        appliedExecutionPrice
      )
        .dividedBy(spotAssetIndexMap.usdc)
        .toNumber();
      availableSizeAtComboMode =
        appliedExecutionPriceAmountsAtComboMode === 0
          ? 0
          : new BigNumber(parsedOlpUsdcAvailableAmountsAtComboMode)
              .div(appliedExecutionPriceAmountsAtComboMode)
              .toNumber();
    }

    setAvailableSizeAtComboMode(Math.max(availableSizeAtComboMode, 0));
  }, [
    selectedOption,
    selectedOptionDirection,
    selectedOrderSide,
    olpStats,
    executionPrice,
    executionPriceAtComboMode,
    isComboMode,
  ]);

  // update value when focused input is pay
  useEffect(() => {
    if (focusedInput !== "pay" || selectedOrderSide === "Sell") return;

    if (quoteAssetAmount === "0" || quoteAssetAmountAtComboMode === "0") {
      dispatch(resetInput());
      return;
    }

    const isBuy = selectedOrderSide === "Buy";

    const normalizedQuoteAsset = convertQuoteAssetToNormalizedSpotAsset(selectedQuoteAsset, false);

    if (!normalizedQuoteAsset) return;

    const quoteAssetSpotPrice = spotAssetIndexMap[normalizedQuoteAsset];

    const quoteAssetValue = new BigNumber(quoteAssetAmount)
      .multipliedBy(quoteAssetSpotPrice)
      .toNumber();
    const quoteAssetValueAtComboMode = new BigNumber(
      quoteAssetAmountAtComboMode
    )
      .multipliedBy(quoteAssetSpotPrice)
      .toNumber();

    dispatch(setQuoteAssetValue(quoteAssetValue));
    dispatch(setQuoteAssetValueAtComboMode(quoteAssetValueAtComboMode));

    const estimatedSize =
      basedExecutionPrice === 0 ? 0 : quoteAssetValue / basedExecutionPrice;
    const estimatedSizeAtComboMode =
      basedExecutionPriceAtComboMode === 0
        ? 0
        : quoteAssetValueAtComboMode / basedExecutionPriceAtComboMode;

    const rpRate = handleCalculateRiskPremium(estimatedSize, isBuy, false);
    const rpRateAtComboMode = handleCalculateRiskPremium(
      estimatedSizeAtComboMode,
      isBuy,
      true
    );

    const riskPremium = isBuy ? markPrice * rpRate : markPrice * -rpRate;

    const riskPremiumAtComboMode = isBuy
      ? markPriceAtComboMode * rpRateAtComboMode
      : markPriceAtComboMode * -rpRateAtComboMode;

    const executionPrice = markPrice + riskPremium;
    const executionPriceAtComboMode =
      markPriceAtComboMode + riskPremiumAtComboMode;

    dispatch(setRiskPremium(riskPremium));
    dispatch(setRiskPremiumAtComboMode(riskPremiumAtComboMode));
    dispatch(setExecutionPrice(executionPrice));
    dispatch(setExecutionPriceAtComboMode(executionPriceAtComboMode));

    const underlyingAssetSpotPrice =
      spotAssetIndexMap[selectedUnderlyingAsset];

    const tradeFeeRate = isBuy
      ? FEE_RATES.OPEN_BUY_NAKED_POSITION
      : FEE_RATES.OPEN_SELL_NAKED_POSITION;
    const tradeFeeRateAtComboMode = FEE_RATES.OPEN_COMBO_POSITION;

    const tradeFeeUsd = new BigNumber(underlyingAssetSpotPrice)
      .multipliedBy(estimatedSize)
      .multipliedBy(tradeFeeRate)
      .toNumber();
    const tradeFeeUsdAtComboMode = new BigNumber(underlyingAssetSpotPrice)
      .multipliedBy(estimatedSizeAtComboMode)
      .multipliedBy(tradeFeeRateAtComboMode)
      .toNumber();

    const maxTradeFeeUsd = new BigNumber(quoteAssetValue)
      .multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE)
      .toNumber();
    const maxTradeFeeUsdAtComboMode = new BigNumber(quoteAssetValueAtComboMode)
      .multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE)
      .toNumber();

    const tradeFeeUsdAfterMax =
      tradeFeeUsd > maxTradeFeeUsd ? maxTradeFeeUsd : tradeFeeUsd;
    const tradeFeeUsdAtComboModeAfterMax =
      tradeFeeUsdAtComboMode > maxTradeFeeUsdAtComboMode
        ? maxTradeFeeUsdAtComboMode
        : tradeFeeUsdAtComboMode;

    dispatch(setTradeFeeUsd(tradeFeeUsdAfterMax));
    dispatch(setTradeFeeUsdAtComboMode(tradeFeeUsdAtComboModeAfterMax));

    const feeAmount = new BigNumber(tradeFeeUsdAfterMax)
      .dividedBy(quoteAssetSpotPrice)
      .toNumber();
    const feeAmountAtComboMode = new BigNumber(tradeFeeUsdAtComboModeAfterMax)
      .dividedBy(quoteAssetSpotPrice)
      .toNumber();

    const payoutAmountAfterFee = new BigNumber(quoteAssetAmount)
      .minus(feeAmount)
      .toNumber();
    const payoutAmountAfterFeeAtComboModeA = new BigNumber(
      quoteAssetAmountAtComboMode
    )
      .minus(feeAmountAtComboMode)
      .toNumber();

    const size =
      executionPrice === 0
        ? "0"
        : new BigNumber(payoutAmountAfterFee)
            .multipliedBy(quoteAssetSpotPrice)
            .dividedBy(executionPrice)
            .toString();
    const sizeAtComboMode =
      executionPriceAtComboMode === 0
        ? "0"
        : new BigNumber(payoutAmountAfterFeeAtComboModeA)
            .multipliedBy(quoteAssetSpotPrice)
            .dividedBy(executionPriceAtComboMode)
            .toString();

    dispatch(setSize(size));
    dispatch(setSizeAtComboMode(sizeAtComboMode));
  }, [
    quoteAssetAmount,
    quoteAssetAmountAtComboMode,
    basedExecutionPrice,
    basedExecutionPriceAtComboMode,
  ]);

  // update value when focused input is size
  useEffect(() => {
    if (focusedInput !== "size") return;

    if (size === "0" || sizeAtComboMode === "0") {
      dispatch(resetInput());
      return;
    }
    
    const isBuy = selectedOrderSide === "Buy";

    const rpRate = handleCalculateRiskPremium(Number(size), isBuy, false);
    const rpRateAtComboMode = handleCalculateRiskPremium(
      Number(sizeAtComboMode),
      isBuy,
      true
    );

    const riskPremium = markPrice * rpRate;
    const riskPremiumAtComboMode = markPriceAtComboMode * rpRateAtComboMode;

    const executionPrice = isBuy
      ? markPrice + riskPremium
      : markPrice - riskPremium;
    const executionPriceAtComboMode = isBuy
      ? markPriceAtComboMode + riskPremiumAtComboMode
      : markPriceAtComboMode - riskPremiumAtComboMode;

    const totalExecutionPrice = Number(size) * executionPrice;
    const totalExecutionPriceAtComboMode =
      Number(sizeAtComboMode) * executionPriceAtComboMode;
    dispatch(setRiskPremium(riskPremium));
    dispatch(setRiskPremiumAtComboMode(riskPremiumAtComboMode));
    dispatch(setExecutionPrice(executionPrice));
    dispatch(setExecutionPriceAtComboMode(executionPriceAtComboMode));

    const underlyingAssetSpotPrice =
      spotAssetIndexMap[selectedUnderlyingAsset];

    const tradeFeeRate = isBuy
      ? FEE_RATES.OPEN_BUY_NAKED_POSITION
      : FEE_RATES.OPEN_SELL_NAKED_POSITION;
    const tradeFeeRateAtComboMode = FEE_RATES.OPEN_COMBO_POSITION;

    const tradeFeeUsd = new BigNumber(underlyingAssetSpotPrice)
      .multipliedBy(size)
      .multipliedBy(tradeFeeRate)
      .toNumber();
    const tradeFeeUsdAtComboMode = new BigNumber(underlyingAssetSpotPrice)
      .multipliedBy(sizeAtComboMode)
      .multipliedBy(tradeFeeRateAtComboMode)
      .toNumber();

    const maxTradeFeeUsd = new BigNumber(totalExecutionPrice)
      .multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE)
      .toNumber();
    const maxTradeFeeUsdAtComboMode = new BigNumber(
      totalExecutionPriceAtComboMode
    )
      .multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE)
      .toNumber();

    const tradeFeeUsdAfterMax =
      tradeFeeUsd > maxTradeFeeUsd ? maxTradeFeeUsd : tradeFeeUsd;
    const tradeFeeUsdAtComboModeAfterMax =
      tradeFeeUsdAtComboMode > maxTradeFeeUsdAtComboMode
        ? maxTradeFeeUsdAtComboMode
        : tradeFeeUsdAtComboMode;
    dispatch(setTradeFeeUsd(tradeFeeUsdAfterMax));
    dispatch(setTradeFeeUsdAtComboMode(tradeFeeUsdAtComboModeAfterMax));

    const quoteAssetValue = isBuy
      ? new BigNumber(size)
          .multipliedBy(executionPrice)
          .plus(tradeFeeUsdAfterMax)
          .toNumber()
      : new BigNumber(size).multipliedBy(executionPrice).toNumber();
    const quoteAssetValueAtComboMode = isBuy
      ? new BigNumber(sizeAtComboMode)
          .multipliedBy(executionPriceAtComboMode)
          .plus(tradeFeeUsdAtComboModeAfterMax)
          .toNumber()
      : new BigNumber(sizeAtComboMode)
          .multipliedBy(executionPriceAtComboMode)
          .toNumber();

    const normalizedQuoteAsset = convertQuoteAssetToNormalizedSpotAsset(selectedQuoteAsset, false);

    if (!normalizedQuoteAsset) return;

    const quoteAssetSpotPrice = spotAssetIndexMap[normalizedQuoteAsset];

    const quoteAssetAmount = new BigNumber(quoteAssetValue)
      .dividedBy(quoteAssetSpotPrice)
      .toString();
    const quoteAssetAmountAtComboMode = new BigNumber(
      quoteAssetValueAtComboMode
    )
      .dividedBy(quoteAssetSpotPrice)
      .toString();
    dispatch(setQuoteAssetValue(quoteAssetValue));
    dispatch(setQuoteAssetValueAtComboMode(quoteAssetValueAtComboMode));
    dispatch(setQuoteAssetAmount(quoteAssetAmount));
    dispatch(setQuoteAssetAmountAtComboMode(quoteAssetAmountAtComboMode));

    if (!isBuy) {
      let collateralAssetAmount =
        selectedOptionDirection === "Call"
          ? size
          : new BigNumber(size)
              .multipliedBy(selectedOption.strikePrice)
              .div(spotAssetIndexMap.usdc)
              .toFixed(QA_TICKER_TO_DECIMAL[chain][BaseQuoteAsset.USDC]);
      let collateralAssetAmountAtComboMode = new BigNumber(sizeAtComboMode)
        .multipliedBy(
          Math.abs(selectedOption.strikePrice - pairedOption.strikePrice)
        )
        .div(spotAssetIndexMap.usdc)
        .toFixed(QA_TICKER_TO_DECIMAL[chain][BaseQuoteAsset.USDC]);

      const collateralAssetValue =
        selectedOptionDirection === "Call"
          ? new BigNumber(collateralAssetAmount)
              .multipliedBy(spotAssetIndexMap[selectedUnderlyingAsset])
              .plus(tradeFeeUsdAfterMax)
              .toNumber()
          : new BigNumber(collateralAssetAmount)
              .multipliedBy(spotAssetIndexMap.usdc)
              .plus(tradeFeeUsdAfterMax)
              .toNumber();

      const collateralAssetValueAtComboMode = new BigNumber(
        collateralAssetAmountAtComboMode
      )
        .multipliedBy(spotAssetIndexMap.usdc)
        .plus(tradeFeeUsdAfterMax)
        .toNumber();

      const normalizedCollateralAsset = convertQuoteAssetToNormalizedSpotAsset(collateralAsset, false);
      const normalizedCollateralAssetAtComboMode = convertQuoteAssetToNormalizedSpotAsset(collateralAssetAtComboMode, false);

      if (!normalizedCollateralAsset || !normalizedCollateralAssetAtComboMode) return;

      const collateralAssetSpotPrice =
        spotAssetIndexMap[normalizedCollateralAsset];
      const collateralAssetSpotPriceAtComboMode =
        spotAssetIndexMap[normalizedCollateralAssetAtComboMode];

      collateralAssetAmount = new BigNumber(collateralAssetValue)
        .dividedBy(collateralAssetSpotPrice)
        .toString();
      collateralAssetAmountAtComboMode = new BigNumber(
        collateralAssetValueAtComboMode
      )
        .dividedBy(collateralAssetSpotPriceAtComboMode)
        .toString();

      dispatch(setCollateralAssetAmount(collateralAssetAmount));
      dispatch(
        setCollateralAssetAmountAtComboMode(collateralAssetAmountAtComboMode)
      );
    }
  }, [size, sizeAtComboMode]);

  useEffect(() => {
    if (containerRef.current && slippageRef.current && isScrollToSlippage) {
      const container = containerRef.current;
      const slippageOffsetTop = slippageRef.current.offsetTop;
      const top =
        slippageOffsetTop > 150 ? slippageOffsetTop - 150 : slippageOffsetTop;
      container.scrollTo({
        top: top,
        behavior: "smooth",
      });
    }
    dispatch(setIsScrollToSlippage(false));
  }, []);

  const renderButton = () => {
    if (isLoading || isWaitingForTrade)
      return (
        <div
          className={twJoin(
            "flex items-center justify-center w-full h-[48px] rounded opacity-40 flex-shrink-0",
            "bg-[linear-gradient(180deg,rgba(216,254,229,0.08)_0%,rgba(192,228,205,0.08)_100%)]",
            "font-bold text-[14px] leading-[21px] text-whitef0 md:text-[16px] md:leading-[22px]"
          )}
        >
          ...
        </div>
      );

    if (!connector || !isConnected)
      return (
        <div
          className={twJoin(
            "flex items-center justify-center w-full h-[48px] rounded flex-shrink-0",
            "bg-[#E6FC8D] text-black0a",
            "font-bold text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
          )}
          onClick={() => {
            setIsLoading(true);
            if (openConnectModal) openConnectModal();
            setIsLoading(false);
          }}
        >
          Connect Wallet
        </div>
      );

    // Check approval
    if (selectedOrderSide === "Buy") {
      if (!isQuoteAssetApproved) {
        return (
          <div
            className={twJoin(
              "flex items-center justify-center w-full h-[48px] rounded",
              "bg-green63 text-black0a flex-shrink-0",
              "font-bold text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
            )}
            onClick={() => handleApproveForQuoteAsset(selectedQuoteAsset)}
          >
            {`Approve ${selectedQuoteAsset}`}
          </div>
        );
      }
    } else {
      if (isComboMode && !isCollateralAssetApprovedAtComboMode) {
        return (
          <div
            className={twJoin(
              "flex items-center justify-center w-full h-[48px] rounded",
              "bg-[#E03F3F] text-black0a flex-shrink-0",
              "font-bold text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
            )}
            onClick={() =>
              handleApproveForQuoteAsset(collateralAssetAtComboMode)
            }
          >
            {`Approve ${collateralAssetAtComboMode}`}
          </div>
        );
      } else if (!isComboMode && !isCollateralAssetApproved) {
        return (
          <div
            className={twJoin(
              "flex items-center justify-center w-full h-[48px] rounded",
              "bg-[#E03F3F] text-black0a flex-shrink-0",
              "font-bold text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
            )}
            onClick={() => handleApproveForQuoteAsset(collateralAsset)}
          >
            {`Approve ${collateralAsset}`}
          </div>
        );
      }
    }

    // Check entered amount
    if (
      (isComboMode && sizeAtComboMode === "0") ||
      (!isComboMode && size === "0")
    ) {
      return (
        <div
          className={twJoin(
            "flex items-center justify-center w-full h-[48px] rounded opacity-40 flex-shrink-0",
            "bg-[linear-gradient(180deg,rgba(216,254,229,0.08)_0%,rgba(192,228,205,0.08)_100%)]",
            "font-bold text-[14px] leading-[21px] text-whitef0 md:text-[16px] md:leading-[22px]"
          )}
        >
          Enter Amount to Buy
        </div>
      );
    }

    // Check disable and error
    const isButtonDisabled =
      !address ||
      BigNumber(size).lte(0) ||
      BigNumber(sizeAtComboMode).lte(0) ||
      selectedOrderSide === "Buy"
        ? isComboMode
          ? quoteAssetAmount === "0"
          : quoteAssetAmountAtComboMode === "0"
        : isComboMode
        ? collateralAssetAmountAtComboMode === "0"
        : collateralAssetAmount === "0";

    if (isButtonDisabled) {
      return (
        <div
          className={twJoin(
            "flex items-center justify-center w-full h-[48px] rounded opacity-40",
            "bg-[linear-gradient(180deg,rgba(216,254,229,0.08)_0%,rgba(192,228,205,0.08)_100%)]",
            "font-bold text-[14px] leading-[21px] text-whitef0 md:text-[16px] md:leading-[22px]"
          )}
        >
          Trade Unavailable for Given Size
        </div>
      );
    }

    const isAvailableExceeded = isComboMode
      ? Number(sizeAtComboMode) > Number(availableSizeAtComboMode)
      : Number(size) > Number(availableSize);

    const isMaxOpenSizeExceeded = isComboMode
      ? Number(sizeAtComboMode) >
        UA_TICKER_TO_MAX_OPEN_SIZE_FOR_SPREAD[chain][selectedUnderlyingAsset]
      : Number(size) >
        UA_TICKER_TO_MAX_OPEN_SIZE_FOR_VANILLA[chain][selectedUnderlyingAsset];

    const isInsufficientBalance =
      selectedOrderSide === "Buy"
        ? isComboMode
          ? BigNumber(quoteAssetAmountAtComboMode).gt(quoteAssetBalance)
          : BigNumber(quoteAssetAmount).gt(quoteAssetBalance)
        : isComboMode
        ? BigNumber(collateralAssetAmountAtComboMode).gt(
            collateralAssetBalanceAtComboMode
          )
        : BigNumber(collateralAssetAmount).gt(collateralAssetBalance);

    const isButtonError =
      isAvailableExceeded || isMaxOpenSizeExceeded || isInsufficientBalance;
    const targetAsset =
      selectedOrderSide === "Buy"
        ? selectedQuoteAsset
        : isComboMode
        ? collateralAssetAtComboMode
        : collateralAsset;

    const buttonNameForError = isAvailableExceeded
      ? "Exceeded Available Size"
      : isMaxOpenSizeExceeded
      ? "Exceeded Max Open Size"
      : `Insufficient ${targetAsset}`;

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
      );
    }

    const buttonName = `${selectedOrderSide} ${selectedOptionDirection} ${isComboMode ? "Spread" : ""}`;

    return (
      <div className="h-[48px]">
        <Button
          name={buttonName}
          color={selectedOrderSide === "Buy" ? "green" : "red"}
          onClick={handleCreateOpenPosition}
        />
      </div>
    );
  };

  if (selectedOption.optionId === "") {
    return (
      <div className="flex flex-col justify-center items-center w-full h-[1204px] px-[40px]">
        <p className="text-[20px] text-greenc1 text-center font-bold">
          Select an option to trade
        </p>
        <p className="text-[13px] text-gray52 text-center leading-4 mt-[10px]">
          Construct your option by choosing call/put, strike price, expiry and
          buy/sell
        </p>
        <img
          className="w-[64px] h-[64px] min-w-[64px] min-h-[64px] mt-[24px]"
          src={IconArrowOptionNotSelected}
        />
      </div>
    );
  }

  const renderRiskPremiumDiffBadge = () => {
    const isRiskPremiumHigher = isComboMode
      ? Math.abs(riskPremiumAtComboMode) > Math.abs(riskPremium)
      : Math.abs(riskPremium) > Math.abs(riskPremiumAtComboMode);

    let riskPremiumDiffInPercentage = 0;

    if (isComboMode && riskPremium !== 0) {
      riskPremiumDiffInPercentage =
        (Math.abs(riskPremiumAtComboMode - riskPremium) / riskPremium) * 100;
    } else if (!isComboMode && riskPremiumAtComboMode !== 0) {
      riskPremiumDiffInPercentage =
        (Math.abs(riskPremium - riskPremiumAtComboMode) /
          riskPremiumAtComboMode) *
        100;
    }

    if (selectedOrderSide === "Sell")
      riskPremiumDiffInPercentage = -riskPremiumDiffInPercentage;

    if (riskPremiumDiffInPercentage === 0) return null;
    if (isComboMode && sizeAtComboMode === "0") return null;
    if (!isComboMode && size === "0") return null;

    return (
      <div
        className={twJoin(
          "absolute right-0",
          "p-[10px] rounded-[20px] border-[1px] border-solid",
          "font-semibold text-[10px] leading-[7px] md:text-[12px]",
          isRiskPremiumHigher
            ? "text-[#E6FC8D] border-[rgba(230,252,141,0.5)]"
            : "text-green63 border-[rgba(99,224,115,0.5)]"
        )}
      >
        <span>
          {advancedFormatNumber(Math.abs(riskPremiumDiffInPercentage), 0)}%
        </span>
        {isRiskPremiumHigher ? " Higher" : " Lower"}
      </div>
    );
  };

  return (
    <div
      className={twJoin(
        "flex flex-col gap-y-6",
        "w-full px-3 flex-1 overflow-auto"
      )}
    >
      <div
        className={twJoin(
          "flex flex-col gap-y-6",
          "w-fullflex-1 overflow-auto"
        )}
        ref={containerRef}
      >
        <div className="flex flex-col gap-y-4 items-center">
          <p
            className={twJoin(
              "font-bold text-center",
              "text-[20px] leading-[24px] md:text-[22px] md:leading-[26px]",
              selectedOrderSide === TradeOptionType.BUY
                ? "text-green63"
                : "text-[#E03F3F]"
            )}
          >
            {`${selectedOrderSide} ${selectedOptionDirection} ${
              isComboMode ? "Spread" : ""
            }`}
          </p>
          <div className={twJoin("flex flex-row gap-x-2 items-center")}>
            <p
              className={twJoin(
                "px-3 py-1 rounded-xl border border-solid border-[#333331]",
                "font-medium text-[12px] leading-[14px] md:text-[14px] md:leading-[16px]",
                selectedOrderSide === TradeOptionType.BUY
                  ? "text-green63"
                  : "text-[#E03F3F]"
              )}
            >
              {selectedOrderSide}
            </p>
            <p
              className={twJoin(
                "font-medium text-whitef0",
                "text-[15px] leading-[18px] md:text-[17px] md:leading-[20px]"
              )}
            >
              {selectedOption.instrument}
            </p>
            {isComboMode && (
              <div className="relative">
                <div
                  className={twJoin(
                    "flex flex-row items-center gap-x-1",
                    "p-1 bg-[#232322] rounded-[3px]",
                    "border border-solid border-[#333331]"
                  )}
                  onClick={() => {
                    setShowPairedOptionPopup(true);
                  }}
                >
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D",
                      "text-[12px] leading-[14px] md:text-[14px] md:leading-[16px]"
                    )}
                  >
                    {"$" +
                      advancedFormatNumber(pairedOption.strikePrice, 0, "")}
                  </p>
                  <img className="h-6 w-6 object-cover" src={IconArrowDownE6} />
                </div>
              </div>
            )}
          </div>
          <SelectedOptionModeSelector
            selectedOptionDirection={selectedOptionDirection}
            selectedOrderSide={selectedOrderSide}
          />
        </div>

        {/* Option Size Input */}
        <div
          className={twJoin(
            "flex flex-col gap-y-4",
            "w-full p-3 rounded-[6px] bg-[#0C1410]",
            "border border-solid border-[#1C3023]"
          )}
        >
          <div className={twJoin("flex flex-row justify-between items-center")}>
            <p
              className={twJoin(
                "font-semibold text-gray9D",
                "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
              )}
            >
              Option Size
            </p>
            <p
              className={twJoin(
                "font-medium text-gray9D",
                "text-[13px] leading-[16px] md:text-[15px] md:leading-[18px]"
              )}
            >{`${advancedFormatNumber(
              isComboMode ? availableSizeAtComboMode : availableSize,
              4,
              ""
            )} Available`}</p>
          </div>
          <div
            className={twJoin(
              "flex flex-row gap-x-1 items-center",
              "h-10 px-2 rounded",
              "border border-solid border-[#1C3023]"
            )}
          >
            <input
              value={isComboMode ? sizeAtComboMode : size}
              placeholder="0"
              className={twJoin(
                "w-[calc(100%-52px)] bg-transparent",
                "font-bold text-[#E6FC8D]",
                "text-[18px] leading-[27px] md:text-[20px] md:leading-[28px]",
                "placeholder:font-bold placeholder-[#E6FC8D]",
                "placeholder:text-[18px] md:placeholder:text-[20px]",
                "focus:outline-none"
              )}
              onChange={(e) => {
                if (e.target.value.includes(" ")) return;
                if (isNaN(Number(e.target.value))) return;
                if (e.target.value === "") {
                  dispatch(setSize("0"));
                  dispatch(setSizeAtComboMode("0"));
                  return;
                }

                dispatch(setSize(e.target.value.replace(/^0+(?=\d)/, "")));
                dispatch(
                  setSizeAtComboMode(e.target.value.replace(/^0+(?=\d)/, ""))
                );
              }}
              onFocus={() => handleInputFocus("size")}
              onBlur={handleInputBlur}
            />
            <div className="flex flex-row gap-x-3">
              <img
                className="w-5 h-5 object-cover"
                src={IconOptionSizeSubtraction}
                onClick={() => {
                  if (!isNaN(parseFloat(size))) {
                    const [integerPart, decimalPart] = size.split(".");
                    if (parseInt(integerPart) > 0) {
                      if (decimalPart) {
                        dispatch(
                          setSize(`${parseInt(integerPart) - 1}.${decimalPart}`)
                        );
                      } else
                        dispatch(
                          setSize((parseInt(integerPart) - 1).toString())
                        );
                    }
                  }
                  if (!isNaN(parseFloat(sizeAtComboMode))) {
                    const [
                      integerPartSizeAtComboMode,
                      decimalPartSizeAtComboMode,
                    ] = size.split(".");
                    if (parseInt(integerPartSizeAtComboMode) > 0) {
                      if (decimalPartSizeAtComboMode) {
                        dispatch(
                          setSizeAtComboMode(
                            `${
                              parseInt(integerPartSizeAtComboMode) - 1
                            }.${decimalPartSizeAtComboMode}`
                          )
                        );
                      } else
                        dispatch(
                          setSizeAtComboMode(
                            (
                              parseInt(integerPartSizeAtComboMode) - 1
                            ).toString()
                          )
                        );
                    }
                  }
                  handleInputFocus("size");
                }}
              />
              <img
                className="w-5 h-5 object-cover"
                src={IconOptionSizeAddition}
                onClick={() => {
                  if (!isNaN(parseFloat(size))) {
                    const [integerPart, decimalPart] = size.split(".");
                    if (decimalPart) {
                      dispatch(
                        setSize(`${parseInt(integerPart) + 1}.${decimalPart}`)
                      );
                    } else {
                      dispatch(setSize((parseInt(integerPart) + 1).toString()));
                    }
                  }
                  if (!isNaN(parseFloat(sizeAtComboMode))) {
                    const [
                      integerPartSizeAtComboMode,
                      decimalPartSizeAtComboMode,
                    ] = size.split(".");
                    if (decimalPartSizeAtComboMode) {
                      dispatch(
                        setSizeAtComboMode(
                          `${
                            parseInt(integerPartSizeAtComboMode) + 1
                          }.${decimalPartSizeAtComboMode}`
                        )
                      );
                    } else {
                      dispatch(
                        setSizeAtComboMode(
                          (parseInt(integerPartSizeAtComboMode) + 1).toString()
                        )
                      );
                    }
                  }
                  handleInputFocus("size");
                }}
              />
            </div>
          </div>
        </div>

        {/* Option Payamount Input */}
        <div
          className={twJoin(
            "flex flex-col gap-y-4",
            "w-full p-3 rounded-[6px] bg-[#0C1410]",
            "border border-solid border-[#1C3023]"
          )}
        >
          {selectedOrderSide === "Buy" ? (
            <>
              <div
                className={twJoin("flex flex-row justify-between items-center")}
              >
                <p
                  className={twJoin(
                    "font-semibold text-gray9D",
                    "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
                  )}
                >
                  <span>Pay</span>
                </p>
                <div
                  className={twJoin("flex flex-row gap-x-[6px] items-center")}
                >
                  <img
                    className="w-[14px] h-[14px] object-cover"
                    src={IconWalletWhite}
                  />
                  <p
                    className={twJoin(
                      "font-semibold text-whitef0",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    {advancedFormatNumber(Number(quoteAssetBalance), 4, "")}
                  </p>
                  <div
                    className={twJoin(
                      "p-[9px] rounded",
                      "border-[0.5px] border-solid border-[#E6FC8D80]",
                      "font-semibold text-greene6",
                      "text-[10px] leading-[7px] md:text-[12px]"
                    )}
                    onClick={() => {
                      const newValue = handleMaxValue();
                      if (isNaN(Number(newValue))) return;

                      dispatch(setQuoteAssetAmount(newValue));
                      dispatch(setQuoteAssetAmountAtComboMode(newValue));
                      handleInputFocus("pay");
                    }}
                  >
                    MAX
                  </div>
                </div>
              </div>
              <div
                className={twJoin("flex flex-row justify-between items-center")}
              >
                <img
                  className="w-7 h-7 min-w-7 min-h-7"
                  src={QA_TICKER_TO_IMG[chain][selectedQuoteAsset as keyof typeof QA_TICKER_TO_IMG[typeof chain]]}
                />
                <input
                  value={
                    isComboMode ? quoteAssetAmountAtComboMode : quoteAssetAmount
                  }
                  placeholder="0"
                  className={twJoin(
                    "w-[calc(100%-112px)] mx-2 bg-transparent",
                    "font-bold text-[#E6FC8D]",
                    "text-[18px] leading-[27px] md:text-[20px] md:leading-[28px]",
                    "placeholder:font-bold placeholder-[#E6FC8D]",
                    "placeholder:text-[18px] md:placeholder:text-[20px]",
                    "focus:outline-none"
                  )}
                  onChange={(e) => {
                    if (e.target.value.includes(" ")) return;
                    if (isNaN(Number(e.target.value))) return;
                    if (e.target.value === "") {
                      dispatch(setQuoteAssetAmount("0"));
                      dispatch(setQuoteAssetAmountAtComboMode("0"));
                      return;
                    }

                    dispatch(
                      setQuoteAssetAmount(
                        e.target.value.replace(/^0+(?=\d)/, "")
                      )
                    );
                    dispatch(
                      setQuoteAssetAmountAtComboMode(
                        e.target.value.replace(/^0+(?=\d)/, "")
                      )
                    );
                  }}
                  onFocus={() => handleInputFocus("pay")}
                  onBlur={handleInputBlur}
                />
                <div
                  className="flex flex-row gap-x-1 items-center"
                  onClick={() => {
                    setShowQuoteAssetPopup(true);
                  }}
                >
                  <p
                    className={twJoin(
                      "font-semibold text-whitef0",
                      "text-[16px] leading-[24px] md:text-[16px]"
                    )}
                  >
                    {selectedQuoteAsset}
                  </p>
                  <img
                    className="w-[18px] h-[18px] object-cover flex-shrink-0"
                    src={IconArrowDownPay}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-row justify-between">
                <div className="flex flex-row gap-x-2 items-center h-fit">
                  <img
                    className="w-[14px] h-[14px] min-w-[14px] min-h-[14px]"
                    src={IconCollateral}
                  />
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    Collateral
                  </p>
                </div>
                <div className="flex flex-col gap-y-[2px]">
                  <div className="flex flex-row gap-x-[7px] justify-end">
                    <p
                      className={twJoin(
                        "font-semibold text-whitef0",
                        "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
                      )}
                    >
                      {advancedFormatNumber(
                        Number(
                          isComboMode
                            ? collateralAssetAmountAtComboMode
                            : collateralAssetAmount
                        ),
                        4,
                        ""
                      )}
                    </p>
                    {isComboMode ? (
                      <img
                        src={QA_TICKER_TO_IMG[chain][collateralAssetAtComboMode as keyof typeof QA_TICKER_TO_IMG[typeof chain]]}
                        className="w-[18px] h-[18px] min-w-[18px] min-h-[18px]"
                      />
                    ) : (
                      <img
                        src={QA_TICKER_TO_IMG[chain][collateralAsset as keyof typeof QA_TICKER_TO_IMG[typeof chain]]}
                        className="w-[18px] h-[18px] min-w-[18px] min-h-[18px]"
                      />
                    )}
                  </div>
                  <div
                    className={twJoin("flex flex-row gap-x-[6px] items-center")}
                  >
                    <img
                      className="w-[14px] h-[14px] object-cover flex-shrink-0"
                      src={IconWalletWhite}
                    />
                    <p
                      className={twJoin(
                        "font-semibold text-whitef0",
                        "text-[10px] leading-[15px] md:text-[12px]"
                      )}
                    >
                      Balance{" "}
                      {advancedFormatNumber(
                        Number(
                          isComboMode
                            ? collateralAssetBalanceAtComboMode
                            : collateralAssetBalance
                        ),
                        4,
                        ""
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-row justify-between">
                <div className="flex flex-row gap-x-2 items-center">
                  <img
                    className="w-[14px] h-[14px] min-w-[14px] min-h-[14px]"
                    src={IconOptionsPremium}
                  />
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    Options Premium
                  </p>
                </div>
                <div className="flex flex-row gap-x-[7px]">
                  {isComboMode ? (
                    <p
                      className={twJoin(
                        "font-semibold text-whitef0",
                        "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
                      )}
                    >
                      {advancedFormatNumber(quoteAssetValueAtComboMode, 4, "")}
                    </p>
                  ) : (
                    <p
                      className={twJoin(
                        "font-semibold text-whitef0",
                        "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
                      )}
                    >
                      {advancedFormatNumber(quoteAssetValue, 4, "")}
                    </p>
                  )}
                  <img
                    className="w-[18px] h-[18px] min-w-[18px] min-h-[18px]"
                    src={IconSymbolUSDC}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Option detail */}
        <div
          className={twJoin(
            "flex flex-col",
            "w-full rounded-[6px] bg-[#0C1410]",
            "border border-solid border-[#1C3023]"
          )}
          ref={slippageRef}
        >
          <div
            className={twJoin(
              "flex flex-col gap-y-4",
              "px-4 pt-4 pb-[10px]",
              "border-b border-solid border-[#1C3023]"
            )}
          >
            <div className="flex flex-row justify-between items-center">
              <p
                className={twJoin(
                  "font-semibold text-gray9D",
                  "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                )}
              >
                Price per Option
              </p>
              {isComboMode ? (
                <p
                  className={twJoin(
                    "font-semibold text-whitef0",
                    "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
                  )}
                >
                  {advancedFormatNumber(
                    executionPriceAtComboModeOptionDetail || 0,
                    2,
                    "$"
                  )}
                </p>
              ) : (
                <p
                  className={twJoin(
                    "font-semibold text-whitef0",
                    "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
                  )}
                >
                  {advancedFormatNumber(
                    executionPriceOptionDetail || 0,
                    2,
                    "$"
                  )}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-row justify-between items-center">
                <div className="flex flex-row gap-x-2 items-center">
                  <img
                    className="w-[14px] h-[14px] min-w-[14px] min-h-[14px]"
                    src={IconOptionsPremium}
                  />
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    Mark Price
                  </p>
                </div>
                {isComboMode ? (
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D h-fit",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    {advancedFormatNumber(markPriceAtComboMode || 0, 2, "$")}
                  </p>
                ) : (
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    {advancedFormatNumber(markPrice || 0, 2, "$")}
                  </p>
                )}
              </div>
              <div className="flex flex-row justify-between items-center">
                <div className="flex flex-row gap-x-2 items-center relative min-w-[184px] md:min-w-[208px]">
                  <img
                    className="w-[14px] h-[14px] min-w-[14px] min-h-[14px]"
                    src={IconCollateral}
                  />
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D h-fit",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    Risk Premium
                  </p>
                  {renderRiskPremiumDiffBadge()}
                </div>
                {isComboMode ? (
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]",
                      "max-w-[calc(100%-195px)] break-all"
                    )}
                  >
                    {advancedFormatNumber(riskPremiumAtComboMode || 0, 2, "$")}
                  </p>
                ) : (
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]",
                      "max-w-[calc(100%-195px)] break-all"
                    )}
                  >
                    {advancedFormatNumber(riskPremium || 0, 2, "$")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-row justify-between items-center gap-x-3">
              <div className="flex flex-row items-center relative min-w-[162px] md:min-w-[172px]">
                <p
                  className={twJoin(
                    "font-semibold text-gray9D h-fit",
                    "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                  )}
                >
                  Trade Fee
                </p>
                {selectedOrderSide === "Buy" && isComboMode && (
                  <div
                    className={twJoin(
                      "absolute right-0",
                      "p-[10px] rounded-[20px] w-max",
                      "border-[0.5px] border-solid border-[#F0EBE580]"
                    )}
                  >
                    <p
                      className={twJoin(
                        "font-semibold text-whitef0",
                        "text-[10px] leading-[7px] md:text[12px]"
                      )}
                    >
                      {`${
                        (Math.abs(
                          FEE_RATES.OPEN_BUY_NAKED_POSITION -
                            FEE_RATES.OPEN_COMBO_POSITION
                        ) /
                          FEE_RATES.OPEN_BUY_NAKED_POSITION) *
                        100
                      }% Discount`}
                    </p>
                  </div>
                )}
              </div>
              <p
                className={twJoin(
                  "font-semibold text-whitef0",
                  "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]",
                  "max-w-[calc(100%-170px)] break-all"
                )}
              >
                {advancedFormatNumber(
                  isComboMode ? tradeFeeUsdAtComboMode : tradeFeeUsd || 0,
                  2,
                  "$"
                )}
              </p>
            </div>
          </div>
          <div
            className={twJoin("flex flex-row justify-between p-3")}
            onClick={() => setShowSlippageTolerancePopup(true)}
          >
            <p
              className={twJoin(
                "font-semibold text-gray9D",
                "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
              )}
            >
              Slippage Tolerance
            </p>
            <div className="flex flex-row items-center gap-x-1">
              <p
                className={twJoin(
                  "font-semibold text-gray9D",
                  "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                )}
              >
                {advancedFormatNumber(slippage, 1, "")}%
              </p>
              <img
                className="h-[18px] w-[18px] object-cover flex-shrink-0"
                src={IconSlippage}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Option Buy/Sell Button */}
      {renderButton()}
    </div>
  );
};

export default SelectedOptionHighLevel;
