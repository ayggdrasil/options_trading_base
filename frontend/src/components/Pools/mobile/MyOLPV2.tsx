import { twJoin } from "tailwind-merge";
import BigNumber from "bignumber.js";

import { useMyOlpData } from "@/hooks/olp";
import { advancedFormatNumber } from "@/utils/helper";

import EthRewardIcon from "@/assets/eth-reward.svg";

type Props = {
  olpKey: string;
};

const StatusItem = ({ title, value, inUSD }: any) => {
  return (
    <div className={twJoin("flex flex-col flex-1")}>
      <p
        className={twJoin(
          "font-semibold text-greene6",
          "text-[12px] leading-[18px] md:text-[14px]"
        )}
      >
        {title}
      </p>
      <div
        className={twJoin(
          "font-bold text-whitef0",
          "text-[14px] leading-[21px] md:text-[16px]"
        )}
      >
        {value}
      </div>
      <p
        className={twJoin(
          "font-normal text-gray80",
          "text-[10px] leading-[15px] md:text-[12px]"
        )}
      >
        {inUSD}
      </p>
    </div>
  );
};

const MyOLPV2: React.FC<Props> = ({ olpKey }) => {
  const { stakedOlp, stakedOlpUsd, claimable, claimableUsd, handleRewards } =
    useMyOlpData({ olpKey });

  const isButtonDisabled =
    BigNumber(claimable).lt(0.0001) && claimableUsd < 0.01;

  return (
    <div className={twJoin("flex flex-col gap-y-3 px-3 md:px-6")}>
      <p
        className={twJoin(
          "font-bold text-whitef0",
          "text-[18px] leading-[27px] md:text-[20px]"
        )}
      >
        My Options LP
      </p>
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-row">
          <StatusItem
            title="Staked"
            value={advancedFormatNumber(Number(stakedOlp), 4, "", true)}
            inUSD={advancedFormatNumber(stakedOlpUsd, 2, "$", true)}
          />
          <StatusItem
            title="Rewards"
            value={
              <div className={twJoin("flex items-center")}>
                <img className="mr-[4px]" src={EthRewardIcon} />
                {advancedFormatNumber(Number(claimable), 4, "", true)}
              </div>
            }
            inUSD={advancedFormatNumber(claimableUsd, 2, "$", true)}
          />
        </div>
        <div
          className={twJoin(
            "flex justify-center items-center",
            "w-full h-10 rounded",
            "font-bold text-[14px] leading-[21px] md:text-[16px]",
            isButtonDisabled
              ? "text-whitef0 bg-[linear-gradient(180deg,rgba(216,254,229,0.08)_0%,rgba(192,228,205,0.08)_100%)]"
              : "text-black0a bg-greene6"
          )}
          onClick={async () => {
            if (!isButtonDisabled) {
              await handleRewards();
            }
          }}
        >
          <span className={isButtonDisabled ? "opacity-40" : ""}>Claim</span>
        </div>
      </div>
    </div>
  );
};

export default MyOLPV2;
