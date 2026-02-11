import React, { Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber } from "@/utils/helper";
import { useAppSelector } from "@/store/hooks";
import { GroupedPosition, Position } from "@/interfaces/interfaces.positionSlice";
import { ModalContext } from "@/components/Common/ModalContext";
import IconArrowPriceDown from "@assets/icon-arrow-price-down.svg";
import IconArrowPriceUp from "@assets/icon-arrow-price-up.svg";
import { DropdownDownIconMedium, DropdownUpIconMedium } from "@/assets/mobile/icon";
import { UA_INFO, UA_INFO_WITH_ALL } from "@/networks/assets";
import { NetworkState } from "@/networks/types";
import { getStrategyByOptionTokenId, isCallStrategy, UnderlyingAsset, UnderlyingAssetWithAll } from "@callput/shared";

type SelectedUnderlyingAssetDropDownProps = {
  futuresPrice: number;
  selectedUnderlyingAsset: string;
  setSelectedUnderlyingAsset: (value: any) => void;
  isAbbreviated?: boolean;
};

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

interface OpenPositionsLength {
  ALL: number;
  BTC: number;
  ETH: number;
}

const SelectUnderlyingAssetSelect: React.FC<SelectedUnderlyingAssetDropDownProps> = ({
  futuresPrice,
  selectedUnderlyingAsset,
  setSelectedUnderlyingAsset,
}) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const positionsData = useAppSelector((state: any) => state.positions);
  const settlePricesData = useAppSelector((state: any) => state.market.settlePrices) as SettlePricesData;

  const dropDownRef = useRef<HTMLDivElement>(null);
  const { openModal, closeModal } = useContext(ModalContext);
  const [lastSettlePrices, setLastSettlePrices] = useState<SettlePrices>({
    BTC: 0,
    ETH: 0,
  });
  const [hasPositionsInNotSelectedAsset, setHasPositionsInNotSelectedAsset] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [openPositionsLength, setOpenPositionsLength] = useState<OpenPositionsLength>({
    ALL: 0,
    BTC: 0,
    ETH: 0,
  });

  useEffect(() => {
    setOpenPositionsLength({ ALL: 0, BTC: 0, ETH: 0 });

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
              setOpenPositionsLength((prev) => ({
                ...prev,
                [asset]: prev[asset as keyof OpenPositionsLength] + 1,
                ALL: prev.ALL + 1,
              }));
            }
          });
        } else {
          positionsInExpiry.forEach((position: Position) => {
            setOpenPositionsLength((prev) => ({
              ...prev,
              [asset]: prev[asset as keyof OpenPositionsLength] + 1,
              ALL: prev.ALL + 1,
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

  useEffect(() => {
    const hasPositionsInNotSelectedAsset = Object.keys(UA_INFO_WITH_ALL[chain]).some((asset) => {
      return asset !== selectedUnderlyingAsset && openPositionsLength[asset as keyof OpenPositionsLength] > 0;
    });
    setHasPositionsInNotSelectedAsset(hasPositionsInNotSelectedAsset);
  }, [openPositionsLength, selectedUnderlyingAsset]);

  useEffect(() => {
    document.body.addEventListener("click", (event) => {
      if (dropDownRef.current?.contains(event.target as Node)) return;
      setIsDropdownOpen(false);
    });
  }, []);

  return (
    <div>
      <div
        className={twJoin(
          "cursor-pointer flex flex-row items-center justify-between",
          "w-full h-[56px] pl-[16px] pr-[12px] py-[12px]",
          "bg-[#232322] rounded-lg"
        )}
        ref={dropDownRef}
        onClick={() => {
          setIsDropdownOpen(!isDropdownOpen);
          openModal(
            <div className="flex flex-col gap-[10px] px-[26px]">
              {Object.keys(UA_INFO_WITH_ALL[chain]).map((asset, index) => {
                return (
                  <React.Fragment key={index}>
                    <div
                      className="flex items-center h-[42px] justify-between"
                      onClick={() => {
                        setSelectedUnderlyingAsset(UA_INFO_WITH_ALL[chain][asset as UnderlyingAsset].symbol);
                        closeModal();
                        setIsDropdownOpen(false);
                      }}
                    >
                      <div className="flex gap-3">
                        <img className="h-[24px] w-auto" src={UA_INFO_WITH_ALL[chain][asset as UnderlyingAsset].src} alt="coin" />
                        <p className="text-contentBright text-base md:text-lg font-semibold">
                          {UA_INFO_WITH_ALL[chain][asset as UnderlyingAsset].name}
                        </p>
                      </div>
                      {openPositionsLength[asset as keyof OpenPositionsLength] > 0 && (
                        <div className="flex flex-row justify-center items-center px-[8px] bg-redE0 rounded-[32px]">
                          <p className="text-[12px] md:text-[14px] text-contentBright font-normal">
                            {openPositionsLength[asset as keyof OpenPositionsLength]} positions
                          </p>
                        </div>
                      )}
                    </div>
                    {index !== 2 && <div className="w-full h-[1px] bg-text opacity-10"></div>}
                  </React.Fragment>
                );
              })}
            </div>,
            {}
          );
        }}
      >
        <div className="flex flex-row items-center gap-[8px]">
          {Object.keys(UA_INFO_WITH_ALL[chain])
            .filter((asset) => UA_INFO_WITH_ALL[chain][asset as UnderlyingAsset].symbol === selectedUnderlyingAsset)
            .map((asset) => {
              return (
                <div key={asset} className="flex flex-row items-center">
                  <img src={UA_INFO_WITH_ALL[chain][asset as UnderlyingAsset].src} className="w-[32px] h-[32px]" />
                  <p
                    style={{ color: UA_INFO_WITH_ALL[chain][asset as UnderlyingAsset].color }}
                    className={twJoin(
                      `text-[${UA_INFO_WITH_ALL[chain][asset as UnderlyingAsset].color}]`,
                      "pl-4 whitespace-nowrap text-base md:text-lg font-bold"
                    )}
                  >
                    {UA_INFO_WITH_ALL[chain][asset as UnderlyingAsset].symbol.replace("_", " ")}
                  </p>
                </div>
              );
            })}
        </div>
        <div className="flex flex-row gap-3 ml-[12px]">
          {selectedUnderlyingAsset !== UnderlyingAssetWithAll.ALL && (
            <>
              <div className="flex flex-row justify-center items-center text-xs md:text-sm font-semibold">
                <div className="text-contentBright">{advancedFormatNumber(futuresPrice, 2, "$")}</div>
              </div>
              <div className="flex flex-row items-center gap-[4px]">
                {futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] === 0 ? (
                  <p></p>
                ) : futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] > 0 ? (
                  <img src={IconArrowPriceUp} className="w-[8px] h-[8px]" />
                ) : (
                  <img src={IconArrowPriceDown} className="w-[8px] h-[8px]" />
                )}
                <div
                  className={twJoin(
                    futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] === 0
                      ? "text-contentBright"
                      : futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] > 0
                      ? "text-green63"
                      : "text-redE0",
                    "flex flex-row justify-center items-center",
                    "text-xs md:text-sm font-semibold"
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
            </>
          )}
          <div className="flex">
            {!isDropdownOpen ? (
              <DropdownDownIconMedium className="text-contentBright" />
            ) : (
              <DropdownUpIconMedium className="text-contentBright" />
            )}
            {!isDropdownOpen && hasPositionsInNotSelectedAsset ? (
              <div className="w-[5px] h-[5px] bg-redE0 rounded-full" />
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectUnderlyingAssetSelect;
