import BigNumber from "bignumber.js";

import { useContext, useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import Main from "@/components/ZeroDte/Main";
import Position from "@/components/ZeroDte/Position";
import { UnderlyingAsset } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface ZeroDteProps {
  announcementsLen: number;
}

function ZeroDte({ announcementsLen }: ZeroDteProps) {
  const [underlyingAsset, setUnderlyingAsset] = useState<UnderlyingAsset>(() => {
    const savedUnderlyingAssetForZeroDte = localStorage.getItem("underlyingAssetForZeroDte");
    return savedUnderlyingAssetForZeroDte ? savedUnderlyingAssetForZeroDte as UnderlyingAsset : UnderlyingAsset.BTC;
  });

  useEffect(() => {
    localStorage.setItem("underlyingAssetForZeroDte", underlyingAsset);
  }, [underlyingAsset])

  const [topPadding, setTopPadding] = useState(0);

  useEffect(() => {
    setTopPadding(announcementsLen * 46 + 46);
  }, [announcementsLen]);

  return (
    <div
      style={{ paddingTop: `${topPadding}px` }}
      className={twJoin(
      "pb-[75px] w-full h-full",
      "flex flex-row justify-center items-center"
      )}
    >
      <div className={twJoin(
        "flex flex-col gap-[16px]",
        "w-[1280px] max-w-[1280px] min-w-[1280px] min-h-screen pt-[64px]"
      )}>
        <Main
          underlyingAsset={underlyingAsset}
          setUnderlyingAsset={setUnderlyingAsset}
        />
        <Position
          underlyingAsset={underlyingAsset}
        />
      </div>
    </div>
  );
}

export default ZeroDte;
