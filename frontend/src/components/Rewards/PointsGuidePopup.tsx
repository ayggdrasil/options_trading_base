import React, { useContext, useState } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'
import { useAccount } from 'wagmi'
import Button from '../Common/Button'
import { ModalContext } from '../Common/ModalContext'

import Image1 from '@/assets/points/img-p-0.png'
import GuideImage0 from '@/assets/points/img-p-1.png'
import GuideImage1 from '@/assets/points/img-p-2.png'
import GuideImage2 from '@/assets/points/img-p-3.png'
import GuideImage3 from '@/assets/points/img-p-4.png'
import Checkbox from '../Common/Checkbox'

type Props = {
  autoShow?: boolean
}

const guideImages = [
  GuideImage0,
  GuideImage1,
  GuideImage2,
  GuideImage3,
]

const GuideItem = ({ idx, currentImgIdx, setImgIdx, title }: any) => {

  const isActive = currentImgIdx === idx

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        setImgIdx(idx)
      }}
      className={twJoin(
        "w-[180px] h-[48px] rounded-[6px]",
        "flex items-center bg-black1a",
        "mb-[12px]",
        "px-[20px]",
        "cursor-pointer",
        "border",
        isActive
          ? "border-primaryc1 text-whitee0"
          : "border-transparent text-gray80",
      )}
    >
      {title}
    </div>
  )
}

const PointsGuidePopup = ({ autoShow }: Props) => {

  const { closeModal } = useContext(ModalContext)

  const { address } = useAccount()

  const [imgIdx, setImgIdx] = useState(0)
  const [dontShow, setDontShow] = useState(false)

  return (
    <div
      className={twJoin(
        "w-[884px]",
        "pt-[52px] pb-[28px] px-[24px]",
        "bg-black1f",
        "rounded-[3px]",
        "shadow-[0px_0px_24px_0px_rgba(10,10,10,0.75)"
      )}
      onClick={(e) => { e.stopPropagation()}}
    >
      <div
        className={twJoin(
          "max-h-[70vh]",
          "overflow-scroll scrollbar-hide",
        )}
      >
        <p
          className={twJoin(
            "text-[30px] text-primaryc1 font-[800]",
            "mb-[36px]",
            "leading-[24px]",
          )}
        >
          How to Earn Points for Exceptional Rewards?
        </p>
        <img 
          className="w-full mb-[24px]" 
          src={Image1} 
        />

        <div className="mb-[36px] pl-[32px]">
          <p className="list-item text-grayb3 text-[15px]">Point Boosts & Bonus Rates are tier-dependent; climb up tiers by accumulating points for more rewards. </p>
          <p className="list-item text-grayb3 text-[15px]">Gain Boosts by participating in Moby’s events; stay tuned for more. </p>
          <p className="list-item text-grayb3 text-[15px]">Points are credited in real-time except for liquidity provision, which is credited daily at 00:00 UTC </p>
          <p className="list-item text-grayb3 text-[15px]">Point weights ​​may continuously vary based on user participation and patterns. </p>
        </div>
      </div>

      {autoShow
        ? (
          <div
            className={twJoin(
              "flex items-center justify-between",
              "mt-[24px] px-[28px]",
            )}
          >
            <Checkbox
              onClick={(e) => {
                // @dev: toggle

                if (dontShow) {
                  // Remove the dontShowUntil key from localStorage
                  localStorage.removeItem('popup.refer&earn.dontShowUntil')
                } else {
                  // Set the dontShowUntil key in localStorage to 7 days from now
                  localStorage.setItem('popup.refer&earn.dontShowUntil', (new Date().getTime() + 86400 * 7 * 1000).toString())
                }

                e.stopPropagation()
                setDontShow(!dontShow)
              }}
              isChecked={dontShow}
              text="Don't show for a week"
            />
            <Button
              className="w-[180px] h-[40px]"
              name="OK"
              color="greenc1"
              onClick={() => {
                closeModal()
              }}
            />
          </div>
        )
        : (
          <div
            className={twJoin(
              "flex items-center justify-end pr-[12px]",
            )}
          >
            <Button
              className="w-[180px] h-[40px]"
              name="OK"
              color="greene6"
              onClick={() => {
                closeModal()
              }}
            />
          </div>
        )
      }
    </div>
  )
}

export default PointsGuidePopup