import { CONTRACT_ADDRESSES } from "./addresses";
import {
  QAAddressToTickerMap,
  UATickerToQATickerMap,
  UATickerToStringMap,
  UATickerToNumberMap,
  UAIndexToStringMap,
  QATickerToNumberMap,
  QATickerToStringMap,
  MSATickerToNumberMap,
  QAInfo,
  UAInfo,
  MSAInfo,
  UAInfoWithAll,
} from "./types";
import { zeroAddress } from "viem";
import {
  MainStableAsset,
  NetworkQuoteAsset,
  SupportedChains,
  UnderlyingAsset,
  UnderlyingAssetWithAll,
} from "@callput/shared";

import IconSymbolBtcOn from "../assets/img/symbol/btc-on.png";
import IconSymbolBtcOff from "../assets/img/symbol/btc-off.png";
import IconSymbolEthOn from "../assets/img/symbol/eth-on.png";
import IconSymbolEthOff from "../assets/img/symbol/eth-off.png";

import IconSymbolUsdc from "../assets/icon-symbol-usdc.svg";
import IconSymbolTotal from "../assets/mobile/icon-symbol-total.svg";

import IconSymbolSOlp from "../assets/icon-symbol-solp.svg";
import IconSymbolMOlp from "../assets/icon-symbol-molp.svg";
import IconSymbolLOlp from "../assets/icon-symbol-lolp.svg";
import { OlpKey } from "../utils/enums";

/*
 * Underlying Asset
 */

export const UA_INFO: UAInfo = {
  [SupportedChains["Base"]]: {
    [UnderlyingAsset.BTC]: {
      name: "Bitcoin",
      symbol: "BTC",
      src: IconSymbolBtcOn,
      offSrc: IconSymbolBtcOff,
      color: "#F7931A",
    },
    [UnderlyingAsset.ETH]: {
      name: "Ethereum",
      symbol: "ETH",
      src: IconSymbolEthOn,
      offSrc: IconSymbolEthOff,
      color: "#7B8DE8",
    },
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]: {
      name: "Bitcoin",
      symbol: "BTC",
      src: IconSymbolBtcOn,
      offSrc: IconSymbolBtcOff,
      color: "#F7931A",
    },
    [UnderlyingAsset.ETH]: {
      name: "Ethereum",
      symbol: "ETH",
      src: IconSymbolEthOn,
      offSrc: IconSymbolEthOff,
      color: "#7B8DE8",
    },
  },
};

export const UA_INFO_WITH_ALL: UAInfoWithAll = {
  [SupportedChains["Base"]]: {
    [UnderlyingAssetWithAll.ALL]: {
      name: "All Assets",
      symbol: "ALL",
      src: IconSymbolTotal,
      color: "#F0EBE5",
    },
    [UnderlyingAssetWithAll.BTC]: {
      name: "Bitcoin",
      symbol: "BTC",
      src: IconSymbolBtcOn,
      color: "#F7931A",
    },
    [UnderlyingAssetWithAll.ETH]: {
      name: "Ethereum",
      symbol: "ETH",
      src: IconSymbolEthOn,
      color: "#7B8DE8",
    },
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAssetWithAll.ALL]: {
      name: "All Assets",
      symbol: "ALL",
      src: IconSymbolTotal,
      color: "#F0EBE5",
    },
    [UnderlyingAssetWithAll.BTC]: {
      name: "Bitcoin",
      symbol: "BTC",
      src: IconSymbolBtcOn,
      color: "#F7931A",
    },
    [UnderlyingAssetWithAll.ETH]: {
      name: "Ethereum",
      symbol: "ETH",
      src: IconSymbolEthOn,
      color: "#7B8DE8",
    },
  },
};

export const UA_TICKER_TO_ADDRESS: UATickerToStringMap = {
  [SupportedChains["Base"]]: {
    [UnderlyingAsset.BTC]: CONTRACT_ADDRESSES[SupportedChains["Base"]].WBTC,
    [UnderlyingAsset.ETH]: CONTRACT_ADDRESSES[SupportedChains["Base"]].WETH,
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]:
      CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].WBTC,
    [UnderlyingAsset.ETH]:
      CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].WETH,
  },
};

export const UA_TICKER_TO_INDEX: UATickerToNumberMap = {
  [SupportedChains["Base"]]: {
    [UnderlyingAsset.BTC]: 1,
    [UnderlyingAsset.ETH]: 2,
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]: 1,
    [UnderlyingAsset.ETH]: 2,
  },
};

