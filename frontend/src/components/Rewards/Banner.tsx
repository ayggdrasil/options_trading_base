import { NetworkState } from '@/networks/types';
import { useAppSelector } from '@/store/hooks';
import { twJoin } from 'tailwind-merge'

type Props = {
  
}

const Banner = ({ }: Props) => {
  return (
    <div
      onClick={() => {
        
      }}
      className={twJoin(
        "w-full h-[128px]",
        "bg-cover bg-center bg-no-repeat",
        "px-[36px] py-[30px]",
        "mb-[16px]",
        "bg-[url('./assets/pnr-banner.png')]"
      )}
    >
      <p
        className={twJoin(
          "w-fit h-[29px] mb-[5px]",
          "text-[24px] font-extrabold leading-[28px]",
        )}
      >
        Rewards for Active Whale Contributors
      </p>
      <p
        className={twJoin(
          "w-[374px] h-[36px]",
          "text-[14px] text-primaryc1 font-semibold leading-[18px]",
        )}
      >
        Earn exceptional rewards by trading, providing liquidity and referring fellow whales on Moby
      </p>
    </div>
  )
}

export default Banner