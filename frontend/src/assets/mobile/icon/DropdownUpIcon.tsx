import { DEFAULT_ICON_SIZE, IIconProps } from "@/utils/constants";

export function DropdownUpIcon({
  size = DEFAULT_ICON_SIZE,
  className,
}: IIconProps) {
  return (
    <span className={className}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="icons/18/dropdown copy">
          <g id="Group 2">
            <g id="Group">
              <path
                id="Combined Shape"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.4027 10.9245C11.6652 11.1871 12.0909 11.1871 12.3534 10.9245C12.616 10.662 12.616 10.2363 12.3534 9.97374L9.46641 7.08671C9.20386 6.82417 8.77818 6.82417 8.51564 7.08671C8.25309 7.34926 8.25309 7.77494 8.51564 8.03749L11.4027 10.9245Z"
                fill="currentColor"
              />
              <path
                id="Combined Shape_2"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.58586 10.924C6.32331 11.1866 5.89764 11.1866 5.63509 10.924C5.37254 10.6615 5.37254 10.2358 5.63509 9.97326L8.52175 7.08659C8.7843 6.82404 9.20997 6.82404 9.47252 7.08659C9.73507 7.34914 9.73507 7.77482 9.47252 8.03736L6.58586 10.924Z"
                fill="currentColor"
              />
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
}
