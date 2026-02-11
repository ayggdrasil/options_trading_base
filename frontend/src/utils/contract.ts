import BigNumber from "bignumber.js";

import { ethers } from "ethers";
import { IOlpMetrics } from "@/interfaces/interfaces.appSlice";
import { settlePosition } from "@/store/slices/PositionsSlice";
import { Abi, parseEther, decodeEventLog } from "viem";
import {
  multicall,
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { EXECUTION_FEE, OLP_KEYS, ZERO_KEY } from "./constants";
import { addToastMessage, removeToastMessage } from "./toast";
import { pendingTx, pendingTxInfo, startPolling } from "./pendingTx";
import { config } from "@/store/wagmi";
import {
  IControllerAllowance,
  IPoolAllowance,
  IUserBalance,
} from "@/interfaces/interfaces.userSlice";
import {
  NewPosition,
  SettlePosition,
} from "@/interfaces/interfaces.positionSlice";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { OlpKey } from "./enums";
import store from "@/store/store";
import PositionManagerAbi from "../../../shared/abis/PositionManager.json";
import SettleManagerAbi from "../../../shared/abis/SettleManager.json";
import ERC20Abi from "../../../shared/abis/ERC20.json";
import ERC1155Abi from "../../../shared/abis/ERC1155.json";
import VaultAbi from "../../../shared/abis/Vault.json";
import VaultUtilsAbi from "../../../shared/abis/VaultUtils.json";
import UsdgAbi from "../../../shared/abis/USDG.json";
import OlpAbi from "../../../shared/abis/OLP.json";
import OlpManagerAbi from "../../../shared/abis/OlpManager.json";
import OlpQueueAbi from "../../../shared/abis/OlpQueue.json";
import RewardTrackerAbi from "../../../shared/abis/RewardTracker.json";
import RewardRouterV2Abi from "../../../shared/abis/RewardRouterV2.json";
import ReferralAbi from "../../../shared/abis/Referral.json";
import { ContractAddresses, SupportedChains } from "@callput/shared";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import {
  getChainIdFromNetworkConfigs,
  getRpcUrlFromNetworkConfigs,
  getUnderlyingAssetIndexByTicker,
} from "@/networks/helpers";
import { BN, NetworkQuoteAsset, UnderlyingAsset } from "@callput/shared";
import {
  QA_TICKER_TO_ADDRESS,
  QA_TICKER_TO_DECIMAL,
  UA_TICKER_TO_ADDRESS,
  UA_TICKER_TO_DECIMAL,
} from "@/networks/assets";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export interface IArgsForCreateOpenPosition {
  userAddress: string;
  underlyingAssetIndex: number;
  length: string;
  isBuys: boolean[];
  optionIds: string[];
  isCalls: boolean[];
  minSize: string;
  path: string[];
  amountIn: string;
  minOutWhenSwap: string;
  leadTrader: string;
  txInfo: NewPosition;
}

const MAX_SUBSTRING_LENGTH = 180;

export function getContractAddress<T extends keyof ContractAddresses>(
  contractName: T,
  chain: SupportedChains
): `0x${string}`;

export function getContractAddress(
  contractName: string,
  chain: SupportedChains
): `0x${string}` {
  const address =
    CONTRACT_ADDRESSES[chain][
      contractName as keyof (typeof CONTRACT_ADDRESSES)[typeof chain]
    ];
  return address as `0x${string}`;
}

const makeRequestTransaction = async ({
  isOpen,
  functionName,
  args,
  value,
  txInfo,
  chain,
}: {
  isOpen: boolean;
  functionName: string;
  args: any[];
  value: bigint;
  txInfo: NewPosition;
  chain: SupportedChains;
}) => {
  const defaultId = Date.now().toString();

  try {
    const { request } = await simulateContract(config, {
      abi: PositionManagerAbi as Abi,
      address: getContractAddress("POSITION_MANAGER", chain),
      functionName,
      args,
      value: value,
    });

    const hash = await writeContract(config, request);

    addToastMessage({
      id: defaultId,
      type: "loading",
      title: "Your order is being submitted...",
      message: "",
      duration: 60 * 1000,
    });

    const transactionReceipt = await waitForTransactionReceipt(config, {
      hash,
    });

    const targetAddresses = Object.values(CONTRACT_ADDRESSES)
      .map((networkAddresses: any) =>
        networkAddresses.POSITION_MANAGER?.toLowerCase()
      )
      .filter((address) => address);

    const targetTopic =
      "0xd829e644f4628ea23643d25cad533269af97d942cfa01b92b5cea1769b99600a";

    let requestKey;

    for (const log of transactionReceipt.logs) {
      if (
        targetAddresses.includes(log.address?.toLowerCase()) &&
        log.topics[0]?.toLowerCase() === targetTopic.toLowerCase()
      ) {
        requestKey = log.topics[2] as any;
      }
    }

    if (transactionReceipt.status === "success") {
      if (!requestKey) {
        removeToastMessage(defaultId);
        addToastMessage({
          id: defaultId,
          type: "error",
          title: "An error occurred while updating information",
          message: "Please check your order status again in a short while.",
          duration: 3 * 1000,
        });

        return false;
      }

      const newPendingTx: [string, string, boolean, SupportedChains] = [
        requestKey,
        defaultId,
        isOpen,
        chain,
      ];
      pendingTx.push(newPendingTx);

      const newPendingTxInfo: [string, NewPosition, SupportedChains] = [
        requestKey,
        txInfo,
        chain,
      ];
      pendingTxInfo.push(newPendingTxInfo);

      startPolling();

      return true;
    }

    removeToastMessage(defaultId);
    addToastMessage({
      id: defaultId,
      type: "error",
      title: "Your order is not submitted.",
      message: "Please try again later.",
      duration: 3 * 1000,
    });

    return false;
  } catch (unknownError) {
    removeToastMessage(defaultId);

    const error = unknownError as any; // Type casting the unknown error as an Error
    console.error(error);

    const errorMessage =
      String(error.message).substring(0, MAX_SUBSTRING_LENGTH) + "...";

    if (error.message.includes("Connector not found")) {
      addToastMessage({
        id: defaultId,
        type: "error",
        title: "Wallet not found. Please check your wallet condition.",
        message: errorMessage,
        duration: 3 * 1000,
      });
    } else if (error.message.includes("User rejected the request")) {
      addToastMessage({
        id: defaultId,
        type: "error",
        title: "You denied transaction signature.",
        message: errorMessage,
        duration: 3 * 1000,
      });
    } else {
      addToastMessage({
        id: defaultId,
        type: "error",
        title: "Your submission failed due to an error.",
        message: errorMessage,
        duration: 5 * 1000,
      });
    }

    return false;
  }
};

export const makeTransaction = async ({
  address,
  abi,
  functionName,
  args,
  value,
  successMessage,
  returnReceipt,
}: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: any[];
  value: bigint;
  returnReceipt?: boolean;
  successMessage?: { title: string; message: string; duration?: number };
}) => {
  const defaultId = Date.now().toString();

  try {
    const { request } = await simulateContract(config, {
      abi: abi,
      address: address,
      functionName: functionName,
      args: args,
      value: value,
    });

    const hash = await writeContract(config, request);

    addToastMessage({
      id: defaultId,
      type: "loading",
      title: "Your transaction is being processed...",
      message: "",
      duration: 60 * 1000,
    });

    const transactionReceipt = await waitForTransactionReceipt(config, {
      hash,
    });

    removeToastMessage(defaultId);

    if (transactionReceipt.status === "success") {
      addToastMessage({
        id: defaultId,
        type: "success",
        title:
          successMessage?.title ||
          "Your transaction is processed successfully.",
        message: successMessage?.message || "",
        duration: successMessage?.duration || 3 * 1000,
      });

      return returnReceipt ? transactionReceipt : true;
    }

    addToastMessage({
      id: defaultId,
      type: "error",
      title: "Your transaction is not processed.",
      message: "Please try again later.",
      duration: 3 * 1000,
    });

    return false;
  } catch (unknownError) {
    removeToastMessage(defaultId);

    const error = unknownError as any; // Broadly catching, then we'll narrow down
    console.error(error);
    console.error(error.message);

    const errorMessage =
      String(error.message).substring(0, MAX_SUBSTRING_LENGTH) + "...";

    if (error.message.includes("Connector not found")) {
      addToastMessage({
        id: defaultId,
        type: "error",
        title: "Wallet not found. Please check your wallet condition.",
        message: errorMessage,
        duration: 3 * 1000,
      });
    } else if (error.message.includes("User rejected the request")) {
      addToastMessage({
        id: defaultId,
        type: "error",
        title: "You denied transaction signature.",
        message: errorMessage,
        duration: 3 * 1000,
      });
    } else {
      addToastMessage({
        id: defaultId,
        type: "error",
        title: "Transaction failed due to an error.",
        message: errorMessage,
        duration: 5 * 1000,
      });
    }

    return false;
  }
};

