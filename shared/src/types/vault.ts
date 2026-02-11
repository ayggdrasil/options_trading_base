import { SupportedChains } from "../constants/networks";
import { VaultIndex } from "../types/assets";

export type VaultIndexToStringMap = {
  [K in SupportedChains]: {
    [A in VaultIndex]: string;
  };
};

export type VaultIndexToNameMap = {
  [K in SupportedChains]: {
    [A in VaultIndex]: VaultName;
  };
};

export type VaultName = "sVault" | "mVault" | "lVault";
