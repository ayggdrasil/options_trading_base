import { VaultIndexToNameMap, VaultIndexToStringMap } from "../types/vault";
import { SupportedChains } from "./networks";
import { CONTRACT_ADDRESSES } from "./addresses";

export const VAULT_INDEX_TO_ADDRESS: VaultIndexToStringMap = {
  [SupportedChains["Base"]]: {
    [0]: CONTRACT_ADDRESSES["Base"].S_VAULT,
    [1]: CONTRACT_ADDRESSES["Base"].M_VAULT,
    [2]: CONTRACT_ADDRESSES["Base"].L_VAULT,
  },
  [SupportedChains["Arbitrum One"]]: {
    [0]: CONTRACT_ADDRESSES["Arbitrum One"].S_VAULT,
    [1]: CONTRACT_ADDRESSES["Arbitrum One"].M_VAULT,
    [2]: CONTRACT_ADDRESSES["Arbitrum One"].L_VAULT,
  },
};

export const VAULT_INDEX_TO_NAME: VaultIndexToNameMap = {
  [SupportedChains["Base"]]: {
    [0]: "sVault",
    [1]: "mVault",
    [2]: "lVault",
  },
  [SupportedChains["Arbitrum One"]]: {
    [0]: "sVault",
    [1]: "mVault",
    [2]: "lVault",
  },
};
