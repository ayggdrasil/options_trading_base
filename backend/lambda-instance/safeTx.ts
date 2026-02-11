import { createSafeClient, SafeClient, SdkStarterKitConfig } from '@safe-global/sdk-starter-kit';
import { TransactionReceipt, ethers } from 'ethers';
import { CONFIG } from './src/constants/constants.config';
import { SAFE_ADDRESSES, Keeper } from './src/constants/safe';
import { initializeRedis } from './src/redis';
import Redis from 'ioredis';
import { ZERO_ADDRESS } from './src/constants';
import { getMostReliableProvider } from './src/contract';
import { MESSAGE_TYPE } from './src/utils/messages';

interface SafeTxData {
  to: string;
  value: string;
  data: string;
  gasLimit?: string;
}
const TIMEOUT = 10000;

/**
 * Safe 트랜잭션을 전송하는 함수
 *
 * @param keeper - 트랜잭션을 실행할 Keeper (예: Keeper.PV_FEEDER, Keeper.SPOT_FEEDER 등)
 * @param safeTxData - 트랜잭션 데이터 (to, value, data, gasLimit?)
 * @param shouldCheckPendingSafeTx - 대기 중인 트랜잭션이 있을 때 가스비를 증가시킬지 여부 (기본값: false)
 * @returns 트랜잭션 실행 결과 (isSuccess, tx, txHash, receipt)
 *
 * @example
 * ```typescript
 * // 기본 사용 예시
 * const { PositionValueFeed } = await initializeContracts();
 * const txData = await PositionValueFeed.feedPV.populateTransaction(
 *   [vault1, vault2, vault3],
 *   [price1, price2, price3],
 *   [isNegative1, isNegative2, isNegative3],
 *   deadline
 * );
 *
 * const result = await safeTx(
 *   Keeper.PV_FEEDER,
 *   {
 *     to: txData.to,
 *     data: txData.data,
 *     value: '0',
 *   }
 * );
 *
 * if (result.isSuccess) {
 *   console.log('Transaction succeeded:', result.txHash);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // shouldCheckPendingSafeTx 옵션 사용 예시 (feed 함수들에서 사용)
 * await processFeedTx('feedOlpPv', async () => {
 *   return await safeTx(
 *     Keeper.PV_FEEDER,
 *     {
 *       to: txData.to,
 *       data: txData.data,
 *       value: '0',
 *     },
 *     true // 대기 중인 트랜잭션 확인 및 가스비 증가
 *   );
 * });
 * ```
 */
export async function safeTx(
  keeper: Keeper,
  safeTxData: SafeTxData,
  shouldCheckPendingSafeTx: boolean = false,
): Promise<{
  isSuccess: boolean;
  tx: ethers.TransactionResponse;
  txHash: string;
  receipt: TransactionReceipt;
}> {
  validateSafeTxData(safeTxData);
  const { redis } = await initializeRedis();
  const { provider, rpcUrl } = await getMostReliableProvider();
  const { signerAddress, safeAddress, safeClient } = await getSafeInfo(rpcUrl, keeper);

  const nonce = await provider.getTransactionCount(signerAddress, 'latest');
  let maxFeePerGas = await getMaxFeePerGasWithBuffer(provider);

  // Pending transaction 체크 및 가스비 조정
  if (shouldCheckPendingSafeTx) {
    const pendingSafeTxData = await getPendingSafeTx(redis, safeAddress, nonce);
    if (pendingSafeTxData) {
      maxFeePerGas = getIncreasedMaxFeePerGas(pendingSafeTxData, maxFeePerGas);
    }
    await updatePendingSafeTx(redis, safeAddress, nonce, maxFeePerGas);
  }

  try {
    const safeTxHash = await sendTxWithSafeClient(safeClient, safeTxData, maxFeePerGas, nonce);
    const transaction = await provider.getTransaction(safeTxHash);
    const { isSuccess, receipt } = await waitForTransactionReceipt(provider, safeTxHash);

    if (!isSuccess) {
      console.log('SafeTx failed', safeTxHash, receipt);
    }

    return {
      isSuccess,
      tx: transaction,
      txHash: safeTxHash,
      receipt,
    };
  } catch (error) {
    console.error('SafeTx failed', error);
    throw error;
  } finally {
    // Pending transaction 정리
    if (shouldCheckPendingSafeTx) {
      await deletePendingSafeTx(redis, safeAddress, nonce);
    }
  }
}

