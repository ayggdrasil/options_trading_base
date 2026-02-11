import React from "react";
import { twJoin } from "tailwind-merge";
import { EXTERNAL_URLS } from "../../../shared/constants/urls";

const EarlyAccess: React.FC = () => {
  const handleGetEarlyAccess = () => {
    window.open(EXTERNAL_URLS.EARLY_ACCESS, "_blank");
  };

  return (
    <section className={twJoin(
      "h-fit w-full flex flex-row items-center justify-center overflow-hidden",
      "bg-black1214",
      "px-[28px] pt-[64px] pb-[128px]",
      "lg:px-[48px] lg:pt-[48px] lg:pb-[120px]"
    )}>
      <div className={twJoin(
        "w-full rounded-[30px] p-[1px]",
        "bg-[linear-gradient(180deg,#255BB8_0%,transparent_100%)]",
        "max-w-[584px] h-fit",
        "lg:max-w-[1408px] lg:h-fit"
      )}>
        <div className={twJoin(
          "w-full h-fit flex flex-col gap-[36px] rounded-[30px]",
          "bg-[linear-gradient(180deg,#0A2666_0%,transparent_100%)]",
          "p-[36px]",
          "lg:px-[64px] lg:pt-[48px] lg:pb-[88px]"
        )}>
          <div className="flex flex-col">
            <p className={twJoin(
              "h-fit text-blue278e font-[400] tracking-[-1px]",
              "text-[20px] leading-[24px]",
              "lg:text-[24px] lg:leading-[32px]"
            )}>
              Become an Early User
            </p>
            <p className={twJoin(
              "h-fit text-whitef2f2 font-[400] tracking-[-1px]",
              "text-[36px] leading-[48px]",
              "lg:text-[48px] lg:leading-[72px]"
            )}>
              Equity options soon. Get in early.
            </p>
          </div>
          <button
            onClick={handleGetEarlyAccess}
            className="cursor-pointer w-[157px] px-[16px] py-[8px] rounded-[6px] bg-blue1f53"
          >
            <p className="text-whitef2f2 text-[16px] font-[600] leading-[24px]">Get Early Access</p>
          </button>
        </div>
      </div>
    </section>
  );
};

export default EarlyAccess;
