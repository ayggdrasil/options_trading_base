import {
  IMarketSlice,
  IOlpStats,
  IOptionDetail,
} from "@/interfaces/interfaces.marketSlice";
import { OptionDirection, OrderSide, OptionStrategy } from "@/utils/types";
import OptionPreviewTitleDisplay from "./OptionPreviewTitleDisplay";
import OptionPreviewTradeInput from "./OptionPreviewTradeInput";
import OptionPreviewTradeSummary from "./OptionPreviewTradeSummary";
import OptionPreviewTradeButton from "./OptionPreviewTradeButton";
import { twJoin } from "tailwind-merge";
import {
  calculateRiskPremiumRate,
  calculateUnderlyingFutures,
  FuturesAssetIndexMap,
  NetworkQuoteAsset,
  RiskFreeRateCollection,
  SpotAssetIndexMap,
  UnderlyingAsset,
  VolatilityScore,
} from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { useEffect, useState } from "react";
import { getBaseQuoteAsset } from "../utils/options";
import { initialOptionDetail } from "@/constants/constants.slices";
import { useAppSelector } from "@/store/hooks";
import { Strategy } from "@callput/shared";
import { getOlpKeyByExpiry } from "@/networks/helpers";
import { NetworkState } from "@/networks/types";
import { BN } from "@/utils/bn";

type previewSnapshot = {
  underlyingAsset: UnderlyingAsset;
  expiry: number;
  optionDirection: OptionDirection;
};

interface OptionPreviewProps {
  selectedOption: IOptionDetail;
  orderSideForSelectedOption: OrderSide;
  optionStrategyForSelectedOption: OptionStrategy;
  snapshot: previewSnapshot;
}