/**
 * 여러 Safe 트랜잭션을 배치로 전송하는 함수
 *
 * @param keeper - 트랜잭션을 실행할 Keeper
 * @param safeTxs - 트랜잭션 데이터 배열
 * @returns 트랜잭션 실행 결과 (isSuccess, tx, txHash, receipt)
 *
 * @example
 * ```typescript
 * const { SpotPriceFeed, PositionValueFeed } = await initializeContracts();
 *
 * const spotTxData = await SpotPriceFeed.feedSpotPrices.populateTransaction(
 *   assets.map(asset => CONTRACT_ADDRESSES[chainId][`W${asset}`]),
 *   assets.map(asset => spot.data[asset]),
 *   deadline
 * );
 *
 * const olppvTxData = await PositionValueFeed.feedPV.populateTransaction(
 *   [S_VAULT, M_VAULT, L_VAULT],
 *   [sOlp, mOlp, lOlp],
 *   [isNegative1, isNegative2, isNegative3],
 *   deadline
 * );
 *
 * const result = await safeTxBatch(
 *   Keeper.PV_FEEDER,
 *   [
 *     {
 *       to: spotTxData.to,
 *       data: spotTxData.data,
 *       value: '0',
 *     },
 *     {
 *       to: olppvTxData.to,
 *       data: olppvTxData.data,
 *       value: '0',
 *     },
 *   ]
 * );
 *
 * if (result.isSuccess) {
 *   console.log('Batch transaction succeeded:', result.txHash);
 * }
 * ```
 */
export async function safeTxBatch(
  keeper: Keeper,
  safeTxs: SafeTxData[],
): Promise<{
  isSuccess: boolean;
  tx: ethers.TransactionResponse;
  txHash: string;
  receipt: TransactionReceipt;
}> {
  safeTxs.forEach(validateSafeTxData);
  const { provider, rpcUrl } = await getMostReliableProvider();
  const { signerAddress, safeClient } = await getSafeInfo(rpcUrl, keeper);

  const nonce = await provider.getTransactionCount(signerAddress, 'pending');
  let maxFeePerGas = await getMaxFeePerGasWithBuffer(provider);

  const safeTxHash = await sendTxWithSafeClient(safeClient, safeTxs, maxFeePerGas, nonce);
  const transaction = await provider.getTransaction(safeTxHash);
  // safeTxBatch는 타임아웃 시 에러를 던지는 원래 동작 유지
  const receipt = await provider.waitForTransaction(safeTxHash, 1, TIMEOUT);
  const isSuccess = receipt.status === 1;

  if (!isSuccess) {
    console.log('SafeTx failed', safeTxHash, receipt);
  }

  return {
    isSuccess,
    tx: transaction,
    txHash: safeTxHash,
    receipt,
  };
}

const getSignerPrivateKey = (keeper: Keeper): string => {
  switch (keeper) {
    case Keeper.OPTIONS_MARKET:
      return process.env.KP_OPTIONS_MARKET;
    case Keeper.POSITION_PROCESSOR:
      return process.env.KP_POSITION_PROCESSOR;
    case Keeper.SETTLE_OPERATOR:
      return process.env.KP_SETTLE_OPERATOR;
    case Keeper.PV_FEEDER:
      return process.env.KP_PV_FEEDER;
    case Keeper.SPOT_FEEDER:
      return process.env.KP_SPOT_FEEDER;
    case Keeper.FEE_DISTRIBUTOR:
      return process.env.KP_FEE_DISTRIBUTOR;
    case Keeper.CLEARING_HOUSE:
      return process.env.KP_CLEARING_HOUSE;
    default:
      throw new Error('Invalid safe keeper');
  }
};

const getPendingSafeTx = async (redis: Redis, safeAddress: string, nonce: number) => {
  const pendingSafeTx = await redis.get(`pendingSafeTx:${safeAddress}:${nonce}`);

  if (pendingSafeTx) {
    const pendingSafeTxData = JSON.parse(pendingSafeTx);
    return pendingSafeTxData;
  }
  return null;
};

