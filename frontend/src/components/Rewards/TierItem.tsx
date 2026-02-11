import React, { useContext } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

import Description from './Description'
import TierTable from './TierTable'

import QuestionMark from '@/assets/questionmark.svg'

import Tier1Image from '@/assets/tier-1.svg'
import Tier2Image from '@/assets/tier-2.svg'
import Tier3Image from '@/assets/tier-3.svg'
import Tier4Image from '@/assets/tier-4.svg'

import PointBonusRateTier1 from '@/assets/tier-1-blue-point-bonus-rate.svg'
import PointBonusRateTier2 from '@/assets/tier-2-purple-point-bonus-rate.svg'
import PointBonusRateTier3 from '@/assets/tier-3-black-point-bonus-rate.svg'
import PointBonusRateTier4 from '@/assets/tier-4-aff-point-bonus-rate.svg'

import ArrowLeft from '@/assets/arrow-left.svg'
import ArrowRight from '@/assets/arrow-right.svg'
import { ModalContext } from '../Common/ModalContext'

type Props = {
  tier: number
  nextWeek?: boolean
  weekMode: string
  setWeekMode?: (weekMode: "current" | "nextweek") => void
}

export const tierMap: { [key: number]: any }= {
  1: {
    name: 'Blue Whale',
    pointBonusRate: PointBonusRateTier1,
    image: Tier1Image,
    feeRebateRate: 15,
  },
  2: {
    name: 'Purple Whale',
    pointBonusRate: PointBonusRateTier2,
    image: Tier2Image,
    feeRebateRate: 15,
  },
  3: {
    name: 'Black Whale',
    pointBonusRate: PointBonusRateTier3,
    image: Tier3Image,
    feeRebateRate: 15,
  },
  4: {
    name: 'Affiliates',
    pointBonusRate: PointBonusRateTier4,
    image: Tier4Image,
    feeRebateRate: 30,
  },
}

const getLeft = ({ nextWeek, weekMode }: { nextWeek: any, weekMode: any}) => {
  if (weekMode == "current") {
    return nextWeek ? "calc(100% + 20px)" : "0"
  }

  return nextWeek ? "0" : "calc(-100% - 20px)"
}

const TierItem = ({ tier, nextWeek, weekMode, setWeekMode }: Props): JSX.Element | null => {
  const { openModal, closeModal } = useContext(ModalContext);

  if (!tier) return null;

  return (
    <div
      style={{
        left: getLeft({ nextWeek, weekMode }),
      }}
      className={twJoin(
        "absolute top-0 w-full h-full",
        "grid grid-cols-[118px,1fr]",
        "items-center h-full",
        "transition-all duration-300",
        "z-10",
      )}
    >
      <div
        className={twJoin(
          "flex items-center justify-center",
        )}
      >
        <img
          className={twJoin(
            "w-[88px] h-[88px]",
          )}
          src={tierMap[tier]?.image}
        />
      </div>
      <div
        className={twJoin(
          "w-full h-full",
          "pr-[20px] pt-[17px]",
        )}
      >
        <div
          className={twJoin(

          )}
        >
          <div
            className={twJoin(
              "flex items-center justify-between",
              "text-[16px] text-[#999999] font-semibold",
            )}
          >
            <div
              className="flex items-center cursor-pointer"
              onClick={() => {
                openModal(
                  <TierTable />,
                  {
                    modalClassName: [
                      "backdrop-blur-none",
                      "bg-[#121212] bg-opacity-80",
                    ]
                  }
                )
              }}
            >
              <span>Tier</span>
              <img className="ml-[3px] w-[24px] h-[24px]" src={QuestionMark} />
            </div>
            <div
              className={twJoin(
                "flex items-center",
                "text-[12px] font-[400]",
                "cursor-pointer",
              )}
              onClick={() => {
                if (setWeekMode === undefined) return;

                if (nextWeek) {
                  setWeekMode("current")
                  return
                }

                setWeekMode("nextweek")
              }}
            >
              {nextWeek 
                ? (
                  <>
                    <img src={ArrowLeft} className="w-[16px] h-[16px] mr-[2px]" />
                    Current
                  </>
                )
                : (
                  <>
                    Next Week
                    <img src={ArrowRight} className="w-[16px] h-[16px] ml-[2px]" />
                  </>
                )
              }
            </div>
          </div>
          <div
            className={twJoin(
              "flex items-center",
              "pt-[13px]"
            )}
          >
            <span
              className={twJoin(
                "text-[21px] text-whitee0 font-bold leading-[22px]",
              )}
            >
              {tierMap[tier]?.name || "-"}
            </span>
            {tier && (
              <img
                className={twJoin(
                  "w-[87px] h-[20px]",
                  "ml-[10px]",
                )}
                src={tierMap[tier]?.pointBonusRate}
              />
            )}
          </div>
          <Description>
            Tier {tier}
          </Description>
        </div>
      </div>
    </div>
  )
}

export default TierItem