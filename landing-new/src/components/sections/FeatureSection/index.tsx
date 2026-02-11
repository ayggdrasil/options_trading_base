import React from "react";
import { twJoin } from "tailwind-merge";

import ImgF1 from "../../../assets/feature/img-f1.png";
import ImgF2 from "../../../assets/feature/img-f2.png";
import ImgF3 from "../../../assets/feature/img-f3.png";
import ImgF4 from "../../../assets/feature/img-f4.png";

interface Feature {
  title: string;
  imgSrc: string;
  description: string;
}

const features: Feature[] = [
  {
    title: "Competitive Fees & Pricing",
    imgSrc: ImgF1,
    description: "Low-cost options trading with the best execution and low fees.",
  },
  {
    title: "Permissionless Access",
    imgSrc: ImgF2,
    description: "Trade instantly with no signup, no KYC, and full self-custody.",
  },
  {
    title: "24/7 Deep Liquidity",
    imgSrc: ImgF3,
    description: "Trade BTC, ETH, SPY, NVDA, TSLA, GOOG, AAPL, PLTR, and more.",
  },
  {
    title: "High Leverage, No Liquidations",
    imgSrc: ImgF4,
    description: "Higher leverage than futures or PERPs, without forced liquidations.",
  },
];

const Feature: React.FC = () => {
  return (
    <section
      className={twJoin(
        "h-fit w-full flex flex-row items-center justify-center bg-[#f2f2f2] overflow-hidden",
        "px-[28px] pt-[72px] pb-[120px]",
        "lg:px-[96px] lg:pt-[120px] lg:pb-[160px]"
      )}
    >
      <div className={twJoin(
        "h-fit flex flex-col items-center justify-center gap-[88px]",
        "w-full",
        "lg:max-w-[1280px]",
      )}>
        <h1 className="text-black181a text-[48px] text-center font-[400] leading-[72px] tracking-[-1px]">Why Traders Choose CallPut</h1>

        <div
          className={twJoin(
            "w-full grid grid-cols-1 gap-[48px]",
            "lg:grid-cols-2 lg:gap-[24px] lg:w-[624px]",
            "xl:grid-cols-4 xl:gap-[24px] xl:w-[1280px]"
          )}
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className={twJoin(
                "flex flex-col items-center justify-center gap-[12px]",
                "w-full",
                "lg:w-[300px]"
              )}
            >
              <img src={feature.imgSrc} alt={feature.title} className="w-[160px] h-[160px] object-contain" />
              <div className="flex flex-col gap-[10px]">
                <p className="h-[27px] text-black181a text-[20px] text-center font-[500] leading-normal">{feature.title}</p>
                <p className="h-[48px] text-black181a text-[17px] text-center font-[400] leading-[24px]">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Feature;
