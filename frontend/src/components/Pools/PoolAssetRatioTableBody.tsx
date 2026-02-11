import { advancedFormatNumber } from "@/utils/helper";
import BigNumber from "bignumber.js";
import { twJoin } from "tailwind-merge";
import { QA_INFO, QA_LIST } from "@/networks/assets";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface PoolAssetRatioTableBodyProps {
  olpMetrics: any;
  olpDepositedAssetValue: any;
  isBuy: boolean
}

const PoolAssetRatioTableBody: React.FC<PoolAssetRatioTableBodyProps> = ({olpMetrics, olpDepositedAssetValue, isBuy}) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const olpAssetList = QA_LIST[chain].filter((asset) => {
    if (asset === "ETH") return false;
    return true;
  })

  return (
    <>
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
          <div
            key={index}
            className={twJoin(
              "grid",
              "grid-cols-[141px_135px_68px] mx-[26px]",
              "h-[30px] text-[13px] text-whitee0 font-semibold",
              "hover:bg-black29 hover:bg-opacity-50 hover:rounded-[4px]"
            )}
          >
            <div className='flex flex-row items-center gap-[6px]'>
              <img src={QA_INFO[chain][token as keyof typeof QA_INFO[typeof chain]].src} className="w-[18px] h-[18px] min-w-[18px] min-h-[18px]"/>
              <div className="flex flex-row items-center w-[117px] gap-[6px]">
                <p className="">{token}</p>
                <p className='text-[12px] text-gray80'>
                  {currentTokenWeight < 0.1 ? "0" : advancedFormatNumber(currentTokenWeight, 1, "", true)} / {Number(targetTokenWeight).toFixed(0)}
                </p>
              </div>
            </div>
            <div className='flex flex-row items-center justify-end'>
              <p>{advancedFormatNumber(depositedValue, 2, "$")}</p>
            </div>
            <div className='flex flex-row items-center justify-end'>
              {
                isBuy
                  ? <p className="text-[12px] text-greenc1">{advancedFormatNumber(parsedBuyUsdgFee , 2, "")}%</p>
                  : <p className="text-[12px] text-greenc1">{advancedFormatNumber(parsedSellUsdgFee , 2, "")}%</p>
              }
            </div>
          </div>
      )})
      }
    </>
  );
};

export default PoolAssetRatioTableBody;
