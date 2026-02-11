import { DEFAULT_ICON_SIZE, IIconProps } from "@/utils/constants";

export function DropdownDownIcon({
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
                d="M11.4027 7.07548C11.6652 6.81293 12.0909 6.81294 12.3534 7.07548C12.616 7.33803 12.616 7.76371 12.3534 8.02626L9.46641 10.9133C9.20386 11.1758 8.77818 11.1758 8.51564 10.9133C8.25309 10.6507 8.25309 10.2251 8.51564 9.96251L11.4027 7.07548Z"
                fill="currentColor"
              />
              <path
                id="Combined Shape_2"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.58586 7.07597C6.32331 6.81342 5.89764 6.81342 5.63509 7.07597C5.37254 7.33852 5.37254 7.7642 5.63509 8.02674L8.52175 10.9134C8.7843 11.176 9.20997 11.176 9.47252 10.9134C9.73507 10.6509 9.73507 10.2252 9.47252 9.96264L6.58586 7.07597Z"
                fill="currentColor"
              />
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
}
