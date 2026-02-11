import { SupportedChains } from "@callput/shared";
import { MainStableAsset, NetworkQuoteAsset, UnderlyingAsset, UnderlyingAssetWithAll } from "@callput/shared";

export type NetworkConfig = {
  CHAIN_ID: number;
  RPC_URL: string; 
}

export type NetworkConfigs = {
  [key in SupportedChains]?: NetworkConfig;
};

export type NetworkState = {
  chain: SupportedChains;
  chainId: number;
  rpcUrl: string;
};

export type MenuMap = {
  [key in SupportedChains]: {
    id: number;
    name: string;
    url: string;
    isExternal: boolean;
    isNew: boolean;
    isDisabled: boolean;
    mobileIcon: string;
    mobileIconSelected: string;
    isMobileDisabled: boolean;
  }[];
};

export type OlpTermMap = {
  [key in SupportedChains]: {
    SHORT: number;
    MID: number;
  };
};

export type CustomCssMap = {
  [key in SupportedChains]: {
    logoSrc: string;
    walletLogoSrc: string;
    dropdownIconSrc: string;
    backgroundClass: string;
    outlineClass: string;
    walletLogoForMobileSrc?: string;
    walletActiveLogoForMobileSrc?: string;
    backgroundClassForMobile?: string;
    backgroundLineForMobile?: string;
    outlineClassForMobile?: string;
  };
};

export type SocialMap = {
  [key in SupportedChains]: {
    id: number;
    name: string;
    url: string;
    iconSrc: string;
    iconSrcSelected: string;
    isDisabled: boolean;
  }[];
};

/*
 * Asset
 */

export type AssetInfoItem = {
  name: string;
  symbol: string;
  src: string;
  offSrc?: string;
  color?: string;
};

/*
 * Underlying Asset
 */

export type UAInfo = {
  [K in SupportedChains]: {
    [A in UnderlyingAsset]: AssetInfoItem;
  };
};

export type UAInfoWithAll = {
  [K in SupportedChains]: {
    [A in UnderlyingAssetWithAll]: AssetInfoItem;
  };
};

export type UATickerToNumberMap = {
  [K in SupportedChains]: {
    [A in UnderlyingAsset]: number;
  };
};

export type UATickerToStringMap = {
  [K in SupportedChains]: {
    [A in UnderlyingAsset]: string;
  };
};

export type UATickerToQATickerMap = {
  [K in SupportedChains]: {
    [A in UnderlyingAsset]: keyof (typeof NetworkQuoteAsset)[K];
  };
};

export type UAIndexToStringMap = {
  [key in SupportedChains]: {
    [key: number]: UnderlyingAsset;
  };
};

/*
 * Quote Asset
 */

export type QAInfo = {
  [K in SupportedChains]: {
    [A in keyof (typeof NetworkQuoteAsset)[K]]: AssetInfoItem;
  };
};

export type QATickerToNumberMap = {
  [K in SupportedChains]: {
    [A in keyof (typeof NetworkQuoteAsset)[K]]: number;
  };
};

export type QATickerToStringMap = {
  [K in SupportedChains]: {
    [A in keyof (typeof NetworkQuoteAsset)[K]]: string;
  };
};

export type QAAddressToTickerMap = {
  [K in SupportedChains]: {
    [address: string]: keyof (typeof NetworkQuoteAsset)[K];
  };
};

/*
 * Main Stable Asset
 */

export type MSAInfo = {
  [K in SupportedChains]: {
    [A in MainStableAsset]: AssetInfoItem;
  };
};

export type MSATickerToNumberMap = {
  [K in SupportedChains]: {
    [A in MainStableAsset]: number;
  };
};
