import React, { ComponentPropsWithRef } from "react";

type PropType = ComponentPropsWithRef<"button">;

export const EmblaDotButton: React.FC<PropType> = (props) => {
  const { children, ...restProps } = props;

  return (
    <button type="button" {...restProps}>
      {children}
    </button>
  );
};
