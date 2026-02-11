import { GroupedPosition, Position } from "@/interfaces/interfaces.positionSlice";
import { UA_INFO } from "@/networks/assets";
import { useAppSelector } from "@/store/hooks";
import { useEffect, useState } from "react";
import { NetworkState } from "@/networks/types";
import { getStrategyByOptionTokenId, isCallStrategy } from "@callput/shared";

interface PositionsLength {
  BTC: number;
  ETH: number;
}

export const useHasPosition = () => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const positionsData = useAppSelector((state: any) => state.positions);

  const [positions, setPositions] = useState<PositionsLength>({ BTC: 0, ETH: 0,})

  useEffect(() => {
    setPositions({ BTC: 0, ETH: 0 })

    Object.keys(UA_INFO[chain]).forEach((asset) => {
      const expiriesInAsset = positionsData[asset];

      expiriesInAsset.forEach((expiryData: GroupedPosition) => {
        const isExpired = Number(expiryData.expiry) * 1000 < Date.now();
        const positionsInExpiry = expiryData.positions;

        if (isExpired) {
          const settlePriceInExpiry = expiryData.settlePrice;

          positionsInExpiry.forEach((position: Position) => {
            const strategy = getStrategyByOptionTokenId(BigInt(position.optionTokenId))
            const isITM = isCallStrategy(strategy)
              ? Number(position.mainOptionStrikePrice) < Number(settlePriceInExpiry)
              : Number(position.mainOptionStrikePrice) > Number(settlePriceInExpiry);

            if (isITM) {
              setPositions((prev) => ({
                ...prev,
                [asset]: prev[asset as keyof PositionsLength] + 1
              }))
            }
          })
        } else {
          positionsInExpiry.forEach((position: Position) => {
            setPositions((prev) => ({
              ...prev,
              [asset]: prev[asset as keyof PositionsLength] + 1
            }))
          })
        }
      })
    })
  }, [positionsData])


  return Object.keys(UA_INFO[chain]).reduce((acc: any, cur) => {
    acc[cur] = positions[cur as keyof PositionsLength] > 0;
    return acc
  }, {})
}