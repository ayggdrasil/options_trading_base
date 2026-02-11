import { useObservableState } from 'observable-hooks'
import React, { useEffect, useRef, useState } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'

type Props = {
  tabs: any[],
  className?: string
  trackerClassName?: string
}

const Tab = ({ tabs, className, trackerClassName }: Props) => {
  const rootElem = useRef<any>(null)
  const [activeElemInfo, setActiveElemInfo] = useState<any>({})

  useEffect(() => {
    const activeElem = rootElem.current?.querySelector(".active")

    const rootElemRect = rootElem.current?.getBoundingClientRect()
    const rect = activeElem?.getBoundingClientRect()

    setActiveElemInfo({
      left: `${rect.x - rootElemRect.x}px`,
      width: `${rect.width}px`,
    })
  }, [tabs])

  return (
    <div
      ref={rootElem}
      className={twMerge(
        twJoin(
          "relative",
          "flex items-center justify-center",
          "h-[44px]",
        ),
        className,
      )}
    >
      {tabs.map(({ key, title, onClick, activeClassName, className, isActive }) => {

        return (
          <div
            key={key}
            className={twMerge(
              twJoin(
                "flex flex-1 items-center justify-center",
                "h-[44px]",
                "active-click",
                "cursor-pointer",
                "text-[13px] font-semibold text-center",
                "z-10",
                "border-b-[1px] border-black29",
                "dt:text-[16px]",
              ),
              isActive
                ? ["active", activeClassName]
                : "text-gray80",
              className,
            )}
            onClick={onClick}
          >
            {title}
          </div>
        )
      })}
      <div
        style={activeElemInfo}
        className={twMerge(
          twJoin(
            "absolute",
            "h-[2px]",
            "bottom-[1px]",
            "bg-greene6",
            "transition-all duration-100",
            "z-0",
          ),
          trackerClassName,
        )}
      />
    </div>
  )
}

export default Tab