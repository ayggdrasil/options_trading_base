import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import { FlattenedPosition } from "@/interfaces/interfaces.positionSlice";
import { useAccount } from "wagmi";
import { OptionDirection, OptionStrategy, OrderSide } from "@/utils/types";
import { PositionStats } from "../utils/calculations";
import ShareButton from "../ShareButton";
import { useContext } from "react";
import { ModalContext } from "@/components/Common/ModalContext";
import { ClosePositionModal } from "@/components/TradingV2/Positions/ClosePositionModal";
import { CountdownTimer } from "@/components/Common/CountdownTimer";
import { SettlePositionModal } from "./SettlePositionModal";

interface OpenPositionsTableBodyProps {
  positionStats: PositionStats;
  flattenedPositions: FlattenedPosition[];
}

function OpenPositionsTableBody({
  positionStats,
  flattenedPositions,
}: OpenPositionsTableBodyProps) {
  const { address } = useAccount();

  if (flattenedPositions.length === 0 || address === undefined) {
    return <NoPositions />;
  }

  return (
    <div
      className={twJoin(
        "w-full min-h-[452px] py-[6px]",
        "border-t-[1px] border-t-black2023"
      )}
    >
      <TotalRow positionStats={positionStats} />
      {flattenedPositions.map((position, index) => {
        if (position.metadata.isExpired) {
          return (
            <ExpiredPositionRow
              key={`expired-${index}`}
              position={position}
              index={index}
            />
          );
        } else {
          return (
            <NotExpiredPositionRow
              key={`open-${index}`}
              position={position}
              index={index}
            />
          );
        }
      })}
    </div>
  );
}

export default OpenPositionsTableBody;

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
        No open position
      </p>
    </div>
  );
}

interface OpenPositionsTableRowProps {
  position: FlattenedPosition;
  index: number;
}

const openPositionsRowStyles = twJoin(
  "w-full h-[40px] flex flex-row items-center px-[20px] py-[4px] gap-[12px]",
  "text-graybfbf text-[13px] font-[600] leading-[32px]",
  "hover:bg-black181a"
);

const TotalRow = ({ positionStats }: { positionStats: PositionStats }) => {
  return (
    <div className={openPositionsRowStyles}>
      <div className="flex flex-row items-center gap-[5px] min-w-[228px] max-w-[228px]">
        <p className="">Total</p>
      </div>
      <div className="w-full min-w-[82px] max-w-[128px] text-right" />
      <div className="w-full min-w-[114px] max-w-[228px] text-right" />
      <div className="w-full min-w-[82px] max-w-[128px] text-right" />
      <div className="w-full min-w-[114px] max-w-[228px] text-right" />
      <div className="w-full min-w-[114px] max-w-[228px] text-right" />
      <GreeksDisplay greeks={positionStats.greeks} isEmpty={false} />
      <div className="min-w-[86px] max-w-[86px] text-right" />
    </div>
  );
};

