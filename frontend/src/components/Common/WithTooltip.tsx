import { useSubscription } from "observable-hooks";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { debounceTime, fromEvent, startWith } from "rxjs";
import { twJoin, twMerge } from "tailwind-merge";

interface Props {
  tooltipContent: ReactNode;
  children: ReactNode;
  tooltipClassName?: string;
  className?: string;
  placement?: "top" | "bottom";
}

const WithTooltip = ({
  tooltipContent,
  children,
  tooltipClassName = "w-[260px] h-fit",
  className,
  placement = "top",
}: Props) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<"left" | "right">("left");

  useSubscription(
    fromEvent(window, "resize").pipe(startWith(null), debounceTime(100)),
    () => {
      if (!tooltipRef.current || !containerRef.current) return;

      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      if (containerRect.left + tooltipRect.width > viewportWidth) {
        setPosition("right");
      } else {
        setPosition("left");
      }
    }
  );

  const verticalClass =
    placement === "top" ? "top-full mt-[6px]" : "bottom-full mb-[6px]";

  return (
    <div
      className={twMerge("relative group flex cursor-help", className)}
      ref={containerRef}
    >
      {children}
      <div
        ref={tooltipRef}
        className={twMerge(
          twJoin(
            "absolute invisible opacity-0 group-hover:visible group-hover:opacity-100",
            "transition-all duration-200",
            "z-50",
            verticalClass,
            position === "right" ? "right-0" : "left-0",
            "w-fit px-[8px] py-[6px] rounded-[4px]",
            "bg-black2023 border-[1px] border-solid border-black292c",
            "text-gray8c8c text-[11px] font-[500] leading-[14px]"
          ),
          tooltipClassName
        )}
      >
        {tooltipContent}
      </div>
    </div>
  );
};

export default WithTooltip;
