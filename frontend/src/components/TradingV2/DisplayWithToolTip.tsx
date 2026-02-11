import { twJoin } from "tailwind-merge";
import WithTooltip from "../Common/WithTooltip";
import { ReactNode } from "react";

interface DisplayWithTooltipProps {
  title: string;
  tooltipContent: ReactNode;
  tooltipClassName?: string;
  className?: string;
  textAlign?: "left" | "right" | "center";
  placement?: "top" | "bottom";
}

function DisplayWithTooltip({
  title,
  tooltipContent,
  tooltipClassName = "w-[260px] h-fit",
  className = "",
  textAlign = "left",
  placement = "top",
}: DisplayWithTooltipProps) {
  const textAlignClass =
    textAlign === "left"
      ? "text-left"
      : textAlign === "right"
        ? "text-right"
        : "text-center";

  return (
    <WithTooltip
      tooltipContent={tooltipContent}
      tooltipClassName={tooltipClassName}
      className={className}
      placement={placement}
    >
      <p className={twJoin("w-full", textAlignClass)}>
        <span className="border-b-[1px] border-dashed border-b-graybfbf">
          {title}
        </span>
      </p>
    </WithTooltip>
  );
}

export default DisplayWithTooltip;