const ExpiredPositionRow = ({
  position,
  index,
}: OpenPositionsTableRowProps) => {
  const { openModal, closeModal } = useContext(ModalContext);
  const settlementInProgress = position.metadata.settlePrice === 0;
  return (
    <div key={index} className={openPositionsRowStyles}>
      <InstrumentDisplay
        instrument={position.metadata.instrument}
        width={{ min: "min-w-[228px]", max: "max-w-[228px]" }}
        optionStrategy={position.metadata.optionStrategy}
        optionDirection={position.metadata.optionDirection}
        pairedOptionStrikePrice={position.pairedOptionStrikePrice}
      />
      <UsdDisplay
        value={position.metadata.lastPrice}
        width={{ min: "min-w-[82px]", max: "max-w-[128px]" }}
        format={{ prefix: "$", suffix: "", decimals: 2 }}
        showColor={false}
      />
      <SizeDisplay
        size={position.metadata.size}
        width={{ min: "min-w-[114px]", max: "max-w-[228px]" }}
        optionOrderSide={position.metadata.optionOrderSide}
      />
      <UsdDisplay
        value={position.metadata.avgPrice}
        width={{ min: "min-w-[82px]", max: "max-w-[128px]" }}
        format={{ prefix: "$", suffix: "", decimals: 2 }}
        showColor={false}
      />
      <UsdDisplay
        value={position.metadata.cashflow}
        width={{ min: "min-w-[114px]", max: "max-w-[228px]" }}
        format={{ prefix: "$", suffix: "", decimals: 2 }}
        showColor={true}
      />
      <PnLRoiDisplay
        pnl={position.metadata.pnl}
        roi={position.metadata.roi}
        width={{ min: "min-w-[114px]", max: "max-w-[228px]" }}
      />
      <GreeksDisplay greeks={position.metadata.greeks} isEmpty={true} />
      <div className="min-w-[86px] max-w-[86px] text-right">
        <div className="flex flex-row items-center justify-end gap-[8px]">
          {settlementInProgress ? (
            <button
              className={twJoin(
                "cursor-not-allowed",
                "w-[48px] h-[30px] min-w-[48px] p-[6px] bg-black2023 rounded-[6px]",
                "text-gray8c8c text-[13px] text-center font-[700] leading-[14px]"
              )}
            >
              ...
            </button>
          ) : (
            <button
              className={twJoin(
                "cursor-pointer",
                "w-[48px] h-[30px] min-w-[48px] p-[6px] bg-black2023 rounded-[6px]",
                "text-blue278e text-[13px] text-center font-[700] leading-[14px]",
                "hover:bg-black292c active:scale-95 active:opacity-80"
              )}
              onClick={() =>
                openModal(
                  <SettlePositionModal
                    position={position}
                    closeModal={closeModal}
                  />,
                  {}
                )
              }
            >
              Settle
            </button>
          )}
          <ShareButton
            shareData={{
              instrument: position.metadata.instrument,
              optionDirection: position.metadata.optionDirection,
              optionOrderSide: position.metadata.optionOrderSide,
              optionStrategy: position.metadata.optionStrategy,
              pnl: position.metadata.pnl,
              roi: position.metadata.roi,
              entryPrice: position.metadata.avgPrice,
              lastPrice: position.metadata.lastPrice,
              pairedOptionStrikePrice: position.pairedOptionStrikePrice,
            }}
            width="w-[62px]"
          />
        </div>
      </div>
    </div>
  );
};

