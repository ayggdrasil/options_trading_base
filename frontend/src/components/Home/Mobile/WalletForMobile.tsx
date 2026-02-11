import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect, useSwitchChain } from "wagmi";
import { twJoin } from "tailwind-merge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import AccountForMobile from "./AccountForMobile";
import { SupportedChains } from "@callput/shared";
import { getChainIdFromNetworkConfigs, getRpcUrlFromNetworkConfigs, isSupportedChain } from "@/networks/helpers";
import { NetworkState } from "@/networks/types";
import { setSelectedChain } from "@/store/slices/NetworkSlice";

function WalletForMobile() {
  const dispatch = useAppDispatch();
  const { chain: currentChain } = useAppSelector(state => state.network) as NetworkState;

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const { disconnect } = useDisconnect();
        const { switchChainAsync } = useSwitchChain();

        const [isForceDisconncted, setIsForceDisconnected] =
          useState<boolean>(false);

        const handleSwitchNetwork = async (networkState: NetworkState) => {
          if (!account) return dispatch(setSelectedChain(networkState));

          if (isSupportedChain(networkState.chain)) {
            try {
              const result = await switchChainAsync({
                chainId: networkState.chainId,
              });
              if (result) dispatch(setSelectedChain(networkState));
            } catch (error) {
              console.error("Failed to switch network:", error);
              disconnect();
            }
          }
        };

        useEffect(() => {
          if (isForceDisconncted) {
            setIsForceDisconnected(false);
            openConnectModal();
            return;
          }

          if (!account) return;

          // Case 1. Wallet connected, but chain is unsupported
          if (
            account &&
            !isSupportedChain(chain?.name as SupportedChains)
          ) {
            setIsForceDisconnected(true);
            return disconnect();
          }

          // Case 2. When chain from redux and chain from rainbowkit are different
          if (chain?.name !== currentChain) {
            dispatch(
              setSelectedChain({
                chain: chain?.name as SupportedChains,
                chainId: getChainIdFromNetworkConfigs(chain?.name as SupportedChains),
                rpcUrl: getRpcUrlFromNetworkConfigs(chain?.name as SupportedChains),
              })
            )
            return;
          }
        }, [chain]);

        return (
          <div
            className={
              !mounted ? "opacity-0 pointer-events-none select-none" : ""
            }
            aria-hidden={!mounted}
          >
            {(() => {
              return (
                <div className="flex items-center gap-x-[6px] md:gap-2">
                  {account ? (
                    <AccountForMobile />
                  ) : (
                    <div
                      className={twJoin(
                        "p-2 md:px-3 rounded",
                        "text-[14px] md:text-[16px] leading-[24px] font-bold",
                        "text-greene6 bg-[rgba(240,235,229,0.1)]"
                      )}
                    >
                      <button onClick={openConnectModal} type="button">
                        Connect
                      </button>
                    </div>
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

export default WalletForMobile;
