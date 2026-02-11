import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { advancedFormatNumber } from "@/utils/helper";
import { OptionDirection, OptionStrategy, OrderSide } from "@/utils/types";
import {
  convertQuoteAssetToNormalizedSpotAsset,
  NetworkQuoteAsset,
  SpotAssetIndexMap,
} from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { useAppSelector } from "@/store/hooks";
import { BN } from "@/utils/bn";
import { twJoin } from "tailwind-merge";
import DisplayWithTooltip from "../DisplayWithToolTip";
import { ReactNode } from "react";

interface OrderSummaryProps {
  selectedOption: IOptionDetail;
  optionDirection: OptionDirection;
  orderSide: OrderSide;
  optionStrategy: OptionStrategy;
  selectedOptionPair: IOptionDetail;
  markPriceForVanilla: number;
  markPriceForSpread: number;
  riskPremiumForVanilla: number;
  riskPremiumForSpread: number;
  executionPriceForVanilla: number;
  executionPriceForSpread: number;
  tradeFeeUsdForVanilla: number;
  tradeFeeUsdForSpread: number;
  quoteAsset: NetworkQuoteAsset<SupportedChains>;
  quoteAssetAmount: string;
  collateralAsset: NetworkQuoteAsset<SupportedChains>;
  collateralAssetAmount: string;
  size: string;
}

