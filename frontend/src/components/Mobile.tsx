import { twJoin } from "tailwind-merge";

import LogoMobyGrey from "../assets/mobile/logo-moby-grey.svg";
import LogoMobyLetter from "../assets/mobile/logo-moby-letter.svg";

import SocialDocs from "../assets/mobile/social-docs.svg";
import SocialDocsSelected from "../assets/mobile/social-docs-selected.svg";
import SocialTwitter from "../assets/mobile/social-twitter.svg";
import SocialTwitterSelected from "../assets/mobile/social-twitter-selected.svg";
import SocialDiscord from "../assets/mobile/social-discord.svg";
import SocialDiscordSelected from "../assets/mobile/social-discord-selected.svg";

import { CALLPUT_DISCORD_URL, CALLPUT_DOCS_URL, CALLPUT_X_URL } from "@/utils/urls";

const MENU_ITEMS = [
  {
    name: "Docs",
    link: CALLPUT_DOCS_URL,
    imgSrc: SocialDocs,
    imgSrcSelected: SocialDocsSelected,
  },
  {
    name: "Twitter",
    link: CALLPUT_X_URL,
    imgSrc: SocialTwitter,
    imgSrcSelected: SocialTwitterSelected,
  },
  {
    name: "Discord",
    link: CALLPUT_DISCORD_URL,
    imgSrc: SocialDiscord,
    imgSrcSelected: SocialDiscordSelected,
  },
]

const Mobile = () => {
  return (
    <div className={twJoin(
      "flex flex-col items-center",
      "w-full h-screen min-h-screen",
      "bg-cover bg-center bg-no-repeat bg-[url('./assets/mobile/bg-teaser.png')]"
    )}>

      <div className={twJoin(
        "flex flex-row justify-between items-center",
        "w-full h-[88px] pl-[28px] pr-[21px] py-[30px]"
      )}>
        <div>
          <img
            className="cursor-pointer w-[122px] h-[28px]"
            src={LogoMobyLetter}
            alt="moby"
            onClick={() => {
              window.location.reload();
            }}
          />
        </div>
        <div className="flex flex-row justify-center items-center gap-[14px]">
          {
            MENU_ITEMS.map((item, index) => (
              <div
                key={index}
                className="cursor-pointer flex flex-row justify-center items-center]"
                onClick={() => window.open(item.link, "_blank")}
              >
                <img
                  className="w-[32px] h-[32px]"
                  src={item.imgSrc}
                  alt={item.name}
                />
              </div>
            ))
          }
        </div>
      </div>

      <div className="w-full h-[1px] bg-black33" />

      <div className="flex flex-col justify-start items-start w-full h-full mt-[80px] px-[28px]">
        <div className="text-[38px] font-normal text-whitee0 leading-[1.2]">
          <p>The Next Options <br/> Protocol with <br/> Maximized Liquidity</p>
        </div>
        <div className="flex flex-row items-center pt-[24px] text-[20px] font-semibold text-greenc1">
          <div className="w-[3px] h-[84px] bg-[rgba(224,224,224,.2)]" />
          <div className="flex flex-col ml-[20px]">
            <p>250x Leverage</p>
            <p>No Liquidation</p>
            <p>Narrow Spread</p>
          </div>
        </div>
      </div>

      <div className="text-center mb-[30px] p-[8px] text-primaryc1 bg-[#262626] border-[1px] rounded-[3px] border-[rgba(254,254,254,0.1)] shadow-[0px 2px 6px rgba(0,0,0,0.12)]">
        <p>Mobile version is not supported at this time.</p>
        <p>Please access via a desktop.</p>
      </div>

      <div className={twJoin(
        "flex flex-col justify-between items-center",
        "w-full h-[81px] min-h-[81px] pb-[24px]",
        "text-[14px] font-normal text-gray80"
      )}>
        <img className="w-[28px] h-[20px]" src={LogoMobyGrey} alt="moby" />
        <p>© 2023. Moby. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Mobile;