const wbtcContract = (chain: SupportedChains) => {
  return {
    address: getContractAddress("WBTC", chain),
    abi: ERC20Abi as Abi,
  };
};

const wethContract = (chain: SupportedChains) => {
  return {
    address: getContractAddress("WETH", chain),
    abi: ERC20Abi as Abi,
  };
};

const usdcContract = (chain: SupportedChains) => {
  return {
    address: getContractAddress("USDC", chain),
    abi: ERC20Abi as Abi,
  };
};

const referralContract = (chain: SupportedChains) => {
  return {
    address: getContractAddress("REFERRAL", chain),
    abi: ReferralAbi as Abi,
  };
};

const vaultContract = (olpKey: OlpKey, chain: SupportedChains) => {
  if (olpKey === OlpKey.sOlp)
    return {
      address: getContractAddress("S_VAULT", chain),
      abi: VaultAbi as Abi,
    };

  if (olpKey === OlpKey.mOlp)
    return {
      address: getContractAddress("M_VAULT", chain),
      abi: VaultAbi as Abi,
    };

  if (olpKey === OlpKey.lOlp)
    return {
      address: getContractAddress("L_VAULT", chain),
      abi: VaultAbi as Abi,
    };

  throw new Error("Invalid olpKey");
};

const vaultUtilsContract = (olpKey: OlpKey, chain: SupportedChains) => {
  if (olpKey === OlpKey.sOlp)
    return {
      address: getContractAddress("S_VAULT_UTILS", chain),
      abi: VaultUtilsAbi as Abi,
    };

  if (olpKey === OlpKey.mOlp)
    return {
      address: getContractAddress("M_VAULT_UTILS", chain),
      abi: VaultUtilsAbi as Abi,
    };

  if (olpKey === OlpKey.lOlp)
    return {
      address: getContractAddress("L_VAULT_UTILS", chain),
      abi: VaultUtilsAbi as Abi,
    };

  throw new Error("Invalid olpKey");
};

const olpContract = (olpKey: OlpKey, chain: SupportedChains) => {
  if (olpKey === OlpKey.sOlp)
    return {
      address: getContractAddress("S_OLP", chain),
      abi: OlpAbi as Abi,
    };

  if (olpKey === OlpKey.mOlp)
    return {
      address: getContractAddress("M_OLP", chain),
      abi: OlpAbi as Abi,
    };

  if (olpKey === OlpKey.lOlp)
    return {
      address: getContractAddress("L_OLP", chain),
      abi: OlpAbi as Abi,
    };

  throw new Error("Invalid olpKey");
};

const olpManagerContract = (olpKey: OlpKey, chain: SupportedChains) => {
  if (olpKey === OlpKey.sOlp)
    return {
      address: getContractAddress("S_OLP_MANAGER", chain),
      abi: OlpManagerAbi as Abi,
    };

  if (olpKey === OlpKey.mOlp)
    return {
      address: getContractAddress("M_OLP_MANAGER", chain),
      abi: OlpManagerAbi as Abi,
    };

  if (olpKey === OlpKey.lOlp)
    return {
      address: getContractAddress("L_OLP_MANAGER", chain),
      abi: OlpManagerAbi as Abi,
    };

  throw new Error("Invalid olpKey");
};

