import { HistoryFilterType } from "@/utils/types";
import ReusableDropdown, {
  DropdownOption,
} from "@/components/Common/ReusuableDropdown";

interface HistoryFilterTypeSelectorProps {
  historyFilterType: HistoryFilterType;
  setHistoryFilterType: (type: HistoryFilterType) => void;
  setCurrentPage: (page: number) => void;
}

function HistoryFilterTypeSelector({
  historyFilterType,
  setHistoryFilterType,
  setCurrentPage,
}: HistoryFilterTypeSelectorProps) {
  const historyFilterOptions: DropdownOption<HistoryFilterType>[] = [
    {
      value: "All Types",
      icon: "",
    },
    {
      value: "Open",
      icon: "",
    },
    {
      value: "Close",
      icon: "",
    },
    {
      value: "Settle",
      icon: "",
    },
    {
      value: "Transfer",
      icon: "",
    },
  ];

  const handleOptionSelect = (option: HistoryFilterType) => {
    setHistoryFilterType(option);
    setCurrentPage(1);
  };

  return (
    <ReusableDropdown
      options={historyFilterOptions}
      selectedOption={historyFilterType}
      onOptionSelect={handleOptionSelect}
      triggerButtonClassName="group/button h-[24px] bg-black292c hover:!bg-black292c active:!scale-95 active:!opacity-80"
      triggerTextClassName="!text-gray8c8c group-hover/button:!text-whitef2f2 !text-[12px] !font-[600] !leading-[14px]"
      triggerDropdownGap={12}
      dropdownPosition="bottom-left"
    />
  );
}

export default HistoryFilterTypeSelector;
