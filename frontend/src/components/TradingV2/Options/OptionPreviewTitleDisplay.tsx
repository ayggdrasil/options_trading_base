import {
  IMarketSlice,
  IOptionDetail,
} from "@/interfaces/interfaces.marketSlice";
import { UnderlyingAsset } from "@callput/shared";
import { advancedFormatNumber, formatNumber } from "@/utils/helper";
import { OptionDirection, OrderSide, OptionStrategy } from "@/utils/types";
import { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import Dropdown from "@/components/Common/Dropdown";
import {
  findOptionPairs,
  getBestOptionPair,
  getGreeks,
} from "../utils/options";
import { useAppSelector } from "@/store/hooks";
import { Strategy } from "@callput/shared";

import IconArrSelDown from "@assets/img/icon/arr-selector-down.png";
import IconArrSelUp from "@assets/img/icon/arr-selector-up.png";
import IconDropdownSel from "@assets/img/icon/dropdown-sel.png";

interface OptionPreviewTitleDisplayProps {
  selectedOption: IOptionDetail;
  underlyingAsset: UnderlyingAsset;
  expiry: number;
  optionDirection: OptionDirection;
  orderSide: OrderSide;
  optionStrategy: OptionStrategy;
  selectedOptionPair: IOptionDetail;
  setSelectedOptionPair: (optionPair: IOptionDetail) => void;
  strategy: Strategy;
  markPriceForVanilla: number;
  markPriceForSpread: number;
  leverageForVanilla: number;
  leverageForSpread: number;
}

function OptionPreviewTitleDisplay({
  selectedOption,
  underlyingAsset,
  expiry,
  optionDirection,
  orderSide,
  optionStrategy,
  selectedOptionPair,
  setSelectedOptionPair,
  strategy,
  markPriceForVanilla,
  markPriceForSpread,
  leverageForVanilla,
  leverageForSpread,
}: OptionPreviewTitleDisplayProps) {
  const [optionList, setOptionList] = useState<IOptionDetail[]>([]);
  const [optionPairList, setOptionPairList] = useState<IOptionDetail[]>([]);
  const [isOptionPairListOpen, setIsOptionPairListOpen] =
    useState<boolean>(false);

  const marketData = useAppSelector(
    (state: any) => state.market
  ) as IMarketSlice;
  const market = marketData.market;

  // 동일한 만기일의 모든 옵션 목록 설정
  useEffect(() => {
    if (expiry === 0) return setOptionList([]);

    const marketExpiries = market[underlyingAsset].expiries;

    if (marketExpiries.length === 0) return setOptionList([]);
    if (!marketExpiries.includes(expiry)) return setOptionList([]);

    const targetOptions =
      optionDirection === "Call"
        ? market[underlyingAsset].options[expiry].call
        : market[underlyingAsset].options[expiry].put;

    const filteredTargetOptions = targetOptions.filter(
      (option: IOptionDetail) => option.isOptionAvailable
    );

    setOptionList(filteredTargetOptions);
  }, [market, underlyingAsset, expiry, optionDirection]);

  useEffect(() => {
    const optionPairList = findOptionPairs(
      orderSide,
      selectedOption,
      optionList
    );
    setOptionPairList(optionPairList);

    const isCurrentOptionPairValid = optionPairList.some(
      (option) => option.optionId === selectedOptionPair.optionId
    );

    if (!isCurrentOptionPairValid) {
      const bestOptionPair = getBestOptionPair(
        orderSide,
        selectedOption,
        optionPairList
      );
      setSelectedOptionPair(bestOptionPair);
    }
  }, [optionList, orderSide]);

  useEffect(() => {
    const optionPairList = findOptionPairs(
      orderSide,
      selectedOption,
      optionList
    );
    setOptionPairList(optionPairList);

    const bestOptionPair = getBestOptionPair(
      orderSide,
      selectedOption,
      optionPairList
    );
    setSelectedOptionPair(bestOptionPair);
  }, [selectedOption]);

  const handleOptionPairSelect = (option: IOptionDetail) => {
    setSelectedOptionPair(option);
  };

  const greeks = getGreeks({
    strategy,
    size: 1,
    mainOption: selectedOption,
    pairedOption: selectedOptionPair,
  });

  return (
    <div className="w-full h-fit flex flex-col">
      <div className="w-full h-fit flex flex-col gap-[2px] p-[20px]">
        <OptionDisplay
          orderSide={orderSide}
          optionDirection={optionDirection}
        />
        <div className="h-[32px] flex flex-row gap-[6px]">
          <p className="text-whitef2f2 text-[18px] font-[700] leading-[32px]">
            {selectedOption.instrument}
          </p>
          {optionStrategy === "Spread" && (
            <OptionPairSelector
              isOpen={isOptionPairListOpen}
              onToggle={() => setIsOptionPairListOpen(!isOptionPairListOpen)}
              selectedOptionPair={selectedOptionPair}
              optionPairList={optionPairList}
              onSelect={handleOptionPairSelect}
              optionDirection={optionDirection}
            />
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-fit flex flex-row items-center justify-center px-[20px]">
        <div className="w-full h-[1px] bg-black2023 my-[6px]" />
      </div>

      <div className="w-full h-fit flex flex-row justify-between px-[20px] py-[12px] gap-[20px]">
        <div className="flex-1 h-fit">
          <LeveragePriceDisplay leverage={leverageForSpread} price={markPriceForSpread} />
        </div>
        <div className="flex-1 h-fit">
          <GreeksDisplay
            delta={greeks.delta}
            gamma={greeks.gamma}
            vega={greeks.vega}
            theta={greeks.theta}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-fit flex flex-row items-center justify-center px-[20px]">
        <div className="w-full h-[1px] bg-black2023 my-[6px]" />
      </div>
    </div>
  );
}

export default OptionPreviewTitleDisplay;

const OptionDisplay = ({
  orderSide,
  optionDirection,
}: {
  orderSide: OrderSide;
  optionDirection: OptionDirection;
}) => (
  <div className="h-[24px] flex flex-row items-center">
    <p
      className={twJoin(
        "h-full text-[18px] font-[700] leading-normal",
        `${orderSide === "Buy" ? "text-green71b8" : "text-rede04a"}`
      )}
    >
      {orderSide} {optionDirection}
    </p>
  </div>
);

const OptionPairSelector = ({
  isOpen,
  onToggle,
  selectedOptionPair,
  optionPairList,
  onSelect,
  optionDirection,
}: {
  isOpen: boolean;
  onToggle: () => void;
  selectedOptionPair: IOptionDetail;
  optionPairList: IOptionDetail[];
  onSelect: (option: IOptionDetail) => void;
  optionDirection: OptionDirection;
}) => (
  <Dropdown
    trigger={
      <div
        className={twJoin(
          "cursor-pointer flex flex-row items-center justify-center gap-[2px] p-[6px] pr-[2px]",
          "w-fit h-[32px] rounded-[4px] bg-black181a",
          "hover:bg-black2023",
          "active:scale-95 active:opacity-80"
        )}
      >
        <p
          className={twJoin(
            "text-gray8c8c text-[13px] font-[600] leading-[18px]",
            optionDirection === "Call"
              ? "border-t-[1px] border-t-gray8c8c"
              : "border-b-[1px] border-b-gray8c8c"
          )}
        >
          {Number(selectedOptionPair.strikePrice)}
        </p>
        <img
          className="w-[16px] h-[16px]"
          src={isOpen ? IconArrSelUp : IconArrSelDown}
        />
      </div>
    }
    isOpen={isOpen}
    onOpenChange={(open) => {
      if (open !== isOpen) {
        onToggle();
      }
    }}
    triggerDropdownGap={4}
    dropdownPosition="bottom-left"
  >
    {(closeDropdown) => (
      <>
        {optionPairList.map((option) => {
          const isSelected =
            option.instrument === selectedOptionPair.instrument;
          return (
            <div
              key={option.instrument}
              className={twJoin(
                "cursor-pointer flex flex-row items-center gap-[12px]",
                "w-full h-[30px] px-[16px] py-[6px]",
                "text-gray8c8c text-[13px] font-[500] leading-[18px]",
                "hover:bg-black292c hover:text-whitef2f2"
              )}
              onClick={() => {
                onSelect(option);
                closeDropdown();
              }}
            >
              <p>{Number(option.strikePrice)}</p>
              {isSelected ? (
                <img
                  src={IconDropdownSel}
                  className="w-[16px] h-[16px]"
                  alt="Selected"
                />
              ) : (
                <div className="w-[16px]" />
              )}
            </div>
          );
        })}
      </>
    )}
  </Dropdown>
);

const LeveragePriceDisplay = ({
  leverage,
  price,
  width = "100%",
}: {
  leverage: number;
  price: number;
  width?: string;
}) => (
  <div className={`w-[${width}] h-fit flex flex-col gap-[8px]`}>
    <div className={`flex flex-col`}>
      <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
        Leverage
      </p>
      <p className="h-[20px] text-whitef2f2 text-[12px] font-[600] leading-[20px]">
        {advancedFormatNumber(leverage, 0, "")}x
      </p>
    </div>
    <div className={`flex flex-col`}>
      <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
        Mark Price
      </p>
      <p className="h-[20px] text-whitef2f2 text-[12px] font-[600] leading-[20px]">
        {advancedFormatNumber(price, 2, "") + " " + "USD"}
      </p>
    </div>
  </div>
);

const GreeksDisplay = ({
  delta,
  gamma,
  vega,
  theta,
}: {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
}) => (
  <div className="w-full h-fit flex flex-col">
    <div className="w-full h-[20px] flex flex-row justify-between items-center">
      <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
        Delta
      </p>
      <p className="h-[20px] text-whitef2f2 text-[12px] font-[600] leading-[20px]">
        {advancedFormatNumber(delta, 2, "")}
      </p>
    </div>
    <div className="w-full h-[20px] flex flex-row justify-between items-center">
      <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
        Gamma
      </p>
      <p className="h-[20px] text-whitef2f2 text-[12px] font-[600] leading-[20px]">
        {advancedFormatNumber(gamma, 6, "")}
      </p>
    </div>
    <div className="w-full h-[20px] flex flex-row justify-between items-center">
      <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
        Vega
      </p>
      <p className="h-[20px] text-whitef2f2 text-[12px] font-[600] leading-[20px]">
        {advancedFormatNumber(vega, 2, "")}
      </p>
    </div>
    <div className="w-full h-[20px] flex flex-row justify-between items-center">
      <p className="h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]">
        Theta
      </p>
      <p className="h-[20px] text-whitef2f2 text-[12px] font-[600] leading-[20px]">
        {advancedFormatNumber(theta, 2, "")}
      </p>
    </div>
  </div>
);
