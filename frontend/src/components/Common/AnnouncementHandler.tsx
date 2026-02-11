import React, { useEffect } from 'react';
import { twJoin } from 'tailwind-merge';

interface AnnouncementHandlerProps {
  showAnnouncementModal: boolean;
  setShowAnnouncementModal: (show: boolean) => void;
}

const isForceShowAnnouncementModal = false;

const AnnouncementHandler: React.FC<AnnouncementHandlerProps> = ({ showAnnouncementModal, setShowAnnouncementModal }) => {
  useEffect(() => {
    if (showAnnouncementModal || isForceShowAnnouncementModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAnnouncementModal]);

  if (!showAnnouncementModal && !isForceShowAnnouncementModal) return null;
  
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
          "px-[24px] py-[28px]",
        )}
      >
        <div
          className={twJoin(
            "flex flex-col gap-[12px]",
            "text-grayb3 text-[15px] font-normal leading-[21px]"
          )}
        >
          <p
            className={twJoin("text-primaryc1 text-[18px] font-bold leading-[24px]")}
          >Important Update</p>
          <p>
            We would like to share our <span className='cursor-pointer text-[#1D98D1] underline' onClick={() => window.open("https://medium.com/moby-trade/moby-post-mortem-report-growth-plan-504ad5b0dd35", "_blank")}>Post-Mortem Report and Growth Plan</span> regarding the incident
            that occurred on January 8, 2025.
          </p>
          <p>
            We extend our sincere apologies for any distress caused and truly appreciate your
            patience and support throughout this process. The Moby team will do our utmost to
            expedite the recovery of all assets and restore normal operations to the protocol
            as swiftly as possible
          </p>
        </div>
        <div className='mt-[24px]'></div>
        <div
          className={twJoin(
            "flex flex-col gap-[12px]",
            "text-grayb3 text-[15px] font-normal leading-[21px]"
          )}
        >
          <p
            className={twJoin("text-primaryc1 text-[18px] font-bold leading-[24px]")}
          >Action Needed</p>
          <p>
            To protect your assets, please revoke all active approvals related to Moby contracts on
            Arbitrum immediately at
          </p>
          <p
            className='cursor-pointer text-[#1D98D1] underline'
            onClick={() => window.open("https://revoke.cash", "_blank")}
          >https://revoke.cash</p>
        </div>
        {!isForceShowAnnouncementModal && (
          <div
            className={twJoin(
              "mt-[36px] cursor-pointer flex flex-row justify-center items-center w-full h-[48px] bg-primaryc1 rounded-[4px]"
            )}
            onClick={() => setShowAnnouncementModal(false)}
          >
            <p className='text-[16px] text-[#121212] font-bold'>Okay</p>
          </div>
        )}
      </div>
    </div>
  )
};

export default AnnouncementHandler;