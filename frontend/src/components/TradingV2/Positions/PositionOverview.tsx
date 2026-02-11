import { UnderlyingAssetWithAll } from "@callput/shared";
import PositionStatisticsAssetSelector from "./PositionStatisticsAssetSelector";
import PositionStatisticsDisplay from "./PositionStatisticsDisplay";
import { PositionStats } from "../utils/calculations";

interface PositionOverviewProps {
  underlyingAsset: UnderlyingAssetWithAll;
  setUnderlyingAsset: (underlyingAsset: UnderlyingAssetWithAll) => void;
  positionStats: PositionStats;
  setCurrentPage: (page: number) => void;
}

function PositionOverview({
  underlyingAsset,
  setUnderlyingAsset,
  positionStats,
  setCurrentPage,
}: PositionOverviewProps) {
  return (
    <div className="flex flex-row items-center gap-[20px]">
      <PositionStatisticsDisplay positionStats={positionStats} />
      <div className="w-[1px] h-[28px] mx-[4px] bg-black2023" />
      <PositionStatisticsAssetSelector
        underlyingAsset={underlyingAsset}
        setUnderlyingAsset={setUnderlyingAsset}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}

export default PositionOverview;
