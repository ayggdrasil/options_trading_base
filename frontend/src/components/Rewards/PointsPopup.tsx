import React, { useContext, useState } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

import { useAccount } from 'wagmi'
import Button from '../Common/Button'
import { ModalContext } from '../Common/ModalContext'

import Image1 from '@/assets/points/img-r-0.png'
import Image3 from '@/assets/points/img-r-2.png'
import Checkbox from '../Common/Checkbox'

type Props = {
  autoShow?: boolean
  setIsModalClosed?: (isModalClosed: boolean) => void
}

const PointsPopup = ({ autoShow, setIsModalClosed }: Props) => {

  const { closeModal } = useContext(ModalContext)

  const { address } = useAccount()

  const [dontShow, setDontShow] = useState(false)

  return (
    <div
      className={twJoin(
        "mt-[16px]",
        "w-[590px]",
        "pt-[52px] pb-[28px]",
        "bg-black1f",
        "rounded-[3px]",
        "shadow-[0px_0px_24px_0px_rgba(10,10,10,0.75)"
      )}
      onClick={(e) => { e.stopPropagation()}}
    >
      <div className="px-[28px]">
        <img className="w-full" src={Image1} />
      </div>
      <div
        style={{
          maxHeight: "calc(70vh - 120px)"
        }}
        className={twJoin(
          "overflow-scroll scrollbar-hide",
          "px-[28px] mt-[40px]"
        )}
      >
        <img className="w-full" src={Image3} />
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
                if (setIsModalClosed) {
                  setIsModalClosed(true)
                }
              }}
            />
          </div>
        )
        : (
          <div
            className={twJoin(
              "flex items-center justify-center",
              "mt-[24px]",
            )}
          >
            <Button
              className="w-[180px] h-[40px]"
              name="OK"
              color="greenc1"
              onClick={() => {
                closeModal()
                if (setIsModalClosed) {
                  setIsModalClosed(true)
                }
              }}
            />
          </div>
        )
      }
    </div>
  )
}

export default PointsPopup