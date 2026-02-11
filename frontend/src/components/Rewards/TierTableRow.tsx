import React from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

type Props = {
  children?: React.ReactNode 
  className?: string
}

const TierTableRow = ({ children, className }: Props) => {
  return (
    <div
      className={twMerge(
        twJoin(
          "w-[900px]",
          "grid grid-cols-[80px,1fr,110px,110px,110px,110px,110px] gap-[20px]",
          "items-start",
          "border-b border-black33 py-[7px]",
          "leading-[18px]",
        ),
        className,
      )}
    >
      {children}
    </div>
  )
}

export default TierTableRow