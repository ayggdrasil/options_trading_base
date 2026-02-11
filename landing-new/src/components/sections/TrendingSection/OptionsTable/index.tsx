import React from "react";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber } from "../../../../utils/formatters";
import { TopPerformingOption, HighestVolumeOption } from "../../../../contexts/data/TrendingContext";
import { CALLPUT_URLS } from "../../../../shared/constants/urls";
import IconArrowNextBlue from "../../../../assets/img/icon-arrow-next-blue.png";

const DISPLAY_LIMIT = 5;

type TableItem = TopPerformingOption | HighestVolumeOption;
type TableMode = "change" | "volume";

interface OptionsTableHeaderProps {
  mode: TableMode;
}

const OptionsTableHeader: React.FC<OptionsTableHeaderProps> = ({ mode }) => {
  const mobileLabel = mode === "change" ? "Price / Change" : "Price / Volume";
  const changeVolumeLabel = mode === "change" ? "Change" : "Volume";
  return (
    <>
      {/* Mobile Header */}
      <div
        className={twJoin(
          "h-[32px] flex-row items-start justify-between gap-[12px]",
          "text-gray8c8c text-[13px] font-[500] leading-[20px]",
          "flex",
          "lg:hidden"
        )}
      >
        <div className="w-full">Options</div>
        <div className="w-[120px] min-w-[120px] text-right">{mobileLabel}</div>
      </div>

      {/* Desktop Header */}
      <div
        className={twJoin(
          "h-[32px] flex-row items-start justify-between gap-[12px]",
          "text-gray8c8c text-[13px] font-[500] leading-[20px]",
          "hidden",
          "lg:flex"
        )}
      >
        <div className="w-full">Options</div>
        <div className="w-[120px] min-w-[120px] text-right">Price</div>
        <div className="w-[88px] min-w-[88px] text-right">{changeVolumeLabel}</div>
      </div>
    </>
  );
};

interface OptionsTableBodyRowProps {
  item: TableItem;
  mode: TableMode;
}

const OptionsTableBodyRow: React.FC<OptionsTableBodyRowProps> = ({ item, mode }) => {
  const isChangeMode = mode === "change";
  const displayValue = isChangeMode ? (item as TopPerformingOption).priceDiffPercentage : (item as HighestVolumeOption).volume;
  return (
    <div className={twJoin("h-fit flex flex-row justify-between items-center")}>
      {/* Mobile Layout */}
      <div className="w-full h-[46px] py-[4px] flex lg:hidden flex-row justify-between items-center gap-[12px]">
        <div className="text-whitef2f2 text-[13px] font-[600] leading-[28px]">
          {item.instrument}
        </div>
        <div className="w-[120px] min-w-[120px] text-right">
          <div className="h-[20px] text-whitef2f2 text-[13px] font-[500] leading-[20px]">
            {advancedFormatNumber(Number(item.currentPrice), 2, "$")}
          </div>
          <div
            className={twJoin(
              "h-[18px] text-[13px] text-right font-[500] leading-[18px]",
              isChangeMode
                ? displayValue! > 0
                  ? "text-green71b8"
                  : displayValue! < 0
                    ? "text-rede04a"
                    : "text-whitef2f2"
                : "text-whitef2f2"
            )}
          >
            {isChangeMode
              ? displayValue! > 0
                ? `+${advancedFormatNumber(displayValue!, 2, "")}%`
                : displayValue! < 0
                  ? `-${advancedFormatNumber(Math.abs(displayValue!), 2, "")}%`
                  : `${advancedFormatNumber(displayValue!, 2, "")}%`
              : `${advancedFormatNumber(displayValue!, 0, "$")}`}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="w-full h-[36px] py-[4px] hidden lg:flex flex-row items-center justify-between gap-[12px]">
        {/* Column 1: Options */}
        <div className="w-full text-whitef2f2 text-[13px] font-[600] leading-[28px]">
          {item.instrument}
        </div>

        {/* Column 2: Price */}
        <div className="w-[120px] min-w-[120px] text-right text-whitef2f2 text-[13px] font-[500] leading-[28px]">
          {advancedFormatNumber(Number(item.currentPrice), 2, "$")}
        </div>

        {/* Column 3: Change or Volume */}
        <div
          className={twJoin(
            "w-[88px] min-w-[88px] text-[13px] text-right font-[500] leading-[28px]",
            isChangeMode
              ? displayValue! > 0
                ? "text-green71b8"
                : displayValue! < 0
                  ? "text-rede04a"
                  : "text-whitef2f2"
              : "text-whitef2f2"
          )}
        >
          {isChangeMode
            ? displayValue! > 0
              ? `+${advancedFormatNumber(displayValue!, 2, "")}%`
              : displayValue! < 0
                ? `-${advancedFormatNumber(Math.abs(displayValue!), 2, "")}%`
                : `${advancedFormatNumber(displayValue!, 2, "")}%`
            : `${advancedFormatNumber(displayValue!, 0, "$")}`}
        </div>
      </div>
    </div>
  );
};

interface OptionsTableBodyProps {
  items: TableItem[];
  mode: TableMode;
}

const OptionsTableBody: React.FC<OptionsTableBodyProps> = ({ items, mode }) => {
  return (
    <div className="w-full h-fit overflow-hidden py-[8px]">
      {items.map((item, index) => {
        return <OptionsTableBodyRow key={index} item={item} mode={mode} />;
      })}
    </div>
  );
};

interface OptionsTableProps {
  title: string;
  items: TableItem[];
  mode: TableMode;
}

const OptionsTable: React.FC<OptionsTableProps> = ({ title, items, mode }) => {
  const filteredData = items.slice(0, DISPLAY_LIMIT);

  return (
    <div
      className={twJoin(
        "w-full h-[352px] flex flex-col gap-[36px] bg-black181a border-black2023",
        "shadow-[0px_6px_36px_0px_rgba(0,0,0,0.20)]",
        "h-[402px] px-[20px] py-[28px]",
        "lg:flex-1 lg:h-[352px] lg:px-[28px] lg:py-[28px] lg:rounded-[24px] lg:border lg:border-[1px] lg:border-solid"
      )}
    >
      {/* Section Header */}
      <div className="flex flex-row justify-between items-center">
        <h2 className="h-[32px] text-whitef2f2 text-[22px] font-[600] leading-[32px]">
          {title}
        </h2>
        <button
          className="cursor-pointer text-blue278e flex items-center text-blue1f53 text-[18px] font-[600] leading-[24px]"
          onClick={() => {
            window.open(CALLPUT_URLS.APP, "_blank");
          }}
        >
          Trade <img src={IconArrowNextBlue} className="w-[32px] h-[32px]" />
        </button>
      </div>

      <div className="w-full h-fit flex flex-col">
        {/* Table Header */}
        <OptionsTableHeader mode={mode} />

        <div className="w-full h-[1px] bg-black2023" />

        {/* Table Body */}
        <OptionsTableBody items={filteredData} mode={mode} />
      </div>
    </div>
  );
};

export default OptionsTable;
