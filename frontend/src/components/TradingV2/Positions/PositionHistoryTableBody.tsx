import { PositionHistoryWithMetadata } from "@/store/slices/PositionHistorySlice";
import { advancedFormatNumber, formatDateWithTime } from "@/utils/helper";
import { OptionDirection, OptionStrategy, OrderSide } from "@/utils/types";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import ShareButton from "../ShareButton";

interface PositionHistoryTableBodyProps {
  history: PositionHistoryWithMetadata[];
}

function PositionHistoryTableBody({ history }: PositionHistoryTableBodyProps) {
  const { address } = useAccount();

  if (history.length === 0 || address === undefined) {
    return <NoPositions />;
  }

  return (
    <div
      className={twJoin(
        "w-full min-h-[452px] py-[6px]",
        "border-t-[1px] border-t-black2023"
      )}
    >
      {history.map((item, index) => {
        return <HistoryTableRow key={index} history={item} index={index} />;
      })}
    </div>
  );
}

export default PositionHistoryTableBody;

function NoPositions() {
  return (
    <div
      className={twJoin(
        "w-full min-h-[452px]",
        "border-t-[1px] border-t-black2023",
        "flex flex-row items-center justify-center"
      )}
    >
      <p className="text-gray8c8c text-[13px] font-[500] leading-[18px]">
        No trade history
      </p>
    </div>
  );
}

interface HistoryTableRowProps {
  history: PositionHistoryWithMetadata;
  index: number;
}

const historyTableRowStyles = twJoin(
  "flex flex-row items-center w-full h-[40px] px-[12px] py-[4px] gap-[12px]",
  "text-[12px] text-grayb3 font-medium leading-[34px]",
  "hover:bg-black17"
);

