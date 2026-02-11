import { SupportedChains } from "@callput/shared";

export const BaseOlpAsset = {
  // WBTC: "WBTC",
  // WETH: "WETH",
  USDC: "USDC",
} as const;

export const NetworkOlpAsset = {
  [SupportedChains["Base"]]: {
    ...BaseOlpAsset,
  },
  [SupportedChains["Arbitrum One"]]: {
    ...BaseOlpAsset,
  },
};

export type BaseOlpAsset = keyof typeof BaseOlpAsset;
export type NetworkOlpAsset<T extends SupportedChains> =
  keyof (typeof NetworkOlpAsset)[T];