export const UA_TICKER_TO_DECIMAL: UATickerToNumberMap = {
  [SupportedChains["Base"]]: {
    [UnderlyingAsset.BTC]: 8,
    [UnderlyingAsset.ETH]: 18,
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]: 8,
    [UnderlyingAsset.ETH]: 18,
  },
};

export const UA_TICKER_TO_OPTIONS_TOKEN: UATickerToStringMap = {
  [SupportedChains["Base"]]: {
    [UnderlyingAsset.BTC]:
      CONTRACT_ADDRESSES[SupportedChains["Base"]].BTC_OPTIONS_TOKEN,
    [UnderlyingAsset.ETH]:
      CONTRACT_ADDRESSES[SupportedChains["Base"]].ETH_OPTIONS_TOKEN,
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]:
      CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].BTC_OPTIONS_TOKEN,
    [UnderlyingAsset.ETH]:
      CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].ETH_OPTIONS_TOKEN,
  },
};

export const UA_TICKER_TO_QA_TICKER: UATickerToQATickerMap = {
  [SupportedChains["Base"]]: {
    [UnderlyingAsset.BTC]: NetworkQuoteAsset["Base"].WBTC,
    [UnderlyingAsset.ETH]: NetworkQuoteAsset["Base"].WETH,
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]: NetworkQuoteAsset["Arbitrum One"].WBTC,
    [UnderlyingAsset.ETH]: NetworkQuoteAsset["Arbitrum One"].WETH,
  },
};

export const UA_TICKER_TO_MAX_OPEN_SIZE_FOR_VANILLA: UATickerToNumberMap = {
  [SupportedChains["Base"]]: {
    [UnderlyingAsset.BTC]: 10,
    [UnderlyingAsset.ETH]: 200,
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]: 10,
    [UnderlyingAsset.ETH]: 200,
  },
};

export const UA_TICKER_TO_MAX_OPEN_SIZE_FOR_SPREAD: UATickerToNumberMap = {
  [SupportedChains["Base"]]: {
    [UnderlyingAsset.BTC]: 200,
    [UnderlyingAsset.ETH]: 5000,
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]: 200,
    [UnderlyingAsset.ETH]: 5000,
  },
};

export const UA_TICKER_TO_TICKER_INTERVAL: UATickerToNumberMap = {
  [SupportedChains["Base"]]: {
    [UnderlyingAsset.BTC]: 50,
    [UnderlyingAsset.ETH]: 1,
  },
  [SupportedChains["Arbitrum One"]]: {
    [UnderlyingAsset.BTC]: 50,
    [UnderlyingAsset.ETH]: 1,
  },
};

export const UA_INDEX_TO_TICKER: UAIndexToStringMap = {
  [SupportedChains["Base"]]: {
    1: UnderlyingAsset.BTC,
    2: UnderlyingAsset.ETH,
  },
  [SupportedChains["Arbitrum One"]]: {
    1: UnderlyingAsset.BTC,
    2: UnderlyingAsset.ETH,
  },
};

/*
 * Quote Asset
 */

export const QA_INFO: QAInfo = {
  [SupportedChains["Base"]]: {
    [NetworkQuoteAsset["Base"].ETH]: {
      name: "Ethereum",
      symbol: "ETH",
      src: IconSymbolEthOn,
    },
    [NetworkQuoteAsset["Base"].WBTC]: {
      name: "Wrapped BTC",
      symbol: "WBTC",
      src: IconSymbolBtcOn,
    },
    [NetworkQuoteAsset["Base"].WETH]: {
      name: "Wrapped ETH",
      symbol: "WETH",
      src: IconSymbolEthOn,
    },
    [NetworkQuoteAsset["Base"].USDC]: {
      name: "USD Coin",
      symbol: "USDC",
      src: IconSymbolUsdc,
    },
  },
  [SupportedChains["Arbitrum One"]]: {
    [NetworkQuoteAsset["Arbitrum One"].ETH]: {
      name: "Ethereum",
      symbol: "ETH",
      src: IconSymbolEthOn,
    },
    [NetworkQuoteAsset["Arbitrum One"].WBTC]: {
      name: "Wrapped BTC",
      symbol: "WBTC",
      src: IconSymbolBtcOn,
    },
    [NetworkQuoteAsset["Arbitrum One"].WETH]: {
      name: "Wrapped ETH",
      symbol: "WETH",
      src: IconSymbolEthOn,
    },
    [NetworkQuoteAsset["Arbitrum One"].USDC]: {
      name: "USD Coin",
      symbol: "USDC",
      src: IconSymbolUsdc,
    },
  },
};

