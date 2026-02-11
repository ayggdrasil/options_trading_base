import { usePositionHistory } from "@/hooks/history";
import { PositionManagementMenu } from "@/utils/types";
import { useEffect, useState, useMemo } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import PositionManagementMenuSelector from "./PositionManagementMenuSelector";
import PositionOverview from "./PositionOverview";
import {
  FuturesAssetIndexMap,
  SpotAssetIndexMap,
  UnderlyingAssetWithAll,
} from "@callput/shared";
import { useAppSelector } from "@/store/hooks";
import { FlattenedPosition } from "@/interfaces/interfaces.positionSlice";
import { NetworkState } from "@/networks/types";
import { getFlattenedPositions, getHistory } from "../utils/options";
import { IOptionsInfo } from "@/interfaces/interfaces.marketSlice";
import { calculatePositionStats, PositionStats } from "../utils/calculations";
import OpenPositionsTable from "./OpenPositionsTable";
import PositionHistoryTable from "./PositionHistoryTable";
import {
  PositionHistoryState,
  PositionHistoryWithMetadata,
} from "@/store/slices/PositionHistorySlice";
import { PositionsState } from "@/store/slices/PositionsSlice";

const ITEMS_PER_PAGE = 8;

const initialStats: PositionStats = {
  openPositions: 0,
  positionsValue: 0,
  invested: 0,
  collateral: 0,
  pnl: 0,
  roi: 0,
  greeks: {
    delta: 0,
    gamma: 0,
    vega: 0,
    theta: 0,
  },
};

function PositionManagementPanel() {
  const [underlyingAsset, setUnderlyingAsset] =
    useState<UnderlyingAssetWithAll>("ALL");
  const [selectedPositionManagementMenu, setSelectedPositionManagementMenu] =
    useState<PositionManagementMenu>("Open Positions");

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const { address } = useAccount();
  const { chain } = useAppSelector((state) => state.network) as NetworkState;

  const positionsData = useAppSelector(
    (state: any) => state.positions
  ) as PositionsState;
  const positionHistoryData = useAppSelector(
    (state: any) => state.positionHistory
  ) as PositionHistoryState;
  const optionsInfo = useAppSelector(
    (state: any) => state.market.optionsInfo
  ) as IOptionsInfo;
  const futuresAssetIndexMap = useAppSelector(
    (state: any) => state.market.futuresAssetIndexMap
  ) as FuturesAssetIndexMap;
  const spotAssetIndexMap = useAppSelector(
    (state: any) => state.market.spotAssetIndexMap
  ) as SpotAssetIndexMap;

  // For Open Positions
  const [positionStats, setPositionStats] =
    useState<PositionStats>(initialStats);
  const [flattenedPositions, setFlattenedPositions] = useState<
    FlattenedPosition[]
  >([]);

  const memoizedPositions = useMemo(() => {
    // Only calculate positions when the current chain matches the positions data chain
    if (positionsData.chain !== chain) {
      return [];
    }

    return getFlattenedPositions(
      underlyingAsset,
      positionsData,
      chain,
      optionsInfo,
      futuresAssetIndexMap
    );
  }, [
    underlyingAsset,
    positionsData,
    chain,
    optionsInfo,
    futuresAssetIndexMap,
  ]);

  const memoizedStats = useMemo(() => {
    return calculatePositionStats(memoizedPositions, chain, spotAssetIndexMap);
  }, [memoizedPositions, chain, spotAssetIndexMap]);

  useEffect(() => {
    setFlattenedPositions(memoizedPositions);
    if (selectedPositionManagementMenu === "Open Positions") {
      setTotalPages(Math.ceil(memoizedPositions.length / ITEMS_PER_PAGE));
    }
  }, [memoizedPositions, selectedPositionManagementMenu]);

  useEffect(() => {
    setPositionStats(memoizedStats);
  }, [memoizedStats]);

  // For History
  const [history, setHistory] = useState<PositionHistoryWithMetadata[]>([]);

  const {
    selectedHistoryRangeType,
    selectedHistoryTimestamp,
    selectedHistoryFilterType,
    setSelectedHistoryRangeType,
    setSelectedHistoryTimestamp,
    setSelectedHistoryFilterType,
  } = usePositionHistory({ address });

  const memoizedHistory = useMemo(() => {
    return getHistory(
      underlyingAsset,
      positionHistoryData,
      chain,
      selectedHistoryFilterType,
      selectedHistoryTimestamp
    );
  }, [
    underlyingAsset,
    positionHistoryData,
    selectedHistoryFilterType,
    selectedHistoryTimestamp,
    chain,
  ]);

  useEffect(() => {
    setHistory(memoizedHistory);
    if (selectedPositionManagementMenu === "History") {
      setTotalPages(Math.ceil(memoizedHistory.length / ITEMS_PER_PAGE));
    }
  }, [memoizedHistory, selectedPositionManagementMenu]);

  return (
    <div className="flex flex-col h-fit w-full">
      <div
        className={twJoin(
          "w-full h-[60px] flex flex-row items-center justify-between px-[20px] py-[12px]",
          "bg-black181a border-t-[1px] border-black2023"
        )}
      >
        <PositionManagementMenuSelector
          selectedPositionManagementMenu={selectedPositionManagementMenu}
          setSelectedPositionManagementMenu={setSelectedPositionManagementMenu}
          selectedHistoryFilterType={selectedHistoryFilterType}
          setSelectedHistoryFilterType={setSelectedHistoryFilterType}
          selectedHistoryRangeType={selectedHistoryRangeType}
          setSelectedHistoryRangeType={setSelectedHistoryRangeType}
          setSelectedHistoryTimestamp={setSelectedHistoryTimestamp}
          setCurrentPage={setCurrentPage}
        />
        <PositionOverview
          underlyingAsset={underlyingAsset}
          setUnderlyingAsset={setUnderlyingAsset}
          positionStats={positionStats}
          setCurrentPage={setCurrentPage}
        />
      </div>
      {selectedPositionManagementMenu === "Open Positions" && (
        <OpenPositionsTable
          positionStats={positionStats}
          flattenedPositions={flattenedPositions}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      )}
      {selectedPositionManagementMenu == "History" && (
        <PositionHistoryTable
          history={history}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      )}
    </div>
  );
}

export default PositionManagementPanel;
