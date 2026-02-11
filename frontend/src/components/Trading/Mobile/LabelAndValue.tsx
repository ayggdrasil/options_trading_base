import { twMerge, twJoin } from "tailwind-merge";

type Props = {
  label: string;
  value: string;
  valueClassName?: string;
};

const LabelAndValue = ({ label, value, valueClassName }: Props) => {
  return (
    <div className={twJoin("flex flex-col gap-y-2", "w-1/2")}>
      <span
        className={twJoin(
          "font-medium text-gray9D",
          "text-[11px] leading-[13px] md:text-[13px] md:leading-[15px]"
        )}
      >
        {label}
      </span>
      <span
        className={twMerge(
          twJoin(
            "font-medium text-whitef0",
            "text-[14px] leading-[17px] md:text-[16px] md:leading-[18px]"
          ),
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  );
};

export default LabelAndValue;
