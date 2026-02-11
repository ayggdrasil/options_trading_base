import React, { useContext, useState } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

import Panel from './Panel'
import TierItem from './TierItem'

type Props = {
  tier: number
  pointWeekly: number
}

const TIER_2_POINT_THRESHOLD = 10000
const TIER_3_POINT_THRESHOLD = 30000

const getNextWeekTier = (weeklyPoints = 0, currentTier: any) => {

  if (currentTier == 4) {
    return 4
  }

  // get tier
  switch (true) {
    case Number(weeklyPoints) < TIER_2_POINT_THRESHOLD:
      return 1 // tier 1
    case Number(weeklyPoints) < TIER_3_POINT_THRESHOLD:
      return 2 // tier 2
    default:
      return 3 // tier 3
  }
}

const Tier = ({ tier, pointWeekly }: Props) => {
  const [weekMode, setWeekMode] = useState<"current" | "nextweek">("current")
  const nextWeekTier = getNextWeekTier(pointWeekly, tier)
  return (
    <div
      className={twJoin(
        "flex-1",
      )}
    >
      <Panel
        title=""
        titleClassName="mb-0"
        className="h-[128px] p-0"
      >
        <div
          className={twJoin(
            "relative",
            "w-full h-full",
            "flex items-center",
            "overflow-hidden",
          )}
        >
          <TierItem tier={tier} weekMode={weekMode} setWeekMode={setWeekMode} />
          <TierItem tier={nextWeekTier} weekMode={weekMode} setWeekMode={setWeekMode} nextWeek />
        </div>
      </Panel>
    </div>
  )
}

export default Tier