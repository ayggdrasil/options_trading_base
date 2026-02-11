import React, { useEffect, useState } from 'react';
import { IS_RESTRICTED_COUNTRY_API } from '@/utils/apis';
import { twJoin } from 'tailwind-merge';
import { CALLPUT_TERMS_AND_CONDITIONS_URL } from '@/utils/urls';

const RestrictedCountryHandler: React.FC = () => {
  const [shouldRestrict, setShouldRestrict] = useState<boolean>(false)

  useEffect(() => {
    const fetchIsRestrictedCountry = async () => {
      const response = await fetch(IS_RESTRICTED_COUNTRY_API);

      if (!response.ok) {
        throw new Error('Failed to fetch from isRestrictedCountry');
      }

      const data = await response.json();

      if (data.shouldRestrict) {
        setShouldRestrict(true);
      }
    }

    fetchIsRestrictedCountry();
  })

  useEffect(() => {
    if (shouldRestrict) {
      // Disable scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      // Enable scroll when component unmounts
      document.body.style.overflow = 'auto';
    };
  }, [shouldRestrict]); // Effect dependencies

  if (!shouldRestrict) return null;
  
  return (
    <div
      className={twJoin(
        "fixed top-0 left-0 w-full h-full z-40",
        "flex items-center justify-center",
        "backdrop-blur-none",
        "bg-[#121212] bg-opacity-80",
    )}>
      <div 
        className={twJoin(
          "bg-black1f border border-black29",
          "rounded-[3px] shadow-[0px_0px_24px_0px__rgba(10,10,10,0.75)]",
          "w-[640px]",
          "px-[24px] pt-[28px] pb-[36px]",
        )}
      >
        <p
          className={twJoin(
            "text-primaryc1 text-[18px] font-bold leading-[24px]"
          )}
        >
          Restricted Territory
        </p>
        <div
          className={twJoin(
            "mt-[24px]",
            "text-[15px] font-semibold text-[#999999]",
            "leading-[21px]"
          )}
        >
          Access to Moby, along with any services provided therein, is expressly prohibited within the territories of the <span className='text-whitee0 font-semibold'>United States, Cuba, Guam, Iran, Iraq, Panama, Syria, North Korea, and Sudan.</span> Individuals or entities residing in or operating from these jurisdictions are not permitted to utilize Moby or its services under any circumstances.
          <br/>
          <br/>
          Please refer to our <span className='cursor-pointer text-greenc1 font-semibold' onClick={() => window.open(CALLPUT_TERMS_AND_CONDITIONS_URL, "_blank")}>Terms & Conditions</span> for additional information.
        </div>
      </div>
    </div>
  )
};

export default RestrictedCountryHandler;