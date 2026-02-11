import React, { useContext } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'
import TierTableRow from './TierTableRow'
import Button from '../Common/Button'
import { ModalContext } from '../Common/ModalContext'

type Props = {
  
}

const TierTable = ({  }: Props) => {
  const { closeModal } = useContext(ModalContext);
  return (
    <div 
      className={twJoin(
        "bg-black1f border border-black29",
        "rounded-[3px] shadow-[0px_0px_24px_0px__rgba(10,10,10,0.75)]",
        "w-[948px]",
        "px-[24px] py-[24px]",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <p
        className={twJoin(
          "text-primaryc1 text-[18px] font-bold leading-[24px]",
          "mb-[24px]"
        )}
      >
        Tiers
      </p>

      <div
        className={twJoin(
          "w-[900px] mx-auto",
          "text-[13px] font-semibold text-grayb3",
        )}
      >
        <TierTableRow
          className="border-t"
        >
          <div className={twMerge("text-left")}></div>
          <div className={twMerge("text-left")}>Eligibility</div>
          <div className={twMerge("text-left")}>Fee Rebate by Referred Whales</div>
          <div className={twMerge("text-left")}>Bonus Point by Referred Whales</div>
          <div className={twMerge("text-left")}>Bonus Point by Referred² Whales</div>
          <div className={twMerge("text-left")}>Tiers Point Boost Rate</div>
          <div className={twMerge("text-left")}>Referrer Whales Fee Discount</div>
        </TierTableRow>
        <TierTableRow>
          <div className={twMerge("text-left", "text-whitee0")}>Tier 1</div>
          <div className={twMerge("text-left")}>-</div>
          <div className={twMerge("text-left")}>15%</div>
          <div className={twMerge("text-left")}>10%</div>
          <div className={twMerge("text-left")}>5%</div>
          <div className={twMerge("text-left")}>-</div>
          <div className={twMerge("text-left")}>10%</div>
        </TierTableRow>
        <TierTableRow>
          <div className={twMerge("text-left", "text-whitee0")}>Tier 2</div>
          <div className={twMerge("text-left")}>10,000 Point</div>
          <div className={twMerge("text-left")}>15%</div>
          <div className={twMerge("text-left")}>15%</div>
          <div className={twMerge("text-left")}>5%</div>
          <div className={twMerge("text-left")}>10%</div>
          <div className={twMerge("text-left")}>10%</div>
        </TierTableRow>
        <TierTableRow>
          <div className={twMerge("text-left", "text-whitee0")}>Tier 3</div>
          <div className={twMerge("text-left")}>30,000 Point</div>
          <div className={twMerge("text-left")}>15%</div>
          <div className={twMerge("text-left")}>20%</div>
          <div className={twMerge("text-left")}>5%</div>
          <div className={twMerge("text-left")}>15%</div>
          <div className={twMerge("text-left")}>10%</div>
        </TierTableRow>
        <TierTableRow>
          <div className={twMerge("text-left", "text-whitee0")}>Affiliates</div>
          <div className={twMerge("text-left")}>Moby’s Key Contributors*</div>
          <div className={twMerge("text-left")}>30%</div>
          <div className={twMerge("text-left")}>30%</div>
          <div className={twMerge("text-left")}>5%</div>
          <div className={twMerge("text-left")}>20%</div>
          <div className={twMerge("text-left")}>15%</div>
        </TierTableRow>
      </div>

      <div
        className={twJoin(
          "w-[900px] mx-auto",
          "flex flex-col",
          "mt-[24px]",
          "pl-[16px]",
          "text-[15px] text-grayb3 font-semibold leading-[20px]",
        )}
      >
        <p
          className={twJoin(
            "list-item mb-[8px]",
          )}
        >
          Tiers, excluding Affiliates, are reassigned every Monday at 00:00 UTC based on the Points earned in the previous week
        </p>
        <div
          className={twJoin(
            "pl-[22px]",
            "text-[15px]",
            "mb-[14px]",
          )}
        >
          <p
            className={twJoin(
              "list-item",
            )}
          >
            Point Boost Rate applies only to trading and liquidity-provision point
          </p>
          <p
            className={twJoin(
              "list-item",
            )}
          >
            Points are credited in Real-Time, except for liquidity provision, which is credited daily at 00:00 UTC
          </p>
        </div>

        <p
          className={twJoin(
            "list-item mb-[8px]",
          )}
        >
          Fee rebates are issued in real-time, aligned with the referred whales’ trades
        </p>

        <p className="list-item mb-[6px]">Moby's Key Contributors*</p>
        <div
          className={twJoin(
            "pl-[22px]",
          )}
        >
          <p className="list-item">Top Trader, Key Opinion Leader, Tech Supporter, Researcher, Partner Project, etc.</p>
          <p className="list-item">
            If you meet the criteria for Affiliates, please reach out to Moby on&nbsp;
            <span 
              onClick={() => {
                window.open("https://t.me/+ikz21RB1B_c2YWVl")
              }}
              className={twJoin(
                "text-[#E6FC8D] underline underline-offset-[3px]",
                "cursor-pointer",
              )}
            >
              Telegram
            </span>
          </p>
        </div>

        <Button
          name="OK"
          className="w-[144px] h-[40px] mt-[24px] mx-auto"
          color="greenc1"
          onClick={closeModal}
        />
      </div>
    </div>
  )
}

export default TierTable