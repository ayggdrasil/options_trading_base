import { useAppSelector } from "@/store/hooks";
import { OlpKey } from "@/utils/enums";
import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";

interface RealTimeGreeksTableBodyProps {
  olpKey: OlpKey;
}

const RealTimeGreeksTableBody: React.FC<RealTimeGreeksTableBodyProps> = ({
  olpKey,
}) => {
  const olpStats = useAppSelector((state: any) => state.market.olpStats);
  const olpGreeks = olpStats[olpKey].greeks;

  return (
    <div className={twJoin("py-3 flex flex-col gap-y-3")}>
      <div className="flex flex-row justify-between">
        <p
          className={twJoin(
            "font-semibold text-gray9D",
            "text-[12px] leading-[18px] md:text-[14px]"
          )}
        >
          Delta
        </p>
        <div className="flex flex-row">
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            {advancedFormatNumber(olpGreeks["BTC"].delta, 2, "")}
          </p>
          <p
            className={twJoin(
              "font-semibold text-whitef0 min-w-[110px]",
              "text-end text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            {advancedFormatNumber(olpGreeks["ETH"].delta, 2, "")}
          </p>
        </div>
      </div>
      <div className="flex flex-row justify-between">
        <p
          className={twJoin(
            "font-semibold text-gray9D",
            "text-[12px] leading-[18px] md:text-[14px]"
          )}
        >
          Gamma
        </p>
        <div className="flex flex-row">
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            {advancedFormatNumber(olpGreeks["BTC"].gamma, 6, "")}
          </p>
          <p
            className={twJoin(
              "font-semibold text-whitef0 min-w-[110px]",
              "text-end text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            {advancedFormatNumber(olpGreeks["ETH"].gamma, 6, "")}
          </p>
        </div>
      </div>
      <div className="flex flex-row justify-between">
        <p
          className={twJoin(
            "font-semibold text-gray9D",
            "text-[12px] leading-[18px] md:text-[14px]"
          )}
        >
          Vega
        </p>
        <div className="flex flex-row">
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            {advancedFormatNumber(olpGreeks["BTC"].vega, 2, "")}
          </p>
          <p
            className={twJoin(
              "font-semibold text-whitef0 min-w-[110px]",
              "text-end text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            {advancedFormatNumber(olpGreeks["ETH"].vega, 2, "")}
          </p>
        </div>
      </div>
      <div className="flex flex-row justify-between">
        <p
          className={twJoin(
            "font-semibold text-gray9D",
            "text-[12px] leading-[18px] md:text-[14px]"
          )}
        >
          Theta
        </p>
        <div className="flex flex-row">
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            {advancedFormatNumber(olpGreeks["BTC"].theta, 2, "")}
          </p>
          <p
            className={twJoin(
              "font-semibold text-whitef0 min-w-[110px]",
              "text-end text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            {advancedFormatNumber(olpGreeks["ETH"].theta, 2, "")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RealTimeGreeksTableBody;
