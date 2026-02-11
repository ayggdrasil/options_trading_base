import { useState } from "react";
import { twJoin } from "tailwind-merge";
import TimeRangeSelector from "../Common/TimeRangeSelector";
import FilterTypeSelector from "../Common/FilterTypeSelector";
import PositionTableHistory from "./PositionTableHistory";
import PositionTableOpen from "./PositionTableOpen";
import { FlattenedPosition } from "@/interfaces/interfaces.positionSlice";
import { usePositionHistory } from "@/hooks/history";
import { useAccount } from "wagmi";
import { UnderlyingAsset } from "@callput/shared";

interface PositionTableProps {
  underlyingAsset: UnderlyingAsset;
  flattenedPositions: FlattenedPosition[];
}

const tabs = ["Open Positions", "History"] as  const;
type TabType = (typeof tabs)[number];

const PositionTable: React.FC<PositionTableProps> = ({
  underlyingAsset,
  flattenedPositions
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("Open Positions");

  const { address } = useAccount();

  const {
    selectedHistoryRangeType,
    selectedHistoryTimestamp,
    selectedHistoryFilterType,
    setSelectedHistoryRangeType,
    setSelectedHistoryTimestamp,
    setSelectedHistoryFilterType,
  } = usePositionHistory({ address })

  return (
    <div className="flex flex-col w-full h-[346px] bg-black1f rounded-[4px]">
      <div className="flex flex-row justify-between items-center h-fit px-[24px] mt-[22px]">
        <div className="flex flex-row items-center gap-[20px] h-[34px]">
          {tabs.map((tab) => (
            <p
              key={tab}
              className={twJoin(
                "cursor-pointer h-full text-[18px]",
                activeTab === tab ? "text-whitee0 font-bold" : "text-gray80 hover:font-semibold hover:text-greenc1"
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </p>
          ))}
        </div>
        {activeTab === "History" && (
          <div className="flex flex-row gap-[24px]">
            <TimeRangeSelector
              historyRangeType={selectedHistoryRangeType}
              setHistoryRangeType={setSelectedHistoryRangeType}
              setHistoryTimestamp={setSelectedHistoryTimestamp}
            />
            <FilterTypeSelector
              historyFilterType={selectedHistoryFilterType}
              setHistoryFilterType={setSelectedHistoryFilterType}
            />
          </div>
        )}
      </div>
      <div className="flex flex-col w-full h-full">
        {activeTab === "Open Positions"
          ? <PositionTableOpen
              flattenedPositions={flattenedPositions}
            />
          : <PositionTableHistory
              underlyingAsset={underlyingAsset}
              historyTimestamp={selectedHistoryTimestamp}
              historyFilterType={selectedHistoryFilterType}
            />}
      </div>
    </div>
  );
};

const getInitialTimestamp = () => Math.floor(new Date().getTime() / 1000) - 86400;

export default PositionTable;