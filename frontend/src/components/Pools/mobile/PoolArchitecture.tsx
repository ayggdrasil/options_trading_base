import { twJoin } from "tailwind-merge";
import LearnMoreIcon from "@/assets/learnmore-mobile.svg";
import OlpArchitectureRewardImage from "@/assets/images/olp-architecture-rewards-mobile.png";
import OlpArchitectureImage from "@/assets/images/olp-architecture-architecture-mobile.png";

type Props = {};

const PoolArchitecture: React.FC<Props> = () => {
  return (
    <div className={twJoin("flex flex-col gap-y-3")}>
      <p
        className={twJoin(
          "font-medium text-gray80",
          "text-[12px] leading-[16px] md:text-[14px]"
        )}
      >
        Moby’s OLP assumes counterparty positions to those requested by traders,
        generating revenue through trading fees and risk premiums. The OLP
        effectively maintains position balance and manages risk by leveraging
        the SLE (Synchronized Liquidity Engine) model to apply a calculated risk
        premium. This approach ensures the stable preservation of liquidity
        provider (LP) capital within the pool.
      </p>
      <div
        className={twJoin(
          "w-full h-10 rounded",
          "border border-solid border-[#E6FC8D]",
          "flex flex-row gap-x-2 justify-center items-center"
        )}
        onClick={() => {
          window.open(
            "https://docs.moby.trade/how-its-built/architecture/liquidity-provision-mechanism",
            "_blank"
          );
        }}
      >
        <span
          className={twJoin(
            "font-semibold text-greene6",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
        >
          Visit Moby Docs
        </span>
        <img
          className={twJoin("w-[18px] h-[18px] object-cover")}
          src={LearnMoreIcon}
        />
      </div>
      <div
        className={twJoin("flex flex-col gap-y-3", "md:flex-row md:gap-x-6")}
      >
        <div className="flex flex-col gap-y-2">
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
          >
            Rewards
          </p>
          <img className="w-full h-auto" src={OlpArchitectureRewardImage} />
        </div>
        <div className="flex flex-col gap-y-2">
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
          >
            Architecture
          </p>
          <img className="w-full h-auto" src={OlpArchitectureImage} />
        </div>
      </div>
    </div>
  );
};

export default PoolArchitecture;
