import { useAppSelector } from "@/store/hooks";
import { useEffect, useState } from "react";

interface SettlePrices {
  BTC: number;
  ETH: number;
}

interface SettlePricesItem {
  timestamp: number,
  data: SettlePrices
}

interface SettlePricesData {
  [key: number]: SettlePrices
}

export const useUAPriceChangeRate = ({ futuresPrice, underlyingAsset }: { futuresPrice: number, underlyingAsset: string }) => {

  const settlePricesData = useAppSelector((state: any) => state.market.settlePrices) as SettlePricesData;

  const [lastSettlePrices, setLastSettlePrices] = useState<SettlePrices>({ BTC: 0, ETH: 0 });

  useEffect(() => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
  
      const lastSettlePrices = Object.entries(settlePricesData)
        .reduce<SettlePricesItem>((closest, [timestamp, data]) => {
          if (Math.abs(Number(timestamp) - currentTimestamp) < Math.abs(Number(closest.timestamp) - currentTimestamp)) {
            return { timestamp: Number(timestamp), data }
          }
          return closest;
        }, { timestamp: 0, data: { BTC: 0, ETH: 0 }})
  
      setLastSettlePrices(lastSettlePrices.data)
    }, [settlePricesData])

  const diff = futuresPrice - lastSettlePrices[underlyingAsset as keyof SettlePrices]
  const changeRate = Math.abs((diff) / lastSettlePrices[underlyingAsset as keyof SettlePrices]) * 100

  return {
    futuresPrice,
    diff,
    changeRate,
  }
}