function OrderSummary({
  selectedOption,
  optionDirection,
  orderSide,
  optionStrategy,
  selectedOptionPair,
  markPriceForVanilla,
  markPriceForSpread,
  riskPremiumForVanilla,
  riskPremiumForSpread,
  executionPriceForVanilla,
  executionPriceForSpread,
  tradeFeeUsdForVanilla,
  tradeFeeUsdForSpread,
  quoteAsset,
  quoteAssetAmount,
  collateralAsset,
  collateralAssetAmount,
  size,
}: OrderSummaryProps) {
  const markPrice =
    optionStrategy === "Vanilla" ? markPriceForVanilla : markPriceForSpread;
  const riskPremium =
    optionStrategy === "Vanilla" ? riskPremiumForVanilla : riskPremiumForSpread;
  const executionPrice =
    optionStrategy === "Vanilla"
      ? executionPriceForVanilla
      : executionPriceForSpread;
  const subtotal = executionPrice * Number(size);
  const tradeFee =
    optionStrategy === "Vanilla" ? tradeFeeUsdForVanilla : tradeFeeUsdForSpread;

  const totalTitle = orderSide === "Buy" ? "Total Cost" : "Total Income";
  const totalValue =
    orderSide === "Buy" ? subtotal + tradeFee : subtotal - tradeFee;

  const spotAssetIndexMap = useAppSelector(
    (state: any) => state.market.spotAssetIndexMap
  ) as SpotAssetIndexMap;
  const normalizedCollateralAsset = convertQuoteAssetToNormalizedSpotAsset(
    collateralAsset,
    false
  );

  if (!normalizedCollateralAsset) return null;

  const collateralAssetSpotIndex = spotAssetIndexMap[normalizedCollateralAsset];
  const collateralAssetAmountInUsd = new BN(collateralAssetAmount)
    .multipliedBy(collateralAssetSpotIndex)
    .toNumber();

  const renderRiskPremiumDiffBadge = () => {
    const isRiskPremiumHigher =
      optionStrategy === "Vanilla"
        ? Math.abs(riskPremiumForVanilla) > Math.abs(riskPremiumForSpread)
        : Math.abs(riskPremiumForSpread) > Math.abs(riskPremiumForVanilla);

    let riskPremiumDiffInPercentage = 0;

    if (optionStrategy === "Vanilla" && riskPremiumForSpread !== 0) {
      riskPremiumDiffInPercentage =
        (Math.abs(riskPremiumForVanilla - riskPremiumForSpread) /
          riskPremiumForSpread) *
        100;
    } else if (optionStrategy === "Spread" && riskPremiumForVanilla !== 0) {
      riskPremiumDiffInPercentage =
        (Math.abs(riskPremiumForSpread - riskPremiumForVanilla) /
          riskPremiumForVanilla) *
        100;
    }

    if (orderSide === "Sell")
      riskPremiumDiffInPercentage = -riskPremiumDiffInPercentage;

    if (riskPremiumDiffInPercentage === 0) return null;
    if (size === "0") return null;

    return (
      <p
        className={twJoin(
          "text-[11px] font-semibold leading-[18px]",
          isRiskPremiumHigher ? "text-redff4d" : "text-greene6"
        )}
      >
        ({advancedFormatNumber(Math.abs(riskPremiumDiffInPercentage), 0)}%{" "}
        {isRiskPremiumHigher ? "Higher" : "Lower"})
      </p>
    );
  };

  return (
    <div className="w-full flex flex-col gap-[4px]">
      <div className="w-full flex flex-col">
        <div className="h-[24px] flex flex-row items-center gap-[5px]">
          <p
            className={twJoin(
              "text-[13px] font-[600] leading-[24px]",
              orderSide === "Buy" ? "text-green71b8" : "text-rede04a"
            )}
          >
            {orderSide} {selectedOption.instrument}
          </p>
          {optionStrategy === "Spread" && (
            <p
              className={twJoin(
                "h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]",
                optionDirection === "Call"
                  ? "border-t-[1px] border-t-gray8c8c"
                  : "border-b-[1px] border-b-gray8c8c"
              )}
            >
              {Number(selectedOptionPair.strikePrice)}
            </p>
          )}
        </div>

        <div className="flex flex-col">
          <SummaryRow
            label="Mark Price"
            value={advancedFormatNumber(markPrice, 2, "$")}
          />
          <SummaryRow
            label={
              <DisplayWithTooltip
                title="Price Difference"
                tooltipContent={
                  <p>
                    The mechanism that penalizes trades adding to the platform's Greeks exposure and rewards trades that reduce it.
                  </p>
                }
                className="text-gray8c8c text-[12px] font-[500] leading-[20px]"
                textAlign="right"
                tooltipClassName="w-[260px]"
              />
            }
            value={advancedFormatNumber(riskPremium, 2, "$")}
          />
          <SummaryRow
            label="Unit Price"
            value={advancedFormatNumber(executionPrice, 2, "$")}
          />
        </div>
      </div>

      <div className="flex flex-col">
        <SummaryRow
          label="Size"
          value={advancedFormatNumber(Number(size), 4, "")}
          highlighted
        />
        <SummaryRow
          label="Subtotal"
          value={advancedFormatNumber(subtotal, 2, "$")}
        />
        <SummaryRow
          label={
            <DisplayWithTooltip
              title="Trade Fee"
              tooltipContent={
                <p>
                  Trade Fee is 0.03% of the notional volume for all trades, except 0.06% for buying naked options, not exceeding 12.5% of execution price * size.
                </p>
              }
              className="text-gray8c8c text-[12px] font-[500] leading-[20px]"
              textAlign="right"
              tooltipClassName="w-[350px]"
            />
          }
          value={advancedFormatNumber(tradeFee, 2, "$")}
        />
      </div>

      <div className="flex flex-col">
        <SummaryRow
          label={totalTitle}
          value={advancedFormatNumber(totalValue, 2, "$")}
          highlighted
        />
        {orderSide === "Sell" && (
          <div className="flex flex-col gap-[4px]">
            <SummaryRow
              label="Required Collateral"
              value={advancedFormatNumber(collateralAssetAmountInUsd, 2, "$")}
              highlighted
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderSummary;

interface SummaryRowProps {
  label: string | ReactNode;
  value: string;
  highlighted?: boolean;
}

const SummaryRow = ({ label, value, highlighted = false }: SummaryRowProps) => {
  if (highlighted) {
    return (
      <div className="h-[24px] flex flex-row items-center justify-between">
        <div className="text-blue278e text-[13px] font-[600] leading-[24px]">
          {label}
        </div>
        <p className="text-blue278e text-[13px] font-[600] leading-[24px]">
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className="h-[20px] flex flex-row items-center justify-between">
      <div className="text-gray8c8c text-[12px] font-[500] leading-[20px]">
        {label}
      </div>
      <p className="text-whitef2f2 text-[12px] font-[600] leading-[20px]">
        {value}
      </p>
    </div>
  );
};
