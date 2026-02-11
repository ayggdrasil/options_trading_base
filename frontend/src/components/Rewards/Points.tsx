import React, { useContext } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'
import Panel from './Panel'
import PointNumber from './PointNumber'
import Description from './Description'

import GuideLabelIcon from '@/assets/points/guide-label.svg'
import { ModalContext } from '../Common/ModalContext'
import PointsGuidePopup from './PointsGuidePopup'

type Props = {
  pointWeekly: number,
  pointEntire: number,
}

const Points = ({ pointWeekly, pointEntire }: Props) => {

  const { openModal } = useContext(ModalContext)

  return (
    <div
      className={twJoin(
        "flex-1",
      )}
    >
      <Panel 
        title={(
          <div
            className={twJoin(
              "inline-flex items-center cursor-pointer",
            )}
            onClick={() => {
              openModal(
                <PointsGuidePopup />,
                {
                  modalClassName: [
                    "backdrop-blur-none",
                    "bg-[#121212] bg-opacity-80",
                  ]
                }
              )
            }}
          >
            <span className="mr-[3px]">Points</span>
            <img
              className="w-[45px]"
              src={GuideLabelIcon}
            />
          </div>
        )}
        className="h-[128px]"
      >
        <div
          className={twJoin(
            "w-full",
            "grid grid-cols-[1fr,1fr]",
          )}
        >
          <div>
            <PointNumber point={pointWeekly} />
            <Description>Weekly</Description>
          </div>
          <div>
            <PointNumber point={pointEntire} />
            <Description>All Time</Description>
          </div>
        </div>

      </Panel>
    </div>
  )
}

export default Points