const updatePendingSafeTx = async (
  redis: Redis,
  safeAddress: string,
  nonce: number,
  maxFeePerGas: bigint,
) => {
  await redis.set(
    `pendingSafeTx:${safeAddress}:${nonce}`,
    JSON.stringify({
      maxFeePerGas: maxFeePerGas.toString(),
    }),
    'EX',
    5 * 60,
  );
};

const deletePendingSafeTx = async (redis: Redis, safeAddress: string, nonce: number) => {
  await redis.del(`pendingSafeTx:${safeAddress}:${nonce}`);
};

const getIncreasedMaxFeePerGas = (pendingSafeTxData: any, maxFeePerGas: bigint) => {
  const maxAllowedFeePerGas = (maxFeePerGas * BigInt(2000)) / BigInt(100);
  const increasedMaxFeePerGas = (BigInt(pendingSafeTxData.maxFeePerGas) * BigInt(120)) / BigInt(100);
  maxFeePerGas = increasedMaxFeePerGas > maxFeePerGas ? increasedMaxFeePerGas : maxFeePerGas;
  maxFeePerGas = maxFeePerGas > maxAllowedFeePerGas ? maxAllowedFeePerGas : maxFeePerGas;
  return maxFeePerGas;
};

const getSafeInfo = async (rpcUrl: string, keeper: Keeper) => {
  const chainId = Number(process.env.CHAIN_ID);
  const privateKey = getSignerPrivateKey(keeper);
  const safeAddress = SAFE_ADDRESSES[chainId][keeper];
  const safeClientConfig: SdkStarterKitConfig = {
    provider: rpcUrl,
    signer: privateKey,
    safeAddress,
  };
  if (process.env.TX_SERVICE_URL) {
    safeClientConfig.txServiceUrl = process.env.TX_SERVICE_URL;
  }
  const safeClient = await createSafeClient(safeClientConfig);
  const signerAddress = ethers.computeAddress('0x' + privateKey);
  return {
    signerAddress,
    safeAddress,
    safeClient,
  };
};

export const getMaxFeePerGasWithBuffer = async (provider: ethers.JsonRpcProvider): Promise<bigint> => {
  const feeData = await provider.getFeeData();

  if (typeof feeData.maxFeePerGas == 'undefined' || typeof feeData.maxPriorityFeePerGas == 'undefined') {
    throw new Error(MESSAGE_TYPE.NO_FEE_DATA_FOUND);
  }

  const bufferedMaxFee = (feeData.maxFeePerGas * BigInt(120)) / BigInt(100);
  const bufferedPriorityFee = (feeData.maxPriorityFeePerGas * BigInt(120)) / BigInt(100);

  return bufferedMaxFee > bufferedPriorityFee ? bufferedMaxFee : bufferedPriorityFee;
};

const waitForTransactionReceipt = async (
  provider: ethers.JsonRpcProvider,
  txHash: string,
): Promise<{ isSuccess: boolean; receipt: TransactionReceipt | null }> => {
  try {
    const receipt = await provider.waitForTransaction(txHash, 1, TIMEOUT);
    return { isSuccess: receipt.status === 1, receipt };
  } catch (error: any) {
    if (error?.message?.includes(MESSAGE_TYPE.NODE_REQUEST_TIMEOUT)) {
      return { isSuccess: false, receipt: null };
    }
    throw error;
  }
};

const validateSafeTxData = (safeTxData: SafeTxData) => {
  if (safeTxData.to === ZERO_ADDRESS) {
    throw new Error('Zero address is not allowed for safeTx.');
  }
};

const sendTxWithSafeClient = async (
  safeClient: SafeClient,
  safeTxData: SafeTxData | SafeTxData[],
  maxFeePerGas: bigint,
  nonce: number,
): Promise<string> => {
  try {
    const transactions = Array.isArray(safeTxData) ? safeTxData : [safeTxData];
    const safeTxResult = await safeClient.send({
      transactions: transactions.map((tx) => ({
        to: tx.to,
        value: tx.value,
        data: tx.data,
        ...(tx.gasLimit && { gas: tx.gasLimit }), // Map gasLimit to 'gas' for Safe SDK
      })),
      ...(maxFeePerGas && { maxFeePerGas: maxFeePerGas.toString() }),
      nonce,
    });
    return safeTxResult.transactions?.ethereumTxHash;
  } catch (error) {
    console.error('sendTxWithSafeClient failed', error);
    throw error;
  }
};
