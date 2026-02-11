import React, { memo, useMemo } from "react";
import {
  ILeadTrader,
  ILeadTraders,
} from "@/interfaces/interfaces.marketSlice.ts";

import BigNumber from "bignumber.js";
import SocialTradingChip from "./SocialTradingChip";
import { UnderlyingAsset } from "@callput/shared";

type SocialTradingChipListProps = {
  leadTraders: ILeadTraders;
  underlyingAsset: UnderlyingAsset;
  setSelectedLeadTrader: (value: ILeadTrader | null) => void;
  setEstimatedPrice: (value: number) => void;
  getOverlayPosition: (id: number) => any;
  toggleDirectCoord: (value: boolean) => void;
  setCopedStrikePrice: (value: number) => void;
};

const SocialTradingChipList: React.FC<SocialTradingChipListProps> = memo(
  ({
    leadTraders,
    underlyingAsset,
    setSelectedLeadTrader,
    setEstimatedPrice,
    getOverlayPosition,
    toggleDirectCoord,
    setCopedStrikePrice,
  }) => {
    const renderLeadTraders = useMemo(() => {
      const list = (leadTraders?.[underlyingAsset] || []).slice();

      list.sort((a: any, b: any) => {
        // Sort by executionPrice in ascending order
        return (
          Number(BigNumber(a.executionPrice).dividedBy(BigNumber(10).pow(30))) -
          Number(BigNumber(b.executionPrice).dividedBy(BigNumber(10).pow(30)))
        );
      });

      return list;
    }, [leadTraders, underlyingAsset]);

    return (
      <>
        {renderLeadTraders.map((leadTrader: any) => {
          const position = getOverlayPosition(leadTrader.id);
          if (position.shouldShow) {
            return (
              <div
                key={leadTrader.id} // Ensure each child has a unique key
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  top: position.top,
                  left: position.left,
                }}
                onClick={() => {
                  toggleDirectCoord(false);
                  setCopedStrikePrice(leadTrader?.strikePrice?.[0] || 0);
                }}
              >
                <SocialTradingChip
                  leadTrader={leadTrader}
                  underlyingAsset={underlyingAsset}
                  setSelectedLeadTrader={setSelectedLeadTrader}
                  setEstimatedPrice={setEstimatedPrice}
                />
              </div>
            );
          }
        })}
      </>
    );
  }
);

export default SocialTradingChipList;
