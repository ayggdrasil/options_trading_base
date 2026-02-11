import { useAppDispatch } from "@/store/hooks";
import { loadMyPositionHistory } from "@/store/slices/PositionHistorySlice";
import { HistoryFilterType, HistoryRangeType } from "@/utils/types";
import { useEffect, useState } from "react";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";

export const usePositionHistory = ({ address }: { address: `0x${string}` | undefined }) => {
  const dispatch = useAppDispatch();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const [selectedHistoryRangeType, setSelectedHistoryRangeType] = useState<HistoryRangeType>("1 Day");
  const [selectedHistoryTimestamp, setSelectedHistoryTimestamp] = useState<number>(
    Math.floor(new Date().getTime() / 1000) - 86400
  );
  const [selectedHistoryFilterType, setSelectedHistoryFilterType] = useState<HistoryFilterType>("All Types");

  useEffect(() => {
    dispatch(loadMyPositionHistory({ chain, address, timestamp: selectedHistoryTimestamp }));
  }, [selectedHistoryTimestamp, address, dispatch])

  return {
    selectedHistoryRangeType,
    selectedHistoryTimestamp,
    selectedHistoryFilterType,
    setSelectedHistoryRangeType,
    setSelectedHistoryTimestamp,
    setSelectedHistoryFilterType,
  }
}