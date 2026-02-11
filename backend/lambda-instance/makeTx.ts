import { TransactionReceipt, ethers } from 'ethers';
import { initializeRedis } from './src/redis';
import Redis from 'ioredis';
import { getMaxFeePerGasWithBuffer } from './safeTx';

const TIMEOUT = 10000;

const getPendingMakeTx = async (redis: Redis, signerAddress: string, nonce: number) => {
  const pendingMakeTx = await redis.get(`pendingMakeTx:${signerAddress}:${nonce}`);

  if (pendingMakeTx) {
    const pendingMakeTxData = JSON.parse(pendingMakeTx);
    return pendingMakeTxData;
  }
  return null;
};

const updatePendingMakeTx = async (
  redis: Redis,
  signerAddress: string,
  nonce: number,
  maxFeePerGas: bigint,
) => {
  await redis.set(
    `pendingMakeTx:${signerAddress}:${nonce}`,
    JSON.stringify({
      maxFeePerGas: maxFeePerGas.toString(),
    }),
    'EX',
    5 * 60,
  );
};

const deletePendingMakeTx = async (redis: Redis, signerAddress: string, nonce: number) => {
  await redis.del(`pendingMakeTx:${signerAddress}:${nonce}`);
};

const getIncreasedMaxFeePerGas = (pendingMakeTxData: any, maxFeePerGas: bigint) => {
  const maxAllowedFeePerGas = (maxFeePerGas * BigInt(2000)) / BigInt(100);
  const increasedMaxFeePerGas = (BigInt(pendingMakeTxData.maxFeePerGas) * BigInt(120)) / BigInt(100);
  maxFeePerGas = increasedMaxFeePerGas > maxFeePerGas ? increasedMaxFeePerGas : maxFeePerGas;
  maxFeePerGas = maxFeePerGas > maxAllowedFeePerGas ? maxAllowedFeePerGas : maxFeePerGas;
  return maxFeePerGas;
};

/**
 * Safe가 아닌 직접 트랜잭션을 전송하는 함수
 *
 * @param contract - ethers.Contract 인스턴스
 * @param signer - ethers.Wallet 인스턴스 (트랜잭션을 서명할 signer)
 * @param methodName - 호출할 컨트랙트 메서드 이름
 * @param args - 메서드에 전달할 인자 배열
 * @param shouldCheckPendingMakeTx - 대기 중인 트랜잭션이 있을 때 가스비를 증가시킬지 여부 (기본값: false)
 * @returns 트랜잭션 실행 결과 (isSuccess, tx, txHash, receipt)
 *
 * @example
 * ```typescript
 * // 기본 사용 예시
 * const { PositionValueFeed, keeper_positionValueFeeder } = await initializeContracts();
 *
 * const result = await makeTx(
 *   PositionValueFeed,
 *   keeper_positionValueFeeder,
 *   'feedPV',
 *   [
 *     [vault1, vault2, vault3],
 *     [price1, price2, price3],
 *     [isNegative1, isNegative2, isNegative3],
 *     deadline
 *   ]
 * );
 *
 * if (result.isSuccess) {
 *   console.log('Transaction succeeded:', result.txHash);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // shouldCheckPendingMakeTx 옵션 사용 예시
 * await processFeedTx('feedOlpPv', async () => {
 *   return await makeTx(
 *     PositionValueFeed,
 *     keeper_positionValueFeeder,
 *     'feedPV',
 *     [vaults, prices, isNegatives, deadline],
 *     true // 대기 중인 트랜잭션 확인 및 가스비 증가
 *   );
 * });
 * ```
 */
export async function makeTx(
  contract: ethers.Contract,
  signer: ethers.Wallet,
  methodName: string,
  args: any[],
  shouldCheckPendingMakeTx: boolean = false,
): Promise<{
  isSuccess: boolean;
  tx: ethers.TransactionResponse;
  txHash: string;
  receipt: TransactionReceipt;
}> {
  const { redis } = await initializeRedis();
  const provider = signer.provider as ethers.JsonRpcProvider;
  const signerAddress = signer.address;

  const nonce = await provider.getTransactionCount(signerAddress, 'latest');
  let maxFeePerGas = await getMaxFeePerGasWithBuffer(provider);

  // Pending transaction 체크 및 가스비 조정
  if (shouldCheckPendingMakeTx) {
    const pendingMakeTxData = await getPendingMakeTx(redis, signerAddress, nonce);
    if (pendingMakeTxData) {
      maxFeePerGas = getIncreasedMaxFeePerGas(pendingMakeTxData, maxFeePerGas);
    }
    await updatePendingMakeTx(redis, signerAddress, nonce, maxFeePerGas);
  }

  try {
    // nonce와 가스비 설정을 위한 overrides
    const overrides: any = {
      nonce, // safeTx와 동일하게 항상 nonce를 명시적으로 설정
    };

    if (shouldCheckPendingMakeTx) {
      const feeData = await provider.getFeeData();
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        overrides.maxFeePerGas = maxFeePerGas;
        // maxPriorityFeePerGas는 maxFeePerGas의 적절한 비율로 설정
        const bufferedPriorityFee = (feeData.maxPriorityFeePerGas * BigInt(120)) / BigInt(100);
        overrides.maxPriorityFeePerGas = bufferedPriorityFee;
      }
    }

    const tx = await contract.connect(signer)[methodName](...args, overrides);
    const receipt = await provider.waitForTransaction(tx.hash, 1, TIMEOUT);
    const isSuccess = receipt.status === 1;

    if (!isSuccess) {
      console.log('MakeTx failed', tx.hash, receipt);
    }

    return {
      isSuccess,
      tx,
      txHash: tx.hash,
      receipt,
    };
  } catch (error) {
    console.error('MakeTx failed', error);
    throw error;
  } finally {
    // Pending transaction 정리
    if (shouldCheckPendingMakeTx) {
      await deletePendingMakeTx(redis, signerAddress, nonce);
    }
  }
}
