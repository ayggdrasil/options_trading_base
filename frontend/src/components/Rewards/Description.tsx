import React from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

type Props = {
  children: React.ReactNode
  onClick?: () => void
}

const Description = ({ children, onClick }: Props) => {
  return (
    <div
      className={twJoin(
        "text-[13px] font-semibold text-primaryc1",
        "mt-[6px]",
      )}
    >
      {children}
    </div>
  )
}

export default Description