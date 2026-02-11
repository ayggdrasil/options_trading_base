import React, { useContext, useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";

import { advancedFormatNumber, formatDDMMMYY } from "@/utils/helper";
import { useAppSelector } from "@/store/hooks";
import { GroupedPosition, Position } from "@/interfaces/interfaces.positionSlice";
import { ModalContext } from "@/components/Common/ModalContext";

import IconDropdownDown from "@assets/mobile/icon-dropdown-down.svg";
import IconArrowPriceDown from "@assets/icon-arrow-price-down.svg";
import IconArrowPriceUp from "@assets/icon-arrow-price-up.svg";

import { UA_INFO } from "@/networks/assets";
import { getStrategyByOptionTokenId, isCallStrategy, UnderlyingAsset } from "@callput/shared";
import { NetworkState } from "@/networks/types";

type SelectedUnderlyingAssetDropDownProps = {
  futuresPrice: number;
  selectedExpiry: number;
  selectedUnderlyingAsset: string;
  setSelectedUnderlyingAsset: (value: any) => void;
};

interface PositionsLength {
  BTC: number;
  ETH: number;
}

interface SettlePrices {
  BTC: number;
  ETH: number;
}

interface SettlePricesItem {
  timestamp: number;
  data: SettlePrices;
}

interface SettlePricesData {
  [key: number]: SettlePrices;
}

const SelectUnderlyingAssetDropDown: React.FC<SelectedUnderlyingAssetDropDownProps> = ({
  futuresPrice,
  selectedUnderlyingAsset,
  selectedExpiry,
  setSelectedUnderlyingAsset,
}) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const positionsData = useAppSelector((state: any) => state.positions);
  const settlePricesData = useAppSelector((state: any) => state.market.settlePrices) as SettlePricesData;

  const { openModal, closeModal } = useContext(ModalContext);

  const [positions, setPositions] = useState<PositionsLength>({
    BTC: 0,
    ETH: 0,
  });
  const [lastSettlePrices, setLastSettlePrices] = useState<SettlePrices>({
    BTC: 0,
    ETH: 0,
  });

  useEffect(() => {
    setPositions({ BTC: 0, ETH: 0 });

    Object.keys(UA_INFO[chain]).forEach((asset) => {
      const expiriesInAsset = positionsData[asset];

      expiriesInAsset.forEach((expiryData: GroupedPosition) => {
        const isExpired = Number(expiryData.expiry) * 1000 < Date.now();
        const positionsInExpiry = expiryData.positions;

        if (isExpired) {
          const settlePriceInExpiry = expiryData.settlePrice;

          positionsInExpiry.forEach((position: Position) => {
            const strategy = getStrategyByOptionTokenId(BigInt(position.optionTokenId));
            const isITM = isCallStrategy(strategy)
              ? Number(position.mainOptionStrikePrice) < Number(settlePriceInExpiry)
              : Number(position.mainOptionStrikePrice) > Number(settlePriceInExpiry);

            if (isITM) {
              setPositions((prev) => ({
                ...prev,
                [asset]: prev[asset as keyof PositionsLength] + 1,
              }));
            }
          });
        } else {
          positionsInExpiry.forEach((position: Position) => {
            setPositions((prev) => ({
              ...prev,
              [asset]: prev[asset as keyof PositionsLength] + 1,
            }));
          });
        }
      });
    });
  }, [positionsData]);

  useEffect(() => {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const lastSettlePrices = Object.entries(settlePricesData).reduce<SettlePricesItem>(
      (closest, [timestamp, data]) => {
        if (
          Math.abs(Number(timestamp) - currentTimestamp) <
          Math.abs(Number(closest.timestamp) - currentTimestamp)
        ) {
          return { timestamp: Number(timestamp), data };
        }
        return closest;
      },
      { timestamp: 0, data: { BTC: 0, ETH: 0 } }
    );

    setLastSettlePrices(lastSettlePrices.data);
  }, [settlePricesData]);

  return (
    <div
      className={twJoin("flex flex-row justify-between items-center rounded-lg", "p-3 bg-[#232322]")}
      onClick={() => {
        openModal(
          <div className={twJoin("w-full px-[26px]", "flex flex-col gap-y-[10px]")}>
            {Object.keys(UA_INFO[chain]).map((asset, index) => (
              <React.Fragment key={index}>
                <button
                  key={asset}
                  className={twJoin(
                    "cursor-pointer flex flex-row justify-between items-center",
                    "w-full h-[42px]",
                    "text-[#F0EBE5]"
                  )}
                  onClick={() => {
                    setSelectedUnderlyingAsset(UA_INFO[chain][asset as UnderlyingAsset].symbol);
                    closeModal();
                  }}
                >
                  <div key={asset} className="flex flex-row items-center">
                    <img src={UA_INFO[chain][asset as UnderlyingAsset].src} className="w-[24px] h-[24px]" />
                    <p
                      className={twJoin(
                        "pl-[12px] whitespace-nowrap text-[16px] md:text-[18px] leading-[24px] font-semibold"
                      )}
                    >
                      {UA_INFO[chain][asset as UnderlyingAsset].name}
                    </p>
                  </div>
                  {positions[asset as keyof PositionsLength] > 0 && (
                    <div className="flex flex-row justify-center items-center px-[8px] bg-[#F74143] rounded-[12px]">
                      <p className="text-[12px] text-whitee0 font-normal">
                        {positions[asset as keyof PositionsLength]} positions
                      </p>
                    </div>
                  )}
                </button>
                {index < Object.keys(UA_INFO[chain]).length - 1 && (
                  <div className="w-full h-[1px] bg-[linear-gradient(180deg,#d8fee5_0%,#c0e4cd_100%)] opacity-10"></div>
                )}
              </React.Fragment>
            ))}
          </div>,
          { contentClassName: "min-h-[150px]" }
        );
      }}
    >
      {Object.keys(UA_INFO[chain])
        .filter((asset) => UA_INFO[chain][asset as UnderlyingAsset].symbol === selectedUnderlyingAsset)
        .map((asset) => {
          return (
            <div key={asset} className="flex flex-row gap-x-4 items-center">
              <img
                src={UA_INFO[chain][asset as UnderlyingAsset].src}
                className="w-[32px] h-[32px] flex-shrink-0"
              />
              <div className="flex flex-col pt-[1px] pb-[2px]">
                <p
                  style={{ color: UA_INFO[chain][asset as UnderlyingAsset].color }}
                  className={twJoin(
                    `text-[${UA_INFO[chain][asset as UnderlyingAsset].color}]`,
                    "whitespace-nowrap font-bold",
                    "text-[16px] leading-[24px] md:text-[18px]"
                  )}
                >
                  {UA_INFO[chain][asset as UnderlyingAsset].symbol}
                </p>
                <p
                  className={twJoin(
                    "font-medium text-[#808080]",
                    "text-[12px] leading-[15px] md:text-[14px]"
                  )}
                >
                  {formatDDMMMYY(selectedExpiry.toString())}
                </p>
              </div>
            </div>
          );
        })}
      <div className="flex flex-row gap-x-3 items-center">
        <div className="flex flex-col gap-y-[4px] pt-[5px]">
          <p className={twJoin("font-medium text-[#808080]", "text-[12px] leading-[15px] md:text-[14px]")}>
            Spot Price
          </p>
          <div className="flex flex-row gap-x-1">
            <p
              className={twJoin(
                "font-semibold text-[#F0EBE5]",
                "text-[12px] leading-[18px] md:text-[14px]"
              )}
            >
              {advancedFormatNumber(futuresPrice, 2, "$")}
            </p>
            <div className="flex flex-row items-center gap-x-1">
              {futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] === 0 ? (
                <p></p>
              ) : futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] > 0 ? (
                <img src={IconArrowPriceUp} className="w-[8px] h-[6px] object-cover flex-shrink-0" />
              ) : (
                <img src={IconArrowPriceDown} className="w-[8px] h-[6px] object-cover flex-shrink-0" />
              )}
              <div
                className={twJoin(
                  futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] === 0
                    ? "text-gray80"
                    : futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] > 0
                    ? "text-green63"
                    : "text-[#E03F3F]",
                  "flex flex-row justify-center items-center",
                  "font-semibold",
                  "text-[12px] leading-[18px] md:text-[14px]"
                )}
              >
                {advancedFormatNumber(
                  Math.abs(
                    (futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices]) /
                      lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices]
                  ) * 100,
                  2
                )}
                %
              </div>
            </div>
          </div>
        </div>
        <img className="w-[18px] h-[18px] min-w-[18px] min-h-[18px]" src={IconDropdownDown} />
      </div>
    </div>
  );
};

export default SelectUnderlyingAssetDropDown;
