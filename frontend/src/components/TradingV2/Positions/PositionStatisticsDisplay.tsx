import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import { PositionStats } from "../utils/calculations";

interface PositionStatisticsDisplayProps {
  positionStats: PositionStats;
}

function PositionStatisticsDisplay({
  positionStats,
}: PositionStatisticsDisplayProps) {
  return (
    <div className="h-[36px] flex flex-row items-center gap-[40px]">
      <div className="flex flex-col min-w-[195px]">
        <StatItem
          label="Open Positions"
          value={positionStats.openPositions}
          format={{ decimals: 0 }}
          width="w-[108px]"
        />
        <StatItem
          label="Position Value"
          value={positionStats.positionsValue}
          format={{ prefix: "$", decimals: 2, showSign: true }}
          width="w-[108px]"
        />
      </div>

      <div className="flex flex-col min-w-[148px]">
        <StatItem
          label="Invested"
          value={positionStats.invested}
          format={{ prefix: "$", decimals: 2 }}
          width="w-[72px]"
        />
        <StatItem
          label="Collateral"
          value={positionStats.collateral}
          format={{ prefix: "$", decimals: 2 }}
          width="w-[72px]"
        />
      </div>

      <div className="flex flex-col min-w-[125px]">
        <StatItem
          label="P&L"
          value={positionStats.pnl}
          format={{ prefix: "$", decimals: 2, showSign: true, showColor: true }}
          width="w-[42px]"
        />
        <StatItem
          label="ROI"
          value={positionStats.roi}
          format={{ decimals: 2, suffix: "%", showSign: true, showColor: true }}
          width="w-[42px]"
        />
      </div>
    </div>
  );
}

export default PositionStatisticsDisplay;

interface StatItemProps {
  label: string;
  value: number;
  format: {
    prefix?: string;
    suffix?: string;
    decimals: number;
    showSign?: boolean;
    showColor?: boolean;
  };
  width?: string;
}

const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  format,
  width = "w-[80px]",
}) => {
  // 값 및 스타일 계산
  const {
    prefix = "",
    suffix = "",
    decimals,
    showSign = false,
    showColor = false,
  } = format;
  let displayValue =
    advancedFormatNumber(Math.abs(value), decimals, prefix) + suffix;
  let valueClass = "text-whitef2f2";

  if (value !== 0 && showSign) {
    displayValue = (value > 0 ? "+" : "-") + displayValue;
  }

  if (value !== 0 && showColor) {
    valueClass = value > 0 ? "text-green71b8" : "text-rede04a";
  }

  return (
    <div className="flex flex-row items-center justify-between">
      <p
        className={twJoin(
          "text-gray8c8c text-[12px] font-[500] leading-[18px]",
          width
        )}
      >
        {label}
      </p>
      <p
        className={twJoin("text-[12px] font-[600] leading-[18px]", valueClass)}
      >
        {displayValue}
      </p>
    </div>
  );
};