export const QA_LIST = {
  [SupportedChains["Base"]]: [
    NetworkQuoteAsset["Base"].ETH,
    NetworkQuoteAsset["Base"].WBTC,
    NetworkQuoteAsset["Base"].WETH,
    NetworkQuoteAsset["Base"].USDC,
  ],
  [SupportedChains["Arbitrum One"]]: [
    NetworkQuoteAsset["Arbitrum One"].ETH,
    NetworkQuoteAsset["Arbitrum One"].WBTC,
    NetworkQuoteAsset["Arbitrum One"].WETH,
    NetworkQuoteAsset["Arbitrum One"].USDC,
  ],
};

export const QA_TICKER_TO_ADDRESS: QATickerToStringMap = {
  [SupportedChains["Base"]]: {
    [NetworkQuoteAsset["Base"].ETH]: zeroAddress,
    [NetworkQuoteAsset["Base"].WBTC]:
      CONTRACT_ADDRESSES[SupportedChains["Base"]].WBTC,
    [NetworkQuoteAsset["Base"].WETH]:
      CONTRACT_ADDRESSES[SupportedChains["Base"]].WETH,
    [NetworkQuoteAsset["Base"].USDC]:
      CONTRACT_ADDRESSES[SupportedChains["Base"]].USDC,
  },
  [SupportedChains["Arbitrum One"]]: {
    [NetworkQuoteAsset["Arbitrum One"].ETH]: zeroAddress,
    [NetworkQuoteAsset["Arbitrum One"].WBTC]:
      CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].WBTC,
    [NetworkQuoteAsset["Arbitrum One"].WETH]:
      CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].WETH,
    [NetworkQuoteAsset["Arbitrum One"].USDC]:
      CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].USDC,
  },
};

export const QA_TICKER_TO_DECIMAL: QATickerToNumberMap = {
  [SupportedChains["Base"]]: {
    [NetworkQuoteAsset["Base"].ETH]: 18,
    [NetworkQuoteAsset["Base"].WBTC]: 8,
    [NetworkQuoteAsset["Base"].WETH]: 18,
    [NetworkQuoteAsset["Base"].USDC]: 6,
  },
  [SupportedChains["Arbitrum One"]]: {
    [NetworkQuoteAsset["Arbitrum One"].ETH]: 18,
    [NetworkQuoteAsset["Arbitrum One"].WBTC]: 8,
    [NetworkQuoteAsset["Arbitrum One"].WETH]: 18,
    [NetworkQuoteAsset["Arbitrum One"].USDC]: 6,
  },
};

export const QA_TICKER_TO_IMG: QATickerToStringMap = {
  [SupportedChains["Base"]]: {
    [NetworkQuoteAsset["Base"].ETH]: IconSymbolEthOn,
    [NetworkQuoteAsset["Base"].WBTC]: IconSymbolBtcOn,
    [NetworkQuoteAsset["Base"].WETH]: IconSymbolEthOn,
    [NetworkQuoteAsset["Base"].USDC]: IconSymbolUsdc,
  },
  [SupportedChains["Arbitrum One"]]: {
    [NetworkQuoteAsset["Arbitrum One"].ETH]: IconSymbolEthOn,
    [NetworkQuoteAsset["Arbitrum One"].WBTC]: IconSymbolBtcOn,
    [NetworkQuoteAsset["Arbitrum One"].WETH]: IconSymbolEthOn,
    [NetworkQuoteAsset["Arbitrum One"].USDC]: IconSymbolUsdc,
  },
};

export const QA_TICKER_TO_NAME: QATickerToStringMap = {
  [SupportedChains["Base"]]: {
    [NetworkQuoteAsset["Base"].ETH]: "Ethereum",
    [NetworkQuoteAsset["Base"].WBTC]: "Wrapped BTC",
    [NetworkQuoteAsset["Base"].WETH]: "Wrapped ETH",
    [NetworkQuoteAsset["Base"].USDC]: "USD Coin",
  },
  [SupportedChains["Arbitrum One"]]: {
    [NetworkQuoteAsset["Arbitrum One"].ETH]: "Ethereum",
    [NetworkQuoteAsset["Arbitrum One"].WBTC]: "Wrapped BTC",
    [NetworkQuoteAsset["Arbitrum One"].WETH]: "Wrapped ETH",
    [NetworkQuoteAsset["Arbitrum One"].USDC]: "USD Coin",
  },
};

