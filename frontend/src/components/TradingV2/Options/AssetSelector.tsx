import { useState } from "react";
import { useUAPriceChangeRate } from "@/hooks/market";
import { useHasPosition } from "@/hooks/user";
import { UA_INFO } from "@/networks/assets";
import { SupportedChains } from "@callput/shared";
import {
  FuturesAssetIndexMap,
  NormalizedFuturesAsset,
  UnderlyingAsset,
} from "@callput/shared";
import { useAppSelector } from "@/store/hooks";
import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import { NetworkState } from "@/networks/types";
import Dropdown from "@/components/Common/Dropdown";

import IconPriceUp from "@assets/img/icon/price-up.png";
import IconPriceDown from "@assets/img/icon/price-down.png";
import IconArrSelUp from "@assets/img/icon/arr-selector-up.png";
import IconArrSelDown from "@assets/img/icon/arr-selector-down.png";

interface AssetSelectorProps {
  selectedUnderlyingAsset: UnderlyingAsset;
  setSelectedUnderlyingAsset: (underlyingAsset: UnderlyingAsset) => void;
}

function AssetSelector({
  selectedUnderlyingAsset,
  setSelectedUnderlyingAsset,
}: AssetSelectorProps) {
  const { chain } = useAppSelector((state) => state.network) as NetworkState;
  const futuresAssetIndexMap = useAppSelector(
    (state: any) => state.market.futuresAssetIndexMap
  ) as FuturesAssetIndexMap;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const availableAssets = Object.keys(UA_INFO[chain]) as UnderlyingAsset[];

  return (
    <div className="h-full flex flex-row items-center justify-center">
      <Dropdown
        trigger={
          <button
            className={twJoin(
              "cursor-pointer flex flex-row items-center justify-between gap-[8px]",
              "h-[56px] p-[8px] rounded-[6px]",
              "hover:bg-black2023",
              "active:opacity-80 active:scale-95"
            )}
          >
            <AssetButtonContent
              asset={selectedUnderlyingAsset}
              chain={chain}
              futuresPrice={
                futuresAssetIndexMap[
                  selectedUnderlyingAsset as NormalizedFuturesAsset
                ]
              }
            />
            <img
              src={isDropdownOpen ? IconArrSelUp : IconArrSelDown}
              className="w-[18px] h-[18px] ml-[8px]"
            />
          </button>
        }
        isOpen={isDropdownOpen}
        onOpenChange={setIsDropdownOpen}
        triggerDropdownGap={4}
        dropdownPosition="bottom-left"
        dropdownWidth="215px"
      >
        {(closeDropdown) =>
          availableAssets.map((asset) => (
            <button
              key={asset}
              className={twJoin(
                "cursor-pointer w-full h-[36px] flex flex-row items-center",
                "px-[8px] py-[6px]",
                "hover:bg-black292c"
              )}
              onClick={() => {
                setSelectedUnderlyingAsset(asset);
                closeDropdown();
              }}
            >
              <AssetMenuItem
                asset={asset}
                chain={chain}
                futuresPrice={
                  futuresAssetIndexMap[asset as NormalizedFuturesAsset]
                }
              />
            </button>
          ))
        }
      </Dropdown>
    </div>
  );
}

export default AssetSelector;

interface AssetItemProps {
  asset: UnderlyingAsset;
  chain: SupportedChains;
  futuresPrice: number;
}

function AssetButtonContent({ asset, chain, futuresPrice }: AssetItemProps) {
  const assetInfo = UA_INFO[chain][asset];
  const hasPositionInAsset = useHasPosition();

  const { diff, changeRate } = useUAPriceChangeRate({
    futuresPrice,
    underlyingAsset: asset,
  });

  return (
    <div className="flex flex-row items-center gap-[16px]">
      <div className="relative">
        <img src={assetInfo.src} className="w-[28px] h-[28px]" />
        {hasPositionInAsset[asset] && (
          <div
            className={twJoin(
              "absolute top-[-1px] right-[-2px]",
              "w-[9px] h-[9px] bg-[#F74143] rounded-full",
              "border-[1px] border-black29"
            )}
          />
        )}
      </div>
      <div className="flex flex-col items-baseline gap-[2px]">
        <p className="h-[24px] text-whitef2f2 text-[18px] font-[700] leading-[24px]">
          {assetInfo.symbol} Options
        </p>
        <div className="flex items-center h-[14px] gap-[2px]">
          <div className="text-gray8c8c text-[12px] font-[500] leading-[14px]">
            {advancedFormatNumber(futuresPrice, 2, "$")}
          </div>
          <PriceChangeIndicator diff={diff} changeRate={changeRate} />
        </div>
      </div>
    </div>
  );
}

function AssetMenuItem({ asset, chain, futuresPrice }: AssetItemProps) {
  const assetInfo = UA_INFO[chain][asset];
  const hasPositionInAsset = useHasPosition();
  return (
    <div className="h-full flex flex-row items-center gap-[6px]">
      <div className="relative">
        <img src={assetInfo.offSrc} className="w-[24px] h-[24px]" />
        {hasPositionInAsset[asset] && (
          <div
            className={twJoin(
              "absolute top-[-1px] right-[-2px]",
              "w-[9px] h-[9px] bg-[#F74143] rounded-full",
              "border-[1px] border-black29"
            )}
          />
        )}
      </div>
      <p className="h-full text-graybfbf text-[14px] font-[500] leading-[24px]">
        {assetInfo.symbol} Options
      </p>
      <p className="h-full text-gray8c8c text-[12px] font-[500] leading-[24px]">
        {advancedFormatNumber(futuresPrice, 2, "$")}
      </p>
    </div>
  );
}

function PriceChangeIndicator({
  diff,
  changeRate,
}: {
  diff: number;
  changeRate: number;
}) {
  return (
    <div className="flex flex-row items-center gap-[2px]">
      {diff === 0 ? (
        <p></p>
      ) : diff > 0 ? (
        <img src={IconPriceUp} className="w-[10px] h-[10px]" />
      ) : (
        <img src={IconPriceDown} className="w-[10px] h-[10px]" />
      )}

      <p
        className={twJoin(
          diff === 0
            ? "text-gray8c8c"
            : diff > 0
              ? "text-green71b8"
              : "text-rede04a",
          "text-[12px] font-[500] leading-[14px]"
        )}
      >
        {advancedFormatNumber(changeRate, 2)}%
      </p>
    </div>
  );
}
