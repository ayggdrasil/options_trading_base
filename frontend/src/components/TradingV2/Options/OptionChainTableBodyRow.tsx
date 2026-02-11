import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { advancedFormatNumber, calculateEstimatedIV, getDaysToExpiration } from "@/utils/helper";
import {
  OptionDirection,
  OptionStrategy,
  OrderSide,
  PriceUnit,
} from "@/utils/types";
import { useMemo } from "react";
import { twJoin } from "tailwind-merge";
import {
  calculateBreakEvenPointV2,
  calculateBidAskPrice,
  calculateVanillaBidAskPrice,
} from "../utils/calculations";
import { parseInstrument } from "../utils/options";
import {
  SpotAssetIndexMap,
  UnderlyingAsset,
  VolatilityScore,
} from "@callput/shared";
import { useAppSelector } from "@/store/hooks";
import { MIN_MARK_PRICE_FOR_BUY_POSITION } from "@/constants/constants.position";
import { NetworkState } from "@/networks/types";
import Tippy from "@tippyjs/react";

interface OptionChainTableBodyRowProps {
  option: IOptionDetail;
  selectedOption: IOptionDetail;
  handleOptionSelection: (option: IOptionDetail) => void;
  orderSideForSelectedOption: OrderSide | null;
  optionStrategyForSelectedOption: OptionStrategy;
  selectedUnderlyingAsset: UnderlyingAsset;
  selectedOptionDirection: OptionDirection;
  selectedOrderSide: OrderSide;
  selectedOptionStrategy: OptionStrategy;
  selectedPriceUnit: PriceUnit;
  underlyingFutures: number;
  extractedOptions: { [key: string]: IOptionDetail };
  maxVolume: number;
  optionPair: IOptionDetail;
}

const MIN_VOLUME_BAR_WIDTH = 3;
const PERCENTAGE_MULTIPLIER = 100;

