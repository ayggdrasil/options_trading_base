import React from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

type Props = {
  title: any
  className?: string
  titleClassName?: string
  children: React.ReactNode
  onClick?: () => void
}

const Panel = ({ title, className, onClick, titleClassName, children }: Props) => {
  return (
    <div
      className={twMerge(
        twJoin(
          "flex flex-col",
          "bg-black1f",
          "px-[24px] py-[20px]",
          "rounded-[4px]"
        ),
        className,
      )}
    >
      <div
        onClick={onClick}
        className={twMerge(
          twJoin(
            "text-[16px] font-semibold",
            "mb-[13px]",
            "text-[#999999]"
          ),
          titleClassName,
        )}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

export default Panel