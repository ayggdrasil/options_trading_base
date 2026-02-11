import React, { useContext, useEffect, useState } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'
import Button from '../Common/Button'

type OlpInfoProps = {
  olpKey: string
  closeModal: () => void
}

const OlpInfo = ({ olpKey, closeModal }: OlpInfoProps) => {

  const [rect, setRect] = useState<any>({ top: 0, right: 0 })

  useEffect(() => {
    // resize event listener
    const handleResize = () => {
      const parentElem = document.querySelector('#' + olpKey)
      
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
        top: `${rect.top + 65}px`,
        left: `${rect.right - 375}px`,
      }}
      className={twJoin(
        "fixed",
        "bg-black1f border border-black29",
        "rounded-[3px] shadow-[0px_0px_24px_0px__rgba(10,10,10,0.75)]",
        "w-[368px] h-fit",
        "p-[24px]",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <p
        className={twJoin(
          "text-primaryc1 text-[18px] font-bold leading-[24px]",
          "mb-[8px]",
        )}
      >
        Options LP
      </p>
      <p
        className={twJoin(
          "text-gray80 text-[15px] font-semibold leading-[20px]",
        )}
      >
        Moby’s OLP takes positions opposite those requested by traders, earning fees in the process. In this process, through the SLE (Synchronized Liquidity Engine) model to apply a calculated Risk Premium, it maintains position balance and effectively manages risk within the OLP, thereby stably preserving LP.
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

export default OlpInfo