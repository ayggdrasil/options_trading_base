import PositionSummary from "./PositionSummary";
import PositionTable from "./PositionTable";
import BannerInvite from "@/assets/banner-invite.png";
import ReferralShare from "../Rewards/ReferralShare";
import { useAppSelector } from "@/store/hooks";
import { useContext, useEffect, useMemo, useState } from "react";
import { FlattenedPosition, GroupedPosition } from "@/interfaces/interfaces.positionSlice";
import { addressToReferralID } from "@/utils/encoding";
import { ModalContext } from "../Common/ModalContext";
import { useAccount } from "wagmi";
import { FuturesAssetIndexMap, SpotAssetIndexMap, UnderlyingAsset } from "@callput/shared";
import { NetworkState } from "../../networks/types";
import { PositionsState } from "../../store/slices/PositionsSlice";
import { getFlattenedPositions } from "../TradingV2/utils/options";
import { IOptionsInfo } from "../../interfaces/interfaces.marketSlice";
import { calculatePositionStats, PositionStats } from "../TradingV2/utils/calculations";

interface PositionProps {
  underlyingAsset: UnderlyingAsset;
}

const initialStats: PositionStats = {
  openPositions: 0,
  positionsValue: 0,
  invested: 0,
  collateral: 0,
  pnl: 0,
  roi: 0,
  greeks: {
    delta: 0,
    gamma: 0,
    vega: 0,
    theta: 0,
  },
};

const Position: React.FC<PositionProps> = ({ underlyingAsset }) => {
  const { chain } = useAppSelector((state) => state.network) as NetworkState;
  const positionsData = useAppSelector((state: any) => state.positions) as PositionsState;
  const optionsInfo = useAppSelector((state: any) => state.market.optionsInfo) as IOptionsInfo;
  const futuresAssetIndexMap = useAppSelector(
    (state: any) => state.market.futuresAssetIndexMap
  ) as FuturesAssetIndexMap;
  const spotAssetIndexMap = useAppSelector(
    (state: any) => state.market.spotAssetIndexMap
  ) as SpotAssetIndexMap;

  const [positionStats, setPositionStats] = useState<PositionStats>(initialStats);
  const [flattenedPositions, setFlattenedPositions] = useState<FlattenedPosition[]>([]);

  const memoizedPositions = useMemo(() => {
    // Only calculate positions when the current chain matches the positions data chain
    if (positionsData.chain !== chain) {
      return [];
    }
    return getFlattenedPositions(underlyingAsset, positionsData, chain, optionsInfo, futuresAssetIndexMap);
  }, [underlyingAsset, positionsData, chain, optionsInfo, futuresAssetIndexMap]);

  const memoizedStats = useMemo(() => {
    return calculatePositionStats(memoizedPositions, chain, spotAssetIndexMap);
  }, [memoizedPositions, chain, spotAssetIndexMap]);

  useEffect(() => {
    const zeroDtePositions = memoizedPositions.filter((flattenedPosition: FlattenedPosition) => {
      const expiry = flattenedPosition.metadata.expiry;
      const isZeroDte = expiry && expiry * 1000 < Date.now() + 24 * 60 * 60 * 1000;
      return isZeroDte;
    });

    setFlattenedPositions(zeroDtePositions);
  }, [memoizedPositions]);

  useEffect(() => {
    setPositionStats(memoizedStats);
  }, [memoizedStats]);

  const { openModal } = useContext(ModalContext);
  const { address } = useAccount();

  return (
    <>
      <div className="w-full h-[96px] flex flex-row gap-[16px]">
        <PositionSummary positionStats={positionStats} />
        <img
          className="cursor-pointer w-[393px]"
          src={BannerInvite}
          onClick={() => {
            openModal(<ReferralShare referralId={addressToReferralID(address)} />, {
              modalClassName: ["backdrop-blur-none", "bg-[#121212] bg-opacity-80"],
            });
          }}
        />
      </div>
      <PositionTable underlyingAsset={underlyingAsset} flattenedPositions={flattenedPositions} />
    </>
  );
};

export default Position;
