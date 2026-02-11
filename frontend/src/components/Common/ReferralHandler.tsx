import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { twJoin } from 'tailwind-merge';

import IconCloseReferral from "../../assets/icon-close-referral.svg"
import { referralIDToAddress } from '@/utils/encoding';
import { shortenAddress } from '@/utils/helper';
import { addToastMessage } from '@/utils/toast';
import { writeHandleAddReferral } from '@/utils/contract';
import { useAppSelector } from '@/store/hooks';
import { NetworkState } from '@/networks/types';

const ReferralHandler: React.FC = () => {
  const location = useLocation();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const [referralAddress, setReferralAddress] = useState<`0x${string}` | null>(null);
  const [referralId, setReferralId] = useState<string | null>(null);
  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  useEffect(() => {
    const toastReferral = () => {
      const referralQueryParam = new URLSearchParams(window.location.search).get('r');

      if (referralQueryParam) {
        const referralId = referralQueryParam + window.location.hash;
        // Assuming referralIDToAddress function can handle the input correctly
        const decoded = referralIDToAddress(referralId) as `0x${string}`;
  
        setReferralId(referralId);
        setReferralAddress(decoded);
      }
    }

    toastReferral();
  }, [location]);

  const handleAddReferral = async () => {
    setIsButtonLoading(true);
    const result = await writeHandleAddReferral(referralAddress as string, chain);

    if (result) {
      setReferralId(null);
      setReferralAddress(null);
      
      addToastMessage({
        id: Date.now().toString(),
        type: "success",
        title: "Referral added successfully",
        message: "",
        duration: 3 * 1000,
      })
    }

    setIsButtonLoading(false);
  }

  return (
    <>
      {referralId && (
        <div className='z-40 fixed top-[104px] right-[24px]'>
          <div
            className={twJoin(
              "flex flex-col w-full",
              "px-[20px] py-[16px] rounded-[4px] bg-black1f",
              "border-green4c border-[1px] border-opacity-30 shadow-[0px_0px_36px_0_rgba(10,10,10,0.72)]",
              "animate-toastIn",
              "w-fit min-w-[480px] h-fit min-h-[180px]",
              
            )}
          >
            <div className="flex flex-row justify-between items-center">
              <div className="text-[14px] text-whitee0 font-semibold">You have a referrer to add:</div>
              <div className='flex flex-row h-fit gap-[16px]'>
                <button
                  className='cursor-pointer w-[51px] h-[32px] rounded-[16px] bg-[#292929]'
                  onClick={handleAddReferral}
                >
                  <p className='text-[12px] text-green4c font-semibold'>Add</p>
                </button>
                <img
                      className="cursor-pointer w-[32px] h-[32px]"
                      src={IconCloseReferral}
                      onClick={() => {
                        setReferralId(null);
                        setReferralAddress(null);
                      }}
                    />
              </div>
            </div>

            <div className="flex flex-col justify-between mt-[16px] text-[15px] h-[36px] font-normal text-[#999999]">  
              <div className="flex flex-row items-center w-full gap-[6px]">
                <div className="flex flex-row items-center justify-center w-[15px] h-[15px]">
                  <div className="w-[5px] h-[5px] rounded-full bg-[#999999]" />
                </div>
                <p className="text-[14px] font-semibold">Earn up to 15% fee discount just by signing up a referral</p>
              </div>

              <div className="flex flex-row items-center w-full gap-[6px]">
                <div className="flex flex-row items-center justify-center w-[15px] h-[15px]">
                  <div className="w-[5px] h-[5px] rounded-full bg-[#999999]" />
                </div>
                <p className="text-[14px] font-semibold">Get point rebates by acquiring referred whales</p>
              </div>
            </div>

            <div className="flex flex-row gap-[8px] px-[16px] py-[11px] mt-[20px] bg-black29 rounded-[3px]">
              <p className="text-[15px] text-greenc1 font-semibold">{shortenAddress(referralAddress)}</p>
              <p className='text-[15px] text-[#808080] font-normal'>{"(" + referralId + ")"}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
};

export default ReferralHandler;