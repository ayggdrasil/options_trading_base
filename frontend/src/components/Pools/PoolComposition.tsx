import { useOLPTotalStat } from '@/hooks/olp'
import { OlpKey } from '@/utils/enums'
import { advancedFormatNumber } from '@/utils/helper'
import React from 'react'
import { twJoin } from 'tailwind-merge'

import IconSymbolWbtc from "@/assets/icon-symbol-wbtc.svg";
import IconSymbolWeth from "@/assets/icon-symbol-weth.svg";
import IconSymbolUsdc from "@/assets/icon-symbol-usdc.svg";
import IconSymbolHoney from "@/assets/icon-symbol-honey.svg";
import PoolCompositionGauge from './PoolCompositionGauge'

type Props = {
  olpKey: OlpKey
}

const assetIconMap: any = {
  WBTC: IconSymbolWbtc,
  WETH: IconSymbolWeth,
  USDC: IconSymbolUsdc,
  HONEY: IconSymbolHoney,
}

const PoolComposition: React.FC<Props> = ({ olpKey }) => {
  const { tvl, tvlComposition } = useOLPTotalStat({ olpKey })

  const tvlCompositionArr = Object.entries(tvlComposition)
    .filter(([assetName, usdValue]: any) => usdValue > 0)
    .map(([assetName, usdValue]: any) => {
      return {
        title: String(assetName).toUpperCase(),
        usdValue,
        ratio: (usdValue / tvl) * 100,
      }
    })


  return (
    <div
      className={twJoin(
        "bg-black1a",
        "pt-[32px] px-[28px] pb-[40px]",
        "rounded-bl-[10px]",
      )}
    >
      <div
        className={twJoin(
          "flex justify-between items-start",
          "mb-[20px]"
        )}
      >
        <span
          className={twJoin(
            "text-[20px] font-[600] text-greene6 leading-[20px]"
          )}
        >
          Pool Composition
        </span>
        <div
          className={twJoin(
            "flex flex-col"
          )}
        >
          <p
            className={twJoin(
              "text-[16px] text-grayb3 font-[700] leading-[18px] text-right"
            )}
          >
            {advancedFormatNumber(tvl, 2, "$", true)}
          </p>
          <p
            className={twJoin(
              "text-[13px] font-[600] leading-[18px] text-gray80 text-right"
            )}
          >
            Total Liquidity
          </p>
        </div>
      </div>
      <PoolCompositionGauge tvlCompositionArr={tvlCompositionArr} />
      <div
        className={twJoin(
          "grid grid-cols-[84px,1fr,54px]",
          "gap-y-[8px] gap-x-[16px]",
        )}
      >
          {tvlCompositionArr.map(({ title, usdValue, ratio } : any) => {
              return (
                <React.Fragment key={title}>
                  <div
                    className={twJoin(
                      "flex items-center"
                    )}
                  >
                    <img
                      className={twJoin(
                        "w-[24px] h-[24px] mr-[8px]"
                      )}
                      src={assetIconMap[title]}
                    />
                    <span
                      className={twJoin(
                        "text-[14px] font-[600] leading-[20px] text-whitee0"
                      )}
                    >
                      {String(title).toUpperCase()}
                    </span>
                  </div>
                  <span
                    className={twJoin(
                      "text-[14px] font-[600] leading-[20px] text-whitee0 text-right"
                    )}
                  >
                    {advancedFormatNumber(usdValue, 2, "$", true)}
                  </span>
                  <span
                    className={twJoin(
                      "text-[14px] font-[600] leading-[20px] text-greene6 text-right"
                    )}
                  >
                    {advancedFormatNumber(ratio, 2, "", true)}%
                  </span>
                </React.Fragment>
              )
          })}
        </div>
    </div>
  )
}

export default PoolComposition