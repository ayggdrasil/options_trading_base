import React, { useContext, useEffect, useState } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'
import Button from '../Common/Button'
import { ModalContext } from '../Common/ModalContext'

type Props = {
  
}

const WeeklyBonus = ({  }: Props) => {
  const { openModal, closeModal } = useContext(ModalContext)
  const [rect, setRect] = useState<any>({ top: 0, right: 0 })

  useEffect(() => {
    // resize event listener
    const handleResize = () => {
      const parentElem = document.querySelector('#leaderboard')
      
      if (parentElem !== null) {
        const rect = parentElem.getBoundingClientRect()
        // re-render
        setRect(rect)
      }
    }

    handleResize()

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div
      style={{
        top: `${rect.top + 24}px`,
        left: `${rect.right - 408}px`,
      }}
      className={twJoin(
        "fixed",
        "bg-black1f border border-black29",
        "rounded-[3px] shadow-[0px_0px_24px_0px__rgba(10,10,10,0.75)]",
        "w-[408px]",
        "px-[24px] py-[24px]",
      )}
    >
      <p
        className={twJoin(
          "text-primaryc1 text-[18px] font-bold leading-[24px]",
          "mb-[8px]",
        )}
      >
        Weekly Bonus Points
      </p>
      <p
        className={twJoin(
          "text-gray80 text-[15px] font-semibold leading-[20px]",
        )}
      >
        Weekly ‘Bonus’ Points are given to the top 1-10 users every Monday at 12:00 UTC, proportional to the total points accumulated throughout the week.
      </p>
      <Button
        name="OK"
        className="flex items-center justify-center w-[144px] h-[40px] mt-[24px] mx-auto"
        color="greenc1"
        onClick={() => {
          closeModal()
        }}
      />
    </div>
  )
}

export default WeeklyBonus