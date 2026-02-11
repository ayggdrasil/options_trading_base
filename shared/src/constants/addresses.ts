import { SupportedChains } from "./networks";
import baseAddresses from "../latestAddress.base.json";
import arbitrumOneAddresses from "../latestAddress.arbitrumOne.json";

export const CONTRACT_ADDRESSES = {
  [SupportedChains.Base]: {
    ...baseAddresses,
    WNAT: baseAddresses.WETH,
  },
  [SupportedChains["Arbitrum One"]]: {
    ...arbitrumOneAddresses,
    WNAT: arbitrumOneAddresses.WETH,
  },
} as const;