const usdgContract = (olpKey: OlpKey, chain: SupportedChains) => {
  if (olpKey === OlpKey.sOlp)
    return {
      address: getContractAddress("S_USDG", chain),
      abi: UsdgAbi as Abi,
    };

  if (olpKey === OlpKey.mOlp)
    return {
      address: getContractAddress("M_USDG", chain),
      abi: UsdgAbi as Abi,
    };

  if (olpKey === OlpKey.lOlp)
    return {
      address: getContractAddress("L_USDG", chain),
      abi: UsdgAbi as Abi,
    };

  throw new Error("Invalid olpKey");
};

const rewardTrackerContract = (olpKey: OlpKey, chain: SupportedChains) => {
  if (olpKey === OlpKey.sOlp)
    return {
      address: getContractAddress("S_REWARD_TRACKER", chain),
      abi: RewardTrackerAbi as Abi,
    };

  if (olpKey === OlpKey.mOlp)
    return {
      address: getContractAddress("M_REWARD_TRACKER", chain),
      abi: RewardTrackerAbi as Abi,
    };

  if (olpKey === OlpKey.lOlp)
    return {
      address: getContractAddress("L_REWARD_TRACKER", chain),
      abi: RewardTrackerAbi as Abi,
    };

  throw new Error("Invalid olpKey");
};

const rewardRouterContract = (olpKey: OlpKey, chain: SupportedChains) => {
  if (olpKey === OlpKey.sOlp)
    return {
      address: getContractAddress("S_REWARD_ROUTER_V2", chain),
      abi: RewardRouterV2Abi as Abi,
    };

  if (olpKey === OlpKey.mOlp)
    return {
      address: getContractAddress("M_REWARD_ROUTER_V2", chain),
      abi: RewardRouterV2Abi as Abi,
    };

  if (olpKey === OlpKey.lOlp)
    return {
      address: getContractAddress("L_REWARD_ROUTER_V2", chain),
      abi: RewardRouterV2Abi as Abi,
    };

  throw new Error("Invalid olpKey");
};

const olpQueueContract = (olpKey: OlpKey, chain: SupportedChains) => {
  if (olpKey === OlpKey.sOlp)
    return {
      address: getContractAddress("S_OLP_QUEUE", chain),
      abi: OlpQueueAbi as Abi,
    };

  if (olpKey === OlpKey.mOlp)
    return {
      address: getContractAddress("M_OLP_QUEUE", chain),
      abi: OlpQueueAbi as Abi,
    };

  if (olpKey === OlpKey.lOlp)
    return {
      address: getContractAddress("L_OLP_QUEUE", chain),
      abi: OlpQueueAbi as Abi,
    };

  throw new Error("Invalid olpKey");
};

// Parse OLP Queue events from transaction receipt
export const parseOlpQueueEventFromReceipt = (
  receipt: any,
  olpKey: OlpKey,
  chain: SupportedChains,
  eventName: "EnqueuedMintAndStake" | "EnqueuedUnstakeAndRedeem"
): {
  queueIndex: string;
  olpQueueAddress: string;
  token: string;
  amount: string;
  receiver: string;
  isNative: boolean;
  blockTime: string;
} | null => {
  try {
    const olpQueue = olpQueueContract(olpKey, chain);
    const olpQueueAddress = olpQueue.address;

    // Find the event log
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== olpQueueAddress.toLowerCase()) {
        continue;
      }

      try {
        const decodedLog = decodeEventLog({
          abi: OlpQueueAbi as Abi,
          data: log.data,
          topics: log.topics,
        });

        if (decodedLog.eventName === eventName) {
          const args = decodedLog.args as any;

          return {
            queueIndex: args.index.toString(),
            olpQueueAddress: olpQueueAddress,
            token:
              eventName === "EnqueuedMintAndStake"
                ? args.token
                : args.tokenOut,
            amount:
              eventName === "EnqueuedMintAndStake"
                ? args.amount.toString()
                : args.olpAmount.toString(),
            receiver: args.receiver,
            isNative: args.isNative,
            blockTime: Math.floor(Date.now() / 1000).toString(),
          };
        }
      } catch (e) {
        // Skip logs that don't match
        continue;
      }
    }
  } catch (error) {
    console.error("Error parsing OLP queue event:", error);
  }

  return null;
};

export async function sendCreateOpenPosition<T extends SupportedChains>(
  chain: T,
  address: string,
  isBuy: boolean,
  underlyingAsset: UnderlyingAsset,
  expiry: number,
  length: string,
  mainOption: IOptionDetail,
  pairedOption: IOptionDetail,
  isCall: boolean,
  size: string,
  slippage: number,
  quoteAsset: keyof (typeof NetworkQuoteAsset)[T],
  quoteAssetAmount: string,
  leadTrader: string
) {
  const parsedSize = new BigNumber(size)
    .multipliedBy(10 ** UA_TICKER_TO_DECIMAL[chain][underlyingAsset])
    .toString();
  const minSize =
    slippage === 100
      ? new BigNumber(1).toString()
      : new BigNumber(parsedSize).multipliedBy(1 - slippage / 100).toFixed(0);

  const txInfo: NewPosition = {
    isOpen: true,
    underlyingAsset: underlyingAsset,
    underlyingAssetAddress: UA_TICKER_TO_ADDRESS[chain][underlyingAsset],
    expiry: expiry,
    optionTokenId: "",
    length,
    mainOptionStrikePrice: 0,
    pairedOptionStrikePrice: 0,
    isBuys: "",
    strikePrices: "",
    isCalls: "",
    optionNames: "",
    size: parsedSize,
    executionPrice: "0",
    openedToken: isBuy ? QA_TICKER_TO_ADDRESS[chain][quoteAsset] : "",
    openedAmount: isBuy
      ? new BN(quoteAssetAmount)
          .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][quoteAsset])
          .toString()
      : "0",
    openedCollateralToken: isBuy ? "" : QA_TICKER_TO_ADDRESS[chain][quoteAsset],
    openedCollateralAmount: isBuy
      ? "0"
      : new BN(quoteAssetAmount)
          .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][quoteAsset])
          .toString(),
    lastProcessBlockTime: "0",
  };

  const isBuys = getIsBuys(length, isBuy);
  const optionIds = getOptionIds(length, mainOption, pairedOption);
  const isCalls = getIsCalls(length, isCall);
  const isEth =
    "ETH" in NetworkQuoteAsset[chain] &&
    quoteAsset === NetworkQuoteAsset[chain].ETH;
  const path = getQuoteAssetPathForOpenPosition(
    chain,
    isBuy,
    isCall,
    underlyingAsset,
    length,
    quoteAsset
  );

  const args: IArgsForCreateOpenPosition = {
    userAddress: address,
    underlyingAssetIndex: getUnderlyingAssetIndexByTicker(
      chain,
      underlyingAsset
    ),
    length: length,
    isBuys: isBuys,
    optionIds: optionIds,
    isCalls: isCalls,
    minSize: minSize,
    path: path,
    amountIn: isEth
      ? new BigNumber(quoteAssetAmount).toString()
      : new BigNumber(quoteAssetAmount)
          .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][quoteAsset])
          .toFixed(0),
    minOutWhenSwap: new BigNumber(0).toString(),
    leadTrader: leadTrader,
    txInfo: txInfo,
  };

  const result = isEth
    ? await writeCreateOpenPositionETH(args, chain)
    : await writeCreateOpenPosition(args, chain);

  return result;
}

