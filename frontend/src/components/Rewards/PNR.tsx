import React from 'react'
import { twMerge, twJoin } from 'tailwind-merge'
import Points from './Points'
import Tier from './Tier'
import Referrals from './Referrals'
import FeeRebates from './FeeRebates'

type Props = {
  userPointInfo: any
}

const PNR = ({ userPointInfo }: Props) => {

  return (
    <div
      className={twJoin(
        "flex flex-col",
      )}
    >
      <div
        className={twJoin(
          "grid grid-cols-[1fr,1fr] gap-[16px]",
        )}
      >
        <Points pointWeekly={userPointInfo?.point_weekly} pointEntire={userPointInfo?.point_entire} />
        <Tier 
          tier={userPointInfo?.tier} 
          pointWeekly={userPointInfo?.point_weekly}
        />
      </div>
      <Referrals
        childrenCount={userPointInfo?.count_children}
        pointFromChildren={userPointInfo?.point_from_children}
        grandchildrenCount={userPointInfo?.count_grandchildren}
        pointFromGrandchildren={userPointInfo?.point_from_grandchildren}
      />
      <FeeRebates
        tier={userPointInfo?.tier}
        feeRebatesReceivedTotal={userPointInfo?.fee_rebates_received_total}
        feeRebatesReceivedWeekly={userPointInfo?.fee_rebates_received_weekly} 
        feeRebatesReceivedVolumeTotal={userPointInfo?.fee_rebates_received_volume_total}
        feeRebatesReceivedChildrenCount={userPointInfo?.fee_rebates_received_children_count}
      />
    </div>
  )
}

export default PNR