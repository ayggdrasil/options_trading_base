import React, { useContext } from 'react'
import { twMerge, twJoin } from 'tailwind-merge'
import Panel from './Panel'

import { addressToReferralID } from '@/utils/encoding'
import { useAccount } from 'wagmi'
import Button from '../Common/Button'
import Description from './Description'
import PointNumber from './PointNumber'
import { ModalContext } from '../Common/ModalContext'
import ReferralShare from './ReferralShare'

import GuideLabelIcon from '@/assets/points/guide-label.svg'
import PointsPopup from './PointsPopup'

type Props = {
  childrenCount: number
  pointFromChildren: number
  grandchildrenCount: number
  pointFromGrandchildren: number
}

const Referrals = ({ 
  childrenCount,
  pointFromChildren,
  grandchildrenCount,
  pointFromGrandchildren,
}: Props) => {

  const { openModal } = useContext(ModalContext)
  const { address } = useAccount()

  return (
    <div
      className={twJoin(
        "mt-[16px]",
        "flex-1",
      )}
    >
      <Panel
        title={(
          <div
            className={twJoin(
              "inline-flex items-center cursor-pointer",
            )}
            onClick={() => {
              openModal(
                <PointsPopup />,
                {
                  modalClassName: [
                    "backdrop-blur-none",
                    "bg-[#121212] bg-opacity-80",
                  ]
                }
              )
            }}
          >
            <span className="mr-[3px]">Referrals</span>
            <img 
              className="w-[45px]"
              src={GuideLabelIcon} 
            />
          </div>
        )}
        className="h-[208px]"
      >
        <div
          className={twJoin(
            "grid grid-cols-[540px,1fr]",
            "mb-[36px]",
          )}
        >
          <div
            className={twJoin(
              "h-[40px]",
              "flex items-center",
              "bg-black29",
              "px-[16px]",
              "font-semibold",
              "text-[15px]",
              "rounded-[6px]",
              "mr-[12px]",
            )}
          >
            {address 
              ? <>
                <span className="text-gray52">{window.location.protocol}//{window.location.host}?r=</span>{addressToReferralID(address)}
                </>
              : ""
            }
          </div>
          <Button
            name="Share Referral Link"
            color="greenc1"
            disabled={!address}
            onClick={() => {
              openModal(<ReferralShare referralId={addressToReferralID(address)} />, {
                modalClassName: [
                  "backdrop-blur-none",
                  "bg-[#121212] bg-opacity-80",
                ]
              })
            }}
          />
        </div>
        <div
          className={twJoin(
            "grid grid-cols-[1fr,1fr]",
          )}
        >
          <div
            className={twJoin(
              "grid grid-cols-[1fr,1fr] items-center",
              "border-l-[3px] border-black33 pl-[24px] pr-[32px]",
            )}
          >
            <div>
              <p
                className={twJoin(
                  "text-whitee0 font-bold text-[21px] leading-[22px]",
                )}
              >
                {childrenCount || "-"}
              </p>
              <Description>Referred Whales</Description>
            </div>
            <div>
              <PointNumber point={pointFromChildren} />
              <Description>Points Earned</Description>
            </div>
          </div>
          <div
            className={twJoin(
              "grid grid-cols-[1fr,1fr] items-center",
              "border-l-[3px] border-black33 pl-[24px]",
            )}
          >
            <div>
              <p
                className={twJoin(
                  "text-whitee0 font-bold text-[21px] leading-[22px]",
                )}
              >
                {grandchildrenCount || "-"}
              </p>
              <Description>Referred² Whales</Description>
            </div>
            <div>
              <PointNumber point={pointFromGrandchildren} />
              <Description>Points Earned</Description>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}

export default Referrals