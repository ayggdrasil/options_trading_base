import React, { useEffect, useLayoutEffect, useState } from "react";
import { CALLPUT_URLS, PRODUCT_URLS } from "../../shared/constants/urls";
import { twJoin } from "tailwind-merge";
import { advancedFormatNumber } from "../../utils/formatters";
import Button from "../common/Button";
import DividerVertical from "../common/DividerVertical";
import Dropdown, { DropdownItem } from "../common/Dropdown";

import LogoCallput from "../../assets/img/logo-callput.png";
import IconHamburger from "../../assets/img/icon-hamburger.png";
import { MEDIAS } from "../../shared/constants/media";
import { useStats } from "../../hooks/useStats";

const MENU_ITEMS = [
  {
    name: "Trading",
    imgSrc: "",
    url: PRODUCT_URLS.TRADING,
    ariaLabel: "Trading",
    active: true,
  },
  {
    name: "Pools",
    imgSrc: "",
    url: PRODUCT_URLS.POOLS,
    ariaLabel: "Pools",
    active: true,
  },
  {
    name: "Rewards",
    imgSrc: "",
    url: PRODUCT_URLS.REWARDS,
    ariaLabel: "Rewards",
    active: false,
  },
  {
    name: "Dashboard",
    imgSrc: "",
    url: PRODUCT_URLS.DASHBOARD,
    ariaLabel: "Dashboard",
    active: false,
  },
];

interface HamburgerItemProps {
  index: number;
  name: string;
  imgSrc: string;
  url: string;
  closeMobileMenu: () => void;
}

interface HamburgerMenuProps {
  isMobileMenuOpen: boolean;
  touchStartY: number | undefined;
  closeMobileMenu: () => void;
  setTouchStartY: (value: number | undefined) => void;
}