export const QA_ADDRESS_TO_TICKER: QAAddressToTickerMap = {
  [SupportedChains["Base"]]: {
    [zeroAddress]: NetworkQuoteAsset["Base"].ETH,
    [CONTRACT_ADDRESSES[SupportedChains["Base"]].WBTC]:
      NetworkQuoteAsset["Base"].WBTC,
    [CONTRACT_ADDRESSES[SupportedChains["Base"]].WETH]:
      NetworkQuoteAsset["Base"].WETH,
    [CONTRACT_ADDRESSES[SupportedChains["Base"]].USDC]:
      NetworkQuoteAsset["Base"].USDC,
  },
  [SupportedChains["Arbitrum One"]]: {
    [zeroAddress]: NetworkQuoteAsset["Arbitrum One"].ETH,
    [CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].WBTC]:
      NetworkQuoteAsset["Arbitrum One"].WBTC,
    [CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].WETH]:
      NetworkQuoteAsset["Arbitrum One"].WETH,
    [CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].USDC]:
      NetworkQuoteAsset["Arbitrum One"].USDC,
  },
};

/*
 * Main Stable Asset
 */

export const MSA_INFO: MSAInfo = {
  [SupportedChains["Base"]]: {
    [MainStableAsset.USDC]: {
      name: "USD Coin",
      symbol: "USDC",
      src: IconSymbolUsdc,
    },
  },
  [SupportedChains["Arbitrum One"]]: {
    [MainStableAsset.USDC]: {
      name: "USD Coin",
      symbol: "USDC",
      src: IconSymbolUsdc,
    },
  },
};

export const MSA_TICKER_TO_DECIMAL: MSATickerToNumberMap = {
  [SupportedChains["Base"]]: {
    [MainStableAsset.USDC]: 6,
  },
  [SupportedChains["Arbitrum One"]]: {
    [MainStableAsset.USDC]: 6,
  },
};

/*
 * Option Liquidity Pool
 */

export const OLP_INFO = {
  [SupportedChains["Base"]]: {
    [OlpKey.sOlp]: {
      name: "OLP",
      symbol: "OLP",
      src: IconSymbolSOlp,
      term: "",
    },
    [OlpKey.mOlp]: {
      name: "Mid-Term OLP",
      symbol: "mOLP",
      src: IconSymbolMOlp,
      term: "Mid-Term",
    },
    [OlpKey.lOlp]: {
      name: "Long-Term OLP",
      symbol: "lOLP",
      src: IconSymbolLOlp,
      term: "Long-Term",
    },
  },
  [SupportedChains["Arbitrum One"]]: {
    [OlpKey.sOlp]: {
      name: "OLP",
      symbol: "OLP",
      src: IconSymbolSOlp,
      term: "",
    },
    [OlpKey.mOlp]: {
      name: "Mid-Term OLP",
      symbol: "mOLP",
      src: IconSymbolMOlp,
      term: "Mid-Term",
    },
    [OlpKey.lOlp]: {
      name: "Long-Term OLP",
      symbol: "lOLP",
      src: IconSymbolLOlp,
      term: "Long-Term",
    },
  },
};

export const OLP_MANAGER_ADDRESSES = {
  [SupportedChains["Base"]]: {
    [OlpKey.sOlp]: CONTRACT_ADDRESSES[SupportedChains["Base"]].S_OLP_MANAGER,
    [OlpKey.mOlp]: CONTRACT_ADDRESSES[SupportedChains["Base"]].M_OLP_MANAGER,
    [OlpKey.lOlp]: CONTRACT_ADDRESSES[SupportedChains["Base"]].L_OLP_MANAGER,
  },
  [SupportedChains["Arbitrum One"]]: {
    [OlpKey.sOlp]:
      CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].S_OLP_MANAGER,
    [OlpKey.mOlp]:
      CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].M_OLP_MANAGER,
    [OlpKey.lOlp]:
      CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].L_OLP_MANAGER,
  },
};

export const REWARD_ROUTER_V2_ADDRESSES = {
  [SupportedChains["Base"]]: {
    [OlpKey.sOlp]: CONTRACT_ADDRESSES[SupportedChains["Base"]].S_REWARD_ROUTER_V2,
    [OlpKey.mOlp]: CONTRACT_ADDRESSES[SupportedChains["Base"]].M_REWARD_ROUTER_V2,
    [OlpKey.lOlp]: CONTRACT_ADDRESSES[SupportedChains["Base"]].L_REWARD_ROUTER_V2,
  },
  [SupportedChains["Arbitrum One"]]: {
    [OlpKey.sOlp]: CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].S_REWARD_ROUTER_V2,
    [OlpKey.mOlp]: CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].M_REWARD_ROUTER_V2,
    [OlpKey.lOlp]: CONTRACT_ADDRESSES[SupportedChains["Arbitrum One"]].L_REWARD_ROUTER_V2,
  },
};
