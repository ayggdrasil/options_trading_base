import React from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

type Props = {
  label: string,
  value: string,
  valueClassName?: string,
}

const LabelAndValue = ({ 
  label,
  value,
  valueClassName,
}: Props) => {
  return (
    <div
      className={twJoin(
        "flex justify-between h-[18px]",
        "mb-[4px]",
      )}
    >
      <span
        className={twJoin(
          "text-[#8b8c8f] font-[600] text-[13px]",
        )}
      >
        {label}
      </span>
      <span
        className={twMerge(
          twJoin(
            ""
          ),
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  )
}

export default LabelAndValue