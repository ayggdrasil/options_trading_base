import React from 'react'
import { twJoin } from 'tailwind-merge'
import Button from '../Common/Button'
import LearnMoreIcon from '@/assets/learnmore.svg'
import OlpArchitectureRewardImage from '@/assets/images/olp-architecture-rewards.svg'
import OlpArchitectureImage from '@/assets/images/olp-architecture-architecture.svg'

type Props = {
}

const PoolArchitecture: React.FC<Props> = () => {
  return (
    <div className={twJoin("flex flex-col")}>
      <div
        className={twJoin(
          "flex flex-col",
          "bg-black1a",
          "pt-[36px] pb-[40px] px-[28px]",
          "rounded-t-[10px]"
        )}
      >
        <div
          className={twJoin(
            "flex items-center justify-between",
          )}
        >
          <span
            className={twJoin(
              "text-[20px] font-[600] text-greene6"
            )}
          >
            OLP (Options Liquidity Pool) Architecture
          </span>
          <Button
            name={(
              <div
                className={twJoin(
                  "flex items-center justify-center",
                  "relative",
                )}
              >
                Learn More
                <img
                  className={twJoin(
                    "w-[28px] h-[28px]"
                  )}
                  src={LearnMoreIcon} 
                />
              </div>
            )}
            color=""
            className={twJoin(
              "w-[128px]",
              "mt-auto",
              "h-[32px]",
              "text-greene6 border border-greene6",
              "text-[14px] font-[600]"
            )}
            onClick={() => {
              window.open("https://docs.moby.trade/how-its-built/architecture/liquidity-provision-mechanism", "_blank")
            }}
          >
          </Button>
        </div>
        <p
          className={twJoin(
            "text-gray99 leading-[18px] font-[600] text-[14px]",
            "mt-[24px] mb-[24px]",
          )}
        >
          Moby’s OLP assumes counterparty positions to those requested by traders, generating revenue through trading fees and risk premiums. The OLP effectively maintains position balance and manages risk by leveraging the SLE (Synchronized Liquidity Engine) model to apply a calculated risk premium. This approach ensures the stable preservation of liquidity provider (LP) capital within the pool.
        </p>

        <div
          className={twJoin(
            "grid grid-cols-[1fr,1fr] gap-[16px]",
            "text-[16px] font-[600] leading-[18px] text-whitee6"
          )}
        >
          <div>
            <p 
              className={twJoin(
                "mb-[16px]"
              )}
            >
              Rewards
            </p>
            <img src={OlpArchitectureRewardImage} />
          </div>
          <div>
            <p
              className={twJoin(
                "mb-[16px]"
              )}
            >
              Architecture
            </p>
            <img src={OlpArchitectureImage} />
          </div>
        </div>
      </div>

      

    </div>
  )
}

export default PoolArchitecture