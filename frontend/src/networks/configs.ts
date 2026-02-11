import {
  CALLPUT_DISCORD_URL,
  CALLPUT_DOCS_URL,
  CALLPUT_TELEGRAM_URL,
  CALLPUT_X_URL,
} from "@/utils/urls";
import { CustomCssMap, MenuMap, NetworkConfigs, OlpTermMap, SocialMap } from "./types";
import { CONTRACT_ADDRESSES } from "./addresses";

import MobileIconTrading from "@assets/mobile/bottom-nav-bar/icon-trading.svg";
import MobileIconTradingSelected from "@assets/mobile/bottom-nav-bar/icon-trading-selected.svg";
import MobileIconPools from "@assets/mobile/bottom-nav-bar/icon-pools.svg";
import MobileIconPoolsSelected from "@assets/mobile/bottom-nav-bar/icon-pools-selected.svg";
import MobileIconRewards from "@assets/mobile/bottom-nav-bar/icon-rewards.svg";
import MobileIconRewardsSelected from "@assets/mobile/bottom-nav-bar/icon-rewards-selected.svg";

import LogoArb from "@assets/logo-arb.svg";
import LogoArbWallet from "@assets/logo-arb-wallet.svg";
import IconChainDropdownBlack from "@assets/icon-chain-dropdown-black.svg";
import IconChainDropdownWhite from "@assets/icon-chain-dropdown-white.svg";
import LogoArbForMobile from "@assets/mobile/logo-arb-mobile.svg";
import LogoArbActiveForMobile from "@assets/mobile/logo-arb-active-mobile.svg";

import IconSocialDocs from "@assets/img/social/docs-off.png";
import IconSocialDocsSelected from "@assets/img/social/docs-on.png";
import IconSocialX from "@assets/img/social/x-off.png";
import IconSocialXSelected from "@assets/img/social/x-on.png";
import IconSocialTelegram from "@assets/img/social/telegram-off.png";
import IconSocialTelegramSelected from "@assets/img/social/telegram-on.png";
import IconSocialDiscord from "@assets/img/social/discord-off.png";
import IconSocialDiscordSelected from "@assets/img/social/discord-on.png";

import { SupportedChains } from "@callput/shared";

const getBaseConfig = () => ({
  CHAIN_ID: Number(import.meta.env.VITE_BASE_CHAIN_ID),
  RPC_URL: import.meta.env.VITE_BASE_RPC_URL,
});

const getArbitrumOneConfig = () => ({
  CHAIN_ID: Number(import.meta.env.VITE_ARBITRUM_ONE_CHAIN_ID),
  RPC_URL: import.meta.env.VITE_ARBITRUM_ONE_RPC_URL,
});

export const PROD_NETWORK: NetworkConfigs = {
  [SupportedChains["Base"]]: getBaseConfig(),
  [SupportedChains["Arbitrum One"]]: getArbitrumOneConfig(),
} as const;

export const DEV_NETWORK: NetworkConfigs = {
  [SupportedChains["Base"]]: getBaseConfig(),
  [SupportedChains["Arbitrum One"]]: getArbitrumOneConfig(),
} as const;

export const MENU_ITEMS: MenuMap = {
  [SupportedChains["Base"]]: [
    {
      id: 1,
      name: "Trading",
      url: "/trading",
      isExternal: false,
      isNew: false,
      isDisabled: false,
      mobileIcon: MobileIconTrading,
      mobileIconSelected: MobileIconTradingSelected,
      isMobileDisabled: false,
    }, 
    {
      id: 2,
      name: "Pools",
      url: "/pools",
      isExternal: false,
      isNew: false,
      isDisabled: false,
      mobileIcon: MobileIconPools,
      mobileIconSelected: MobileIconPoolsSelected,
      isMobileDisabled: false,
    },
    {
      id: 3,
      name: "Rewards",
      url: "/rewards",
      isExternal: false,
      isNew: false,
      isDisabled: true,
      mobileIcon: MobileIconRewards,
      mobileIconSelected: MobileIconRewardsSelected,
      isMobileDisabled: true,
    },
    {
      id: 4,
      name: "Dashboard",
      url: "/dashboard",
      isExternal: true,
      isNew: false,
      isDisabled: true,
      mobileIcon: MobileIconRewards,
      mobileIconSelected: MobileIconRewardsSelected,
      isMobileDisabled: false,
    },
  ],
  [SupportedChains["Arbitrum One"]]: [
    {
      id: 1,
      name: "Trading",
      url: "/trading",
      isExternal: false,
      isNew: false,
      isDisabled: false,
      mobileIcon: MobileIconTrading,
      mobileIconSelected: MobileIconTradingSelected,
      isMobileDisabled: false,
    },
    {
      id: 2,
      name: "Pools",
      url: "/pools",
      isExternal: false,
      isNew: false,
      isDisabled: false,
      mobileIcon: MobileIconPools,
      mobileIconSelected: MobileIconPoolsSelected,
      isMobileDisabled: false,
    },
    {
      id: 3,
      name: "Rewards",
      url: "/rewards",
      isExternal: false,
      isNew: false,
      isDisabled: true,
      mobileIcon: MobileIconRewards,
      mobileIconSelected: MobileIconRewardsSelected,
      isMobileDisabled: true,
    },
    {
      id: 4,
      name: "Dashboard",
      url: "/dashboard",
      isExternal: true,
      isNew: false,
      isDisabled: true,
      mobileIcon: MobileIconRewards,
      mobileIconSelected: MobileIconRewardsSelected,
      isMobileDisabled: false,
    },
  ]  
};

