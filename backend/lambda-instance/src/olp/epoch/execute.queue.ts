import BigNumber from 'bignumber.js';
import initializeContracts from '../../contract';
import { sendMessage } from '../../utils/slack';
import { LogLevel } from '../../utils/enums';
import { MESSAGE_TYPE } from '../../utils/messages';
import { makeTx } from '../../../makeTx';
import { CONTRACT_ADDRESSES } from '../../constants/constants.addresses';
import { isIgnorableError } from '../../utils/helper';
import { VaultType } from './config';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface QueueExecutionResult {
  vaultType: VaultType;
  hasPendingQueue: boolean;
  executed: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Execute OLP queue for given vault type
 * This should be called during the PROCESS phase (after endEpoch, before startEpoch)
 *
 * @param vaultType - Vault type to process ('s', 'm', or 'l')
 */
export const executeOlpQueue = async (vaultType: VaultType): Promise<QueueExecutionResult> => {
  const chainId = Number(process.env.CHAIN_ID);
  const maxItems = Number(process.env.MAX_OLP_QUEUE_EXECUTE_ITEMS) || 10;

  try {
    const { kp_olpProcessor, getOlpQueueContractByVaultAddress } = await initializeContracts();

    console.log('====== EXECUTE OLP QUEUE ======');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Vault type: ${vaultType.toUpperCase()}`);
    console.log(`Max items per execution: ${maxItems}`);

    // Get vault address from vaultType
    const vaultAddress = CONTRACT_ADDRESSES[chainId][`${vaultType.toUpperCase()}_VAULT`];

    // Get OlpQueue contract using helper function
    const olpQueue = getOlpQueueContractByVaultAddress(vaultAddress);

    // Check if there's a pending queue
    const hasPendingQueue = await olpQueue.hasPendingQueue();
    console.log(`Has pending queue:`, hasPendingQueue);

    if (!hasPendingQueue) {
      console.log(`No pending queue, skipping`);
      return {
        vaultType,
        hasPendingQueue: false,
        executed: false,
      };
    }

    // Get last processed index and calculate end index
    const [lastProcessedIndex, queueLength] = await Promise.all([
      olpQueue.lastProcessedIndex(),
      olpQueue.queueLength(),
    ]);

    const endIndex = Math.min(Number(lastProcessedIndex) + maxItems, Number(queueLength) - 1);

    console.log(`Last processed index: ${lastProcessedIndex}`);
    console.log(
      `Executing queue from index ${Number(lastProcessedIndex) + 1} to ${endIndex} (max ${maxItems} items)...`,
    );

    const result = await makeTx(
      olpQueue,
      kp_olpProcessor,
      'executeQueue',
      [endIndex],
      false, // shouldCheckPendingMakeTx
    );

    if (!result?.isSuccess) {
      console.error(`Failed to execute queue:`, {
        txHash: result?.txHash,
        receipt: result?.receipt,
      });
      return {
        vaultType,
        hasPendingQueue: true,
        executed: false,
        txHash: result?.txHash,
      };
    }

    console.log(`✓ Successfully executed queue`);
    console.log(`Transaction hash: ${result.txHash}`);

    return {
      vaultType,
      hasPendingQueue: true,
      executed: true,
      txHash: result.txHash,
    };
  } catch (error: any) {
    console.error(`Error executing queue:`, error);

    const isIgnorable = isIgnorableError(error);

    if (!isIgnorable) {
      await sendMessage(
        `\`[Lambda][execute.queue.ts]\` Error executing queue for ${vaultType.toUpperCase()}_OLP_QUEUE`,
        LogLevel.ERROR,
        {
          description: error?.message || error,
        },
      );
    }

    return {
      vaultType,
      hasPendingQueue: false,
      executed: false,
      error: error.message,
    };
  }
};
