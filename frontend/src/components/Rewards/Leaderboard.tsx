import React, { useContext, useEffect, useState } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'
import ToggleButton from '../Common/ToggleButton'
import LeaderboardRow from './LeaderboardRow'
import { useAccount } from 'wagmi'
import Pagination from './Pagination'
import WeeklyBonus from './WeeklyBonus'
import { ModalContext } from '../Common/ModalContext'

import QuestionMark from '@/assets/questionmark.svg'

type Props = {
  userPointInfo: any
  leaderboard: any
}

const Leaderboard = ({ userPointInfo, leaderboard }: Props) => {

  const { openModal, closeModal } = useContext(ModalContext)

  const { address } = useAccount()

  const [page, setPage] = useState(1)
  const [leaderboardType, setLeaderboardType] = useState("weekly")

  const isWeekly = leaderboardType === "weekly"

  const leaderboardArr = isWeekly
    ? leaderboard?.weeklyLeaderboard 
    : leaderboard?.entireLeaderboard

  return (
    <div
      className={twJoin(
        "flex flex-col",
      )}
    >
      <div
        id="leaderboard"
        className={twJoin(
          "flex flex-col items-center",
          "bg-black1f",
          "py-[28px]",
          "w-full h-[640px]",
        )}
      >
        <div className='flex flex-row w-full justify-between items-center px-[24px]'>
          <p className='text-[20px] text-whitee0 font-bold'>Leaderboard</p>
          <ToggleButton
            id="leaderboard-type"
            buttonSize="small"
            buttonShape="round"
            items={
              [
                { value: 'weekly', label: 'Weekly', textColor: 'text-greenc1', hoverColor: 'hover:!bg-black33 hover:!text-greenc1' },
                { value: 'alltime', label: 'All Time', textColor: 'text-greenc1', hoverColor: 'hover:!bg-black33 hover:!text-greenc1' }
              ]
            }
            selectedItem={leaderboardType}
            setSelectedItem={setLeaderboardType}
          />
        </div>

        <div
          className="w-[440px]"
        >
          <div
            className={twJoin(
              isWeekly
                ? "grid grid-cols-[42px,124px,120px,1fr] gap-[12px]"
                : "grid grid-cols-[42px,124px,1fr] gap-[12px]",
              "h-[37px]",
              "mt-[28px]",
              "pb-[12px]",
              "mb-[12px]",
              "border-b-[1px] border-black33",
              "text-[14px] font-semibold text-gray80",
            )}
          >
            <span>Rank</span>
            <span>Trader</span>
            <span
              className={twJoin(
                "text-right",
                !isWeekly && "pr-[12px]"
              )}
            >
              Points
            </span>
            {isWeekly && (
              <div
                className="flex items-center justify-end pr-[6px] cursor-pointer"
                onClick={() => {
                  openModal(
                    <WeeklyBonus />, {
                      modalClassName: [
                        "backdrop-blur-none",
                        "bg-[#121212] bg-opacity-80",
                      ]
                    }
                  )
                }}
              >
                <span>Bonus</span>
                <img className="w-[24px] h-[24px] ml-[3px]" src={QuestionMark} />
              </div>
            )}
          </div>

          <div
            className={twJoin(
              "flex flex-col",
            )}
          >
            {address && (
              <LeaderboardRow
                isWeekly={isWeekly}
                mine
                rank={isWeekly ? userPointInfo?.user_weekly_rank : userPointInfo?.user_entire_rank}
                address={address}
                point={isWeekly ? userPointInfo?.point_weekly : userPointInfo?.point_entire}
                reward={userPointInfo?.weekly_reward || "-"}
              />
            )}
            {leaderboardArr?.slice((page - 1) * 10, page * 10)?.map(({ rank, address, point, reward }: { rank: any, address: any, point: any, reward: any }) => {
              return (
                <LeaderboardRow
                  key={address}
                  isWeekly={isWeekly}
                  rank={rank}
                  address={address}
                  point={point}
                  reward={reward || "-"}
                />
              )
            })}
          </div>
        </div>
        <Pagination
          itemsPerPage={10}
          totalCount={leaderboardArr?.length || 0}
          page={page}
          setPage={setPage}
        />
      </div>
    </div>
  )
}

export default Leaderboard