function getQuoteAssetPathForOpenPosition<T extends SupportedChains>(
  chain: T,
  isBuy: boolean,
  isCall: boolean,
  underlyingAsset: UnderlyingAsset,
  length: string,
  quoteAsset: keyof (typeof NetworkQuoteAsset)[T]
): string[] {
  if (
    "ETH" in NetworkQuoteAsset[chain] &&
    quoteAsset === NetworkQuoteAsset[chain].ETH
  ) {
    if (length === "1" && !isBuy && isCall) {
      // Vanilla Sell Call
      return [
        QA_TICKER_TO_ADDRESS[chain]["WETH"],
        UA_TICKER_TO_ADDRESS[chain][underlyingAsset],
      ];
    }
    return [
      QA_TICKER_TO_ADDRESS[chain]["WETH"],
      QA_TICKER_TO_ADDRESS[chain]["USDC"],
    ];
  }

  const quoteAssetAddress = QA_TICKER_TO_ADDRESS[chain][quoteAsset];
  let requiredQuoteAssetAddress: string;

  if (length === "1" && !isBuy && isCall) {
    // Vanilla Sell Call
    requiredQuoteAssetAddress = UA_TICKER_TO_ADDRESS[chain][underlyingAsset];
  } else {
    requiredQuoteAssetAddress = QA_TICKER_TO_ADDRESS[chain]["USDC"];
  }

  if (!quoteAssetAddress) throw new Error("Invalid quote asset address");

  if (
    quoteAssetAddress.toLowerCase() === requiredQuoteAssetAddress.toLowerCase()
  ) {
    return [quoteAssetAddress];
  } else {
    return [quoteAssetAddress, requiredQuoteAssetAddress];
  }
}

const getIsBuys = (length: string, isBuy: boolean) => {
  if (length === "1") {
    return [isBuy, false, false, false];
  } else if (length === "2") {
    return [isBuy, !isBuy, false, false];
  }

  return [];
};

const getOptionIds = (
  length: string,
  mainOption: IOptionDetail,
  pairedOption: IOptionDetail
) => {
  if (length === "1") {
    return [mainOption.optionId, ZERO_KEY, ZERO_KEY, ZERO_KEY];
  } else if (length === "2") {
    return [mainOption.optionId, pairedOption.optionId, ZERO_KEY, ZERO_KEY];
  }

  return [];
};

const getIsCalls = (length: string, isCall: boolean) => {
  if (length === "1") {
    return [isCall, false, false, false];
  } else if (length === "2") {
    return [isCall, isCall, false, false];
  }

  return [];
};