export const DASHBOARD_URL = {
  [SupportedChains["Base"]]: "",
  [SupportedChains["Arbitrum One"]]: "",
};

export const OLP_TERM: OlpTermMap = {
  [SupportedChains["Base"]]: {
    SHORT: 90,
    MID: 180,
  },
  [SupportedChains["Arbitrum One"]]: {
    SHORT: 90,
    MID: 180,
  },
};

export const VAULT_CREATED_AT = {
  [SupportedChains["Base"]]: {
    [CONTRACT_ADDRESSES[SupportedChains["Base"]].S_VAULT]: "30 Jan 2026",
  },
  [SupportedChains["Arbitrum One"]]: {
    [CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].S_VAULT]: "",
  },
};

export const CUSTOM_CSS: CustomCssMap = {
  [SupportedChains["Base"]]: {
    logoSrc: LogoArb,
    walletLogoSrc: LogoArbWallet,
    dropdownIconSrc: IconChainDropdownWhite,
    backgroundClass: "bg-[url('@assets/bg-arb.svg')] hover:bg-[url('@assets/bg-arb-hovered.svg')]",
    outlineClass: "rounded-[4px]",

    walletLogoForMobileSrc: LogoArbForMobile,
    walletActiveLogoForMobileSrc: LogoArbActiveForMobile,
    backgroundClassForMobile: "bg-[#2c4d7a]",
    backgroundLineForMobile: "bg-text opacity-10",
    outlineClassForMobile: "border-[1px] border-solid border-[#1C3023]",
  },
  [SupportedChains["Arbitrum One"]]: {
    logoSrc: LogoArb,
    walletLogoSrc: LogoArbWallet,
    dropdownIconSrc: IconChainDropdownBlack,
    backgroundClass: "bg-[url('@assets/bg-arb.svg')] hover:bg-[url('@assets/bg-arb-hovered.svg')]",
    outlineClass: "border-[1px] border-solid border-[rgba(255,198,113,.4)] rounded-[10px]",

    walletLogoForMobileSrc: LogoArbForMobile,
    walletActiveLogoForMobileSrc: LogoArbActiveForMobile,
    backgroundClassForMobile: "bg-[#f47226]",
    backgroundLineForMobile: "bg-[#F7931A66]",
    outlineClassForMobile: "border-[1px] border-solid border-[#FFC67166]",
  },
};

export const SOCIALS: SocialMap = {
  [SupportedChains["Base"]]: [
    {
      id: 1,
      name: "Docs",
      url: CALLPUT_DOCS_URL,
      iconSrc: IconSocialDocs,
      iconSrcSelected: IconSocialDocsSelected,
      isDisabled: false,
    },
    {
      id: 2,
      name: "X",
      url: CALLPUT_X_URL,
      iconSrc: IconSocialX,
      iconSrcSelected: IconSocialXSelected,
      isDisabled: false,
    },
    {
      id: 3,
      name: "Telegram",
      url: CALLPUT_TELEGRAM_URL,
      iconSrc: IconSocialTelegram,
      iconSrcSelected: IconSocialTelegramSelected,
      isDisabled: false,
    },
    {
      id: 4,
      name: "Discord",
      url: CALLPUT_DISCORD_URL,
      iconSrc: IconSocialDiscord,
      iconSrcSelected: IconSocialDiscordSelected,
      isDisabled: false,
    },
  ],  
  [SupportedChains["Arbitrum One"]]: [
    {
      id: 1,
      name: "Docs",
      url: CALLPUT_DOCS_URL,
      iconSrc: IconSocialDocs,
      iconSrcSelected: IconSocialDocsSelected,
      isDisabled: false,
    },
    {
      id: 2,
      name: "X",
      url: CALLPUT_X_URL,
      iconSrc: IconSocialX,
      iconSrcSelected: IconSocialXSelected,
      isDisabled: false,
    },
    {
      id: 3,
      name: "Telegram",
      url: CALLPUT_TELEGRAM_URL,
      iconSrc: IconSocialTelegram,
      iconSrcSelected: IconSocialTelegramSelected,
      isDisabled: false,
    },
    {
      id: 4,
      name: "Discord",
      url: CALLPUT_DISCORD_URL,
      iconSrc: IconSocialDiscord,
      iconSrcSelected: IconSocialDiscordSelected,
      isDisabled: false,
    },
  ],
};
