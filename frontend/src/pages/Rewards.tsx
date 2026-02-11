import Leaderboard from '@/components/Rewards/Leaderboard';
import Banner from '@/components/Rewards/Banner';
import PNR from '@/components/Rewards/PNR';
import { useEffect, useState } from 'react';
import { twJoin } from 'tailwind-merge';
import { useAccount } from 'wagmi';;
import { LEADERBOARD_API, USER_POINT_INFO_API } from '@/networks/apis';
import { NetworkState } from '@/networks/types';
import { useAppSelector } from '@/store/hooks';

interface RewardsProps {
  announcementsLen: number;
}

function Rewards({ announcementsLen }: RewardsProps) {
  const { address } = useAccount()
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const [userPointInfo, setUserPointInfo] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)

  useEffect(() => {
    fetch(LEADERBOARD_API[chain])
      .then((res) => res.json())
      .then((data) => {
        setLeaderboard(data)
      })
  }, [chain])

  useEffect(() => {
    if (!address) {
      setUserPointInfo(null)
      return
    }

    fetch(USER_POINT_INFO_API[chain] + address)
      .then((res) => res.json())
      .then((data) => {
        setUserPointInfo(data)
      })

  }, [address, chain])

  const [topPadding, setTopPadding] = useState(0);

  useEffect(() => {
    setTopPadding(announcementsLen * 46 + 46);
  }, [announcementsLen]);

  return (
    <div
      style={{ paddingTop: `${topPadding}px` }}
      className={twJoin(
        "relative",
        "pb-[72px] w-full h-full",
        'flex flex-row justify-center items-center',
      )}
    > 
      <div 
        className={twJoin(
          "flex flex-col gap-[28px]",
          "w-full min-w-[1280px] max-w-[1920px] min-h-screen pt-[66px]"
        )}
      >
        <div
          className={twJoin(
            "grid grid-cols-[776px,480px] gap-[16px]",
          )}
        >
          <div
            className={twJoin(
              "flex flex-col",
            )}
          >
            <Banner />
            <PNR userPointInfo={userPointInfo} />
          </div>
          <Leaderboard userPointInfo={userPointInfo} leaderboard={leaderboard} />
        </div>
      </div>
    </div>
  )
}

export default Rewards;