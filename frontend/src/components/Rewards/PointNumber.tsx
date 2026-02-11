import React from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

import PointIcon from '@assets/point-icon.svg'
import { advancedFormatNumber } from '@/utils/helper'

type Props = {
  point: number | string
  className?: string
  textClassName?: string
  imgClassName?: string
}

const PointNumber = ({ point, className, textClassName, imgClassName }: Props) => {
  return (
    <div
      className={twMerge(
        twJoin(
          "flex items-center",
          "leading-[22px]",
        ),
        className,
      )}
    >
      <span
        className={twMerge(
          twJoin(
            "text-[21px] font-bold text-whitee6 leading-[22px]",
          ),
          textClassName
        )}
      >
        {advancedFormatNumber(Number(point), 0, "")}
      </span>
      <img 
        className={twMerge(
          twJoin(
            "w-[20px] h-[20px]",
            "ml-[6px]",
          ),
          imgClassName
        )}
        src={PointIcon} 
      />
    </div>
  )
}

export default PointNumber