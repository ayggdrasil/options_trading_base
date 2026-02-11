import React from "react";

import { twJoin, twMerge } from "tailwind-merge";

import LogoArbSelected from '@assets/chains/icon-arb-sel.svg';
import LogoArbUnselected from "@assets/chains/icon-arb-unsel.svg";
import { getChainIdFromNetworkConfigs, getNetworkConfigs, getRpcUrlFromNetworkConfigs } from "@/networks/helpers";
import { SupportedChains } from "@callput/shared";
import { NetworkState } from "@/networks/types";


interface ToggleChainProps {
  chain: SupportedChains;
  handleSwitchNetwork: (networkState: NetworkState) => void;
}

const TOGGLE_CHAIN_SUPPORTED_NETWORK_CLASS: any = {
  [SupportedChains["Base"]]: {
    logoSrc: LogoArbUnselected,
    selectedLogoSrc: LogoArbSelected,
    className: "bg-transparent",
    selectedClassName: "bg-[#2C4D7A]",
  },
  [SupportedChains["Arbitrum One"]]: {
    logoSrc: LogoArbUnselected,
    selectedLogoSrc: LogoArbSelected,
    className: "bg-transparent",
    selectedClassName: "bg-[#F47226]",
  },
}

const ToggleChain: React.FC<ToggleChainProps> = ({ chain, handleSwitchNetwork }) => {
  const networkConfigs = getNetworkConfigs();

  return (
    <div className="relative">
      <div
        className={twJoin(
          "flex items-center",
          "bg-black29 p-[4px] rounded-[4px]",
          "w-[68px] h-[36px] mr-[12px] justify-between",
        )}
      >
        {(Object.keys(networkConfigs)).map((networkName) => {

          const isSelected = chain === networkName

          return (
            <button
              key={networkName}
              className={twMerge(
                twJoin(
                  "cursor-pointer flex flex-row items-center justify-center",
                  "w-[28px] h-[28px]",
                  "text-whitee0",
                  "active:bg-black1f active:opacity-80 active:scale-95",
                  "rounded-[4px]",
                  !isSelected && "hover:bg-white/10",
                ),
                isSelected 
                  ? TOGGLE_CHAIN_SUPPORTED_NETWORK_CLASS[networkName as SupportedChains].selectedClassName
                  : TOGGLE_CHAIN_SUPPORTED_NETWORK_CLASS[networkName as SupportedChains].className,
              )}
              type="submit"
              onClick={() => {
                handleSwitchNetwork({
                  chain: networkName as SupportedChains,
                  chainId: getChainIdFromNetworkConfigs(networkName as SupportedChains),
                  rpcUrl: getRpcUrlFromNetworkConfigs(networkName as SupportedChains),
                });
              }}
            >
              <img
                src={isSelected 
                    ? TOGGLE_CHAIN_SUPPORTED_NETWORK_CLASS[networkName as SupportedChains].selectedLogoSrc
                    : TOGGLE_CHAIN_SUPPORTED_NETWORK_CLASS[networkName as SupportedChains].logoSrc
                }
                className="w-[20px] h-[20px]"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ToggleChain;