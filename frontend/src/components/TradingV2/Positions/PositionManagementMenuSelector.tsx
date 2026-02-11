import {
  HistoryFilterType,
  HistoryRangeType,
  PositionManagementMenu,
} from "@/utils/types";
import { twJoin } from "tailwind-merge";
import HistoryFilterTypeSelector from "./HistoryFilterTypeSelector";
import HistoryRangeTypeSelector from "./HistoryRangeTypeSelector";

interface PositionManagementMenuSelectorProps {
  selectedPositionManagementMenu: PositionManagementMenu;
  setSelectedPositionManagementMenu: (menu: PositionManagementMenu) => void;
  selectedHistoryFilterType: HistoryFilterType;
  setSelectedHistoryFilterType: (type: HistoryFilterType) => void;
  selectedHistoryRangeType: HistoryRangeType;
  setSelectedHistoryRangeType: (type: HistoryRangeType) => void;
  setSelectedHistoryTimestamp: (timestamp: number) => void;
  setCurrentPage: (page: number) => void;
}

function PositionManagementMenuSelector({
  selectedPositionManagementMenu,
  setSelectedPositionManagementMenu,
  selectedHistoryFilterType,
  setSelectedHistoryFilterType,
  selectedHistoryRangeType,
  setSelectedHistoryRangeType,
  setSelectedHistoryTimestamp,
  setCurrentPage,
}: PositionManagementMenuSelectorProps) {

  return (
    <div className="flex flex-row items-center justify-between gap-[4px]">
      <div
        className={twJoin(
          "cursor-pointer group w-fit h-[36px] flex flex-row items-center justify-center px-[16px] py-[6px]",
          "bg-transparent rounded-[6px]",
          "hover:bg-black292c hover:text-whitef2f2 active:scale-95 active:opacity-80",
          selectedPositionManagementMenu === "Open Positions" && "!bg-black2023"
        )}
        onClick={() => {
          setSelectedPositionManagementMenu("Open Positions");
          setCurrentPage(1);
        }}
      >
        <p
          className={twJoin(
            "h-[16px] text-grayb3 text-[14px] font-bold leading-[16px]",
            "group-hover:text-whitef2f2",
            selectedPositionManagementMenu === "Open Positions" &&
              "!text-blue278e"
          )}
        >
          Open Positions
        </p>
      </div>
      <div
        className={twJoin(
          "cursor-pointer group w-fit h-[36px] flex flex-row items-center justify-center gap-[16px] px-[16px] py-[6px]",
          "bg-transparent rounded-[6px]",
          "hover:bg-black292c",
          selectedPositionManagementMenu === "History" &&
            "!bg-black2023 !pr-[6px]"
        )}
        onClick={() => {
          setSelectedPositionManagementMenu("History");
          setCurrentPage(1);
        }}
      >
        <p
          className={twJoin(
            "h-[16px] text-grayb3 text-[14px] font-bold leading-[16px]",
            "group-hover:text-whitef2f2",
            selectedPositionManagementMenu === "History" && "!text-blue278e"
          )}
        >
          History
        </p>
        {selectedPositionManagementMenu === "History" && (
          <div className="flex flex-row items-center justify-center gap-[6px]">
            <HistoryFilterTypeSelector
              historyFilterType={selectedHistoryFilterType}
              setHistoryFilterType={setSelectedHistoryFilterType}
              setCurrentPage={setCurrentPage}
            />
            <HistoryRangeTypeSelector
              historyRangeType={selectedHistoryRangeType}
              setHistoryRangeType={setSelectedHistoryRangeType}
              setSelectedHistoryTimestamp={setSelectedHistoryTimestamp}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default PositionManagementMenuSelector;