const HistoryTableRow = ({ history, index }: HistoryTableRowProps) => {
  return (
    <div key={index} className={historyTableRowStyles}>
      <div className="w-[128px] min-w-[128px]">
        <p className="w-full h-[16px] font-medium leading-normal">
          {history.metadata.type}
        </p>
        <p className="w-full h-[16px] text-gray80 text-[11px] font-normal leading-[16px]">
          {formatDateWithTime(history.processBlockTime)}
        </p>
      </div>
      <UsdDisplay
        value={history.metadata.uaPrice}
        width={{ min: "min-w-[72px]", max: "max-w-[72px]" }}
        format={{ prefix: "$", suffix: "", decimals: 0 }}
        textClass="text-left"
        showColor={false}
      />
      <InstrumentDisplay
        instrument={history.metadata.instrument}
        width={{ min: "min-w-[208px]", max: "max-w-[208px]" }}
        optionStrategy={history.metadata.optionStrategy}
        optionDirection={history.metadata.optionDirection}
        pairedOptionStrikePrice={history.metadata.pairedOptionStrikePrice}
      />
      <SizeDisplay
        size={history.metadata.size}
        width={{ min: "min-w-[108px]", max: "max-w-[200px]" }}
        optionOrderSide={history.metadata.optionOrderSide}
      />
      <CollateralDisplay
        type={history.metadata.type}
        collateral={history.metadata.collateral}
        width={{ min: "min-w-[108px]", max: "max-w-[200px]" }}
        optionOrderSide={history.metadata.optionOrderSide}
      />
      <UsdDisplay
        value={history.metadata.avgPrice}
        width={{ min: "min-w-[82px]", max: "max-w-[94px]" }}
        format={{ prefix: "$", suffix: "", decimals: 2 }}
        showColor={false}
      />
      <UsdDisplay
        value={history.metadata.settlePayoff}
        width={{ min: "min-w-[82px]", max: "max-w-[94px]" }}
        format={{ prefix: "$", suffix: "", decimals: 2 }}
        showColor={false}
      />
      <PnLRoiDisplay
        pnl={history.metadata.pnl}
        roi={history.metadata.roi}
        width={{ min: "min-w-[108px]", max: "max-w-[200px]" }}
      />
      <UsdDisplay
        value={history.metadata.cashflow}
        width={{ min: "min-w-[108px]", max: "max-w-[200px]" }}
        format={{ prefix: "$", suffix: "", decimals: 2 }}
        showColor={true}
      />
      <div className="w-full min-w-[74px] max-w-[126px] text-right">
        <div className="flex flex-row items-center justify-end">
          {(history.metadata.type === "Settle" ||
            history.metadata.type === "Close") && (
            <ShareButton
              shareData={{
                instrument: history.metadata.instrument,
                optionDirection: history.metadata.optionDirection,
                optionOrderSide: history.metadata.optionOrderSide,
                optionStrategy: history.metadata.optionStrategy,
                pnl: history.metadata.pnl,
                roi: history.metadata.roi,
                entryPrice: history.metadata.entryPrice,
                lastPrice: history.metadata.lastPrice,
                pairedOptionStrikePrice:
                  history.metadata.pairedOptionStrikePrice,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

function InstrumentDisplay({
  instrument,
  width,
  optionStrategy,
  optionDirection,
  pairedOptionStrikePrice,
  textClass = "text-right",
}: {
  instrument: string;
  width: { min: string; max: string };
  optionStrategy: OptionStrategy;
  optionDirection: OptionDirection;
  pairedOptionStrikePrice: string | number;
  textClass?: string;
}) {
  const valueClass = twJoin(textClass);
  return (
    <div
      className={twJoin(
        "flex flex-row items-center gap-[5px]",
        width.min,
        width.max,
        valueClass
      )}
    >
      <p className="">{instrument}</p>
      {optionStrategy === "Spread" && (
        <p
          className={twJoin(
            "h-[13px] text-[10px] text-gray80 font-medium leading-[12px]",
            optionDirection === "Call"
              ? "border-t-[1px] border-t-gray80"
              : "border-b-[1px] border-b-gray80"
          )}
        >
          {pairedOptionStrikePrice}
        </p>
      )}
    </div>
  );
}

function SizeDisplay({
  size,
  width,
  optionOrderSide,
  textClass = "text-right",
}: {
  size: number;
  width: { min: string; max: string };
  optionOrderSide: OrderSide;
  textClass?: string;
}) {
  const parsedSize = optionOrderSide === "Buy" ? size : -size;
  const textColorClass =
    optionOrderSide === "Buy" ? "text-green63" : "text-redff33";
  const valueClass = twJoin(textClass, textColorClass);
  return (
    <div className={twJoin("w-full", width.min, width.max, valueClass)}>
      <p className={twJoin("w-full")}>
        {advancedFormatNumber(parsedSize, 4, "")}
      </p>
    </div>
  );
}

function CollateralDisplay({
  type,
  collateral,
  width,
  optionOrderSide,
  textClass = "text-right",
}: {
  type: string;
  collateral: number;
  width: { min: string; max: string };
  optionOrderSide: OrderSide;
  textClass?: string;
}) {
  const textColorClass = collateral >= 0 ? "text-green63" : "text-redff33";
  const valueClass = twJoin(textClass, textColorClass);

  if (optionOrderSide === "Buy" || type === "Transfer") {
    return (
      <div
        className={twJoin(
          "w-full text-grayb3",
          width.min,
          width.max,
          textClass
        )}
      >
        <p className={twJoin("w-full")}>-</p>
      </div>
    );
  }

  return (
    <div
      className={twJoin(
        "w-full text-green63",
        width.min,
        width.max,
        valueClass
      )}
    >
      <p className={twJoin("w-full")}>
        {advancedFormatNumber(collateral, 4, "")}
      </p>
    </div>
  );
}

function UsdDisplay({
  value,
  width,
  format,
  textClass = "text-right",
  showColor = false,
}: {
  value: number;
  width: { min: string; max: string };
  format: { prefix: string; suffix: string; decimals: number };
  textClass?: string;
  showColor?: boolean;
}) {
  if (value === 0) {
    return (
      <div
        className={twJoin(
          "w-full text-grayb3",
          width.min,
          width.max,
          textClass
        )}
      >
        <p className={twJoin("w-full")}>-</p>
      </div>
    );
  }

  const displayValue =
    advancedFormatNumber(value, format.decimals, format.prefix) + format.suffix;
  const widthClass = width.min + " " + width.max;
  const textColorClass = showColor
    ? value > 0
      ? "text-green63"
      : "text-redff33"
    : "text-grayb3";
  const valueClass = twJoin(textClass, widthClass, textColorClass);

  return (
    <div className={twJoin("flex flex-row justify-end w-full ", valueClass)}>
      <p className="w-full">{displayValue}</p>
    </div>
  );
}

function PnLRoiDisplay({
  pnl,
  roi,
  width,
  textClass = "text-right",
}: {
  pnl: number;
  roi: number;
  width: { min: string; max: string };
  textClass?: string;
}) {
  const valueClass = twJoin(textClass);

  if (pnl === 0) {
    return (
      <div
        className={twJoin(
          "flex flex-col justify-center w-full",
          width.min,
          width.max,
          valueClass
        )}
      >
        <p className="w-full h-[16px] leading-[16px] text-grayb3">-</p>
      </div>
    );
  }

  return (
    <div
      className={twJoin(
        "flex flex-col justify-center w-full",
        width.min,
        width.max,
        pnl === 0 ? "text-grayb3" : pnl > 0 ? "text-green63" : "text-redff33",
        valueClass
      )}
    >
      <p className="w-full h-[16px] leading-[16px]">
        {advancedFormatNumber(pnl, 2, "$")}
      </p>
      <p className="w-full h-[16px] leading-[16px]">
        {advancedFormatNumber(roi, 2, "")}%
      </p>
    </div>
  );
}
