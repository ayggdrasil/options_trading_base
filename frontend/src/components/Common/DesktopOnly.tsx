import React from 'react'
import { twJoin, twMerge } from 'tailwind-merge'

type Props = {
  children: React.ReactNode
  className?: string
}

const DesktopOnly: React.FC<Props> = ({ children, className }) => {
  return (
    <div 
      className={
        twMerge(
          twJoin("dt:block", "hidden"),
          className
        )
      }
    >
      {children}
    </div>
  )
}

export default DesktopOnly