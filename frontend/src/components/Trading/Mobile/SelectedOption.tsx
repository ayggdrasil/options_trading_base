import BigNumber from "bignumber.js";
import {
  advancedFormatBigNumber,
  advancedFormatNumber,
  calculateEstimatedIV,
  getPairedOptionStrikePriceByTermV2,
} from "@/utils/helper";
import { OptionDirection, OrderSide } from "@/utils/types";
import { twJoin } from "tailwind-merge";
import { useEffect, useState } from "react";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { initialOptionDetail } from "@/constants/constants.slices";
import { TradeOptionType } from "./constant";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import SelectedOptionChart from "./SelectedOptionChart";
import SelectedOptionModeSelector from "./SelectedOptionComboMode";

import { ModalName, setModalNameList } from "@/store/slices/SelectedOption";
import Button from "@/components/Common/Button";
import { Greeks, UnderlyingAsset } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface SelectedOptionProps {
  underlyingFutures: number;
  selectedUnderlyingAsset: UnderlyingAsset;
  selectedOptionDirection: OptionDirection;
  selectedExpiry: number;
  selectedOption: IOptionDetail;
  selectedOrderSide: OrderSide;
  setShowSelectedOptionHighLevel: (value: any) => void;
}

const SelectedOption: React.FC<SelectedOptionProps> = ({
  underlyingFutures,
  selectedUnderlyingAsset,
  selectedOptionDirection,
  selectedExpiry,
  selectedOption,
  selectedOrderSide,
  setShowSelectedOptionHighLevel,
}) => {
  const dispatch = useAppDispatch();
  const modalNameList = useAppSelector((state: any) => state.selectedOption.modalNameList);
  const isComboMode = useAppSelector((state: any) => state.selectedOption.isComboMode);
  const selectableOptionPairs = useAppSelector((state: any) => state.selectedOption.selectableOptionPairs);
  const [currentOptionId, setCurrentOptionId] = useState<string>("");
  const [currentTradeType, setCurrentTradeType] = useState<OrderSide>("Buy");
  const [pairedOption, setPairedOption] = useState<IOptionDetail>(initialOptionDetail);

  const [executionPrice, setExecutionPrice] = useState<number>(0);
  const [executionPriceAtComboMode, setExecutionPriceAtComboMode] = useState<number>(0);

  const [size, setSize] = useState<string>("0");
  const [sizeAtComboMode, setSizeAtComboMode] = useState<string>("0");

  const [greeks, setGreeks] = useState<Greeks>({
    delta: 0,
    gamma: 0,
    vega: 0,
    theta: 0,
  });

  const priceForBuy = Math.max(selectedOption.markPrice * (1 + selectedOption.riskPremiumRateForBuy), 0); // Ask Price
  const priceForSell = Math.max(selectedOption.markPrice * (1 - selectedOption.riskPremiumRateForSell), 0); // Bid Price
  const spreadForSell = ((selectedOption.markPrice - priceForSell) / selectedOption.markPrice) * 100; // %
  const spreadForBuy = ((priceForBuy - selectedOption.markPrice) / selectedOption.markPrice) * 100; // %
  const estimatedIvForBuy = calculateEstimatedIV(
    selectedOption.markIv,
    selectedOption.markPrice,
    priceForBuy,
    selectedOption.vega,
    true
  );
  const estimatedIvForSell = calculateEstimatedIV(
    selectedOption.markIv,
    selectedOption.markPrice,
    priceForSell,
    selectedOption.vega,
    false
  );
  const [leverage, setLeverage] = useState<number>(0);
  const [leverageAtComboMode, setLeverageAtComboMode] = useState<number>(0);

  // Initialize values that are affected by input
  const handleInitializeInputValues = () => {
    setExecutionPrice(0);
    setExecutionPriceAtComboMode(0);
    setSize("0");
    setSizeAtComboMode("0");
  };

  useEffect(() => {
    handleInitializeInputValues();
  }, [currentOptionId, currentTradeType]);

  // Initialize default values related to selected option
  useEffect(() => {
    if (selectedOption.optionId !== currentOptionId || selectedOrderSide !== currentTradeType) {
      setCurrentOptionId(selectedOption.optionId);
      setCurrentTradeType(selectedOrderSide);
      setPairedOption(initialOptionDetail);
    }
  }, [selectedOption, selectedOrderSide]);

  // Validate combo mode and initialize paired option
  useEffect(() => {
    if (pairedOption?.optionId !== "") return;

    const pairedOptionIndex = getPairedOptionStrikePriceByTermV2(
      selectedExpiry,
      selectedOption.strikePrice,
      selectableOptionPairs,
      selectedOptionDirection === "Call"
    );

    setPairedOption(selectableOptionPairs[pairedOptionIndex]);
  }, [selectableOptionPairs]);

  useEffect(() => {
    setGreeks({
      delta: isComboMode ? selectedOption.delta - pairedOption?.delta : selectedOption.delta,
      gamma: isComboMode ? selectedOption.gamma - pairedOption?.gamma : selectedOption.gamma,
      vega: isComboMode ? selectedOption.vega - pairedOption?.vega : selectedOption.vega,
      theta: isComboMode ? selectedOption.theta - pairedOption?.theta : selectedOption.theta,
    });
  }, [isComboMode, selectedOption, pairedOption]);

  useEffect(() => {
    if (!selectedOption.optionId || selectedOption.optionId === "") {
      setLeverage(0);
      return;
    }
    const markPrice = selectedOption.markPrice;
    setLeverage(underlyingFutures / markPrice);
  }, [selectedOption, selectedOrderSide, underlyingFutures]);

  useEffect(() => {
    if (!pairedOption?.optionId || pairedOption?.optionId === "") {
      setLeverageAtComboMode(0);
      return;
    }

    const markPriceAtComboMode = selectedOption.markPrice - pairedOption?.markPrice;

    setLeverageAtComboMode(underlyingFutures / markPriceAtComboMode);
  }, [pairedOption]);

  return (
    <div className="flex-1 overflow-auto flex flex-col w-full px-3 gap-y-6 md:px-6">
      <div className="flex-1 overflow-auto flex flex-col w-full gap-y-6 md:px-6">
        <div className="flex flex-col gap-y-4 items-center">
          {selectedOrderSide === TradeOptionType.BUY ? (
            <p
              className={twJoin(
                "font-bold text-center text-green63",
                "text-[20px] leading-[24px] md:text-[22px] md:leading-[26px]"
              )}
            >
              Buy {selectedOption.instrument}
            </p>
          ) : (
            <p
              className={twJoin(
                "font-bold text-center text-redE0",
                "text-[20px] leading-[24px] md:text-[22px] md:leading-[26px]"
              )}
            >
              Sell {selectedOption.instrument}
            </p>
          )}
          <SelectedOptionModeSelector
            selectedOptionDirection={selectedOptionDirection}
            selectedOrderSide={selectedOrderSide}
          />
        </div>

        <div className={twJoin("flex flex-row flex-wrap gap-y-5")}>
          {selectedOrderSide === TradeOptionType.BUY ? (
            <div className={twJoin("w-[calc(100%/3)]", "flex flex-col gap-y-2")}>
              <p
                className={twJoin(
                  "font-medium text-gray9D",
                  "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
                )}
              >
                Ask Price
              </p>
              <p
                className={twJoin(
                  "font-medium text-whitef0",
                  "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
                )}
              >
                {advancedFormatNumber(priceForBuy, 2, "$")}
              </p>
            </div>
          ) : (
            <div className={twJoin("w-[calc(100%/3)]", "flex flex-col gap-y-2")}>
              <p
                className={twJoin(
                  "font-medium text-gray9D",
                  "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
                )}
              >
                Bid Price
              </p>
              <p
                className={twJoin(
                  "font-medium text-whitef0",
                  "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
                )}
              >
                {advancedFormatNumber(priceForSell, 2, "$")}
              </p>
            </div>
          )}

          <div className={twJoin("w-[calc(100%/3)]", "flex flex-col gap-y-2")}>
            <p
              className={twJoin(
                "font-medium text-gray9D",
                "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
              )}
            >
              Mark Price
            </p>
            <p
              className={twJoin(
                "font-medium text-whitef0",
                "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
              )}
            >
              {advancedFormatNumber(selectedOption.markPrice, 1, "$")}
            </p>
          </div>
          <div className={twJoin("w-[calc(100%/3)]", "flex flex-col gap-y-2")}>
            <p
              className={twJoin(
                "font-medium text-gray9D",
                "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
              )}
            >
              Risk Premium
            </p>
            <p
              className={twJoin(
                "font-medium text-whitef0",
                "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
              )}
            >
              {selectedOrderSide === TradeOptionType.BUY
                ? advancedFormatNumber(spreadForBuy, 2, "") + "%"
                : advancedFormatNumber(spreadForSell, 2, "") + "%"}
            </p>
          </div>
          {selectedOrderSide === TradeOptionType.BUY ? (
            <div className={twJoin("w-[calc(100%/3)]", "flex flex-col gap-y-2")}>
              <p
                className={twJoin(
                  "font-medium text-gray9D",
                  "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
                )}
              >
                Ask IV
              </p>
              <p
                className={twJoin(
                  "font-medium text-whitef0",
                  "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
                )}
              >
                {estimatedIvForBuy <= 0 || estimatedIvForBuy >= 3
                  ? "-"
                  : advancedFormatNumber(BigNumber(estimatedIvForBuy).multipliedBy(100).toNumber(), 1, "") +
                    "%"}
              </p>
            </div>
          ) : (
            <div className={twJoin("w-[calc(100%/3)]", "flex flex-col gap-y-2")}>
              <p
                className={twJoin(
                  "font-medium text-gray9D",
                  "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
                )}
              >
                Bid IV
              </p>
              <p
                className={twJoin(
                  "font-medium text-whitef0",
                  "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
                )}
              >
                {estimatedIvForSell <= 0 || estimatedIvForSell >= 3
                  ? "-"
                  : advancedFormatNumber(BigNumber(estimatedIvForSell).multipliedBy(100).toNumber(), 1, "") +
                    "%"}
              </p>
            </div>
          )}
          <div className={twJoin("w-[calc(100%/3)]", "flex flex-col gap-y-2")}>
            <p
              className={twJoin(
                "font-medium text-gray9D",
                "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
              )}
            >
              Leverage
            </p>
            <p
              className={twJoin(
                "font-medium text-whitef0",
                "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
              )}
            >
              x
              {isComboMode ? advancedFormatBigNumber(leverageAtComboMode) : advancedFormatBigNumber(leverage)}
            </p>
          </div>
          <div className={twJoin("w-[calc(100%/3)]", "flex flex-col gap-y-2")}>
            <p
              className={twJoin(
                "font-medium text-gray9D",
                "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
              )}
            >
              Volume
            </p>
            <p
              className={twJoin(
                "font-medium text-whitef0",
                "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
              )}
            >
              {advancedFormatNumber(selectedOption.volume / 1000, 2, "$")}K
            </p>
          </div>
        </div>

        <SelectedOptionChart
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
        />

        {/* Greeks of Selected Option */}
        <div className="flex flex-col gap-y-4">
          <div
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[13px] leading-[16px] md:text-[15px] md:leading-[18px]"
            )}
          >
            Greeks
          </div>
          <div className="flex flex-row justify-between">
            <div className="flex flex-col gap-y-2">
              <p
                className={twJoin(
                  "font-medium text-gray9D",
                  "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
                )}
              >
                Delta
              </p>
              <p
                className={twJoin(
                  "font-medium text-whitef0",
                  "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
                )}
              >
                {advancedFormatNumber(greeks.delta || 0, 2, "")}
              </p>
            </div>
            <div className="flex flex-col gap-y-2">
              <p
                className={twJoin(
                  "font-medium text-gray9D",
                  "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
                )}
              >
                Gamma
              </p>
              <p
                className={twJoin(
                  "font-medium text-whitef0",
                  "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
                )}
              >
                {advancedFormatNumber(greeks.gamma || 0, 6, "")}
              </p>
            </div>
            <div className="flex flex-col gap-y-2">
              <p
                className={twJoin(
                  "font-medium text-gray9D",
                  "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
                )}
              >
                Vega
              </p>
              <p
                className={twJoin(
                  "font-medium text-whitef0",
                  "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
                )}
              >
                {advancedFormatNumber(greeks.vega || 0, 2, "")}
              </p>
            </div>
            <div className="flex flex-col gap-y-2">
              <p
                className={twJoin(
                  "font-medium text-gray9D",
                  "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
                )}
              >
                Theta
              </p>
              <p
                className={twJoin(
                  "font-medium text-whitef0",
                  "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
                )}
              >
                {advancedFormatNumber(greeks.theta || 0, 2, "")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[48px]">
        <Button
          name={`${selectedOrderSide} ${selectedOptionDirection} ${isComboMode ? "Spread" : ""}`}
          color={selectedOrderSide === "Buy" ? "green" : "red"}
          onClick={() => {
            setShowSelectedOptionHighLevel(true);
            dispatch(setModalNameList([...modalNameList, ModalName.SELECTED_OPTION]));
          }}
        />
      </div>
    </div>
  );
};

export default SelectedOption;
