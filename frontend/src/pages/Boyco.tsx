import { useEffect, useState } from 'react';
import { twJoin } from 'tailwind-merge';

import ComingThoonAll from '@assets/coming-thoon-all.png'

interface BoycoProps {
  announcementsLen: number;
}

function Boyco({ announcementsLen }: BoycoProps) {
  const [topPadding, setTopPadding] = useState(0);

  useEffect(() => {
    setTopPadding(announcementsLen * 46 + 46);
  }, [announcementsLen]);

  return (
    <div
      style={{ paddingTop: `${topPadding}px` }}
      className={twJoin(
        "relative",
        "pb-[72px] w-full h-full",
        'flex flex-row justify-center items-center',
      )}
    >
      <div 
        className={twJoin(
          "flex flex-col gap-[36px]",
          "w-[1280px] max-w-[1280px] min-w-[1280px] min-h-screen pt-[46px]"
        )}
      >
        <img
          className={twJoin(
            "w-full object-cover",
          )}
          src={ComingThoonAll}
        />
      </div>
    </div>
  )
}

export default Boyco;