function OptionChainTableBodyRow({
  option,
  selectedOption,
  handleOptionSelection,
  orderSideForSelectedOption,
  optionStrategyForSelectedOption,
  selectedUnderlyingAsset,
  selectedOptionDirection,
  selectedOrderSide,
  selectedOptionStrategy,
  selectedPriceUnit,
  underlyingFutures,
  extractedOptions,
  maxVolume,
  optionPair,
}: OptionChainTableBodyRowProps) {
  if (!option.instrument) return null;

  const { chain } = useAppSelector((state) => state.network) as NetworkState;
  const olpStats = useAppSelector((state: any) => state.market.olpStats);
  const spotAssetIndexMap = useAppSelector(
    (state: any) => state.market.spotAssetIndexMap
  ) as SpotAssetIndexMap;
  const volatilityScore = useAppSelector(
    (state: any) => state.market.volatilityScore
  ) as VolatilityScore;

  const underlyingAssetSpotIndex = spotAssetIndexMap[selectedUnderlyingAsset];
  const underlyingAssetVolatilityScore =
    volatilityScore[selectedUnderlyingAsset];

  const bidAskPrice = useMemo(() => {
    return calculateBidAskPrice(
      selectedOrderSide,
      selectedOptionStrategy,
      option,
      optionPair,
      chain,
      olpStats,
      underlyingFutures,
      underlyingAssetSpotIndex,
      underlyingAssetVolatilityScore
    );
  }, [
    option,
    selectedOrderSide,
    selectedOptionStrategy,
    optionPair,
    chain,
    olpStats,
    underlyingFutures,
    underlyingAssetSpotIndex,
    underlyingAssetVolatilityScore,
  ]);

  const price = useMemo(() => {
    if (selectedPriceUnit === "USD") {
      return bidAskPrice;
    }
    return underlyingFutures ? bidAskPrice / underlyingFutures : 0;
  }, [bidAskPrice, selectedPriceUnit, underlyingFutures]);

  const iv = useMemo(() => {
    let markIv = 0;
    let markPrice = 0;
    let vega = 0;

    switch (selectedOptionStrategy) {
      case "Vanilla":
        markIv = option.markIv;
        markPrice = option.markPrice;
        vega = option.vega;
        break;
      case "Spread":
        markIv = (option.markIv + optionPair.markIv) / 2;
        markPrice = Math.abs(option.markPrice - optionPair.markPrice);
        vega = (option.vega + optionPair.vega) / 2;
        break;
    }

    return calculateEstimatedIV(
      markIv,
      markPrice,
      bidAskPrice,
      vega,
      selectedOrderSide === "Buy"
    );
  }, [
    bidAskPrice,
    option,
    selectedOrderSide,
    optionPair,
    selectedOptionStrategy,
  ]);

  // const bep = useMemo(() => {
  //   const { expiry } = parseInstrument(option.instrument || "");
  //   return calculateBreakEvenPoint({
  //     expiry: expiry,
  //     orderSide: selectedOrderSide,
  //     options: [option, optionPair],
  //     tickerInterval: UA_TICKER_TO_TICKER_INTERVAL[chain][selectedUnderlyingAsset],
  //   });
  // }, [selectedOrderSide, option, optionPair]);

  const bepV2 = useMemo(() => {
    return calculateBreakEvenPointV2({
      optionDirection: selectedOptionDirection,
      orderSide: selectedOrderSide,
      optionStrategy: selectedOptionStrategy,
      options: [option, optionPair],
    });
  }, [selectedOrderSide, selectedOptionStrategy, option, optionPair]);

  const toBep = useMemo(() => {
    if (!underlyingFutures) return 0;
    return (
      ((bepV2 - underlyingFutures) / underlyingFutures) * PERCENTAGE_MULTIPLIER
    );
  }, [bepV2, underlyingFutures]);

  const maxRoiOrApr = useMemo(() => {
    if (!bidAskPrice || !option.instrument) return 0;

    const { expiry } = parseInstrument(option.instrument);
    const daysToExpiration = getDaysToExpiration(expiry);

    const maxPayoff = Math.abs(option.strikePrice - optionPair.strikePrice);

    if (selectedOrderSide === "Buy") {
      const maxRoi = (maxPayoff - bidAskPrice) / bidAskPrice;
      return maxRoi * PERCENTAGE_MULTIPLIER;
    } else {
      if (daysToExpiration <= 0) return 0;
      const marginBasedApr = (bidAskPrice / maxPayoff) * (365 / daysToExpiration);
      return marginBasedApr * PERCENTAGE_MULTIPLIER;
    }
  }, [bidAskPrice, option, optionPair, selectedOrderSide]);

  const priceChange24h = useMemo(() => {
    const extractedOption = extractedOptions[option.instrument || ""];


    if (!extractedOption) return 0;

    const currentPrice = calculateVanillaBidAskPrice(
      selectedOrderSide,
      option
    );

    const previousPrice = calculateVanillaBidAskPrice(
      selectedOrderSide,
      extractedOption
    )

    if (!currentPrice || !previousPrice) return 0;

    return (
      ((currentPrice - previousPrice) / previousPrice) * PERCENTAGE_MULTIPLIER
    );
  }, [
    selectedOrderSide,
    extractedOptions,
    option,
  ]);

  const volumeBarWidth = useMemo(() => {
    if (!option.volume || !maxVolume) return 1;
    return Math.max(
      (option.volume / maxVolume) * PERCENTAGE_MULTIPLIER,
      MIN_VOLUME_BAR_WIDTH
    );
  }, [option.volume, maxVolume]);

  const isSelected =
    option.instrument === selectedOption.instrument &&
    selectedOrderSide === orderSideForSelectedOption &&
    selectedOptionStrategy === optionStrategyForSelectedOption;

  return (
    <div
      className={twJoin(
        "flex flex-row items-center w-full px-[20px] py-[6px] gap-[10px]",
        "text-[14px] text-graybfbf font-[600] leading-[24px]",
        "hover:bg-black181a"
      )}
    >
      {/* Strike Price */}
      <StrikePriceDisplay
        strikePrice={option.strikePrice}
        optionDirection={selectedOptionDirection}
        optionStrategy={selectedOptionStrategy}
        optionPair={optionPair}
      />

      {/* Break Even */}
      <BreakEvenDisplay price={bepV2} />

      {/* To Break Even */}
      <ChangePercentageDisplay value={toBep} />

      {/* Max ROI / Max APR */}
      <ChangePercentageDisplay value={maxRoiOrApr} />

      {/* Spacer */}
      <div className="w-full min-w-[8px] max-w-[24px]"></div>

      {/* Price & IV */}
      <BuySellButton
        option={option}
        bidAskPrice={bidAskPrice}
        price={price}
        iv={iv}
        orderSide={selectedOrderSide}
        selectedPriceUnit={selectedPriceUnit}
        isSelected={isSelected}
        handleOptionSelection={handleOptionSelection}
      />

      {/* 24H Change */}
      <ChangePercentageDisplay value={priceChange24h} showColor={true} />

      {/* Spacer */}
      <div className="w-full min-w-[8px] max-w-[24px]"></div>

      {/* Volume */}
      <VolumeDisplay volume={option.volume} volumeBarWidth={volumeBarWidth} />
    </div>
  );
}

export default OptionChainTableBodyRow;

function StrikePriceDisplay({
  strikePrice,
  optionDirection,
  optionStrategy,
  optionPair,
}: {
  strikePrice: number;
  optionDirection: OptionDirection;
  optionStrategy: OptionStrategy;
  optionPair: IOptionDetail;
}) {
  return (
    <div
      className={twJoin(
        "flex flex-row items-center gap-[6px] w-full min-w-[148px] max-w-[234px]",
        "text-whitef2f2"
      )}
    >
      <p>{advancedFormatNumber(strikePrice, 0, "")}</p>
      <p>{optionDirection}</p>
      {optionStrategy === "Spread" && (
        <p
          className={twJoin(
            "h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]",
            optionDirection === "Call"
              ? "border-t-[1px] border-t-gray8c8c"
              : "border-b-[1px] border-b-gray8c8c"
          )}
        >
          {optionPair.strikePrice}
        </p>
      )}
    </div>
  );
}

