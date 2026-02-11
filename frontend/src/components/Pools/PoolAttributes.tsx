import { useOLPTotalStat } from "@/hooks/olp";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { BLOCK_EXPLORER } from "@/networks/apis";
import { QA_INFO } from "@/networks/assets";
import { VAULT_CREATED_AT } from "@/networks/configs";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";
import { advancedFormatNumber } from "@/utils/helper";
import { OlpKey } from "@callput/shared";
import React, { ReactNode } from "react";
import { twJoin, twMerge } from "tailwind-merge";

type Props = {
  olpKey: OlpKey;
};

interface AttributeItemProps {
  title: string;
  value: ReactNode;
  valueClassName?: string;
  onClick?: () => void;
}

const AttributeItem = ({
  title,
  value,
  valueClassName,
  onClick,
}: AttributeItemProps) => {
  return (
    <>
      <p className="text-gray8c8c text-[14px] font-[500] leading-[24px]">
        {title}
      </p>
      <div
        style={{
          textDecorationSkipInk: "none",
        }}
        className={twMerge(
          "text-whitef2f2 text-[14px] text-right font-[600] leading-[24px]",
          valueClassName
        )}
        onClick={onClick}
      >
        {value}
      </div>
    </>
  );
};

const PoolAttributes: React.FC<Props> = ({ olpKey }) => {
  const { chain } = useAppSelector((state) => state.network) as NetworkState;
  const { tvl, tvlComposition } = useOLPTotalStat({ olpKey });

  const contractAddress = CONTRACT_ADDRESSES[chain].S_VAULT;
  const vaultCreatedAt = VAULT_CREATED_AT[chain][contractAddress];

  const tvlCompositionArr = Object.entries(tvlComposition)
    .filter(([assetName, usdValue]: any) => usdValue > 0)
    .map(([assetName, usdValue]: any) => {
      return {
        title: String(assetName).toUpperCase(),
        usdValue,
        ratio: (usdValue / tvl) * 100,
      };
    });

  return (
    <div className="w-[412px] h-[162px] flex flex-col gap-[16px]">
      <div className="h-[38px] flex flex-row items-center">
        <p className="text-blue278e text-[20px] font-[700] leading-[30px]">
          Pool Attributes
        </p>
      </div>
      <div
        className={twJoin(
          "grid grid-cols-[1fr_1fr] justify-between gap-y-[4px]"
        )}
      >
        <AttributeItem
          title="Composition"
          value={
            <div className="flex items-center justify-end gap-[4px]">
              <span>{advancedFormatNumber(tvl, 2, "$", true)}</span>
              {tvlCompositionArr.map(({ title, usdValue, ratio }: any) => {
                return (
                  <div className="flex items-center gap-[4px]" key={title}>
                    <img
                      className={twJoin("w-[24px] h-[24px]")}
                      src={
                        QA_INFO[chain][
                          title as keyof (typeof QA_INFO)[typeof chain]
                        ].src
                      }
                    />
                    <span>{ratio}</span>
                  </div>
                );
              })}
            </div>
          }
        />
        <AttributeItem
          title="Contract Address"
          value={
            <span>
              {contractAddress.slice(0, 6) + "..." + contractAddress.slice(-4)}
            </span>
          }
          onClick={() => {
            window.open(
              BLOCK_EXPLORER[chain] + "/address/" + contractAddress,
              "_blank"
            );
          }}
          valueClassName="cursor-pointer underline"
        />
        <AttributeItem
          title="Creation Date"
          value={<span>{vaultCreatedAt}</span>}
        />
        <AttributeItem
          title="Audited and Secured by"
          value={<span>Omniscia, Pessimistic</span>}
        />
      </div>
    </div>
  );
};

export default PoolAttributes;
