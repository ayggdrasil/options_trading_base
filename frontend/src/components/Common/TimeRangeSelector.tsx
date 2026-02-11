import React, { Dispatch, SetStateAction } from 'react';
import { HistoryRangeType } from '@/utils/types';

// Helper function to calculate timestamp
export const calculateTimestamp = (range: HistoryRangeType) => {
  const now = Math.floor(new Date().getTime() / 1000);
  switch(range) {
    case '1 Day': return now - 86400;
    case '1 Week': return now - 604800;
    case '1 Month': return now - 2592000;
    case '3 Months': return now - 7776000;
    case '6 Months': return now - 15552000;
    case 'All': return 1; // 1 is a special value to indicate all history
    default: return now;
  }
}

interface TimeRangeSelectorProps {
  historyRangeType: HistoryRangeType;
  setHistoryRangeType: Dispatch<SetStateAction<HistoryRangeType>>;
  setHistoryTimestamp: Dispatch<SetStateAction<number>>;
}

const TimeRangeButton = ({ range, selectedRange, onSelectRange }: { range: any, selectedRange: any, onSelectRange: any}) => {
  const isSelected = selectedRange === range;
  const handleClick = () => {
    if (isSelected) return;
    onSelectRange(range, calculateTimestamp(range));
  };

  return (
    <p
      className={`cursor-pointer flex flex-row items-center justify-center w-fit h-[26px] px-[8px] rounded-[16px]  text-[12px] ${
        isSelected ? "bg-black29 text-greenc1 font-semibold" : "bg-transparent text-gray80 font-normal"
      }`}
      onClick={handleClick}
    >
      {range}
    </p>
  );
};

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  historyRangeType,
  setHistoryRangeType,
  setHistoryTimestamp
}) => {
  const ranges: HistoryRangeType[] = ['1 Day', '1 Week', '1 Month', '6 Months', 'All'];

  const handleSelectRange = (range: any, timestamp: any) => {
    setHistoryRangeType(range);
    setHistoryTimestamp(timestamp);
  };

  return (
    <div className="flex flex-row items-center justify-between w-[283px] h-[34px] px-[4px] rounded-[17px] bg-black1a">
      {ranges.map(range => (
        <TimeRangeButton
          key={range}
          range={range}
          selectedRange={historyRangeType}
          onSelectRange={handleSelectRange}
        />
      ))}
    </div>
  );
};

export default TimeRangeSelector;