const NotExpiredPositionRow = ({
  position,
  index,
}: OpenPositionsTableRowProps) => {
  const { openModal, closeModal } = useContext(ModalContext);
  const expiresInThirtyMinutes =
    position.metadata.expiry * 1000 <= Date.now() + 30 * 60 * 1000;
  return (
    <div key={index} className={openPositionsRowStyles}>
      <InstrumentDisplay
        instrument={position.metadata.instrument}
        width={{ min: "min-w-[228px]", max: "max-w-[228px]" }}
        optionStrategy={position.metadata.optionStrategy}
        optionDirection={position.metadata.optionDirection}
        pairedOptionStrikePrice={position.pairedOptionStrikePrice}
      />
      <UsdDisplay
        value={position.metadata.lastPrice}
        width={{ min: "min-w-[82px]", max: "max-w-[128px]" }}
        format={{ prefix: "$", suffix: "", decimals: 2 }}
        showColor={false}
      />
      <SizeDisplay
        size={position.metadata.size}
        width={{ min: "min-w-[114px]", max: "max-w-[228px]" }}
        optionOrderSide={position.metadata.optionOrderSide}
      />
      <UsdDisplay
        value={position.metadata.avgPrice}
        width={{ min: "min-w-[82px]", max: "max-w-[128px]" }}
        format={{ prefix: "$", suffix: "", decimals: 2 }}
        showColor={false}
      />
      <UsdDisplay
        value={position.metadata.cashflow}
        width={{ min: "min-w-[114px]", max: "max-w-[228px]" }}
        format={{ prefix: "$", suffix: "", decimals: 2 }}
        showColor={true}
      />
      <PnLRoiDisplay
        pnl={position.metadata.pnl}
        roi={position.metadata.roi}
        width={{ min: "min-w-[114px]", max: "max-w-[228px]" }}
      />
      <GreeksDisplay greeks={position.metadata.greeks} isEmpty={false} />
      <div className="min-w-[86px] max-w-[86px] text-right">
        <div className="flex flex-row items-center justify-end gap-[8px]">
          {expiresInThirtyMinutes ? (
            <button
              className={twJoin(
                "cursor-not-allowed",
                "w-[48px] h-[30px] min-w-[48px] p-[6px] bg-black2023 rounded-[6px]",
                "text-gray8c8c text-[13px] font-[700] leading-[14px]"
              )}
            >
              <CountdownTimer
                className="text-grayb3"
                targetTimestamp={position.metadata.expiry}
                compactFormat={true}
              />
            </button>
          ) : (
            <button
              className={twJoin(
                "cursor-pointer",
                "w-[48px] h-[30px] min-w-[48px] p-[6px] bg-black2023 rounded-[6px]",
                "text-gray8c8c text-[13px] text-center font-[700] leading-[14px]",
                "hover:bg-black292c active:scale-95 active:opacity-80"
              )}
              onClick={() =>
                openModal(
                  <ClosePositionModal
                    position={position}
                    closeModal={closeModal}
                  />,
                  {}
                )
              }
            >
              Close
            </button>
          )}
          <ShareButton
            shareData={{
              instrument: position.metadata.instrument,
              optionDirection: position.metadata.optionDirection,
              optionOrderSide: position.metadata.optionOrderSide,
              optionStrategy: position.metadata.optionStrategy,
              pnl: position.metadata.pnl,
              roi: position.metadata.roi,
              entryPrice: position.metadata.avgPrice,
              lastPrice: position.metadata.lastPrice,
              pairedOptionStrikePrice: position.pairedOptionStrikePrice,
            }}
          />
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
      <p>{instrument}</p>
      {optionStrategy === "Spread" && (
        <p
          className={twJoin(
            "h-[16px] text-gray8c8c text-[12px] font-[500] leading-[16px]",
            optionDirection === "Call"
              ? "border-t-[1px] border-t-gray8c8c"
              : "border-b-[1px] border-b-gray8c8c"
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
    optionOrderSide === "Buy" ? "text-green71b8" : "text-rede04a";
  const valueClass = twJoin(textClass, textColorClass);
  return (
    <div className={twJoin("w-full", width.min, width.max, valueClass)}>
      <p className={twJoin("w-full")}>
        {advancedFormatNumber(parsedSize, 4, "")}
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
  const displayValue =
    advancedFormatNumber(value, format.decimals, format.prefix) + format.suffix;
  const widthClass = width.min + " " + width.max;
  const textColorClass = showColor
    ? value > 0
      ? "text-green71b8"
      : "text-rede04a"
    : "text-graybfbf";
  const valueClass = twJoin(textClass, widthClass, textColorClass);

  return (
    <div className={twJoin("flex flex-row justify-end w-full", valueClass)}>
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
          "w-full flex flex-col justify-center",
          width.min,
          width.max,
          valueClass
        )}
      >
        <p className="w-full h-[16px] text-graybfbf text-[13px] font-[500] leading-[16px]">
          -
        </p>
      </div>
    );
  }

  return (
    <div
      className={twJoin(
        "w-full flex flex-col justify-center",
        width.min,
        width.max,
        pnl === 0
          ? "text-graybfbf"
          : pnl > 0
            ? "text-green71b8"
            : "text-rede04a",
        valueClass
      )}
    >
      <p className="w-full h-[16px] text-[13px] font-[500] leading-[16px]">
        {advancedFormatNumber(pnl, 2, "$")}
      </p>
      <p className="w-full h-[16px] text-[13px] font-[500] leading-[16px]">
        {advancedFormatNumber(roi, 2, "")}%
      </p>
    </div>
  );
}

function GreeksDisplay({
  greeks,
  isEmpty,
  textClass = "text-right",
}: {
  greeks: { delta: number; gamma: number; vega: number; theta: number };
  isEmpty: boolean;
  textClass?: string;
}) {
  const valueClass = twJoin(textClass);
  if (isEmpty) {
    return (
      <>
        <div
          className={twJoin(
            "flex flex-row justify-end w-full min-w-[72px] max-w-[120px]",
            valueClass
          )}
        >
          <p className="w-full">-</p>
        </div>
        <div
          className={twJoin(
            "flex flex-row justify-end w-full min-w-[72px] max-w-[134px]",
            valueClass
          )}
        >
          <p className="w-full">-</p>
        </div>
        <div
          className={twJoin(
            "flex flex-row justify-end w-full min-w-[72px] max-w-[120px]",
            valueClass
          )}
        >
          <p className="w-full">-</p>
        </div>
        <div
          className={twJoin(
            "flex flex-row justify-end w-full min-w-[72px] max-w-[120px]",
            valueClass
          )}
        >
          <p className="w-full">-</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-row justify-end w-full min-w-[72px] max-w-[120px] text-right">
        <p className="w-full">{advancedFormatNumber(greeks.delta, 2, "")}</p>
      </div>
      <div className="flex flex-row justify-end w-full min-w-[72px] max-w-[134px] text-right">
        <p className="w-full">{advancedFormatNumber(greeks.gamma, 6, "")}</p>
      </div>
      <div className="flex flex-row justify-end w-full min-w-[72px] max-w-[120px] text-right">
        <p className="w-full">{advancedFormatNumber(greeks.vega, 2, "")}</p>
      </div>
      <div className="flex flex-row justify-end w-full min-w-[72px] max-w-[120px] text-right">
        <p className="w-full">{advancedFormatNumber(greeks.theta, 2, "")}</p>
      </div>
    </>
  );
}
