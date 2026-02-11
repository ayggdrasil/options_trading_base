import React from "react";
import { twJoin } from "tailwind-merge";

interface DividerVerticalProps {
  className: string;
}

const DividerVertical: React.FC<DividerVerticalProps> = ({ className }) => {
  return <div className={twJoin("divider-vertical", className)}></div>;
};

export default DividerVertical;