function OptionPreview({
  selectedOption,
  orderSideForSelectedOption,
  optionStrategyForSelectedOption,
  snapshot,
}: OptionPreviewProps) {
  const { chain } = useAppSelector((state) => state.network) as NetworkState;

  const [localSnapshot, setLocalSnapshot] = useState<previewSnapshot>(() => ({
    ...snapshot,
  }));
  const { underlyingAsset, expiry, optionDirection } = localSnapshot;

  const [selectedOptionPair, setSelectedOptionPair] =
    useState<IOptionDetail>(initialOptionDetail);

  const [markPriceForVanilla, setMarkPriceForVanilla] = useState<number>(0);
  const [markPriceForSpread, setMarkPriceForSpread] = useState<number>(0);
  const [basedExecutionPriceForVanilla, setBasedExecutionPriceForVanilla] =
    useState<number>(0);
  const [basedExecutionPriceForSpread, setBasedExecutionPriceForSpread] =
    useState<number>(0);
  const [riskPremiumForVanilla, setRiskPremiumForVanilla] = useState<number>(0);
  const [riskPremiumForSpread, setRiskPremiumForSpread] = useState<number>(0);
  const [executionPriceForVanilla, setExecutionPriceForVanilla] =
    useState<number>(0);
  const [executionPriceForSpread, setExecutionPriceForSpread] =
    useState<number>(0);

  const [leverageForVanilla, setLeverageForVanilla] = useState<number>(0);
  const [leverageForSpread, setLeverageForSpread] = useState<number>(0);

  const [sizeForVanilla, setSizeForVanilla] = useState<string>("0");
  const [sizeForSpread, setSizeForSpread] = useState<string>("0");
  const [availableSizeForVanilla, setAvailableSizeForVanilla] =
    useState<number>(0);
  const [availableSizeForSpread, setAvailableSizeForSpread] =
    useState<number>(0);

  const [quoteAsset, setQuoteAsset] = useState<
    NetworkQuoteAsset<SupportedChains>
  >(
    getBaseQuoteAsset(
      underlyingAsset,
      optionDirection,
      "Buy",
      optionStrategyForSelectedOption
    )
  );
  const [quoteAssetAmountForVanilla, setQuoteAssetAmountForVanilla] =
    useState<string>("0");
  const [quoteAssetAmountForSpread, setQuoteAssetAmountForSpread] =
    useState<string>("0");
  const [quoteAssetValueForVanilla, setQuoteAssetValueForVanilla] =
    useState<number>(0);
  const [quoteAssetValueForSpread, setQuoteAssetValueForSpread] =
    useState<number>(0);

  const collateralAssetForVanilla = getBaseQuoteAsset(
    underlyingAsset,
    optionDirection,
    "Sell",
    "Vanilla"
  );
  const collateralAssetForSpread = getBaseQuoteAsset(
    underlyingAsset,
    optionDirection,
    "Sell",
    "Spread"
  );

  const [collateralAssetAmountForVanilla, setCollateralAssetAmountForVanilla] =
    useState<string>("0");
  const [collateralAssetAmountForSpread, setCollateralAssetAmountForSpread] =
    useState<string>("0");
  const [tradeFeeUsdForVanilla, setTradeFeeUsdForVanilla] = useState<number>(0);
  const [tradeFeeUsdForSpread, setTradeFeeUsdForSpread] = useState<number>(0);

  const [slippage, setSlippage] = useState<number>(5);
  const [underlyingFutures, setUnderlyingFutures] = useState<number>(0);

  const spotAssetIndexMap = useAppSelector(
    (state: any) => state.market.spotAssetIndexMap
  ) as SpotAssetIndexMap;
  const futuresAssetIndexMap = useAppSelector(
    (state: any) => state.market.futuresAssetIndexMap
  ) as FuturesAssetIndexMap;
  const riskFreeRateCollection = useAppSelector(
    (state: any) => state.market.riskFreeRateCollection
  ) as RiskFreeRateCollection;
  const olpStats = useAppSelector(
    (state: any) => state.market.olpStats
  ) as IOlpStats;
  const volatilityScore = useAppSelector(
    (state: any) => state.market.volatilityScore
  ) as VolatilityScore;

  const underlyingAssetSpotIndex = spotAssetIndexMap[underlyingAsset];
  const underlyingAssetVolatilityScore = volatilityScore[underlyingAsset];

  const isCall = optionDirection === "Call";
  const isBuy = orderSideForSelectedOption === "Buy";
  const isVanilla = optionStrategyForSelectedOption === "Vanilla";
  const strategy = getStrategyByOptionTokenId(isVanilla, isBuy, isCall);
  const olpKey = getOlpKeyByExpiry(chain, expiry);

  const handleCalculateRiskPremium = (
    size: string,
    isBuy: boolean,
    isVanilla: boolean
  ) => {
    const olpGreeks = olpStats[olpKey].greeks[underlyingAsset];
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

    let rpRate = 0;

    if (isVanilla) {
      const { RP_rate } = calculateRiskPremiumRate({
        underlyingAsset: underlyingAsset,
        expiry: expiry,
        isOpen: true,
        orderSide: isBuy ? "Buy" : "Sell",
        optionDirection: isCall ? "Call" : "Put",
        mainOption: selectedOption,
        pairedOption: null,
        size: Number(size),
        underlyingFutures,
        underlyingAssetSpotIndex,
        underlyingAssetVolatilityScore,
        olpKey,
        olpGreeks,
        olpUtilityRatio,
      });

      rpRate = RP_rate;
    } else {
      const { RP_rate } = calculateRiskPremiumRate({
        underlyingAsset: underlyingAsset,
        expiry: expiry,
        isOpen: true,
        orderSide: isBuy ? "Buy" : "Sell",
        optionDirection: isCall ? "Call" : "Put",
        mainOption: selectedOption,
        pairedOption: selectedOptionPair,
        size: Number(size),
        underlyingFutures,
        underlyingAssetSpotIndex,
        underlyingAssetVolatilityScore,
        olpKey,
        olpGreeks,
        olpUtilityRatio,
      });

      rpRate = RP_rate;
    }

    return rpRate;
  };

  const handleInitializeInputValues = () => {
    setRiskPremiumForVanilla(0);
    setRiskPremiumForSpread(0);
    setExecutionPriceForVanilla(0);
    setExecutionPriceForSpread(0);
    setLeverageForVanilla(0);
    setLeverageForSpread(0);
    setSizeForVanilla("0");
    setSizeForSpread("0");
    setQuoteAssetAmountForVanilla("0");
    setQuoteAssetAmountForSpread("0");
    setQuoteAssetValueForVanilla(0);
    setQuoteAssetValueForSpread(0);
    setCollateralAssetAmountForVanilla("0");
    setCollateralAssetAmountForSpread("0");
    setTradeFeeUsdForVanilla(0);
    setTradeFeeUsdForSpread(0);
  };

  useEffect(() => {
    setLocalSnapshot(snapshot);
  }, [selectedOption]);

  useEffect(() => {
    const underlyingFutures = calculateUnderlyingFutures(
      underlyingAsset,
      expiry,
      futuresAssetIndexMap,
      riskFreeRateCollection
    );
    setUnderlyingFutures(underlyingFutures);
  }, [underlyingAsset, expiry, futuresAssetIndexMap, riskFreeRateCollection]);

  // Initialize default values related to selected option
  useEffect(() => {
    const { markPrice, basedExecutionPrice } =
      calculateMarkPriceAndBasedExecutionPrice(
        selectedOption,
        orderSideForSelectedOption
      );
    setMarkPriceForVanilla(markPrice);
    setBasedExecutionPriceForVanilla(basedExecutionPrice);
    setLeverageForVanilla(underlyingFutures / markPrice);
  }, [selectedOption, orderSideForSelectedOption]);

  // Initialize default values related to paired option
  useEffect(() => {
    if (selectedOptionPair.optionId === "") {
      setMarkPriceForSpread(0);
      setBasedExecutionPriceForSpread(0);
      setLeverageForSpread(0);
      return;
    }

    const markPrice = Math.max(
      selectedOption.markPrice - selectedOptionPair.markPrice,
      0
    );

    const basedRiskPremium =
      orderSideForSelectedOption === "Buy"
        ? markPrice * handleCalculateRiskPremium("1", true, false)
        : markPrice * handleCalculateRiskPremium("1", false, false);

    const basedExecutionPrice =
      orderSideForSelectedOption === "Buy"
        ? markPrice + basedRiskPremium
        : markPrice - basedRiskPremium;

    setMarkPriceForSpread(markPrice);
    setBasedExecutionPriceForSpread(basedExecutionPrice);
    setLeverageForSpread(underlyingFutures / markPrice);
  }, [selectedOptionPair, orderSideForSelectedOption]);

  // calculate availableSize and availableSizeAtComboMode
  useEffect(() => {
    const olpAssetAmounts = olpStats[olpKey].assetAmounts;
    const savedUsdcAmountForClose = new BN(olpAssetAmounts.usdc.depositedAmount)
      .multipliedBy(0.03)
      .toNumber();
    const parsedOlpUsdcAvailableAmounts = new BN(
      olpAssetAmounts.usdc.availableAmount
    )
      .minus(savedUsdcAmountForClose)
      .toNumber();

    const availableSizeForVanilla = calculateAvailableSize(
      isBuy,
      isCall,
      isVanilla,
      underlyingAsset,
      olpAssetAmounts,
      selectedOption,
      selectedOptionPair,
      spotAssetIndexMap.usdc,
      parsedOlpUsdcAvailableAmounts,
      executionPriceForVanilla,
      basedExecutionPriceForVanilla
    );

    const availableSizeForSpread = calculateAvailableSize(
      isBuy,
      isCall,
      isVanilla,
      underlyingAsset,
      olpAssetAmounts,
      selectedOption,
      selectedOptionPair,
      spotAssetIndexMap.usdc,
      parsedOlpUsdcAvailableAmounts,
      executionPriceForSpread,
      basedExecutionPriceForSpread
    );

    setAvailableSizeForVanilla(availableSizeForVanilla);
    setAvailableSizeForSpread(availableSizeForSpread);
  }, [
    selectedOption,
    selectedOptionPair,
    localSnapshot,
    orderSideForSelectedOption,
    optionStrategyForSelectedOption,
    olpStats,
    spotAssetIndexMap,
    executionPriceForVanilla,
    executionPriceForSpread,
    basedExecutionPriceForVanilla,
    basedExecutionPriceForSpread,
  ]);

  return (
    <div
      className={twJoin(
        "w-full h-full min-w-[384px] max-w-[384px] min-h-[764px]",
        "flex flex-col items-center justify-center"
      )}
    >
      <OptionPreviewTitleDisplay
        selectedOption={selectedOption}
        underlyingAsset={underlyingAsset}
        expiry={expiry}
        optionDirection={optionDirection}
        orderSide={orderSideForSelectedOption}
        optionStrategy={optionStrategyForSelectedOption}
        selectedOptionPair={selectedOptionPair}
        setSelectedOptionPair={setSelectedOptionPair}
        strategy={strategy}
        markPriceForVanilla={markPriceForVanilla}
        markPriceForSpread={markPriceForSpread}
        leverageForVanilla={leverageForVanilla}
        leverageForSpread={leverageForSpread}
      />
      <OptionPreviewTradeInput
        selectedOption={selectedOption}
        underlyingAsset={underlyingAsset}
        expiry={expiry}
        optionDirection={optionDirection}
        orderSide={orderSideForSelectedOption}
        optionStrategy={optionStrategyForSelectedOption}
        selectedOptionPair={selectedOptionPair}
        underlyingFutures={underlyingFutures}
        markPriceForVanilla={markPriceForVanilla}
        markPriceForSpread={markPriceForSpread}
        basedExecutionPriceForVanilla={basedExecutionPriceForVanilla}
        basedExecutionPriceForSpread={basedExecutionPriceForSpread}
        riskPremiumForVanilla={riskPremiumForVanilla}
        riskPremiumForSpread={riskPremiumForSpread}
        setRiskPremiumForVanilla={setRiskPremiumForVanilla}
        setRiskPremiumForSpread={setRiskPremiumForSpread}
        executionPriceForVanilla={executionPriceForVanilla}
        executionPriceForSpread={executionPriceForSpread}
        setExecutionPriceForVanilla={setExecutionPriceForVanilla}
        setExecutionPriceForSpread={setExecutionPriceForSpread}
        quoteAsset={quoteAsset}
        setQuoteAsset={setQuoteAsset}
        quoteAssetAmountForVanilla={quoteAssetAmountForVanilla}
        quoteAssetAmountForSpread={quoteAssetAmountForSpread}
        setQuoteAssetAmountForVanilla={setQuoteAssetAmountForVanilla}
        setQuoteAssetAmountForSpread={setQuoteAssetAmountForSpread}
        quoteAssetValueForVanilla={quoteAssetValueForVanilla}
        quoteAssetValueForSpread={quoteAssetValueForSpread}
        setQuoteAssetValueForVanilla={setQuoteAssetValueForVanilla}
        setQuoteAssetValueForSpread={setQuoteAssetValueForSpread}
        collateralAssetForVanilla={collateralAssetForVanilla}
        collateralAssetForSpread={collateralAssetForSpread}
        collateralAssetAmountForVanilla={collateralAssetAmountForVanilla}
        collateralAssetAmountForSpread={collateralAssetAmountForSpread}
        setCollateralAssetAmountForVanilla={setCollateralAssetAmountForVanilla}
        setCollateralAssetAmountForSpread={setCollateralAssetAmountForSpread}
        tradeFeeUsdForVanilla={tradeFeeUsdForVanilla}
        tradeFeeUsdForSpread={tradeFeeUsdForSpread}
        setTradeFeeUsdForVanilla={setTradeFeeUsdForVanilla}
        setTradeFeeUsdForSpread={setTradeFeeUsdForSpread}
        sizeForVanilla={sizeForVanilla}
        sizeForSpread={sizeForSpread}
        setSizeForVanilla={setSizeForVanilla}
        setSizeForSpread={setSizeForSpread}
        availableSizeForVanilla={availableSizeForVanilla}
        availableSizeForSpread={availableSizeForSpread}
        handleCalculateRiskPremium={handleCalculateRiskPremium}
        handleInitializeInputValues={handleInitializeInputValues}
      />
      <OptionPreviewTradeButton
        selectedOption={selectedOption}
        underlyingAsset={underlyingAsset}
        expiry={expiry}
        optionDirection={optionDirection}
        orderSide={orderSideForSelectedOption}
        optionStrategy={optionStrategyForSelectedOption}
        selectedOptionPair={selectedOptionPair}
        quoteAsset={quoteAsset}
        quoteAssetAmountForVanilla={quoteAssetAmountForVanilla}
        quoteAssetAmountForSpread={quoteAssetAmountForSpread}
        collateralAssetForVanilla={collateralAssetForVanilla}
        collateralAssetForSpread={collateralAssetForSpread}
        collateralAssetAmountForVanilla={collateralAssetAmountForVanilla}
        collateralAssetAmountForSpread={collateralAssetAmountForSpread}
        sizeForVanilla={sizeForVanilla}
        sizeForSpread={sizeForSpread}
        availableSizeForVanilla={availableSizeForVanilla}
        availableSizeForSpread={availableSizeForSpread}
        slippage={slippage}
        handleInitializeInputValues={handleInitializeInputValues}
      />
      <OptionPreviewTradeSummary
        selectedOption={selectedOption}
        underlyingAsset={underlyingAsset}
        expiry={expiry}
        optionDirection={optionDirection}
        orderSide={orderSideForSelectedOption}
        optionStrategy={optionStrategyForSelectedOption}
        underlyingFutures={underlyingFutures}
        selectedOptionPair={selectedOptionPair}
        markPriceForVanilla={markPriceForVanilla}
        markPriceForSpread={markPriceForSpread}
        riskPremiumForVanilla={riskPremiumForVanilla}
        riskPremiumForSpread={riskPremiumForSpread}
        executionPriceForVanilla={executionPriceForVanilla}
        executionPriceForSpread={executionPriceForSpread}
        tradeFeeUsdForVanilla={tradeFeeUsdForVanilla}
        tradeFeeUsdForSpread={tradeFeeUsdForSpread}
        quoteAsset={quoteAsset}
        quoteAssetAmount={
          optionStrategyForSelectedOption === "Vanilla"
            ? quoteAssetAmountForVanilla
            : quoteAssetAmountForSpread
        }
        collateralAsset={
          optionStrategyForSelectedOption === "Vanilla"
            ? collateralAssetForVanilla
            : collateralAssetForSpread
        }
        collateralAssetAmount={
          optionStrategyForSelectedOption === "Vanilla"
            ? collateralAssetAmountForVanilla
            : collateralAssetAmountForSpread
        }
        size={
          optionStrategyForSelectedOption === "Vanilla"
            ? sizeForVanilla
            : sizeForSpread
        }
        slippage={slippage}
        setSlippage={setSlippage}
      />
    </div>
  );
}

