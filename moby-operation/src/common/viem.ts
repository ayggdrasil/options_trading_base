// src/common/viem.ts
import {
  Address,
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { Chain } from "./enum";
import { CONTRACT_ADDRESS } from "./address";

import OlpManagerAbi from "../abis/OlpManagerAbi.json";
import ReferralAbi from "../abis/ReferralAbi.json";

class ViemService {
  private static instance: ViemService | null = null;
  private readonly publicClient;
  private readonly walletClient;
  private readonly chain: Chain;

  private constructor(config: { deployerKey: string; rpcUrl: string; chain: Chain }) {
    const deployer = privateKeyToAccount(`0x${config.deployerKey}`);

    this.publicClient = createPublicClient({
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: deployer,
      transport: http(config.rpcUrl),
      chain: arbitrum,
    });

    this.chain = config.chain;
  }

  static initialize() {
    if (this.instance) return this.instance;

    const deployerKey = process.env.DEPLOYER_KEY;
    const rpcUrl = process.env.RPC_URL;
    const chain = process.env.CHAIN as Chain;

    if (!deployerKey || !rpcUrl || !chain) {
      throw new Error("Required environment variables are missing");
    }

    this.instance = new ViemService({
      deployerKey,
      rpcUrl,
      chain,
    });

    return this.instance;
  }

  static getInstance() {
    if (!this.instance) {
      throw new Error("ViemService not initialized");
    }
    return this.instance;
  }

  getClients() {
    return {
      publicClient: this.getPublicClient(),
      walletClient: this.getWalletClient(),
    };
  }

  getPublicClient() {
    return this.publicClient;
  }

  getWalletClient() {
    return this.walletClient;
  }

  getChain(): Chain {
    if (!this.chain) throw new Error("Chain not initialized");
    return this.chain;
  }

  getContract<T extends any>({ address, abi }: { address: `0x${string}`; abi: any }) {
    return getContract({
      address,
      abi,
      client: {
        public: this.getPublicClient(),
        wallet: this.getWalletClient(),
      },
    });
  }

  getOlpManagerContract() {
    return this.getContract({
      address: CONTRACT_ADDRESS[this.getChain()].S_OLP_MANAGER as `0x${string}`,
      abi: OlpManagerAbi,
    });
  }

  getReferralContract() {
    return this.getContract({
      address: CONTRACT_ADDRESS[this.getChain()].REFERRAL as `0x${string}`,
      abi: ReferralAbi,
    });
  }
}

export const viem = {
  initialize: ViemService.initialize.bind(ViemService),
  getInstance: ViemService.getInstance.bind(ViemService),
};
