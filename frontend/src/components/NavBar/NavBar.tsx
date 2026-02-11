import Wallet from "./Wallet";

import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { twJoin } from "tailwind-merge";
import { useAppSelector } from "@/store/hooks";
import { advancedFormatNumber, formatNumber } from "@/utils/helper";
import { MENU_ITEMS, SOCIALS } from "@/networks/configs";
import { NetworkState } from "@/networks/types";
import Dropdown from "@/components/Common/Dropdown";

import IconExternal from "@assets/icon-external.svg";
import IconExternalSelected from "@assets/icon-external-selected.svg";
import IconBadgeNew from "@assets/icon-badge-new.svg";

import IconArrSelDown from "@assets/img/icon/arr-selector-down.png";
import IconArrSelUp from "@assets/img/icon/arr-selector-up.png";
import LogoCallPut from "@assets/img/logo-callput.png";

interface NavBarItemProps {
  name: string | JSX.Element;
  url: string;
  isExternal: boolean;
  isNew: boolean;
  isDisabled: boolean;
}

interface SocialMenuItemProps {
  social: any;
  onClick: () => void;
}

const NavBarItem: React.FC<NavBarItemProps> = ({
  name,
  url,
  isExternal,
  isNew,
  isDisabled,
}) => {
  const location = useLocation();
  const isActive =
    location.pathname === url ||
    (location.pathname === "/" && url === "/trading");
  const ref = useRef<HTMLDivElement>(null);

  const commonClasses =
    "h-full flex flex-row items-center justify-center px-[16px] text-gray8c8c text-[16px] font-[600] rounded-[6px]";

  const linkClasses = isDisabled
    ? "pointer-events-none opacity-30"
    : isActive
      ? "!text-blue278e !font-[700] bg-black2023"
      : "hover:text-whitef2f2 hover:bg-black292c active:scale-95";

  const content = (
    <div className="h-full group flex flex-row justify-center items-center gap-[6px]">
      <div>{name}</div>
      {isNew && <img className="w-[34px] h-[16px]" src={IconBadgeNew} />}
      {isExternal && !isDisabled && (
        <>
          <img
            className="block group-hover:hidden w-[10px] h-[10px]"
            src={IconExternal}
          />
          <img
            className="hidden group-hover:block w-[10px] h-[10px]"
            src={IconExternalSelected}
          />
        </>
      )}
    </div>
  );

  return (
    <div ref={ref} className={twJoin("h-full", isDisabled && "cursor-not-allowed")}>
      {isExternal ? (
        <a
          href={url}
          className={twJoin(commonClasses, linkClasses)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      ) : (
        <Link to={url} className={twJoin(commonClasses, linkClasses)}>
          {content}
        </Link>
      )}
    </div>
  );
};

const SocialMenuItem: React.FC<SocialMenuItemProps> = ({ social, onClick }) => {
  return (
    <button
      key={social.id}
      className={twJoin(
        "cursor-pointer group",
        "w-full h-[36px] flex flex-row items-center justify-between px-[20px]",
        "hover:bg-black292c hover:text-whitef2f2"
      )}
      type="button"
      onClick={onClick}
    >
      <p className="text-[14px] font-[500] leading-[24px] text-gray8c8c group-hover:text-whitef2f2">
        {social.name}
      </p>
      <div className="w-[24px] h-[24px] relative">
        <img
          src={social.iconSrc}
          className="absolute w-6 h-6 group-hover:opacity-0 transition-opacity"
          alt={`${social.name} icon`}
        />
        <img
          src={social.iconSrcSelected}
          className="absolute w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
          alt={`${social.name} selected icon`}
        />
      </div>
    </button>
  );
};

function NavBar() {
  const navigate = useNavigate();
  const volumeData = useAppSelector((state: any) => state.user.volume);
  const { chain } = useAppSelector((state) => state.network) as NetworkState;

  const [totalNotionalVolume, setTotalNotionalVolume] = useState("0");
  const [isMoreOpened, setIsMoreOpened] = useState<boolean>(false);

  const olpApr = useAppSelector((state: any) => state.app.olpApr);

  useEffect(() => {
    setTotalNotionalVolume(volumeData.totalNotionalVolume);
  }, [volumeData]);

  const getNavbarName = (item: any) => {
    // const isPool = item.name === "Pool"
    // const poolAPR = formatNumber((olpApr?.sOlp?.feeApr + olpApr?.sOlp?.riskPremiumApr) * 100, 1, true)
    // if (isPool) {
    //   return (
    //     <div
    //       className={twJoin(
    //         "flex items-center"
    //       )}
    //     >
    //       {item.name}
    //       <span
    //         className={twJoin(
    //           "flex items-center justify-center",
    //           "min-w-[48px] h-[18px] text-center text-black17 text-[14px] font-[700] bg-gradient-to-r from-[#F7931A] to-[#FF581B]",
    //           "rounded-[3px]",
    //           "ml-[6px]"
    //         )}
    //       >
    //         {poolAPR == "0"
    //           ? "0.0%"
    //           : `${poolAPR.replace('<', '')}%`
    //         }
    //       </span>
    //     </div>
    //   )
    // }
    return item.name;
  };

  return (
    <div
      className={twJoin(
        "h-[72px] z-40 fixed top-0 left-0 right-0 flex flex-row justify-between items-center px-[20px] ",
        "bg-black1214 border-b-[1px] border-b-black2023"
      )}
    >
      {/* Left Side */}
      <div className="h-full flex flex-row items-center gap-[24px]">
        <div className="h-full flex flex-row justify-center items-center">
          <img
            className="cursor-pointer w-[128px] h-[40px] min-w-[128px]"
            src={LogoCallPut}
            onClick={() => {
              navigate("/");
            }}
          />
        </div>
        <div className="h-[40px] flex flex-row items-center gap-[8px]">
          {MENU_ITEMS[chain].map((item) => (
            <NavBarItem
              key={item.id}
              name={getNavbarName(item)}
              url={item.url}
              isExternal={item.isExternal}
              isNew={item.isNew}
              isDisabled={item.isDisabled}
            />
          ))}
          <div className="h-full">
            <Dropdown
              trigger={
                <div
                  className={twJoin(
                    "h-full cursor-pointer flex flex-row items-center justify-center px-[16px] text-gray8c8c text-[16px] font-[600] rounded-[6px]",
                    "hover:text-whitef2f2 hover:bg-black292c active:scale-95",
                    isMoreOpened && "!text-blue278e !font-[700] bg-black2023"
                  )}
                >
                  <div className="flex flex-row items-center gap-[6px]">
                    <p className="flex items-center h-full">More</p>
                    <img
                      className="w-[18px] h-[18px]"
                      src={isMoreOpened ? IconArrSelUp : IconArrSelDown}
                    />
                  </div>
                </div>
              }
              isOpen={isMoreOpened}
              onOpenChange={setIsMoreOpened}
              triggerDropdownGap={8}
              dropdownPosition="bottom-left"
              dropdownWidth="160px"
            >
              {(closeDropdown) =>
                SOCIALS[chain].map((social: any) => {
                  return (
                    <SocialMenuItem
                      key={social.id}
                      social={social}
                      onClick={() => {
                        window.open(social.url, "_blank");
                        closeDropdown();
                      }}
                    />
                  );
                })
              }
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className={twJoin("flex flex-row items-center gap-[12px]")}>
        <div className="w-fit">
          <p className="text-[11px] text-gray80 font-bold whitespace-nowrap">
            Total Trading Volume
          </p>
          <p className="text-[12px] font-bold whitespace-nowrap">
            {advancedFormatNumber(Number(totalNotionalVolume), 0, "$")}
          </p>
        </div>
        <Wallet />
      </div>
    </div>
  );
}

export default NavBar;
