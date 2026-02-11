import React from "react";
import Button from "../../common/Button";
import { ABOUT_URLS, CALLPUT_URLS } from "../../../shared/constants/urls";
import { twJoin } from "tailwind-merge";

import LogoCallput from "../../../assets/img/logo-callput.png";
import IconInfo from "../../../assets/img/icon-info.svg";

import HereImg from "../../../assets/hero/hero-img.png";
import HereImgM from "../../../assets/hero/hero-img-m.png";

const Hero: React.FC = () => {
  const handleStartTrading = () => {
    window.open(CALLPUT_URLS.APP, "_blank");
  };

  return (
    <section
      className={twJoin(
        "relative h-[calc(100dvh-72px)] w-full overflow-hidden",
        "flex flex-row items-center justify-center",
        "bg-[linear-gradient(115deg,#8EA0B1_0%,#F2F2F2_76.82%)]",
        "px-[28px]",
        "lg:px-[64px]"
      )}
    >
      <img
        src={HereImgM}
        alt="HereImgM"
        className="lg:hidden absolute bottom-0 w-full max-w-[540px] object-contain"
      />
      <div className="z-1 w-full flex flex-row items-center justify-center gap-[64px]">
        <img
          src={HereImg}
          alt="HereImg"
          className="hidden lg:block w-[446px] h-[446px] object-contain"
        />
        <div
          className={twJoin(
            "flex flex-col",
            "max-w-[584px] w-full items-center gap-[36px]",
            "lg:max-w-none lg:w-[642px] lg:items-start lg:gap-[32px]"
          )}
        >
          <div className={twJoin(
            "flex flex-col gap-[12px]",
            "items-center",
            "lg:items-start"
          )}>
            <img
              src={LogoCallput}
              alt="LogoCallput"
              className="w-[192px] h-[60px]"
            />
            <h1
              className={twJoin(
                "text-[#181A1F] font-[400] tracking-[-1px]",
                "text-[36px] leading-[45px] text-center",
                "block",
                "lg:hidden"
              )}
            >
              Permissionless 24/7 On-Chain Options for US Stocks & Crypto
            </h1>
            <h1
              className={twJoin(
                "text-[#181A1F] font-[400] tracking-[-1px]",
                "text-[60px] leading-[72px] text-left",
                "hidden",
                "lg:block"
              )}
            >
              Permissionless
              <br />
              24/7 On-Chain Options
              <br />
              for US Stocks & Crypto
            </h1>
          </div>
          <div className={twJoin(
            "w-[504px] h-[92px] flex flex-col",
            "w-full h-fit items-center gap-[8px]",
            "lg:w-[504px] lg:h-[92px] lg:items-start lg:gap-[12px]"
          )}>
            <p className={twJoin(
              "text-[#181A1F] text-[16px] font-[400]",
              "h-fit leading-[23px] text-center",
              "lg:h-[56px] lg:leading-[28px] lg:text-left"
            )}>
              Start with just $1. Permissionless, low-fee options trading for
              BTC, ETH, SPY, NVDA, TSLA, GOOG and more.
            </p>
            <div
              className="cursor-pointer flex flex-row items-center gap-[4px]"
              onClick={() => {
                window.open(ABOUT_URLS.DISCLAIMER, "_blank");
              }}
            >
              <img
                src={IconInfo}
                alt="IconInfo"
                className="w-[16px] h-[16px]"
              />
              <p className="text-[#8C8C8C] text-[14px] font-[400] leading-[24px]">
                Disclaimer
              </p>
            </div>
          </div>
          <Button
            label="Launch App" // Start Trading on BASE
            height="40px"
            onClick={handleStartTrading}
            disabled={false}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
