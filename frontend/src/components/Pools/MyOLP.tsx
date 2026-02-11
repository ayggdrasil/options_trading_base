import BigNumber from "bignumber.js";
import { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { advancedFormatNumber } from "@/utils/helper";
import { loadBalance } from "@/store/slices/UserSlice";
import { writeHandleRewards } from "@/utils/contract";
import { OlpKey } from "@/utils/enums";
import { OLP_SYMBOLS } from "@/utils/constants";
import { CUSTOM_CSS } from "@/networks/configs";
import { NetworkState } from "@/networks/types";
import { FuturesAssetIndexMap } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface MyOlpProps {
  olpKey: OlpKey;
  isDisabled: boolean;
}

const MyOlp: React.FC<MyOlpProps> = ({olpKey, isDisabled}) => {
  const {address} = useAccount();

  const dispatch = useAppDispatch();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const userData = useAppSelector((state: any) => state.user);
  const userBalance = userData.balance;

  const olpMetricsData = useAppSelector((state: any) => state.app.olpMetrics);

  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;

  
  const [loading, setLoading] = useState(true);

  const [stakedOlp, setStakedOlp] = useState<string>("0");
  const [claimable, setClaimable] = useState<string>("0");
  const [claimableUsd, setClaimableUsd] = useState<number>(0);

  const [olpPrice, setOlpPrice] = useState<string>("0");

  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  const handleRewards = async () => {
    setIsButtonLoading(true);
    const result = await writeHandleRewards(olpKey as OlpKey, chain);

    if (result && address) {
      dispatch(loadBalance({ chain, address }));
    }

    setIsButtonLoading(false);
  }

  useEffect(() => {
    if (address === undefined) {
      setLoading(false);
      return;
    }

    setClaimable(userBalance.claimableReward[olpKey]);
    setStakedOlp(new BigNumber(userBalance.olpToken[olpKey]).toString())
    setOlpPrice(new BigNumber(olpMetricsData[olpKey].price).dividedBy(10 ** 30).toString());

    setLoading(false);
  }, [userBalance, olpMetricsData])

  useEffect(() => {
    if (futuresAssetIndexMap) {
      const parsed = new BigNumber(claimable).multipliedBy(futuresAssetIndexMap.eth).toNumber();
      setClaimableUsd(parsed);
    }
  })

  if (loading) {
    return <div>Loading...</div>;
  }

  const renderButton = () => {
    if (isButtonLoading) {
      return (
        <button
          className={twJoin(
            "cursor-not-allowed mt-[25px] w-[52px] h-[22px] rounded-[11px] bg-black2e",
            "text-[12px] text-gray52 text-center font-semibold"
          )}>
          ...
        </button>
      )
    }

    const isButtonDisabled = BigNumber(claimable).lt(0.0001) && claimableUsd < 0.01;

    return (
      <button
        className={twJoin(
            isButtonDisabled ? 'cursor-not-allowed bg-black2e' : 'bg-primaryc1',
            'mt-[25px] w-[52px] h-[22px] rounded-[11px]',
            'text-[12px] text-gray52 text-center font-semibold'
          )}
        onClick={() => {
          if (isButtonDisabled) return;
          handleRewards() 
        }}
      >Claim</button>
    )
  }

  return (
    <div className="relative">
      <div className={twJoin(
        "absolute top-[40px] z-10 flex flex-row justify-center items-center w-full h-[117px] bg-[#131415] bg-opacity-90",
        isDisabled ? "block" : "hidden"
      )}/>
      <p className={twJoin(
        'text-[16px] text-greenc1 font-bold',
        isDisabled ? 'text-opacity-10' : 'text-opacity-100',
      )}>My Options LP (OLP)</p>
      <div className={twJoin(
        'flex flex-row w-[400px] h-[117px] mt-[16px] px-[28px] py-[24px] bg-black1f rounded-[4px]',
        CUSTOM_CSS[chain].outlineClass
      )}>
        <div className='flex-1'>
          <div className='flex flex-row'>

            {/* Tooltip */}
            <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
              <p className="text-greenc1 text-[13px] h-[18px] hover:text-greenc1 ">Staked</p>
              <div className={twJoin(
                "w-max h-[40px] z-20",
                "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[12px]",
                "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                "group-hover:block"
              )}>
                <p className="text-[12px] text-gray80 leading-[0.85rem]">
                  OLP tokens automatically staked <br/>
                  to start receiving rewards at once.
                </p>
              </div>
            </div>

          </div>
          <div className='mt-[8px]'>
            <p className='text-[14px] text-whitee0 font-semibold'>{advancedFormatNumber(new BigNumber(stakedOlp).toNumber(), 2, "")} &nbsp;{OLP_SYMBOLS[olpKey]}</p>
            <p className='text-[12px] text-gray80 font-semibold mt-[4px]'>{advancedFormatNumber(new BigNumber(stakedOlp).multipliedBy(olpPrice).toNumber(), 2, "$")}</p>
          </div>
        </div>
        <div className='flex-1 flex flex-row justify-end'>
          <div className='flex flex-col items-end'>
            <div className='flex flex-row'>

              {/* Tooltip */}
              <div className="relative group cursor-help w-fit font-semibold border-b-[1px] border-dashed border-b-greenc1">
                <p className="text-greenc1 text-[13px] h-[18px] hover:text-greenc1 ">Rewards</p>
                <div className={twJoin(
                  "w-[254px] h-[72px] z-30",
                  "absolute hidden px-[11px] py-[6px] bottom-[24px] -left-[100px]",
                  "bg-black1f rounded-[4px] border-[1px] border-[rgba(224,224,224,.1)] shadow-[0_0_8px_0_rgba(10,10,10,.72)]",
                  "group-hover:block"
                )}>
                  <p className="text-[12px] text-gray80 leading-[0.85rem]">
                    OLP token staking rewards including fees,<br/>
                    but not Risk Premium. Risk Premium is<br/>
                    added directly to LPs, increasing the value<br/>
                    of OLP tokens.
                  </p>
                </div>
              </div>
              
            </div>
            <div className='mt-[8px] text-right'>
              <p className='text-[14px] text-whitee0 font-semibold'>{`${advancedFormatNumber(new BigNumber(claimable).toNumber(), 4, "")} ETH`}</p>
              <p className='text-[12px] text-gray80 font-semibold mt-[4px]'>{advancedFormatNumber(claimableUsd, 2, "$")}</p>
            </div>
          </div>
          <div className='ml-[16px]'>
            {renderButton()}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default MyOlp;
