import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { NetworkConfigs, NetworkState } from "@/networks/types";
import { SupportedChains } from "@callput/shared";
import { getChainIdFromNetworkConfigs, getNetworkConfigs, getRpcUrlFromNetworkConfigs } from "@/networks/helpers";

const networkConfigs: NetworkConfigs = getNetworkConfigs();

export const loadNetworkStateFromLocalStorage = (): NetworkState => {
  const storedChain = localStorage.getItem("callput:selectedChain") as SupportedChains;

  if (storedChain && networkConfigs && Object.keys(networkConfigs).includes(storedChain)) {
    return {
      chain: storedChain,
      chainId: getChainIdFromNetworkConfigs(storedChain),
      rpcUrl: getRpcUrlFromNetworkConfigs(storedChain),
    };
  }

  const defaultChain = Object.keys(networkConfigs)[0] as SupportedChains;

  return {
    chain: defaultChain,
    chainId: getChainIdFromNetworkConfigs(defaultChain),
    rpcUrl: getRpcUrlFromNetworkConfigs(defaultChain),
  };
};

const setChainToLocalStorage = (chain: SupportedChains) => {
  localStorage.setItem("callput:selectedChain", chain);
};

const removeChainFromLocalStorage = () => {
  localStorage.removeItem("callput:selectedChain");
};

const initialState: NetworkState = loadNetworkStateFromLocalStorage();

const networkSlice = createSlice({
  name: "network",
  initialState: initialState,
  reducers: {
    setSelectedChain: (state, action: PayloadAction<NetworkState>) => {
      setChainToLocalStorage(action.payload.chain);
      return action.payload;
    },
    removeSelectedChain: (state) => {
      removeChainFromLocalStorage();
      const defaultChain = Object.keys(networkConfigs)[0] as SupportedChains;
      return {
        chain: defaultChain,
        chainId: getChainIdFromNetworkConfigs(defaultChain),
        rpcUrl: getRpcUrlFromNetworkConfigs(defaultChain),
      };
    },
  },
});

export const { setSelectedChain, removeSelectedChain } = networkSlice.actions;

export default networkSlice.reducer;
