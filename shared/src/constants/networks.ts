export const SupportedChains = {
  "Base": "Base",
  "Arbitrum One": "Arbitrum One",
} as const;
export type SupportedChains = keyof typeof SupportedChains;

export const ChainIds: { [key in SupportedChains]: number } = {
  [SupportedChains.Base]: 8453,
  [SupportedChains["Arbitrum One"]]: 42161,
} as const;

export const ChainNames: { [key: number]: SupportedChains } = {
  8453: SupportedChains.Base,
  42161: SupportedChains["Arbitrum One"],
} as const;

export const RpcUrls: { [key in SupportedChains]: string } = {
  [SupportedChains.Base]: "",
  [SupportedChains["Arbitrum One"]]: "",
} as const;

export const BlockExplorers: { [key in SupportedChains]: string } = {
  [SupportedChains.Base]: "",
  [SupportedChains["Arbitrum One"]]: "",
} as const;

export const ChainMetadata: { [key in SupportedChains]: { chainName: string; nativeCurrency: { name: string; symbol: string; decimals: number; }; iconUrl?: string; } } = {
  [SupportedChains.Base]: {
    chainName: "Base",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    iconUrl: "",
  },
  [SupportedChains["Arbitrum One"]]: {
    chainName: "Arbitrum One",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    iconUrl: "",
  },
} as const;
