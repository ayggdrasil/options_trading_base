import { useContext } from 'react';
import { twJoin } from 'tailwind-merge';
import TotalStat from './TotalStat';
import { OlpKey } from '@/utils/enums';
import { ModalContext } from '@/components/Common/ModalContext';
import OLPDetailParts from '@/components/Pools/mobile/OLPDetailParts';

type Props = {
  olpKey: OlpKey;
  olpDetailData: any;
};

const PoolsHeader: React.FC<Props> = ({ olpKey, olpDetailData }) => {
  const { openModal } = useContext(ModalContext);
  return (
    <div
      className={twJoin('flex flex-col gap-y-5', 'px-3 pt-3 md:px-6 md:pt-6')}
    >
      <div className={twJoin('flex flex-col gap-y-3')}>
        <div className={twJoin('flex flex-col gap-y-3')}>
          <p
            className={twJoin(
              'font-bold text-whitef0',
              'text-[20px] leading-[24px] md:text-[22px]',
            )}
          >
            Options Liquidity Pool
          </p>
          <p
            className={twJoin(
              'font-medium text-gray80',
              'text-[12px] leading-[16px] md:text-[14px]',
            )}
          >
            Moby's Options Liquidity Pool (OLP) utilizes an advanced automated
            market-making strategy to generate revenue from trading fees, risk
            premiums, and user PnL, all while maintaining robust safety
            measures.
          </p>
        </div>
        <TotalStat olpKey={olpKey} olpDetailData={olpDetailData} />
      </div>
      <div
        className={twJoin(
          'flex justify-center items-center h-10 w-full',
          'rounded border border-solid border-gray80',
          'font-semibold text-gray80',
          'text-[14px] leading-[21px] md:text-[16px]',
        )}
        onClick={() => {
          openModal(
            <OLPDetailParts
              olpKey={OlpKey.sOlp}
              olpDetailData={olpDetailData}
            />,
            {
              contentClassName:
                'flex flex-col min-h-[150px] pb-0 md:max-h-modalPool',
            },
          );
        }}
      >
        Learn more about OLP
      </div>
    </div>
  );
};

export default PoolsHeader;
