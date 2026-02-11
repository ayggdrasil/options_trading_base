import React from "react";
import TagLineSlider from "../common/TagLineSlider";
import DividerVertical from "../common/DividerVertical";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber } from "../../utils/formatters";

import { useStats } from "../../hooks/useStats";
import { ContractStatItem, StatItem } from "../../contexts/data/StatsContext";
import { STATS_DATA } from "../../shared/constants/data";

interface StatProps {
  stat: StatItem;
  className?: string;
}

interface ResponsiveStatProps {
  stats: StatItem[];
}

interface ContractStatProps {
  stat: ContractStatItem;
  className?: string;
  labelClassName?: string;
}

const Stat: React.FC<StatProps> = ({ stat, className }) => {
  return (
    <div className={twJoin("flex flex-col justify-between gap-[5px]", className)}>
      <p className={twJoin("number-center-18-600-20", "lg:text-[24px] lg:text-left lg:leading-[30px]")}>
        {advancedFormatNumber(stat.value, 0, stat.prefix)}
      </p>
      <p className={twJoin("text-12", "lg:text-[18px] lg:text-left")}>{stat.label}</p>
    </div>
  );
};

const ResponsiveStat: React.FC<ResponsiveStatProps> = ({ stats }) => {
  return (
    <>
      {/* For PC */}
      {stats.map((stat, index) => (
        <React.Fragment key={`pc-${stat.label}`}>
          {index > 0 && <DividerVertical className="hidden h-[40px] lg:block lg:h-[88px]" />}
          <Stat stat={stat} className="hidden h-[40px] lg:flex lg:h-[60px] lg:min-w-[216px] lg:w-fit" />
        </React.Fragment>
      ))}

      {/* For Mobile */}
      <div className={twJoin("flex flex-row justify-between items-center", "lg:hidden")}>
        {stats.map((stat, index) => (
          <React.Fragment key={`mobile-${stat.label}`}>
            {index > 0 && <DividerVertical className="h-[40px] lg:hidden lg:h-[88px]" />}
            <Stat stat={stat} className="h-[40px] lg:hidden lg:h-[60px] lg:min-w-[216px] lg:w-fit" />
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

const ContractStat: React.FC<ContractStatProps> = ({ stat, className, labelClassName }) => {
  return (
    <div className={className}>
      <div className={twJoin("flex flex-row justify-center items-center gap-[16px]", "lg:justify-start")}>
        {Object.values(stat.assets).map((asset, index) => (
          <div key={index} className="flex flex-row justify-center items-center gap-[8px]">
            <img src={asset.icon} alt={asset.iconAlt} className="w-[24px]" />
            <p className={twJoin("number-center-18-600-20", "lg:text-[24px] lg:text-left lg:leading-[30px]")}>
              {advancedFormatNumber(asset.value, 0, "")}
            </p>
          </div>
        ))}
      </div>
      <p className={labelClassName || twJoin("text-12", "lg:text-[18px] lg:text-left")}>{stat.label}</p>
    </div>
  );
};

const StatsSection: React.FC = () => {
  const { data } = useStats();

  const transactionVolumeAndProtocolRevenue = [
    data?.totalTransactionVolume || STATS_DATA.totalTransactionVolume,
    data?.protocolNetRevenue || STATS_DATA.protocolNetRevenue,
  ];

  return (
    <section
      className={twJoin(
        "relative h-fit w-full px-[12px] py-[72px] overflow-hidden",
        "lg:max-w-[1280px] lg:mx-auto lg:px-0"
      )}
    >
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        <div
          className={twJoin(
            "flex flex-col items-center gap-[4px] w-full px-[18px]",
            "lg:items-start lg:gap-[8px] lg:px-0"
          )}
        >
          <h1 className={twJoin("title-24", "lg:text-[32px]")}>
            No.1 Options Protocol on Arbitrum and Berachain
          </h1>

          <TagLineSlider
            tagLines={[
              <p
                className={twJoin("subtitle-16 text-greenE6", "lg:text-[20px]")}
              >{`Buy/sell call/put options with best prices and tight spreads`}</p>,
              <p
                className={twJoin("subtitle-16 text-greenE6", "lg:text-[20px]")}
              >{`1000x Leverage No Liquidation Narrow Spread`}</p>,
              <p
                className={twJoin("subtitle-16 text-greenE6", "lg:text-[20px]")}
              >{`Follow a market maker's options strategy for higher earnings`}</p>,
            ]}
            className="h-[44px] lg:h-fit"
          />
        </div>

        <div
          className={twJoin(
            "flex flex-col justify-between w-full h-[204px] bg-gray17 rounded-[6px] mt-[24px] px-[18px] py-[20px]",
            "lg:flex-row lg:items-center lg:h-[136px] lg:mt-[36px] lg:px-[48px] lg:py-[24px]"
          )}
        >
          <Stat
            stat={data?.totalTradingVolume || STATS_DATA.totalTradingVolume}
            className="h-[40px] lg:h-[60px] lg:min-w-[216px] lg:w-fit"
          />

          <DividerVertical className="hidden h-[40px] lg:block lg:h-[88px]" />

          <ContractStat
            stat={data?.totalContracts || STATS_DATA.totalContracts}
            className={twJoin(
              "flex flex-col justify-between gap-[5px] w-full h-[40px]",
              "lg:h-[60px] lg:min-w-[280px] lg:w-fit"
            )}
          />

          <DividerVertical className="hidden h-[40px] lg:block lg:h-[88px]" />

          {/* 기존 코드 대신 ResponsiveStat 사용 */}
          <ResponsiveStat stats={transactionVolumeAndProtocolRevenue} />
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
