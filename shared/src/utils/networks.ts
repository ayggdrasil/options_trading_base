import { BlockExplorers, ChainMetadata, ChainNames, RpcUrls } from "../constants/networks.js";

export function getChainInfo(chainId: number) {
  const chainName = ChainNames[chainId];
  if (!chainName) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return {
    id: chainId,
    name: chainName,
    rpcUrl: RpcUrls[chainName],
    blockExplorer: BlockExplorers[chainName],
    ...ChainMetadata[chainName],
  };
}