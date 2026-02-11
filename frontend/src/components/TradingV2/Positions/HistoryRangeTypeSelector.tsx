import { HistoryRangeType } from "@/utils/types";
import ReusableDropdown, {
  DropdownOption,
} from "@/components/Common/ReusuableDropdown";
import { calculateTimestampByHistoryRange } from "../utils/calculations";

interface HistoryRangeTypeSelectorProps {
  historyRangeType: HistoryRangeType;
  setHistoryRangeType: (type: HistoryRangeType) => void;
  setSelectedHistoryTimestamp: (timestamp: number) => void;
  setCurrentPage: (page: number) => void;
}

function HistoryRangeTypeSelector({
  historyRangeType,
  setHistoryRangeType,
  setSelectedHistoryTimestamp,
  setCurrentPage,
}: HistoryRangeTypeSelectorProps) {
  const historyRangeOptions: DropdownOption<HistoryRangeType>[] = [
    {
      value: "1 Day",
      icon: "",
    },
    {
      value: "1 Week",
      icon: "",
    },
    {
      value: "1 Month",
      icon: "",
    },
    {
      value: "3 Months",
      icon: "",
    },
    {
      value: "6 Months",
      icon: "",
    },
  ];

  const handleSelectRange = (range: HistoryRangeType) => {
    setHistoryRangeType(range);
    setSelectedHistoryTimestamp(calculateTimestampByHistoryRange(range));
    setCurrentPage(1);
  };

  return (
    <ReusableDropdown
      options={historyRangeOptions}
      selectedOption={historyRangeType}
      onOptionSelect={handleSelectRange}
      triggerButtonClassName="group/button h-[24px] bg-black292c hover:!bg-black292c active:!scale-95 active:!opacity-80"
      triggerTextClassName="!text-gray8c8c group-hover/button:!text-whitef2f2 !text-[12px] !font-[600] !leading-[14px]"
      triggerDropdownGap={12}
      dropdownPosition="bottom-left"
    />
  );
}

export default HistoryRangeTypeSelector;
