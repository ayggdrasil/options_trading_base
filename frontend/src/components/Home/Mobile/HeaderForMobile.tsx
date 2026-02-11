import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { addressToReferralID } from "@/utils/encoding";
import {
  CALLPUT_DISCORD_URL,
  CALLPUT_DOCS_URL,
  CALLPUT_TELEGRAM_URL,
  CALLPUT_X_URL,
} from "@/utils/urls";
import { ModalContext } from "@/components/Common/ModalContext";
import WalletForMobile from "./WalletForMobile";
import AddReferralModalForMobile from "./AddReferralModalForMobile";
import useElementBounding from "@/hooks/useElementBounding";

import LogoMobyMobile from "@assets/mobile/logo-moby-mobile.svg";
import IconSocialDashboard from "@assets/mobile/icon-social-dashboard.svg";
import IconSocialDocs from "@assets/mobile/icon-social-docs.svg";
import IconSocialInvite from "@assets/mobile/icon-social-invite.svg";
import IconSocialTwitter from "@assets/mobile/icon-social-twitter.svg";
import IconSocialTelegram from "@assets/mobile/icon-social-telegram.svg";
import IconSocialDiscord from "@assets/mobile/icon-social-discord.svg";
import IconMenu from "@assets/mobile/icon-menu.svg";

const socials = [
  {
    id: 1,
    name: "Twitter",
    url: CALLPUT_X_URL,
    iconSrc: IconSocialTwitter,
  },
  {
    id: 2,
    name: "Telegram",
    url: CALLPUT_TELEGRAM_URL,
    iconSrc: IconSocialTelegram,
  },
  {
    id: 3,
    name: "Discord",
    url: CALLPUT_DISCORD_URL,
    iconSrc: IconSocialDiscord,
  },
];

interface SocialMenuItemProps {
  id: number;
  name: string;
  iconSrc: string;
  url?: string;
  onClick?: () => void;
}

const SocialMenuItem: React.FC<SocialMenuItemProps> = ({
  name,
  url,
  iconSrc,
  onClick,
}) => {
  const { closeModal } = useContext(ModalContext);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (url) {
      closeModal();
      window.open(url, "_blank");
    }
  };

  return (
    <button
      className={twJoin(
        "w-full py-[10px] border-b-[1px] first:pt-0",
        "border-[rgba(255,255,255,0.1)]"
      )}
      type="button"
      onClick={handleClick}
    >
      <div className="flex items-center gap-3 py-1">
        <img src={iconSrc} className="w-[34px] h-[34px]" alt={`${name} icon`} />
        <p className="text-[16px] md:text-[18px] leading-6 font-semibold text-whitef0">
          {name}
        </p>
      </div>
    </button>
  );
};

interface SocialMenuModalProps {
  menu: SocialMenuItemProps[];
}

const SocialMenuModal: React.FC<SocialMenuModalProps> = ({ menu }) => {
  const { closeModal } = useContext(ModalContext);

  return (
    <div className="px-3 md:px-6">
      <div className="mb-4 px-[14px]">
        {menu.map((menuItem) => {
          return <SocialMenuItem key={menuItem.id} {...menuItem} />;
        })}
      </div>

      <div className="flex items-center justify-around">
        {socials.map(({ id, url, iconSrc, name }) => (
          <img
            key={id}
            src={iconSrc}
            alt={name}
            className="w-[34px] cursor-pointer"
            onClick={() => {
              closeModal();
              window.open(url, "_blank");
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface HeaderForMobileProps {
  children: React.ReactNode;
  setHeaderHeight: Dispatch<SetStateAction<number | undefined>>;
}

function HeaderForMobile({ children, setHeaderHeight }: HeaderForMobileProps) {
  const navigate = useNavigate();
  const { isConnected, address } = useAccount();

  const headerRef = useRef(null);

  const { height: headerHeight } = useElementBounding(headerRef, {
    immediate: true,
  });

  const { openModal, closeModal } = useContext(ModalContext);

  const menuList = useMemo(() => {
    const referralId = addressToReferralID(address);

    return [
      {
        id: 1,
        name: "Dashboard",
        url: "https://dune.com/mobytrade/moby",
        iconSrc: IconSocialDashboard,
        isShow: true,
      },
      {
        id: 2,
        name: "Docs",
        url: CALLPUT_DOCS_URL,
        iconSrc: IconSocialDocs,
        isShow: true,
      },
      {
        id: 3,
        name: "Invite",
        iconSrc: IconSocialInvite,
        isShow: isConnected,
        onClick: () => {
          closeModal();

          setTimeout(() => {
            openModal(<AddReferralModalForMobile referralId={referralId} />, {
              contentClassName: "flex flex-col min-h-[400px]",
            });
          }, 200);
        },
      },
    ]?.filter((item) => {
      return item?.isShow;
    });
  }, [isConnected, address]);

  useLayoutEffect(() => {
    setHeaderHeight(headerHeight);
  }, [headerHeight]);

  return (
    <>
      <div
        ref={headerRef}
        className={twJoin("fixed top-0 left-0 right-0 z-40")}
      >
        <div
          className={twJoin(
            "flex justify-between items-center",
            "min-h-[60px] py-[10px] pl-[12px] pr-2 md:pl-6 md:pr-5",
            "border-b-[1px] border-black29",
            "bg-black12"
          )}
        >
          {/* Logo */}
          <img
            className="h-5 md:h-6 cursor-pointer"
            src={LogoMobyMobile}
            onClick={() => {
              navigate("/");
              window.scrollTo(0, 0);
            }}
          />

          {/* Button group */}
          <div className="flex items-center justify-end">
            {/* Wallet */}
            <WalletForMobile />

            {/* Menu icon */}
            <img
              className="cursor-pointer w-[36px] ml-2 md:ml-3"
              src={IconMenu}
              onClick={() => {
                openModal(<SocialMenuModal menu={menuList} />, {
                  contentClassName: "min-h-[200px]",
                });
              }}
            />
          </div>
        </div>
        {children}
      </div>
      <div
        style={{ height: `${headerHeight}px` }}
        className="w-full min-h-[60px]"
      />
    </>
  );
}

export default HeaderForMobile;
