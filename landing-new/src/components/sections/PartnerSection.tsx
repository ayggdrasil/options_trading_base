import React from "react";
import { AUDITORS, PARTNERS } from "../../shared/constants/partners";
import { twJoin } from "tailwind-merge";

const PartnerSection: React.FC = () => {
  return (
    <section
      className={twJoin(
        "relative h-fit w-full px-[12px] py-[72px] overflow-hidden",
        "lg:px-0 lg:pt-[88px] lg:pb-[200px]"
      )}
    >
      <div
        className={twJoin(
          "relative z-10 flex flex-col items-center justify-center gap-[72px] h-full",
          "lg:gap-[172px]"
        )}
      >
        <div className={twJoin("flex flex-col gap-[60px]", "lg:gap-[64px]")}>
          <div className="flex flex-col justify-between h-[30px] px-[18px]">
            <h1 className={twJoin("title-24", "lg:text-[32px]")}>Partners</h1>
          </div>

          <div className="flex flex-row justify-center items-center w-full">
            <div
              className={twJoin(
                "grid grid-cols-2 gap-[8px] w-[328px]",
                "lg:grid-cols-5 lg:gap-[20px] lg:w-full lg:max-w-[1280px]"
              )}
            >
              {PARTNERS.map((item, index) => (
                <div
                  key={index}
                  className={twJoin(
                    "flex justify-center items-center w-[160px] h-[64px] custom-card-partner",
                    "lg:w-[240px] lg:h-[96px]"
                  )}
                >
                  <img
                    src={item.imgSrc}
                    alt={item.name}
                    className={twJoin("h-[32px] object-contain", "lg:h-[48px]")}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={twJoin("flex flex-col gap-[60px]", "lg:gap-[64px]")}>
          <div className="flex flex-col justify-between h-[30px] px-[18px]">
            <h1 className={twJoin("title-24", "lg:text-[32px]")}>Audited and Secured by</h1>
          </div>

          <div className="flex flex-row justify-center items-center w-full">
            <div
              className={twJoin(
                "grid grid-cols-2 gap-[8px] w-[328px]",
                "lg:grid-cols-4 lg:gap-[20px] lg:w-full lg:max-w-[1280px]"
              )}
            >
              {AUDITORS.map((item, index) => (
                <div
                  key={index}
                  className={twJoin(
                    "flex justify-center items-center w-[160px] h-[64px] custom-card-partner",
                    "lg:w-[305px] lg:h-[108px]"
                  )}
                >
                  <img
                    src={item.imgSrc}
                    alt={item.name}
                    className={twJoin("h-[32px] object-contain", "lg:h-[60px]")}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerSection;
