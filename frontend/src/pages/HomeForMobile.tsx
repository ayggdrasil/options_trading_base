import BigNumber from "bignumber.js";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { HistoryFilterType, HistoryRangeType, TradeDataMenuType } from "@/utils/types";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { loadAllowanceForController } from "@/store/slices/UserSlice";
import { timeSince } from "@/utils/helper";
import { ModalContext } from "@/components/Common/ModalContext";

import "../customScrollbar.css";

import { calculateTimestamp } from "@/components/Common/TimeRangeSelector";
import HistoryCards from "@/components/Trading/Mobile/HistoryCard";
import MyPositionCard from "@/components/Trading/Mobile/MyPositionCard";
import SelectUnderlyingAssetSelect from "@/components/Trading/Mobile/SelectUnderlyingAssetSelect";
import PositionDashboard from "@/components/Trading/Mobile/PositionDashboard";

import { DropdownDownIconMedium, DropdownUpIconMedium } from "@assets/mobile/icon";
import { NetworkState } from "@/networks/types";
import {
  historyRangeTypeOptions,
  historyTypeOptions,
  __positionHistoryData,
  __positionsData,
  TradeDataMenu,
} from "@/utils/constants";

import { CUSTOM_CSS } from "@/networks/configs";
import { FuturesAssetIndexMap, NormalizedFuturesAsset, UnderlyingAssetWithAll } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface TradingProps {
  headerHeight?: number;
}

