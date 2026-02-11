import initializeContracts from '../../contract';
import { sendMessage } from '../../utils/slack';
import { safeTx } from '../../../safeTx';
import { makeTx } from '../../../makeTx';
import { LogLevel } from '../../utils/enums';
import { Keeper } from '../../constants/safe';

/**
 * Safe를 통한 트랜잭션 전송 테스트
 * 
 * @example
 * ```typescript
 * // populateTransaction으로 트랜잭션 데이터 생성 후 safeTx로 전송
 * const txData = await Contract.method.populateTransaction(...args);
 * await safeTx(Keeper.XXX, {
 *   to: txData.to,
 *   data: txData.data,
 *   value: '0',
 * });
 * ```
 */
export const testSafeTx = async () => {
  const { WETHToken } = await initializeContracts();

  try {
    const txData = await WETHToken.deposit.populateTransaction();
    await safeTx(Keeper.FEE_DISTRIBUTOR, {
      to: txData.to,
      data: txData.data,
      value: '0',
    });
  } catch (error) {
    console.log('Error in testSafeTx:', error);
    await sendMessage(`\`[Lambda][testTx.ts]\` TEST SAFE TX`, LogLevel.ERROR, {
      description: error?.message || error,
    });
  }
};

/**
 * 직접 트랜잭션 전송 테스트 (Safe 없이)
 * 
 * @example
 * ```typescript
 * // 컨트랙트에 signer 연결 후 직접 메서드 호출
 * await makeTx(Contract, signer, 'methodName', [...args]);
 * ```
 */
export const testMakeTx = async () => {
  const { WETHToken, keeper_feeDistributor } = await initializeContracts();

  try {
    await makeTx(WETHToken, keeper_feeDistributor, 'deposit', []);
  } catch (error) {
    console.log('Error in testMakeTx:', error);
    await sendMessage(`\`[Lambda][testTx.ts]\` TEST MAKE TX`, LogLevel.ERROR, {
      description: error?.message || error,
    });
  }
};