export const writeCreateOpenPosition = async (
  args: IArgsForCreateOpenPosition,
  chain: SupportedChains
) => {
  try {
    const result = await makeRequestTransaction({
      isOpen: true,
      functionName: "createOpenPosition",
      args: [
        args.underlyingAssetIndex,
        args.length,
        args.isBuys,
        args.optionIds,
        args.isCalls,
        args.minSize,
        args.path,
        args.amountIn,
        args.minOutWhenSwap,
        args.leadTrader,
      ],
      value: parseEther(EXECUTION_FEE),
      txInfo: args.txInfo,
      chain,
    });

    return result;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const writeCreateOpenPositionETH = async (
  args: IArgsForCreateOpenPosition,
  chain: SupportedChains
) => {
  const totalAmountIn = new BigNumber(args.amountIn)
    .plus(EXECUTION_FEE)
    .toString();

  try {
    const result = await makeRequestTransaction({
      isOpen: true,
      functionName: "createOpenPositionNAT",
      args: [
        args.underlyingAssetIndex,
        args.length,
        args.isBuys,
        args.optionIds,
        args.isCalls,
        args.minSize,
        args.path,
        args.minOutWhenSwap,
        args.leadTrader,
      ],
      value: parseEther(totalAmountIn),
      txInfo: args.txInfo,
      chain,
    });

    return result;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const writeCreateClosePosition = async (
  underlyingAssetIndex: number,
  optionTokenId: string,
  size: bigint,
  path: (string | undefined)[],
  minAmountOut: bigint,
  minOutWhenSwap: bigint,
  withdrawETH: boolean,
  txInfo: NewPosition,
  chain: SupportedChains
) => {
  try {
    const result = await makeRequestTransaction({
      isOpen: false,
      functionName: "createClosePosition",
      args: [
        underlyingAssetIndex,
        optionTokenId,
        size,
        path,
        minAmountOut,
        minOutWhenSwap,
        withdrawETH,
      ],
      value: parseEther(EXECUTION_FEE),
      txInfo: txInfo,
      chain,
    });

    return result;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const writeSettlePosition = async (
  path: (string | undefined)[],
  underlyingAssetIndex: number,
  optionTokenId: string,
  minOut: number,
  withdrawETH: boolean,
  txInfo: SettlePosition,
  chain: SupportedChains
) => {
  const defaultId = Date.now().toString();

  try {
    const { request } = await simulateContract(config, {
      abi: SettleManagerAbi as Abi,
      address: getContractAddress("SETTLE_MANAGER", chain),
      functionName: "settlePosition",
      args: [path, underlyingAssetIndex, optionTokenId, minOut, withdrawETH],
      value: parseEther("0"),
    });

    const hash = await writeContract(config, request);

    addToastMessage({
      id: defaultId,
      type: "loading",
      title: "Your order is being submitted...",
      message: "",
      duration: 60 * 1000,
    });

    const transactionReceipt = await waitForTransactionReceipt(config, {
      hash,
    });

    removeToastMessage(defaultId);

    if (transactionReceipt.status === "success") {
      addToastMessage({
        id: defaultId,
        type: "success",
        title: "Your position is settled successfully.",
        message: txInfo.mainOptionName,
        duration: 3 * 1000,
      });

      store.dispatch(settlePosition(txInfo));

      return true;
    }

    addToastMessage({
      id: defaultId,
      type: "error",
      title: "Your position is not settled.",
      message: "Please try again later.",
      duration: 3 * 1000,
    });

    return false;
  } catch (unknownError) {
    removeToastMessage(defaultId);

    const error = unknownError as any; // Broadly catching, then we'll narrow down
    console.error(error);

    const errorMessage =
      String(error.message).substring(0, MAX_SUBSTRING_LENGTH) + "...";

    if (error.message.includes("Connector not found")) {
      addToastMessage({
        id: defaultId,
        type: "error",
        title: "Wallet not found. Please check your wallet condition.",
        message: errorMessage,
        duration: 3000,
      });
    } else if (error.message.includes("User rejected the request")) {
      addToastMessage({
        id: defaultId,
        type: "error",
        title: "You denied transaction signature.",
        message: errorMessage,
        duration: 3 * 1000,
      });
    } else {
      addToastMessage({
        id: defaultId,
        type: "error",
        title: "Settle failed due to an error.",
        message: errorMessage,
        duration: 5 * 1000,
      });
    }

    return false;
  }
};

export const writeMintAndStakeOlp = async (
  olpKey: OlpKey,
  args: any[],
  chain: SupportedChains
) => {
  return await makeTransaction({
    ...rewardRouterContract(olpKey, chain),
    functionName: "mintAndStakeOlp",
    args: args,
    value: parseEther("0"),
  });
};

export const writeMintAndStakeOlpNAT = async (
  olpKey: OlpKey,
  args: any[],
  value: string,
  chain: SupportedChains
) => {
  return await makeTransaction({
    ...rewardRouterContract(olpKey, chain),
    functionName: "mintAndStakeOlpNAT",
    args: args,
    value: parseEther(value),
  });
};

export const writeSubmitMintAndStakeOlp = async (
  olpKey: OlpKey,
  args: any[],
  chain: SupportedChains,
  value: string = "0"
) => {
  return await makeTransaction({
    ...rewardRouterContract(olpKey, chain),
    functionName: "submitMintAndStakeOlp",
    args: args,
    value: parseEther(value),
    returnReceipt: true,
  });
};

export const writeUnstakeAndRedeemOlp = async (
  olpKey: OlpKey,
  args: any[],
  chain: SupportedChains
) => {
  return await makeTransaction({
    ...rewardRouterContract(olpKey, chain),
    functionName: "unstakeAndRedeemOlp",
    args: args,
    value: parseEther("0"),
  });
};

export const writeUnstakeAndRedeemOlpNAT = async (
  olpKey: OlpKey,
  args: any[],
  chain: SupportedChains
) => {
  return await makeTransaction({
    ...rewardRouterContract(olpKey, chain),
    functionName: "unstakeAndRedeemOlpNAT",
    args: args,
    value: parseEther("0"),
  });
};

export const writeSubmitUnstakeAndRedeemOlp = async (
  olpKey: OlpKey,
  args: any[],
  chain: SupportedChains
) => {
  return await makeTransaction({
    ...rewardRouterContract(olpKey, chain),
    functionName: "submitUnstakeAndRedeemOlp",
    args: args,
    value: parseEther("0"),
    returnReceipt: true,
  });
};

export const writeHandleRewards = async (
  olpKey: OlpKey,
  chain: SupportedChains
) => {
  return await makeTransaction({
    ...rewardRouterContract(olpKey, chain),
    functionName: "handleRewards",
    args: [true, false],
    value: parseEther("0"),
  });
};

export const writeCancelOlpQueue = async (
  olpKey: OlpKey,
  queueIndex: string,
  chain: SupportedChains
) => {
  return await makeTransaction({
    ...olpQueueContract(olpKey, chain),
    functionName: "cancel",
    args: [queueIndex, 0], // 0 = USER_CANCEL
    value: parseEther("0"),
  });
};

export const writeHandleAddReferral = async (
  address: string,
  chain: SupportedChains
) => {
  return await makeTransaction({
    ...referralContract(chain),
    functionName: "setParent",
    args: [address],
    value: parseEther("0"),
  });
};

export const writeApproveERC20 = async (
  tokenAddress: `0x${string}`,
  spender: string,
  amount: bigint
) => {
  return await makeTransaction({
    address: tokenAddress,
    abi: ERC20Abi as Abi,
    functionName: "approve",
    args: [spender, amount],
    value: parseEther("0"),
  });
};

export const write1155Transfer = async (
  tokenAddress: `0x${string}`,
  from: `0x${string}`,
  to: `0x${string}`,
  optionTokenId: any,
  amount: any
) => {
  return await makeTransaction({
    address: tokenAddress,
    abi: ERC1155Abi as Abi,
    functionName: "safeTransferFrom",
    args: [from, to, optionTokenId, amount, "0x"],
    value: parseEther("0"),
  });
};

export const getAllowanceForController = async (
  data: IControllerAllowance,
  address: string,
  chain: SupportedChains
) => {
  try {
    const contracts = [
      {
        ...wbtcContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("CONTROLLER", chain)],
      },
      {
        ...wethContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("CONTROLLER", chain)],
      },
      {
        ...usdcContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("CONTROLLER", chain)],
      },
    ];

    const response: any = await multicall(config, {
      chainId: getChainIdFromNetworkConfigs(chain),
      contracts: contracts,
    });

    data.quoteToken.wbtc =
      (response[0].result &&
        new BigNumber(String(response[0].result))
          .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["WBTC"])
          .toString()) ||
      "0";
    data.quoteToken.weth =
      (response[1].result &&
        new BigNumber(String(response[1].result))
          .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["WETH"])
          .toString()) ||
      "0";
    data.quoteToken.usdc =
      (response[2].result &&
        new BigNumber(String(response[2].result))
          .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["USDC"])
          .toString()) ||
      "0";
  } catch (error) {
    console.error(error);
  }

  return data;
};

