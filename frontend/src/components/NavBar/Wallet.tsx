import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect, useSwitchChain } from "wagmi";
import { twJoin } from "tailwind-merge";
import AddReferralButton from "./AddReferralButton";
import Account from "./Account";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import ToggleChain from "./ToggleChain";
import GuideButton from "../Common/GuideButton";
import { SupportedChains } from "@callput/shared";
import {
  getChainIdFromNetworkConfigs,
  getNetworkConfigs,
  getRpcUrlFromNetworkConfigs,
  isSupportedChain,
} from "@/networks/helpers";
import { NetworkState } from "@/networks/types";
import { setSelectedChain } from "@/store/slices/NetworkSlice";

function Wallet() {
  const dispatch = useAppDispatch();
  const { chain: currentChain } = useAppSelector(
    (state) => state.network
  ) as NetworkState;

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const { disconnect, isSuccess } = useDisconnect();
        const { switchChainAsync } = useSwitchChain();

        const [isForceDisconncted, setIsForceDisconnected] =
          useState<boolean>(false);

        const handleSwitchNetwork = async (
          networkState: NetworkState
        ): Promise<void> => {
          if (!account) {
            dispatch(setSelectedChain(networkState));
            return;
          }

          if (isSupportedChain(networkState.chain)) {
            try {
              const result = await switchChainAsync({
                chainId: networkState.chainId,
              });
              if (result) {
                dispatch(setSelectedChain(networkState));
              }
            } catch (error) {
              console.error("Failed to switch network:", error);
              throw error; // rethrow the error so the caller can handle it
            }
          }
        };

        useEffect(() => {
          if (isForceDisconncted) {
            setIsForceDisconnected(false);
            openConnectModal();
            return;
          }

          if (!account || !chain) return;

          const metamaskChain = chain.name as SupportedChains;
          const isMetamaskChainSupported = isSupportedChain(metamaskChain);

          // Case 1. The chain connected to the metamask is not supported
          if (!isMetamaskChainSupported) {
            // get the list of supported chains
            const networkConfigs = getNetworkConfigs();
            const supportedChains = Object.keys(
              networkConfigs
            ) as SupportedChains[];

            if (supportedChains.length > 0) {
              // try to switch to the first supported chain
              const targetChain = supportedChains[0];
              handleSwitchNetwork({
                chain: targetChain,
                chainId: getChainIdFromNetworkConfigs(targetChain),
                rpcUrl: getRpcUrlFromNetworkConfigs(targetChain),
              }).catch(() => {
                // if the switch fails, disconnect
                setIsForceDisconnected(true);
                disconnect();
              });
            } else {
              // if there are no supported chains, disconnect
              setIsForceDisconnected(true);
              disconnect();
            }
            return;
          }

          // Case 2. The chain from redux and the chain from metamask are different and the chain from metamask is supported
          if (metamaskChain !== currentChain && isMetamaskChainSupported) {
            dispatch(
              setSelectedChain({
                chain: metamaskChain,
                chainId: getChainIdFromNetworkConfigs(metamaskChain),
                rpcUrl: getRpcUrlFromNetworkConfigs(metamaskChain),
              })
            );
            return;
          }
        }, [chain, account, currentChain]);

        return (
          <div
            className="overflow-visible"
            {...(!mounted && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              return (
                <div className="flex flex-row items-center gap-[12px]">
                  <div className="w-[1px] h-[28px] mx-[4px] bg-black2023" />
                  {account && <AddReferralButton disabled={true} />}
                  <GuideButton />
                  <div className="w-[1px] h-[28px] mx-[4px] bg-black2023" />
                  {/* <ToggleChain chain={currentChain} handleSwitchNetwork={handleSwitchNetwork} /> */}
                  {account ? (
                    <Account />
                  ) : (
                    <button
                      className={twJoin(
                        "w-fit h-[40px] min-w-fit px-[16px] py-[8px] rounded-[6px] bg-blue278e",
                        "cursor-pointer flex flex-row justify-center items-center",
                        "text-whitef2f2 text-[16px] font-[600] leading-[24px]",
                        "active:opacity-80 active:scale-95"
                      )}
                      onClick={openConnectModal}
                      type="button"
                    >
                      Connect Wallet
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

export default Wallet;
