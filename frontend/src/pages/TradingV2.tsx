import OptionTradingPanel from "@/components/TradingV2/Options/OptionTradingPanel";
import PositionManagementPanel from "@/components/TradingV2/Positions/PositionManagementPanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTradingTitle } from "@/store/slices/MarketSlice";
import { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";

const BASE_TITLE = "CallPut.app - Permissionless 24/7 On-Chain Options for US Stocks & Crypto";

interface TradingProps {
  announcementsLen: number;
}

function TradingV2({ announcementsLen }: TradingProps) {
  const dispatch = useAppDispatch();
  const tradingTitle = useAppSelector((state: any) => state.market.tradingTitle);
  const [topPadding, setTopPadding] = useState(0);

  useEffect(() => {
    if (announcementsLen > 0) {
      setTopPadding(announcementsLen * 46 + 46);
    }
  }, [announcementsLen]);

  useEffect(() => {
    if (tradingTitle?.underlyingAsset != null) {
      const formattedFutures = Number(tradingTitle.underlyingFutures).toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      });
      document.title = `${formattedFutures} | ${tradingTitle.underlyingAsset} Options | ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }
  }, [tradingTitle]);

  useEffect(() => {
    return () => {
      document.title = BASE_TITLE;
      dispatch(setTradingTitle(null));
    };
  }, [dispatch]);

  return (
    <div
      style={announcementsLen > 0 ? { paddingTop: `${topPadding}px` } : undefined}
      className={twJoin("flex flex-row justify-center items-center", "w-full h-full", "pt-[46px]")}
    >
      <div
        className={twJoin(
          "flex flex-col",
          "w-full min-w-[1280px] max-w-[1920px] min-h-screen",
          "pt-[26px]",
          "border-x-[1px] border-[#292929]"
        )}
      >
        <OptionTradingPanel />
        <PositionManagementPanel />
      </div>
    </div>
  );
}

export default TradingV2;
