import { HistoryFilterType } from "@/utils/types";
import PositionTableHistoryHead from "./PositionTableHistoryHead";
import PositionTableHistoryBody from "./PositionTableHistoryBody";
import { UnderlyingAsset } from "@callput/shared";

interface PositionTableHistoryProps {
  underlyingAsset: UnderlyingAsset;
  historyTimestamp: number;
  historyFilterType: HistoryFilterType;
}

const PositionTableHistory: React.FC<PositionTableHistoryProps> = ({
  underlyingAsset,
  historyTimestamp,
  historyFilterType
}) => {
  return (
    <>
      <PositionTableHistoryHead />
      <div className="w-full h-[1px] bg-black29 mt-[16px]"/>
      <PositionTableHistoryBody
        underlyingAsset={underlyingAsset}
        historyTimestamp={historyTimestamp}
        historyFilterType={historyFilterType}
      />
    </>
  );
};

export default PositionTableHistory;