export const getAllowanceForPool = async (
  data: IPoolAllowance,
  address: string,
  chain: SupportedChains
) => {
  try {
    const contracts = [
      {
        ...wbtcContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("S_REWARD_ROUTER_V2", chain)],
      },
      {
        ...wbtcContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("M_REWARD_ROUTER_V2", chain)],
      },
      {
        ...wbtcContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("L_REWARD_ROUTER_V2", chain)],
      },
      {
        ...wethContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("S_REWARD_ROUTER_V2", chain)],
      },
      {
        ...wethContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("M_REWARD_ROUTER_V2", chain)],
      },
      {
        ...wethContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("L_REWARD_ROUTER_V2", chain)],
      },
      {
        ...usdcContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("S_REWARD_ROUTER_V2", chain)],
      },
      {
        ...usdcContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("M_REWARD_ROUTER_V2", chain)],
      },
      {
        ...usdcContract(chain),
        functionName: "allowance",
        args: [address, getContractAddress("L_REWARD_ROUTER_V2", chain)],
      },
    ];

    const response: any = await multicall(config, {
      chainId: getChainIdFromNetworkConfigs(chain),
      contracts: contracts,
    });

    data.sOlpManager.wbtc =
      (response[0].result && response[0].result.toString()) || "0";
    data.mOlpManager.wbtc =
      (response[1].result && response[1].result.toString()) || "0";
    data.lOlpManager.wbtc =
      (response[2].result && response[2].result.toString()) || "0";
    data.sOlpManager.weth =
      (response[3].result && response[3].result.toString()) || "0";
    data.mOlpManager.weth =
      (response[4].result && response[4].result.toString()) || "0";
    data.lOlpManager.weth =
      (response[5].result && response[5].result.toString()) || "0";
    data.sOlpManager.usdc =
      (response[6].result && response[6].result.toString()) || "0";
    data.mOlpManager.usdc =
      (response[7].result && response[7].result.toString()) || "0";
    data.lOlpManager.usdc =
      (response[8].result && response[8].result.toString()) || "0";
  } catch (error) {
    console.error(error);
  }

  return data;
};

export const getUserBalance = async (
  data: IUserBalance,
  address: string,
  chain: SupportedChains
) => {
  try {
    const rpcUrl = getRpcUrlFromNetworkConfigs(chain);
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const nativeBalance = await provider.getBalance(address);

    const contracts = [
      {
        ...wbtcContract(chain),
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...wethContract(chain),
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...usdcContract(chain),
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...rewardTrackerContract(OlpKey.sOlp, chain),
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...rewardTrackerContract(OlpKey.mOlp, chain),
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...rewardTrackerContract(OlpKey.lOlp, chain),
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...rewardTrackerContract(OlpKey.sOlp, chain),
        functionName: "claimable",
        args: [address],
      },
      {
        ...rewardTrackerContract(OlpKey.mOlp, chain),
        functionName: "claimable",
        args: [address],
      },
      {
        ...rewardTrackerContract(OlpKey.lOlp, chain),
        functionName: "claimable",
        args: [address],
      },
      {
        ...olpManagerContract(OlpKey.sOlp, chain),
        functionName: "lastAddedAt",
        args: [address],
      },
      {
        ...olpManagerContract(OlpKey.sOlp, chain),
        functionName: "cooldownDuration",
        args: [],
      },
      {
        ...olpManagerContract(OlpKey.mOlp, chain),
        functionName: "lastAddedAt",
        args: [address],
      },
      {
        ...olpManagerContract(OlpKey.mOlp, chain),
        functionName: "cooldownDuration",
        args: [],
      },
      {
        ...olpManagerContract(OlpKey.lOlp, chain),
        functionName: "lastAddedAt",
        args: [address],
      },
      {
        ...olpManagerContract(OlpKey.lOlp, chain),
        functionName: "cooldownDuration",
        args: [],
      },
    ];

    const response: any = await multicall(config, {
      chainId: getChainIdFromNetworkConfigs(chain),
      contracts: contracts,
    });

    data.quoteAsset.WBTC =
      (response[0].result &&
        new BigNumber(String(response[0].result))
          .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["WBTC"])
          .toString()) ||
      "0";
    data.quoteAsset.WETH =
      (response[1].result &&
        new BigNumber(String(response[1].result))
          .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["WETH"])
          .toString()) ||
      "0";
    data.quoteAsset.USDC =
      (response[2].result &&
        new BigNumber(String(response[2].result))
          .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["USDC"])
          .toString()) ||
      "0";
    data.quoteToken.wbtc =
      (response[0].result &&
        new BigNumber(String(response[0].result))
          .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["WBTC"])
          .toString()) ||
      "0";
    data.quoteToken.weth =
      (response[1].result &&
        new BigNumber(String(response[1].result))
          .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["WETH"])
          .toString()) ||
      "0";
    data.quoteToken.usdc =
      (response[2].result &&
        new BigNumber(String(response[2].result))
          .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["USDC"])
          .toString()) ||
      "0";
    data.olpToken.sOlp =
      (response[3].result &&
        new BigNumber(String(response[3].result))
          .dividedBy(10 ** 18)
          .toString()) ||
      "0";
    data.olpToken.mOlp =
      (response[4].result &&
        new BigNumber(String(response[4].result))
          .dividedBy(10 ** 18)
          .toString()) ||
      "0";
    data.olpToken.lOlp =
      (response[5].result &&
        new BigNumber(String(response[5].result))
          .dividedBy(10 ** 18)
          .toString()) ||
      "0";

    data.claimableReward.sOlp =
      (response[6].result &&
        new BigNumber(String(response[6].result))
          .dividedBy(10 ** 18)
          .toString()) ||
      "0";
    data.claimableReward.mOlp =
      (response[7].result &&
        new BigNumber(String(response[7].result))
          .dividedBy(10 ** 18)
          .toString()) ||
      "0";
    data.claimableReward.lOlp =
      (response[8].result &&
        new BigNumber(String(response[8].result))
          .dividedBy(10 ** 18)
          .toString()) ||
      "0";

    const sOlpLastAddedAt =
      (response[9].result && response[9].result.toString()) || "0";
    const mOlpLastAddedAt =
      (response[11].result && response[11].result.toString()) || "0";
    const lOlpLastAddedAt =
      (response[13].result && response[13].result.toString()) || "0";

    const sOlpCooldownDuration =
      (response[10].result && response[10].result.toString()) || "0";
    const mOlpCooldownDuration =
      (response[12].result && response[12].result.toString()) || "0";
    const lOlpCooldownDuration =
      (response[14].result && response[14].result.toString()) || "0";

    data.cooldown.sOlp = new BigNumber(sOlpLastAddedAt)
      .plus(sOlpCooldownDuration)
      .toString();
    data.cooldown.mOlp = new BigNumber(mOlpLastAddedAt)
      .plus(mOlpCooldownDuration)
      .toString();
    data.cooldown.lOlp = new BigNumber(lOlpLastAddedAt)
      .plus(lOlpCooldownDuration)
      .toString();

    data.quoteAsset.ETH =
      (nativeBalance &&
        new BigNumber(String(nativeBalance))
          .dividedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["ETH"])
          .toString()) ||
      "0";
  } catch (error) {
    console.error(error);
  }

  return data;
};

export const getEpochStages = async (chain: SupportedChains) => {
  try {
    const contracts = [
      {
        ...rewardRouterContract(OlpKey.sOlp, chain),
        functionName: "epochStage",
        args: [],
      },
      {
        ...rewardRouterContract(OlpKey.mOlp, chain),
        functionName: "epochStage",
        args: [],
      },
      {
        ...rewardRouterContract(OlpKey.lOlp, chain),
        functionName: "epochStage",
        args: [],
      },
    ];

    const response: any = await multicall(config, {
      chainId: getChainIdFromNetworkConfigs(chain),
      contracts: contracts,
    });

    return {
      sOlp: (response[0].result !== undefined ? Number(response[0].result) : 0) as 0 | 1,
      mOlp: (response[1].result !== undefined ? Number(response[1].result) : 0) as 0 | 1,
      lOlp: (response[2].result !== undefined ? Number(response[2].result) : 0) as 0 | 1,
    };
  } catch (error) {
    console.error(error);
    return {
      sOlp: 0 as 0 | 1,
      mOlp: 0 as 0 | 1,
      lOlp: 0 as 0 | 1,
    };
  }
};

export const getOlpMetrics = async (
  data: IOlpMetrics,
  chain: SupportedChains
) => {
  try {
    for (let i = 0; i < OLP_KEYS.length; i++) {
      const contracts = [
        {
          ...vaultContract(OLP_KEYS[i], chain),
          functionName: "totalTokenWeights",
          args: [],
        },
        {
          ...vaultContract(OLP_KEYS[i], chain),
          functionName: "tokenWeights",
          args: [getContractAddress("WBTC", chain)],
        },
        {
          ...vaultContract(OLP_KEYS[i], chain),
          functionName: "tokenWeights",
          args: [getContractAddress("WETH", chain)],
        },
        {
          ...vaultContract(OLP_KEYS[i], chain),
          functionName: "tokenWeights",
          args: [getContractAddress("USDC", chain)],
        },
        {
          ...usdgContract(OLP_KEYS[i], chain),
          functionName: "totalSupply",
          args: [],
        },
        {
          ...vaultContract(OLP_KEYS[i], chain),
          functionName: "usdgAmounts",
          args: [getContractAddress("WBTC", chain)],
        },
        {
          ...vaultContract(OLP_KEYS[i], chain),
          functionName: "usdgAmounts",
          args: [getContractAddress("WETH", chain)],
        },
        {
          ...vaultContract(OLP_KEYS[i], chain),
          functionName: "usdgAmounts",
          args: [getContractAddress("USDC", chain)],
        },
        {
          ...vaultUtilsContract(OLP_KEYS[i], chain),
          functionName: "getBuyUsdgFeeBasisPoints",
          args: [getContractAddress("WBTC", chain), "1000000000000000000"],
        },
        {
          ...vaultUtilsContract(OLP_KEYS[i], chain),
          functionName: "getBuyUsdgFeeBasisPoints",
          args: [getContractAddress("WETH", chain), "1000000000000000000"],
        },
        {
          ...vaultUtilsContract(OLP_KEYS[i], chain),
          functionName: "getBuyUsdgFeeBasisPoints",
          args: [getContractAddress("USDC", chain), "1000000000000000000"],
        },
        {
          ...vaultUtilsContract(OLP_KEYS[i], chain),
          functionName: "getSellUsdgFeeBasisPoints",
          args: [getContractAddress("WBTC", chain), "1000000000000000000"],
        },
        {
          ...vaultUtilsContract(OLP_KEYS[i], chain),
          functionName: "getSellUsdgFeeBasisPoints",
          args: [getContractAddress("WETH", chain), "1000000000000000000"],
        },
        {
          ...vaultUtilsContract(OLP_KEYS[i], chain),
          functionName: "getSellUsdgFeeBasisPoints",
          args: [getContractAddress("USDC", chain), "1000000000000000000"],
        },
      ];

      const response: any = await multicall(config, {
        chainId: getChainIdFromNetworkConfigs(chain),
        contracts: contracts,
      });

      const totalTargetWeight =
        (response[0].result && response[0].result.toString()) || "0";
      const btcTargetWeight =
        (response[1].result && response[1].result.toString()) || "0";
      const ethTargetWeight =
        (response[2].result && response[2].result.toString()) || "0";
      const usdcTargetWeight =
        (response[3].result && response[3].result.toString()) || "0";

      const totalCurrentWeight =
        (response[4].result && response[4].result.toString()) || "0";
      const btcCurrentWeight =
        (response[5].result && response[5].result.toString()) || "0";
      const ethCurrentWeight =
        (response[6].result && response[6].result.toString()) || "0";
      const usdcCurrentWeight =
        (response[7].result && response[7].result.toString()) || "0";

      if (totalTargetWeight === "0") {
        data[OLP_KEYS[i]].targetWeight.wbtc = "0";
        data[OLP_KEYS[i]].targetWeight.weth = "0";
        data[OLP_KEYS[i]].targetWeight.usdc = "0";
      } else {
        data[OLP_KEYS[i]].targetWeight.wbtc = new BigNumber(btcTargetWeight)
          .div(totalTargetWeight)
          .multipliedBy(100)
          .toString();
        data[OLP_KEYS[i]].targetWeight.weth = new BigNumber(ethTargetWeight)
          .div(totalTargetWeight)
          .multipliedBy(100)
          .toString();
        data[OLP_KEYS[i]].targetWeight.usdc = new BigNumber(usdcTargetWeight)
          .div(totalTargetWeight)
          .multipliedBy(100)
          .toString();
      }

      if (totalCurrentWeight === "0") {
        data[OLP_KEYS[i]].currentWeight.wbtc = "0";
        data[OLP_KEYS[i]].currentWeight.weth = "0";
        data[OLP_KEYS[i]].currentWeight.usdc = "0";
      } else {
        data[OLP_KEYS[i]].currentWeight.wbtc = new BigNumber(btcCurrentWeight)
          .div(totalCurrentWeight)
          .multipliedBy(100)
          .toString();
        data[OLP_KEYS[i]].currentWeight.weth = new BigNumber(ethCurrentWeight)
          .div(totalCurrentWeight)
          .multipliedBy(100)
          .toString();
        data[OLP_KEYS[i]].currentWeight.usdc = new BigNumber(usdcCurrentWeight)
          .div(totalCurrentWeight)
          .multipliedBy(100)
          .toString();
      }

      data[OLP_KEYS[i]].buyUsdgFee.wbtc =
        (response[8].result && response[8].result.toString()) || "0";
      data[OLP_KEYS[i]].buyUsdgFee.weth =
        (response[9].result && response[9].result.toString()) || "0";
      data[OLP_KEYS[i]].buyUsdgFee.usdc =
        (response[10].result && response[10].result.toString()) || "0";

      data[OLP_KEYS[i]].sellUsdgFee.wbtc =
        (response[11].result && response[11].result.toString()) || "0";
      data[OLP_KEYS[i]].sellUsdgFee.weth =
        (response[12].result && response[12].result.toString()) || "0";
      data[OLP_KEYS[i]].sellUsdgFee.usdc =
        (response[13].result && response[13].result.toString()) || "0";
    }
  } catch (error) {
    console.error(error);
  }

  try {
    const contracts = [
      {
        ...olpManagerContract(OlpKey.sOlp, chain),
        functionName: "getPrice",
        args: [true],
      },
      {
        ...olpManagerContract(OlpKey.mOlp, chain),
        functionName: "getPrice",
        args: [true],
      },
      {
        ...olpManagerContract(OlpKey.lOlp, chain),
        functionName: "getPrice",
        args: [true],
      },
      {
        ...olpContract(OlpKey.sOlp, chain),
        functionName: "totalSupply",
        args: [],
      },
      {
        ...olpContract(OlpKey.mOlp, chain),
        functionName: "totalSupply",
        args: [],
      },
      {
        ...olpContract(OlpKey.lOlp, chain),
        functionName: "totalSupply",
        args: [],
      },
    ];

    const response: any = await multicall(config, {
      chainId: getChainIdFromNetworkConfigs(chain),
      contracts: contracts,
    });

    data.sOlp.price =
      (response[0].result && response[0].result.toString()) || "0";
    data.mOlp.price =
      (response[1].result && response[1].result.toString()) || "0";
    data.lOlp.price =
      (response[2].result && response[2].result.toString()) || "0";

    data.sOlp.totalSupply =
      (response[3].result && response[3].result.toString()) || "0";
    data.mOlp.totalSupply =
      (response[4].result && response[4].result.toString()) || "0";
    data.lOlp.totalSupply =
      (response[5].result && response[5].result.toString()) || "0";
  } catch (error) {
    console.error(error);
  }

  return data;
};

