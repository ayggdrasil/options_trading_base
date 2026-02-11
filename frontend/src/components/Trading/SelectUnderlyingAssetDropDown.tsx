import BigNumber from "bignumber.js";
import { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import IconDropdownDown from "@assets/icon-dropdown-down.svg";
import IconDropdownUp from "@assets/icon-dropdown-up.svg";
import IconArrowPriceDown from "@assets/icon-arrow-price-down.svg";
import IconArrowPriceUp from "@assets/icon-arrow-price-up.svg";
import { advancedFormatNumber } from "@/utils/helper";
import { useAppSelector } from "@/store/hooks";
import { GroupedPosition, Position } from "@/interfaces/interfaces.positionSlice";
import { UA_INFO } from "@/networks/assets";
import { UnderlyingAsset } from "@callput/shared";
import { NetworkState } from "@/networks/types";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

type SelectedUnderlyingAssetDropDownProps = {
  futuresPrice: number;
  selectedUnderlyingAsset: string;
  setSelectedUnderlyingAsset: (value: any) => void;
  isAbbreviated?: boolean;
}

interface PositionsLength {
  BTC: number;
  ETH: number;
}

interface SettlePrices {
  BTC: number;
  ETH: number;
}

interface SettlePricesItem {
  timestamp: number,
  data: SettlePrices
}

interface SettlePricesData {
  [key: number]: SettlePrices
}

const SelectUnderlyingAssetDropDown: React.FC<SelectedUnderlyingAssetDropDownProps> = ({ futuresPrice, selectedUnderlyingAsset, setSelectedUnderlyingAsset, isAbbreviated = false }) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const positionsData = useAppSelector((state: any) => state.positions);
  const settlePricesData = useAppSelector((state: any) => state.market.settlePrices) as SettlePricesData;

  const dropDownRef = useRef<HTMLDivElement>(null)

  const [positions, setPositions] = useState<PositionsLength>({ BTC: 0, ETH: 0,})
  const [lastSettlePrices, setLastSettlePrices] = useState<SettlePrices>({ BTC: 0, ETH: 0,});
  const [hasPositionsInNotSelectedAsset, setHasPositionsInNotSelectedAsset] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    setPositions({ BTC: 0, ETH: 0 })

    Object.keys(UA_INFO[chain]).forEach((asset) => {
      const expiriesInAsset = positionsData[asset];

      expiriesInAsset.forEach((expiryData: GroupedPosition) => {
        const expiry = Number(expiryData.expiry);
        const isExpired = expiry && expiry * 1000 < Date.now();
        const isZeroDte = expiry && expiry * 1000 < Date.now() + 24 * 60 * 60 * 1000;

        const positionsInExpiry = expiryData.positions;

        if (isExpired) {
          positionsInExpiry.forEach((position: Position) => {
            setPositions((prev) => ({
              ...prev,
              [asset]: prev[asset as keyof PositionsLength] + 1
            }))
          })
        } else if (isZeroDte) {
          positionsInExpiry.forEach((position: Position) => {
            setPositions((prev) => ({
              ...prev,
              [asset]: prev[asset as keyof PositionsLength] + 1
            }))
          })
        }
      })
    })
  }, [positionsData])

  useEffect(() => {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const lastSettlePrices = Object.entries(settlePricesData)
      .reduce<SettlePricesItem>((closest, [timestamp, data]) => {
        if (Math.abs(Number(timestamp) - currentTimestamp) < Math.abs(Number(closest.timestamp) - currentTimestamp)) {
          return { timestamp: Number(timestamp), data }
        }
        return closest;
      }, { timestamp: 0, data: { BTC: 0, ETH: 0 }})

    setLastSettlePrices(lastSettlePrices.data)
  }, [settlePricesData])

  useEffect(() => {
    const hasPositionsInNotSelectedAsset = Object.keys(UA_INFO).some((asset) => {
      return asset !== selectedUnderlyingAsset && positions[asset as keyof PositionsLength] > 0;
    })
    setHasPositionsInNotSelectedAsset(hasPositionsInNotSelectedAsset)
  }, [positions, selectedUnderlyingAsset])
  
  useEffect(() => {
    document.body.addEventListener("click", event => {
      if (dropDownRef.current?.contains(event.target as Node)) return;
      setIsDropdownOpen(false);
    })
  }, []);

  return (
    <div className={`relative ${isAbbreviated ? "w-fit" : "w-[345px]"}`}>
      <div
        className={twJoin(
          "cursor-pointer flex flex-row items-center justify-between",
          "w-full h-[48px] pl-[8px] pr-[16px] py-[12px]",
          "bg-black17 rounded-[6px]",
          "hover:bg-black21 active:bg-black12 active:opacity-80 active:scale-95"
        )}
        ref={dropDownRef}
        onClick={() => {
          setIsDropdownOpen(!isDropdownOpen);
        }}
      >
        <div className="flex flex-row items-center gap-[8px]">
          {Object.keys(UA_INFO[chain])
            .filter((asset) => UA_INFO[chain][asset as UnderlyingAsset].symbol === selectedUnderlyingAsset)
            .map((asset) => {
              return <div
                key={asset}
                className="flex flex-row items-center"
              >
                <img src={UA_INFO[chain][asset as UnderlyingAsset].src} className="w-[32px] h-[32px]"/>
                <p
                  style={{ color: UA_INFO[chain][asset as UnderlyingAsset].color }}
                  className={twJoin(
                    `text-[${UA_INFO[chain][asset as UnderlyingAsset].color}]`,
                    "pl-[10px] whitespace-nowrap text-[20px] font-bold"
                  )}
                >{UA_INFO[chain][asset as UnderlyingAsset].symbol}</p>
              </div>
            })}
          <div className="flex flex-row justify-center items-center text-[18px] font-semibold">
            <div className="text-whitee0">{advancedFormatNumber(futuresPrice, 2, "$")}</div>
          </div>
          <div className="flex flex-row items-center gap-[4px]">
            {futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] === 0
              ? <p></p>
              : futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] > 0
                ? <img src={IconArrowPriceUp} className="w-[12px] h-[12px]"/>
                : <img src={IconArrowPriceDown} className="w-[12px] h-[12px]"/>
            }
            <div className={twJoin(
              futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] === 0
                ? "text-gray80"
                : futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices] > 0
                  ? "text-green63"
                  : "text-[#E03F3F]",
              "flex flex-row justify-center items-center",
              "text-[18px] font-semibold",
            )}>
              {advancedFormatNumber(
                Math.abs((futuresPrice - lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices]) / lastSettlePrices[selectedUnderlyingAsset as keyof SettlePrices]) * 100,
                2,
              )}%
            </div>
          </div>
        </div>
        <div className="flex flex-row ml-[12px]">
          {!isDropdownOpen ? (
            <img className="cursor-pointer w-[18px] h-[18px] min-w-[18px] min-h-[18px]" src={IconDropdownDown} onClick={() => setIsDropdownOpen(!isDropdownOpen)} />
          ) : (
            <img className="cursor-pointer w-[18px] h-[18px] min-w-[18px] min-h-[18px]" src={IconDropdownUp} onClick={() => setIsDropdownOpen(!isDropdownOpen)}/>
          )}
          {!isDropdownOpen && hasPositionsInNotSelectedAsset
            ? <div className="w-[6px] h-[6px] bg-[#F74143] rounded-full"/>
            : <div className="w-[6px] h-[6px] bg-transparent rounded-full"/>
          }
        </div>
      </div>
      {isDropdownOpen && (
        <div
          className={twJoin(
            "z-20 absolute top-[56px]",
            "w-full p-[4px]",
            "bg-black1f rounded-[4px] shadow-[0px_0px_36px_0_rgba(10,10,10,0.72)]"
          )}
        >
          {Object.keys(UA_INFO[chain]).map((asset) => (
            <button 
              key={asset}
              className={twJoin(
                "cursor-pointer flex flex-row justify-between items-center",
                "w-full h-[44px] px-[8px]",
                "text-whitee0",
                "hover:bg-black29 hover:rounded-[3px] hover:text-greenc1",
                "active:bg-black1f active:opacity-80 active:scale-95"
              )}
              type="submit"
              onClick={() => {
                setSelectedUnderlyingAsset(UA_INFO[chain][asset as UnderlyingAsset].symbol)
              }}
            >
              <div key={asset} className="flex flex-row items-center">
                <img src={UA_INFO[chain][asset as UnderlyingAsset].src} className="w-[28px] h-[28px]"/>
                <p className="pl-[14px] whitespace-nowrap text-[18px] font-semibold">{UA_INFO[chain][asset as UnderlyingAsset].name}</p>
              </div>
              {positions[asset as keyof PositionsLength] > 0 && (
                <div className="flex flex-row justify-center items-center px-[8px] bg-[#F74143] rounded-[12px]">
                <p className="text-[12px] text-whitee0 font-normal">{positions[asset as keyof PositionsLength]} positions</p>
              </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectUnderlyingAssetDropDown;
