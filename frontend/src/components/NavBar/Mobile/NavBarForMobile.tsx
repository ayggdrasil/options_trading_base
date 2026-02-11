import React from "react";
import { Link, useLocation } from "react-router-dom";
import { twJoin } from "tailwind-merge";
import IconHome from "@assets/mobile/bottom-nav-bar/icon-home.svg";
import IconHomeSelected from "@assets/mobile/bottom-nav-bar/icon-home-selected.svg";
import { MENU_ITEMS } from "@/networks/configs";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";

interface NavBarItemProps {
  name: string;
  url: string;
  mobileIcon?: string;
  mobileIconSelected?: string;
  isMobileDisabled?: boolean;
}

const NavBarItem: React.FC<NavBarItemProps> = ({ name, url, mobileIcon, mobileIconSelected, isMobileDisabled }) => {
  const location = useLocation();
  const isActive = location.pathname === url;

  const content = (
    <>
      <img src={isActive ? mobileIconSelected : mobileIcon} className="w-[40px] h-[40px]" />
      <p
        className={twJoin(
          "text-[12px] leading-[16px] font-[500]",
          isActive ? "text-whitef5" : "text-gray52"
        )}
      >
        {name}
      </p>
    </>
  );

  if (isMobileDisabled) {
    return (
      <div className="w-12 md:w-14 flex flex-col items-center gap-y-1 cursor-not-allowed opacity-[0.3]">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={url}
      className="w-12 md:w-14 flex flex-col items-center gap-y-1"
    >
      {content}
    </Link>
  );
};

function NavBarForMobile() {
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div
          className={twJoin(
            "pt-2 pb-3 px-4 md:px-6",
            "flex items-center justify-between gap-[20px]",
            "backdrop-blur-[50px] bg-black17 py-[12px] px-[16px]",
            "border-t-[1px] border-black33 rounded-t-[20px]",
          )}
        >
          <NavBarItem name="Home" url="/" mobileIcon={IconHome} mobileIconSelected={IconHomeSelected} />
          {MENU_ITEMS[chain]
            ?.filter((menuItem) => {
              return !menuItem.isExternal && !menuItem.isMobileDisabled;
            })
            ?.map((menuItem) => {
              return <NavBarItem key={menuItem.id} {...menuItem} />;
            })}
        </div>
      </div>
    </>
  );
}

export default NavBarForMobile;
