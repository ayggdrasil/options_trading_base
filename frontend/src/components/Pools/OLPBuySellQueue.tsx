import { useState } from "react";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber } from "@/utils/helper";
import { CountdownTimer } from "../Common/CountdownTimer";
import IconDropdownUp from "@assets/img/icon/arr-selector-up.png";
import IconDropdownDown from "@assets/img/icon/arr-selector-down.png";
import IconCancel from "@assets/img/icon/cancel.svg";
import GifLoader from "@assets/img/animation/loader.gif";
import { useAppSelector } from "@/store/hooks";

export type QueueItem = {
  queueNumber: number;
  estimatedOlpAmount: string;
  onCancel: () => Promise<void>;
};

type OLPBuySellQueueProps = {
  type: "deposit" | "withdraw";
  queueItems: QueueItem[];
};

const OLPBuySellQueue: React.FC<OLPBuySellQueueProps> = ({
  type,
  queueItems,
}) => {
  const olpEpochState = useAppSelector((state: any) => state.olpEpoch);

  const [isOpen, setIsOpen] = useState(false);
  const [cancelingIndexes, setCancelingIndexes] = useState<Set<number>>(
    new Set()
  );

  if (!queueItems || queueItems.length === 0) {
    return null;
  }

  const queueCount = queueItems.length;
  const title = type === "deposit" ? "Queued Deposit" : "Queued Withdraw";

  return (
    <div className="flex flex-col rounded-[6px] bg-black2023">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={twJoin(
          "w-full h-[36px]",
          "cursor-pointer flex flex-row items-center justify-between",
          "px-[10px] py-[8px]"
        )}
      >
        <div className="flex flex-row items-center gap-[8px]">
          {/* Orange circle with number */}
          <div
            className={twJoin(
              "w-[20px] h-[20px] min-w-[20px] min-h-[20px]",
              "rounded-[10px] bg-orangee091",
              "flex items-center justify-center"
            )}
          >
            <p className="h-[18px] text-black181a text-[12px] font-[800] leading-[18px]">
              {queueCount}
            </p>
          </div>
          <p className="h-[20px] text-graybfbf text-[14px] font-[600] leading-[20px]">
            {title}
          </p>
        </div>
        <img
          src={isOpen ? IconDropdownUp : IconDropdownDown}
          alt={isOpen ? "Collapse" : "Expand"}
          className="w-[16px] h-[16px]"
        />
      </button>

      {/* Content - Visible when open */}
      {isOpen && (
        <div className={twJoin("flex flex-col", "px-[10px] py-[8px]")}>
          {/* Table Header */}
          <div
            className={twJoin(
              "grid grid-cols-[48px_1fr_48px] gap-[12px]",
              "h-[24px]",
              "text-[12px] text-gray8c8c font-[500] leading-[24px]"
            )}
          >
            <div className="text-center">Queue</div>
            <div className="text-right">Est. OLP Amount</div>
            <div className="text-center">Cancel</div>
          </div>

          <div className="w-full h-[1px] bg-black292c my-[6px]" />

          {/* Table Rows */}
          <div className="flex flex-col gap-[8px]">
            {queueItems.map((item, index) => (
              <div
                key={index}
                className={twJoin(
                  "grid grid-cols-[48px_1fr_48px] gap-[12px]",
                  "h-[24px]",
                  "text-[12px] text-graybfbf font-[500] leading-[24px]"
                )}
              >
                <div className="text-center">{item.queueNumber}</div>
                <div className="text-right">
                  {advancedFormatNumber(Number(item.estimatedOlpAmount), 2, "")}
                </div>
                <div className="flex items-center justify-center">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setCancelingIndexes((prev) => new Set(prev).add(index));
                      try {
                        await item.onCancel();
                      } finally {
                        setCancelingIndexes((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(index);
                          return newSet;
                        });
                      }
                    }}
                    disabled={cancelingIndexes.has(index)}
                    className={twJoin(
                      "w-[20px] h-[20px]",
                      "flex items-center justify-center",
                      cancelingIndexes.has(index)
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    )}
                  >
                    {cancelingIndexes.has(index) ? (
                      <img
                        src={GifLoader}
                        alt="Loading"
                        className="w-[16px] h-[16px]"
                      />
                    ) : (
                      <img
                        src={IconCancel}
                        alt="Cancel"
                        className="w-[16px] h-[16px]"
                      />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Message */}
          <div className="p-[8px] pt-[4px] mt-[12px]">
            <p className="text-gray4b50 text-[12px] font-[500] leading-[16px]">
              The final OLP amount will be determined when your request is
              processed. <span className="text-gray8c8c"> Time Left : </span>
              <CountdownTimer
                className="text-gray8c8c text-[12px] font-[500] leading-[16px]"
                targetTimestamp={olpEpochState.epochInfo.processStartsAt / 1000}
                compactFormat={false}
              />
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OLPBuySellQueue;
