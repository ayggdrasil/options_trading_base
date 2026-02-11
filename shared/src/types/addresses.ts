import { SupportedChains } from "src/constants/networks";
import { CONTRACT_ADDRESSES } from "../constants/addresses";

export type ContractAddressesMap = typeof CONTRACT_ADDRESSES;
export type ContractAddresses = ContractAddressesMap[SupportedChains];
