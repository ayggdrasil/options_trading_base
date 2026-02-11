import { getRpcUrlFromNetworkConfigs } from "@/networks/helpers";
import { SupportedChains } from "@callput/shared";
import { Chain, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { bitgetWallet, coinbaseWallet, okxWallet, rabbyWallet, rainbowWallet, walletConnectWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { http, Transport } from "viem";
import { createConfig } from "wagmi";
import { base, arbitrum } from 'wagmi/chains'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet, okxWallet, rabbyWallet, coinbaseWallet, bitgetWallet],
    },
  ],
  {
    appName: 'Moby',
    projectId: 'a10b8f6a7c2339ea7e308213d4910173',
  }
);

const chains = [base, arbitrum] as const;
const transports: Record<number, Transport> = {
  [base.id]: http(getRpcUrlFromNetworkConfigs(SupportedChains["Base"])),
  [arbitrum.id]: http(getRpcUrlFromNetworkConfigs(SupportedChains["Arbitrum One"])),
};

export const config = createConfig({
  connectors,
  chains: chains as readonly [Chain, ...Chain[]],
  transports: transports
})
