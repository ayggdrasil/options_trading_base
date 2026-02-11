import React from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

type Props = {
  children: React.ReactNode
  className?: string
}

const DashedText = ({ children, className }: Props) => {
  return (
    <div
      className={twMerge(
        twJoin(
          "underline decoration-dashed decoration-greenc1 underline-offset-[6px]"
        ),
        className
      )}
    >
      {children}
    </div >
  )
}

export default DashedText