import { advancedFormatNumber } from "@/utils/helper";
import BigNumber from "bignumber.js";
import { twJoin } from "tailwind-merge";
import { QA_INFO, QA_LIST } from "@/networks/assets";
import { useAppSelector } from "@/store/hooks";
import { NetworkState } from "@/networks/types";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface PoolAssetRatioTableBodyProps {
  olpMetrics: any;
  olpDepositedAssetValue: any;
  isBuy: boolean;
}

const PoolAssetRatioTableBody: React.FC<PoolAssetRatioTableBodyProps> = ({
  olpMetrics,
  olpDepositedAssetValue,
  isBuy,
}) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const olpAssetList = QA_LIST[chain].filter((asset) => {
    if (asset === "ETH") return false;
    return true;
  })

  return (
    <div className="py-3 flex flex-col gap-y-3">
      {olpAssetList.map((token, index) => {
        let targetTokenWeight = 0;
        let depositedValue = 0;
        let buyUsdgFee = 0;
        let sellUsdgFee = 0;
        let currentTokenWeight = 0;

        if (token === "WBTC") {
          targetTokenWeight = olpMetrics.targetWeight.wbtc;
          currentTokenWeight = olpMetrics.currentWeight.wbtc;
          buyUsdgFee = olpMetrics.buyUsdgFee.wbtc;
          sellUsdgFee = olpMetrics.sellUsdgFee.wbtc;
          depositedValue = olpDepositedAssetValue.wbtc;
        } else if (token === "WETH") {
          targetTokenWeight = olpMetrics.targetWeight.weth;
          currentTokenWeight = olpMetrics.currentWeight.weth;
          buyUsdgFee = olpMetrics.buyUsdgFee.weth;
          sellUsdgFee = olpMetrics.sellUsdgFee.weth;
          depositedValue = olpDepositedAssetValue.weth;
        } else if (token === "USDC") {
          targetTokenWeight = olpMetrics.targetWeight.usdc;
          currentTokenWeight = olpMetrics.currentWeight.usdc;
          buyUsdgFee = olpMetrics.buyUsdgFee.usdc;
          sellUsdgFee = olpMetrics.sellUsdgFee.usdc;
          depositedValue = olpDepositedAssetValue.usdc;
        }

        const parsedBuyUsdgFee = BigNumber(buyUsdgFee).div(100).toNumber();
        const parsedSellUsdgFee = BigNumber(sellUsdgFee).div(100).toNumber();

        return (
          <div key={index} className={twJoin("flex flex-row justify-between")}>
            <div className="flex flex-row items-center gap-x-[6px]">
              <img
                src={QA_INFO[chain][token as keyof typeof QA_INFO[typeof chain]].src}
                className="w-[20px] h-[20px] object-cover"
              />
              <div className="flex flex-row items-center gap-[6px]">
                <p
                  className={twJoin(
                    "font-semibold text-whitef0",
                    "text-[12px] leading-[14px] md:text-[14px]"
                  )}
                >
                  {token}
                </p>
                <p
                  className={twJoin(
                    "font-semibold text-gray9D",
                    "text-[11px] leading-[16px] md:text-[13px]"
                  )}
                >
                  {currentTokenWeight < 0.1
                    ? "0"
                    : advancedFormatNumber(
                        currentTokenWeight,
                        1,
                        "",
                        true
                      )}{" "}
                  / {Number(targetTokenWeight).toFixed(0)}
                </p>
              </div>
            </div>
            <div className="flex flex-row gap-x-5">
              <p
                className={twJoin(
                  "font-semibold text-whitef0",
                  "text-[12px] leading-[16px] md:text-[14px]"
                )}
              >
                {advancedFormatNumber(depositedValue, 2, "$")}
              </p>
              <p
                className={twJoin(
                  "font-semibold text-greene6",
                  "text-[11px] leading-[16px] md:text-[13px]"
                )}
              >
                {isBuy
                  ? `${advancedFormatNumber(parsedBuyUsdgFee, 2, "")}%`
                  : `${advancedFormatNumber(parsedSellUsdgFee, 2, "")}%`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PoolAssetRatioTableBody;
