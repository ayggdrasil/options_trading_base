import { useOLPTotalStat } from "@/hooks/olp";
import { OlpKey } from "@/utils/enums";
import { advancedFormatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";

import IconSymbolWbtc from "@/assets/icon-symbol-wbtc.svg";
import IconSymbolWeth from "@/assets/icon-symbol-weth.svg";
import IconSymbolUsdc from "@/assets/icon-symbol-usdc.svg";
import IconSymbolHoney from "@/assets/icon-symbol-honey.svg";
import PoolCompositionGauge from "./PoolCompositionGauge";

type Props = {
  olpKey: OlpKey;
};

const assetIconMap: any = {
  WBTC: IconSymbolWbtc,
  WETH: IconSymbolWeth,
  USDC: IconSymbolUsdc,
  HONEY: IconSymbolHoney,
};

const PoolComposition: React.FC<Props> = ({ olpKey }) => {
  const { tvl, tvlComposition } = useOLPTotalStat({ olpKey });

  const tvlCompositionArr = Object.entries(tvlComposition)
    .filter(([assetName, usdValue]: any) => usdValue > 0)
    .map(([assetName, usdValue]: any) => {
      return {
        title: String(assetName).toUpperCase(),
        usdValue,
        ratio: (usdValue / tvl) * 100,
      };
    });

  return (
    <div className={twJoin("flex flex-col gap-y-2")}>
      <p
        className={twJoin(
          "font-semibold text-whitef0",
          "text-[14px] leading-[21px] md:text-[16px]"
        )}
      >
        Pool Composition
      </p>
      <div className={twJoin("flex flex-col", "p-5 rounded bg-[#171717]")}>
        <div className={twJoin("flex flex-col")}>
          <p
            className={twJoin(
              "font-bold text-whitef0 text-right",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
          >
            {advancedFormatNumber(tvl, 2, "$", true)}
          </p>
          <p
            className={twJoin(
              "font-normal text-gray80 text-right",
              "text-[10px] leading-[15px] md:text-[12px]"
            )}
          >
            Total Liquidity
          </p>
        </div>
        <PoolCompositionGauge tvlCompositionArr={tvlCompositionArr} />
        <div className={twJoin("flex flex-col gap-y-4")}>
          {tvlCompositionArr.map(({ title, usdValue, ratio }: any) => {
            return (
              <div
                key={title}
                className="flex flex-row justify-between items-center"
              >
                <div className={twJoin("flex flex-row gap-x-3 items-center")}>
                  <img
                    className={twJoin("w-[24px] h-[24px] object-cover")}
                    src={assetIconMap[title]}
                  />
                  <p
                    className={twJoin(
                      "font-bold text-whitef0",
                      "text-[14px] leading-[21px] md:text-[16px]"
                    )}
                  >
                    {String(title).toUpperCase()}
                  </p>
                </div>
                <div className="flex flex-row">
                  <p
                    className={twJoin(
                      "font-semibold text-whitef0",
                      "text-[12px] leading-[18px] md:text-[14px]"
                    )}
                  >
                    {advancedFormatNumber(usdValue, 2, "$", true)}
                  </p>
                  <p
                    className={twJoin(
                      "w-[64px] font-semibold text-greene6 text-right",
                      "text-[12px] leading-[18px] md:text-[14px]"
                    )}
                  >
                    {advancedFormatNumber(ratio, 2, "", true)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PoolComposition;
