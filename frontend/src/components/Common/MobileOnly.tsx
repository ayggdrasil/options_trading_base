import React from 'react'
import { twJoin } from 'tailwind-merge'

type Props = {
  children: React.ReactNode
}

const MobileOnly: React.FC<Props> = ({ children }) => {
  return (
    <div className={twJoin("dt:hidden", "block")}>
      {children}
    </div>
  )
}

export default MobileOnly