function HomeForMobile({ headerHeight }: TradingProps) {
  const dispatch = useAppDispatch();

  const { address } = useAccount();

  // Fetching Data
  const { openModal, closeModal } = useContext(ModalContext);
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const optionsInfo = useAppSelector((state: any) => state.market.optionsInfo);
  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;
  const positionsData = useAppSelector((state: any) => state.positions);
  const positionHistoryData = useAppSelector((state: any) => state.positionHistory);

  // State (기초자산, 만기일, 옵션 관련 상태값)
  const [selectedUnderlyingAsset, setSelectedUnderlyingAsset] = useState<UnderlyingAssetWithAll>(
    () => {
      const savedUnderlyingAsset = localStorage.getItem("selectedUnderlyingAssetForHome");
      return savedUnderlyingAsset
        ? (savedUnderlyingAsset as UnderlyingAssetWithAll)
        : UnderlyingAssetWithAll.ALL;
    }
  );

  const [selectedTradeDataMenuType, setSelectedTradeDataMenuType] =
    useState<TradeDataMenuType>("My Positions");

  const [selectedHistoryRangeType, setSelectedHistoryRangeType] = useState<HistoryRangeType>("1 Day");

  const [selectedHistoryTimestamp, setSelectedHistoryTimestamp] = useState<number>(
    Math.floor(new Date().getTime() / 1000) - 86400
  );

  const [selectedHistoryFilterType, setSelectedHistoryFilterType] = useState<HistoryFilterType>("All Types");

  const [historyData, setHistoryData] = useState<any>([]);

  const _positionsData = useMemo(() => {
    return {
      ...positionsData,
      ALL: [...(positionsData.BTC || []), ...(positionsData.ETH || [])].sort((a, b) => b.expiry - a.expiry),
    };
  }, [positionsData]);

  const _positionHistoryData = useMemo(() => {
    return {
      ...positionHistoryData,
      ALL: [...(positionHistoryData.BTC || []), ...(positionHistoryData.ETH || [])].sort(
        (a, b) => b.processBlockTime - a.processBlockTime
      ),
    };
  }, [positionHistoryData]);

  useEffect(() => {
    localStorage.setItem("selectedUnderlyingAssetForHome", selectedUnderlyingAsset);
  }, [selectedUnderlyingAsset]);

  useEffect(() => {
    dispatch(
      loadAllowanceForController({ chain, address })
    );
  }, [address]);

  // State (선물 가격 상태값)
  const futuresIndex = futuresAssetIndexMap[selectedUnderlyingAsset as NormalizedFuturesAsset];
  const positionTableRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className={twJoin("pt-3 pb-[72px] w-full h-full", "flex flex-row justify-center items-center")}>
      <div
        className={twJoin("w-full flex flex-col px-3 md:px-6")}
        style={{
          height:
            selectedTradeDataMenuType === "My Positions"
              ? _positionsData[selectedUnderlyingAsset]?.length === 0
                ? `calc(100vh - ${63 + (headerHeight || 0)}px)`
                : "auto"
              : historyData.length === 0
              ? `calc(100vh - ${63 + (headerHeight || 0)}px)`
              : "auto",
        }}
      >
        {/* Trade 페이지 상단 왼쪽 영역 - Dashboard */}
        <div className={twJoin("w-full", "flex flex-col gap-y-4")}>
          <div className="w-full">
            <SelectUnderlyingAssetSelect
              futuresPrice={futuresIndex}
              selectedUnderlyingAsset={selectedUnderlyingAsset}
              setSelectedUnderlyingAsset={setSelectedUnderlyingAsset}
            />
          </div>

          <PositionDashboard
            selectedUnderlyingAsset={selectedUnderlyingAsset}
            groupedPosition={_positionsData[selectedUnderlyingAsset] || []}
          />
        </div>
        <div
          className={twJoin(
            "w-full h-[1px] mt-6 mb-2",
            CUSTOM_CSS[chain].backgroundLineForMobile
          )}
        ></div>
        {/* My Position 영역 */}
        <div className="flex flex-col flex-1">
          <div
            style={{ top: `${headerHeight}px` }}
            className="flex flex-row items-center justify-between sticky top-[60px] bg-black03 z-10"
          >
            <div className="group flex flex-row items-center gap-4 h-[34px]">
              {TradeDataMenu.map((item: any) => {
                return (
                  <p
                    key={item.value}
                    className={twJoin(
                      "cursor-pointer w-fit text-lg md:text-xl font-bold ",
                      selectedTradeDataMenuType === item.value ? "text-contentBright" : "text-gray4a"
                    )}
                    onClick={() => setSelectedTradeDataMenuType(item.value as any)}
                  >
                    {item.title}
                  </p>
                );
              })}
            </div>
          </div>
          {selectedTradeDataMenuType === "History" && (
            <div className="flex flex-row gap-3 my-6">
              <div
                className="flex justify-center items-center gap-2 flex-1 px-4 py-[10px] rounded bg-[#ffffff14]"
                onClick={() => {
                  openModal(
                    <Select
                      data={historyTypeOptions}
                      selected={selectedHistoryFilterType}
                      onClick={(value) => {
                        setSelectedHistoryFilterType(value as HistoryFilterType);
                        closeModal();
                      }}
                    />,
                    {}
                  );
                }}
              >
                <p className="text-contentBright text-sm md:text-base font-bold">
                  {selectedHistoryFilterType}
                </p>
                {selectedTradeDataMenuType ? (
                  <DropdownDownIconMedium size={18} className="text-contentBright" />
                ) : (
                  <DropdownUpIconMedium size={18} className="text-contentBright" />
                )}
              </div>
              <div
                className="flex justify-center items-center gap-2 flex-1 px-4 py-[10px] rounded bg-[#ffffff14]"
                onClick={() =>
                  openModal(
                    <Select
                      data={historyRangeTypeOptions}
                      selected={selectedHistoryRangeType}
                      onClick={(value) => {
                        setSelectedHistoryRangeType(value as HistoryRangeType);
                        setSelectedHistoryTimestamp(calculateTimestamp(value as HistoryRangeType));
                        closeModal();
                      }}
                    />,
                    {}
                  )
                }
              >
                <p className="text-contentBright text-sm md:text-base font-bold">
                  {selectedHistoryRangeType}
                </p>
                {selectedTradeDataMenuType ? (
                  <DropdownDownIconMedium size={18} className="text-contentBright" />
                ) : (
                  <DropdownUpIconMedium size={18} className="text-contentBright" />
                )}
              </div>
            </div>
          )}

          {selectedTradeDataMenuType === "My Positions" && (
            <div
              className={twJoin(
                " flex flex-col mb-6 overflow-auto",
                (_positionsData[selectedUnderlyingAsset]?.length === 0) &&
                  "flex-1 justify-center bg-[#111613B2] mt-6"
              )}
              style={{
                maxHeight: "calc(100vh - 158px)",
              }}
            >
              {(_positionsData[selectedUnderlyingAsset]?.length || 0) > 0 ? (
                <MyPositionCard
                  positionTableRef={positionTableRef}
                  selectedUnderlyingAsset={selectedUnderlyingAsset}
                  optionsInfo={optionsInfo}
                  futuresPrice={futuresIndex}
                  groupedPosition={_positionsData[selectedUnderlyingAsset] || []}
                />
              ) : (
                <div className="flex flex-row justify-center items-center w-full text-base md:text-lg font-bold text-contentBright opacity-65">
                  <p>You don't have any position yet.</p>
                </div>
              )}
            </div>
          )}

          {selectedTradeDataMenuType === "History" && (
            <div className={twJoin(historyData.length === 0 && "flex-1 flex justify-center bg-[#111613B2]")}>
              <div
                className={twJoin("flex flex-col mb-[44px] overflow-auto")}
                style={{
                  maxHeight: "calc(100vh - 158px)",
                }}
              >
                <HistoryCards
                  selectedUnderlyingAsset={selectedUnderlyingAsset}
                  selectedHistoryTimestamp={selectedHistoryTimestamp}
                  selectedHistoryFilterType={selectedHistoryFilterType}
                  positionHistoryData={_positionHistoryData}
                  historyData={historyData}
                  setHistoryData={setHistoryData}
                />
              </div>
              <div className="fixed bottom-[63px] right-0 w-full flex justify-end p-3 md:p-6 bg-black03">
                <div
                  className={twJoin(
                    "text-sm md:text-base text-contentBright opacity-45 font-semibold",
                    _positionHistoryData.lastUpdatedAt === "0" && "hidden"
                  )}
                >
                  Last updated {timeSince(_positionHistoryData.lastUpdatedAt)} ago
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface IPropsSelect {
  data: {
    value: string;
    label: string;
  }[];
  selected?: string;
  onClick?: (value: string) => void;
}

const Select = (props: IPropsSelect) => {
  const { data, selected, onClick } = props;
  return (
    <div className="px-3">
      {data.map((item, index) => {
        return (
          <div
            key={item.value}
            className={`${selected === item.value ? "text-greene6 " : "text-contentBright"} ${
              index === 0 ? "pt-0" : "border-t border-[#d5d8d71a]"
            } ${
              index === data.length - 1 ? "pb-0" : ""
            } flex items-center justify-center text-base font-semibold py-5`}
            onClick={() => onClick?.(item.value)}
          >
            <p>{item.label}</p>
          </div>
        );
      })}
    </div>
  );
};

export default HomeForMobile;
