import React from 'react';
import { twJoin, twMerge } from 'tailwind-merge';

type Props = {
  label?: string;
  items: any[];
  className?: string;
};

const SelectorForMobile: React.FC<Props> = ({ label, items, className }) => {
  return (
    <div
      className={twMerge(
        twJoin('flex items-center gap-4 text-xs md:text-sm font-semibold'),
        className,
      )}
    >
      {label && <div className='text-contentBright'>{label}</div>}
      {items.map(({ value, onClick, isActive }) => {
        return (
          <div
            className={twJoin(isActive && ['text-greene6'])}
            onClick={onClick}
            key={value}
          >
            {value}
          </div>
        );
      })}
    </div>
  );
};

export default SelectorForMobile;