export default OptionPreview;

function calculateMarkPriceAndBasedExecutionPrice(
  selectedOption: IOptionDetail,
  orderSide: OrderSide
) {
  const markPrice = selectedOption.markPrice;

  const basedExecutionPrice =
    orderSide === "Buy"
      ? markPrice * (1 + selectedOption.riskPremiumRateForBuy)
      : markPrice * (1 - selectedOption.riskPremiumRateForSell);

  return { markPrice, basedExecutionPrice };
}

function getStrategyByOptionTokenId(
  isVanilla: boolean,
  isBuy: boolean,
  isCall: boolean
): Strategy {
  if (isVanilla) {
    if (isBuy) {
      return isCall ? "BuyCall" : "BuyPut";
    } else {
      return isCall ? "SellCall" : "SellPut";
    }
  } else {
    if (isBuy) {
      return isCall ? "BuyCallSpread" : "BuyPutSpread";
    } else {
      return isCall ? "SellCallSpread" : "SellPutSpread";
    }
  }
}

function calculateAvailableSize(
  isBuy: boolean,
  isCall: boolean,
  isVanilla: boolean,
  underlyingAsset: UnderlyingAsset,
  olpAssetAmounts: any,
  selectedOption: IOptionDetail,
  selectedOptionPair: IOptionDetail,
  usdcSpotIndex: number,
  parsedOlpUsdcAvailableAmounts: number,
  executionPrice: number,
  basedExecutionPrice: number
): number {
  if (isBuy) {
    if (isVanilla && isCall) {
      return underlyingAsset === UnderlyingAsset.BTC
        ? olpAssetAmounts.wbtc.availableAmount
        : olpAssetAmounts.weth.availableAmount;
    } else {
      const strikePrice = isVanilla
        ? selectedOption.strikePrice
        : Math.abs(selectedOption.strikePrice - selectedOptionPair.strikePrice);
      const strikePriceAmounts = new BN(strikePrice)
        .dividedBy(usdcSpotIndex)
        .toNumber();
      return new BN(parsedOlpUsdcAvailableAmounts)
        .div(strikePriceAmounts)
        .toNumber();
    }
  }

  // Sell orders (both call and put)
  const appliedExecutionPrice =
    executionPrice === 0 ? basedExecutionPrice : executionPrice;
  const appliedExecutionPriceAmounts = new BN(appliedExecutionPrice)
    .dividedBy(usdcSpotIndex)
    .toNumber();

  return appliedExecutionPriceAmounts === 0
    ? 0
    : new BN(parsedOlpUsdcAvailableAmounts)
        .div(appliedExecutionPriceAmounts)
        .toNumber();
}