const HamburgerMenuItem: React.FC<HamburgerItemProps> = ({ index, name, url, imgSrc, closeMobileMenu }) => {
  return (
    <div
      key={index}
      className={twJoin(
        "px-[28px] py-[8px]",
        "cursor-pointer hover:bg-whited9d9 active:bg-whited9d9 focus:bg-whited9d9",
        "transition-transform duration-150 ease-in-out active:scale-95",
      )}
      onClick={() => {
        window.open(url, "_blank");
        closeMobileMenu();
      }}
    >
      <div className="w-full flex flex-row items-center justify-between">
        <p className="h-[32px] text-gray4b50 text-[16px] font-[500] leading-[32px]">{name}</p>
        <img className="w-[32px]" src={imgSrc} />
      </div>
    </div>
  );
};

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isMobileMenuOpen,
  touchStartY,
  closeMobileMenu,
  setTouchStartY,
}) => {
  return (
    <div
      className={twJoin(
        "fixed top-0 bottom-0 left-0 w-full",
        "flex flex-col justify-end",
        "transition-all duration-[300ms] ease-linear",
        // "bg-[rgb(255,255,255,0.3)] backdrop-blur-[2px]",
        isMobileMenuOpen ? "opacity-100 z-[200] delay-[100ms]" : "opacity-0 -z-[1] pointer-events-none"
      )}
      onClick={closeMobileMenu}
      onTouchStart={(e) => {
        setTouchStartY(e.touches?.[0]?.clientY);
      }}
      onTouchEnd={(e) => {
        if (typeof touchStartY === "number" && e.changedTouches?.[0]?.clientY > touchStartY) {
          closeMobileMenu();
        }
      }}
    >
      <div
        className={twJoin(
          "relative overflow-hidden",
          "pt-[12px] pb-[20px] rounded-t-[12px] bg-whitef2f2",
          "border-t-[1px] border-t-whited9d9",
          "shadow-[0px_-6px_36px_0px_rgba(0,0,0,0.20)]",
          "transition-all duration-[300ms] ease-linear",
          isMobileMenuOpen ? "translate-y-0 delay-[150ms]" : "translate-y-full"
        )}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="relative z-[2] overflow-auto h-full">
          {MEDIAS.map((media, index) => (
            <HamburgerMenuItem
              key={index}
              index={index}
              name={media.name}
              imgSrc={media.imgBlackSrc}
              url={media.url}
              closeMobileMenu={closeMobileMenu}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const NavBar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number>();

  const { data: statsData } = useStats();

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setTouchStartY(undefined);
  };

  const resetBodyStyle = () => {
    document.body.classList.remove("fixed-body");
    document.body.style.top = "";
  };

  useLayoutEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.top = `-${window.scrollY}px`;
      document.body.classList.add("fixed-body");

      return;
    }

    const scrollY = Math.abs(parseInt(document.body?.style?.top || "0", 10));
    resetBodyStyle();
    window.scrollTo(0, scrollY);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    return () => {
      resetBodyStyle();
    };
  }, []);

  const handleClickLogo = () => {
    window.location.href = CALLPUT_URLS.HOME;
  };

  const handleLaunchApp = () => {
    window.open(CALLPUT_URLS.APP, "_blank");
  };

  // 드롭다운 아이템 생성
  const dropdownItems: DropdownItem[] = MEDIAS.map((media) => ({
    id: media.name,
    label: media.name,
    icon: media.imgBlackSrc,
    url: media.url,
    ariaLabel: media.ariaLabel,
  }));

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 custom-navbar shadow-md z-50">
        <div className={twJoin(
          "max-w-[1920px] mx-auto",
          "px-[12px]",
          "lg:px-[20px]",
        )}>
          <div className="flex justify-between h-[72px] items-center">
            <div className="flex flex-row items-center gap-[24px]">
              <div className="flex-shrink-0 flex items-center cursor-pointer transition-transform duration-150 ease-in-out active:scale-95" onClick={handleClickLogo}>
                <img src={LogoCallput} alt="Logo" className="w-[128px] h-[40px]" />
              </div>
              <div className={twJoin("hidden flex-shrink-0 flex-row gap-[8px]", "lg:flex")}>
                {MENU_ITEMS.map((item) => (
                  <div
                    key={item.name}
                    className={twJoin(
                      "flex-shrink-0 flex flex-row justify-center items-center px-[16px] py-[8px]",
                      "transition-transform duration-150 ease-in-out",
                      item.active ? "cursor-pointer active:scale-95" : "cursor-not-allowed opacity-50"
                    )}
                    onClick={() => {
                      if (item.active && item.url) {
                        window.open(item.url, "_blank");
                      }
                    }}
                  >
                    <p className="text-[16px] text-[#202329] font-[600] leading-[24px]">{item.name}</p>
                  </div>
                ))}
                <Dropdown
                  trigger={(isOpen) => (
                    <div className="flex-shrink-0 flex flex-row justify-center items-center px-[16px] py-[8px] transition-transform duration-150 ease-in-out active:scale-95">
                      <p className="text-[16px] text-[#202329] font-[600] leading-[24px]">More</p>
                      <div className="ml-[4px] flex-shrink-0">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={twJoin(
                            "transition-transform duration-200",
                            isOpen ? "rotate-180" : "rotate-0"
                          )}
                        >
                          <path
                            d="M6 9L12 15L18 9"
                            stroke="#202329"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                  items={dropdownItems}
                  position="bottom"
                  alignment="left"
                  containerClassName="flex-shrink-0"
                />
              </div>
            </div>

            <div className={twJoin(
              "flex-shrink-0 flex flex-row items-center",
              "gap-[12px]",
              "lg:gap-[16px]",
            )}>
              <div className="hidden lg:block">
                <p className="h-[16px] text-[#202329] text-[12px] font-[500] leading-[16px]">Total Trading Volume</p>
                <p className="h-[20px] text-[#202329] text-[12px] font-[700] leading-[20px]">{advancedFormatNumber(statsData?.totalTradingVolume?.value || 0, 0, "$", true)}</p>
              </div>
              <DividerVertical className="hidden lg:block w-[1px] h-[28px] bg-[#d9d9d9]" />
              <Button
                label="Launch App" // Launch App
                height="40px"
                onClick={handleLaunchApp}
                disabled={false}
              />
              <img
                src={IconHamburger}
                alt="Menu"
                className={twJoin("cursor-pointer w-[40px] h-[40px] transition-transform duration-150 ease-in-out active:scale-95", "lg:hidden")}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />
            </div>
          </div>
        </div>
      </nav>

      <HamburgerMenu
        isMobileMenuOpen={isMobileMenuOpen}
        touchStartY={touchStartY}
        closeMobileMenu={closeMobileMenu}
        setTouchStartY={setTouchStartY}
      />
    </>
  );
};

export default NavBar;
