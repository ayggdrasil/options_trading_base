import { twJoin } from 'tailwind-merge'
import Panel from './Panel'
import Description from './Description'

import { advancedFormatNumber } from '@/utils/helper'
import { tierMap } from './TierItem'

type Props = {
  tier: number
  feeRebatesReceivedTotal: string
  feeRebatesReceivedWeekly: string
  feeRebatesReceivedVolumeTotal: string
  feeRebatesReceivedChildrenCount: number
}

const FeeRebates = ({
  tier,
  feeRebatesReceivedTotal,
  feeRebatesReceivedWeekly,
  feeRebatesReceivedVolumeTotal,
  feeRebatesReceivedChildrenCount,
}: Props) => {

  return (
    <div
      className={twJoin(
        "grid grid-cols-[1fr,1fr] gap-[16px] mt-[16px]",
      )}
    >
      <div
        className={twJoin(
          "flex-1",
        )}
      >
        <Panel 
          title={(
            <div
              className={twJoin(
                "inline-flex items-center",
              )}
            >
              <span className="mr-[3px]">Fee Rebates</span>
              {tierMap[tier]?.feeRebateRate > 0 && (
                <div className='flex flex-row justify-center items-center w-[34px] h-[20px] rounded-[3px] bg-black2e ml-[10px]'>
                  <p className='text-[12px] text-primaryc1 font-semibold'>{tierMap[tier]?.feeRebateRate}%</p>
                </div>
              )}
            </div>
          )}
          className="h-[128px]"
        >
          <div
              className={twJoin(
                "grid grid-cols-[1fr,1fr] items-center",
                "border-l-[3px] border-black33 pl-[24px]",
              )}
            >
              <div>
                <p
                  className={twJoin(
                    "text-whitee0 font-bold text-[21px] leading-[22px]",
                  )}
                >
                  {advancedFormatNumber(Number(feeRebatesReceivedWeekly), 2, "$")}
                </p>
                <Description>Weekly</Description>
              </div>
              <div>
                <p
                  className={twJoin(
                    "text-whitee0 font-bold text-[21px] leading-[22px]",
                  )}
                >
                  {advancedFormatNumber(Number(feeRebatesReceivedTotal), 2, "$")}
                </p>
                <Description>All Time</Description>
              </div>
            </div>
        </Panel>
      </div>
      <div
        className={twJoin(
          "flex-1",
        )}
      >
        <Panel 
          title={(
            <div
              className={twJoin(
                "inline-flex items-center",
              )}
            >
              <span className="mr-[3px]">Total Referee Transaction Volume</span>
            </div>
          )}
          className="h-[128px]"
        >
          <div
              className={twJoin(
                "grid grid-cols-[1fr] items-center",
                "border-l-[3px] border-black33 pl-[24px]",
              )}
            >
              <div>
                <p
                  className={twJoin(
                    "text-whitee0 font-bold text-[21px] leading-[22px]",
                  )}
                >
                  {advancedFormatNumber(Number(feeRebatesReceivedVolumeTotal), 2, "$")}
                </p>
                <Description>by {feeRebatesReceivedChildrenCount} Whales</Description>
              </div>
            </div>
        </Panel>
      </div>
    </div>
  )
}

export default FeeRebates