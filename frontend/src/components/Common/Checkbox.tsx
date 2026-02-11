import React from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

import IconChecked from "../../assets/icon-checked.svg"
import IconUnchecked from "../../assets/icon-unchecked.svg"

type Props = {
  isChecked: boolean
  onClick: (...args: any[]) => void
  text: string
}
const Checkbox = ({ isChecked, onClick, text }: Props) => {
  return (
    <label 
      onClick={onClick}
      className="cursor-pointer flex flex-row items-center gap-[10px]"
    >
      <img className="w-[16px]" src={isChecked ? IconChecked : IconUnchecked} />
      <p className="text-[13px] text-[#999999] font-semibold leading-3">{text}</p>
    </label>
  )
}

export default Checkbox