function BreakEvenDisplay({ price }: { price: number }) {
  return (
    <div className="w-full min-w-[96px] max-w-[180px] text-right">
      <p className="">{advancedFormatNumber(price, 0, "$")}</p>
    </div>
  );
}

function ChangePercentageDisplay({
  value,
  showColor = false,
}: {
  value: number;
  showColor?: boolean;
}) {
  const sign = value >= 0 ? "+" : "-";
  const absValue = Math.abs(value);

  let textColor = "text-graybfbf"; // 기본 색상

  if (showColor) {
    if (value > 0) {
      textColor = "text-green71b8"; // 초록색
    } else if (value < 0) {
      textColor = "text-rede04a"; // 빨간색
    }
  }

  return (
    <div className="w-full min-w-[96px] max-w-[180px] text-right">
      {value == 0
        ? <p className={textColor}>-</p>
        : <div className="flex flex-row items-center justify-end">
          <p className={textColor}>{sign}</p>
          <p className={textColor}>{advancedFormatNumber(absValue, 2, "")}%</p>
        </div>
      }
    </div>
  );
}

function BuySellButton({
  option,
  bidAskPrice,
  price,
  iv,
  orderSide,
  selectedPriceUnit,
  isSelected,
  handleOptionSelection,
}: {
  option: IOptionDetail;
  bidAskPrice: number;
  price: number;
  iv: number;
  orderSide: OrderSide;
  selectedPriceUnit: PriceUnit;
  isSelected: boolean;
  handleOptionSelection: (option: IOptionDetail) => void;
}) {
  const isBuy = orderSide === "Buy";

  const minMarkPriceForBuy =
    MIN_MARK_PRICE_FOR_BUY_POSITION[
    option.instrument?.split("-")[0] as UnderlyingAsset
    ];

  const isAvailable = bidAskPrice >= minMarkPriceForBuy;

  const BuyEnableContent = () => {
    return (
      <div
        className={twJoin(
          "w-[184px] h-[40px] px-[12px] py-[6px] bottom-[40px] -left-[12px]",
          "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
          isAvailable ? "hidden" : "block"
        )}
      >
        <p className="text-[12px] text-gray80 font-semibold leading-[0.75rem]">{`Option Price is less than minimum order price, $${minMarkPriceForBuy}`}</p>
      </div>
    );
  };

  return (
    <Tippy
      content={<BuyEnableContent />}
      animation={false}
      offset={[120, -50]}
      hideOnClick={false}
    >
      <div className="w-full min-w-[148px] max-w-[234px]">
        <div
          className={twJoin(
            "group cursor-pointer",
            "flex flex-row items-center justify-between gap-[14px] px-[14px]",
            "w-full h-[44px] rounded-[6px]",
            "active:opacity-80 active:scale-95",
            isSelected
              ? isBuy
                ? "bg-green2f3d"
                : "bg-red422c"
              : "bg-black2023 hover:bg-black292c",
            !isAvailable && "!cursor-not-allowed active:!scale-100 !opacity-30"
          )}
          onClick={(e) => {
            if (!isAvailable) return;
            handleOptionSelection(option);
          }}
        >
          <div
            className={twJoin(
              "flex-1 flex flex-col items-center",
              "text-[14px] font-[600]"
            )}
          >
            {/* Price */}
            <p
              className={twJoin(
                "h-[20px] leading-[20px]",
                isSelected
                  ? isBuy
                    ? "text-green71b8"
                    : "text-rede04a"
                  : isBuy
                    ? "text-rede04a"
                    : "text-green71b8"
              )}
            >
              {advancedFormatNumber(
                price,
                selectedPriceUnit === "USD" ? 2 : 4,
                selectedPriceUnit === "USD" ? "$" : ""
              )}
            </p>
            {/* IV */}
            <p
              className={twJoin(
                "h-[16px] text-[12px] font-[500] leading-[16px]",
                isSelected
                  ? isBuy
                    ? "text-green71b8"
                    : "text-rede04a"
                  : "text-gray8c8c"
              )}
            >
              {advancedFormatNumber(iv * 100, 2, "")}%
            </p>
          </div>
          <div className="w-fit flex flex-row items-center justify-center">
            <p
              className={twJoin(
                "h-full leading-[24px]",
                isSelected
                  ? isBuy
                    ? "text-green71b8"
                    : "text-rede04a"
                  : "text-gray8c8c"
              )}
            >
              {orderSide}
            </p>
          </div>
        </div>
      </div>
    </Tippy>
  );
}

function VolumeDisplay({
  volume,
  volumeBarWidth,
}: {
  volume: number;
  volumeBarWidth: number;
}) {
  return (
    <div className="flex flex-col gap-[6px] w-full min-w-[96px] max-w-[180px]">
      <div
        className="h-[10px] bg-black2023"
        style={{ width: `${volumeBarWidth}%` }}
      />
      <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
        {advancedFormatNumber(volume / 1000, 2, "$")}K
      </p>
    </div>
  );
}
