import { twJoin } from 'tailwind-merge'
import PointNumber from './PointNumber'

import Rank1Icon from '@assets/rank-1.svg'
import Rank2Icon from '@assets/rank-2.svg'
import Rank3Icon from '@assets/rank-3.svg'
import { shortenAddress } from '@/utils/helper'

type Props = {
  mine?: boolean
  isWeekly?: boolean
  rank: string | number
  address: `0x${string}`
  point: number
  reward: number | string
}

const Rank = ({ rank }: { rank: any }) => {
  if (Number(rank) == 1) return <img src={Rank1Icon} className="w-[20px] h-[16px]" />
  if (Number(rank) == 2) return <img src={Rank2Icon} className="w-[20px] h-[16px]" />
  if (Number(rank) == 3) return <img src={Rank3Icon} className="w-[20px] h-[16px]" />

  return <span className="text-[14px] font-semibold text-gray80">{rank}</span>
}

const LeaderboardRow = ({ mine, isWeekly, rank, address, point, reward }: Props) => {
  return (
    <div
      className={twJoin(
        isWeekly 
          ? "grid grid-cols-[42px,124px,120px,1fr] gap-[12px]"
          : "grid grid-cols-[42px,124px,1fr] gap-[12px]",
        "items-center",
        "h-[31px]",
        "mb-[6px]",
        "rounded-[4px]",
        mine && "bg-[#3D4030]/[0.5]"
      )}
    >
      <div
        className={twJoin(
          "flex justify-center",
          "pl-[4px]",
        )}
      >
        <Rank rank={rank} />
      </div>
      <span className="text-[14px] font-semibold text-whitee0">{mine ? "You" : shortenAddress(address)}</span>
      <PointNumber 
        point={point} 
        className={twJoin(
          "justify-end",
          !isWeekly && "pr-[12px]",
        )}
        textClassName="text-greenc1 text-[14px] font-semibold" 
        imgClassName="w-[16px] h-[16px] ml-[8px]" 
      />
      {isWeekly && (
        <PointNumber
          point={reward}
          className="justify-end pr-[12px]"
          textClassName="text-[#F5D01D] text-[14px] font-semibold"
          imgClassName="w-[16px] h-[16px] ml-[8px]"
        />
      )}
    </div>
  )
}

export default LeaderboardRow