export const isPositionRequestExecuted = async (
  requestKey: string,
  isOpen: boolean,
  chain: SupportedChains
) => {
  const rpcUrl = getRpcUrlFromNetworkConfigs(chain);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const positionManager = new ethers.Contract(
    getContractAddress("POSITION_MANAGER", chain) as string,
    PositionManagerAbi,
    provider
  );

  let data = {
    status: "0",
    optionTokenId: "0",
    size: "0",
    executionPrice: "0",
    closedCollateralAmount: "0",
    lastProcessBlockTime: "0",
  };

  let positionRequest;
  if (isOpen) {
    positionRequest = await positionManager.openPositionRequests(requestKey);
  } else {
    positionRequest = await positionManager.closePositionRequests(requestKey);
  }

  if (Number(positionRequest[9]) === 2) {
    // executed
    data.status = "2";
    data.optionTokenId = new BigNumber(positionRequest[3]).toString();

    if (isOpen) {
      data.size = new BigNumber(positionRequest[10]).toString();
      data.executionPrice = new BigNumber(positionRequest[11]).toString();
      data.lastProcessBlockTime = new BigNumber(positionRequest[12]).toString();
    } else {
      data.closedCollateralAmount = new BigNumber(
        positionRequest[10]
      ).toString();
      data.executionPrice = new BigNumber(positionRequest[11]).toString();
      data.lastProcessBlockTime = new BigNumber(positionRequest[12]).toString();
    }

    return data;
  }

  if (Number(positionRequest[9]) === 1) {
    // cancelled
    data.status = "1";
    data.optionTokenId = new BigNumber(positionRequest[3]).toString();
    data.lastProcessBlockTime = new BigNumber(positionRequest[12]).toString();

    return data;
  }

  return data;
};
