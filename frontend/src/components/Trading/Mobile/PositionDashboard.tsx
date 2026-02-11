import BigNumber from "bignumber.js";
import { advancedFormatNumber, formatNumber } from "@/utils/helper";
import { twJoin } from "tailwind-merge";
import { useAppSelector } from "@/store/hooks";
import { initialOptionDetail } from "@/constants/constants.slices";
import { GroupedPosition } from "@/interfaces/interfaces.positionSlice";
import { calculateClosePayoff, calculateSettlePayoff } from "@/utils/calculation";
import { useEffect, useState } from "react";
import { UA_TICKER_TO_DECIMAL } from "@/networks/assets";
import { getMainOptionName, getPairedOptionName, getStrategyByOptionTokenId, getStrikePriceByInstrument, NormalizedSpotAsset, SpotAssetIndexMap, UnderlyingAssetWithAll } from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { NetworkState } from "@/networks/types";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface PositionDashboardProps {
  selectedUnderlyingAsset: UnderlyingAssetWithAll;
  groupedPosition: GroupedPosition[];
}

const PositionDashboard: React.FC<PositionDashboardProps> = ({
  selectedUnderlyingAsset,
  groupedPosition,
}) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;
  const optionsInfo = useAppSelector((state: any) => state.market.optionsInfo);

  const underlyingAssetSpotIndex = spotAssetIndexMap[selectedUnderlyingAsset as NormalizedSpotAsset];

  const [openPositionValue, setOpenPositionValue] = useState<number>(0);
  const [positionCount, setPositionCount] = useState<number>(0);
  const [totalPnl, setTotalPnl] = useState<number>(0);
  const [totalInvestment, setTotalInvestment] = useState<number>(0);
  const [totalRoi, setTotalRoi] = useState<number>(0);

  useEffect(() => {
    let openPositionValue = 0;
    let positionCount = 0;
    let totalPnl = 0;
    let totalInvestment = 0;
    let totalRoi = 0;

    groupedPosition && groupedPosition.map((gp, index) => {
      const expiry = gp.expiry;
      const isExpired = expiry && expiry * 1000 < Date.now();

      const settlePrice = new BigNumber(gp.settlePrice).toNumber();

      gp.positions.map((position) => {
        const optionTokenId = BigInt(position["optionTokenId"]);

        const isCombo = Number(position["length"]) > 1;
        const strategy = getStrategyByOptionTokenId(optionTokenId);

        const mainOptionName = getMainOptionName(optionTokenId, position["optionNames"]);
        const pairedOptionName = getPairedOptionName(optionTokenId, position["optionNames"]);

        const typePositions =
        selectedUnderlyingAsset === UnderlyingAssetWithAll.ALL
          ? (position.optionNames.split("-")[0]) as UnderlyingAssetWithAll
          : selectedUnderlyingAsset;

        const mainOptionInfo = optionsInfo[mainOptionName] || initialOptionDetail;
        const pairedOptionInfo = optionsInfo[pairedOptionName] || initialOptionDetail;

        const parsedSize = new BigNumber(position["size"])
          .div(10 ** UA_TICKER_TO_DECIMAL[chain][typePositions as keyof typeof UA_TICKER_TO_DECIMAL[SupportedChains]])
          .toNumber();
        const parsedExecutionPrice = new BigNumber(position["executionPrice"]).div(10 ** 30).toNumber();
        const parsedMarkPrice = isCombo
          ? Math.max(
              mainOptionInfo.markPrice - pairedOptionInfo.markPrice || Number(position["markPrice"]),
              0
            )
          : Math.max(mainOptionInfo.markPrice || Number(position["markPrice"]), 0);
        
        const mainOptionStrikePrice = getStrikePriceByInstrument(mainOptionName);
        const pairedOptionStrikePrice = getStrikePriceByInstrument(pairedOptionName);

        
        if (isExpired) {
          positionCount += 1;

          const { settlePayoff, pnl } = calculateSettlePayoff({
            strategy,
            mainOptionStrikePrice,
            settlePrice,
            pairedOptionStrikePrice,
            parsedExecutionPrice,
            parsedSize,
          });

          totalPnl = new BigNumber(totalPnl).plus(pnl).toNumber();

          openPositionValue = position.isBuy
            ? new BigNumber(openPositionValue)
                .plus(new BigNumber(settlePayoff).multipliedBy(parsedSize))
                .toNumber()
            : new BigNumber(openPositionValue)
                .minus(new BigNumber(settlePayoff).multipliedBy(parsedSize))
                .toNumber();
        } else {
          positionCount += 1;

          const { pnl } = calculateClosePayoff({
            strategy,
            mainOptionStrikePrice,
            parsedMarkPrice,
            pairedOptionStrikePrice,
            parsedExecutionPrice,
            parsedSize,
            futuresPrice: underlyingAssetSpotIndex,
          });

          totalPnl = new BigNumber(totalPnl).plus(pnl).toNumber();

          openPositionValue = position.isBuy
            ? new BigNumber(openPositionValue)
                .plus(new BigNumber(parsedMarkPrice).multipliedBy(parsedSize))
                .toNumber()
            : new BigNumber(openPositionValue)
                .minus(new BigNumber(parsedMarkPrice).multipliedBy(parsedSize))
                .toNumber();
        }

        totalInvestment = new BigNumber(totalInvestment)
          .plus(new BigNumber(parsedExecutionPrice).multipliedBy(parsedSize))
          .toNumber();
        
      })

      totalRoi =
        totalPnl === 0 || totalInvestment === 0
          ? 0
          : new BigNumber(totalPnl).div(totalInvestment).multipliedBy(100).toNumber();
    })

    setOpenPositionValue(openPositionValue);
    setPositionCount(positionCount);
    setTotalPnl(totalPnl);
    setTotalInvestment(totalInvestment);
    setTotalRoi(totalRoi);
  }, [underlyingAssetSpotIndex, groupedPosition, optionsInfo])

  return (
    <div className={twJoin("flex flex-wrap justify-between gap-[10px] p-3 md:p-6")}>
      <div className="w-[45%] flex flex-col items-start gap-[2px]">
        <div className="flex flex-row items-center h-[17px] gap-[10px] leading-[1rem]">
          <p className="text-gray9D text-[13px] md:text-[15px] leading-5 font-normal">Total Open Positions</p>
        </div>
        <div className="flex flex-row">
          <p className="text-[18px] md:text-[20px] leading-[24px] font-bold text-contentBright">
            {formatNumber(positionCount, 0, true)}
          </p>
        </div>
      </div>

      <div className="w-[45%] flex flex-col items-start gap-[7px]">
        <div className="flex flex-row items-center h-[17px] gap-[10px]">
          <div className="text-gray9D text-[13px] md:text-[15px] leading-5 font-normal">
            <p className="h-[17px] text-gray80">Total Invest</p>
          </div>
        </div>
        <div className="flex flex-row">
          <p className="text-[18px] md:text-[20px] leading-[24px] font-bold text-contentBright">
            {advancedFormatNumber(totalInvestment, 2, "$", true)}
          </p>
        </div>
      </div>

      <div className="w-[45%] flex flex-col items-start gap-[7px]">
        <div className="flex flex-row items-center h-[17px] gap-[10px]">
          <div className="text-gray9D text-[13px] md:text-[15px] leading-5 font-normal">
            <p className="h-[17px] text-gray80">Total P&L</p>
          </div>
        </div>
        <div className="flex flex-row">
          <p className="text-[18px] md:text-[20px] leading-[24px] font-bold text-contentBright">
            {BigNumber(totalPnl).isEqualTo(0) ? (
              <span>{advancedFormatNumber(totalPnl, 2, "$")}</span>
            ) : BigNumber(totalPnl).isGreaterThan(0) ? (
              <span className="text-green63">{advancedFormatNumber(totalPnl, 2, "$")}</span>
            ) : (
              <span className=" text-redE0">{advancedFormatNumber(totalPnl, 2, "$")}</span>
            )}
          </p>
        </div>
      </div>

      <div className="w-[45%] flex flex-col items-start gap-[7px]">
        <div className="flex flex-row items-center h-[17px] gap-[10px]">
          <div className="text-gray9D text-[13px] md:text-[15px] leading-5 font-normal">
            <p className="h-[17px] text-gray80">Total ROI</p>
          </div>
        </div>
        <div className="flex flex-row">
          <p className="text-[18px] md:text-[20px] leading-[24px] font-bold text-contentBright">
            {BigNumber(totalRoi).isEqualTo(0) ? (
              <span>{advancedFormatNumber(totalRoi, 2, "")}%</span>
            ) : BigNumber(totalRoi).isGreaterThan(0) ? (
              <span className="text-green63">{advancedFormatNumber(totalRoi, 2, "")}%</span>
            ) : (
              <span className="text-redE0">{advancedFormatNumber(totalRoi, 2, "")}%</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PositionDashboard;
