import { Subject, interval, of, startWith, switchMap, takeUntil } from 'rxjs';
import { feedOlppv } from '../../feed/feed.olppv';
import { executeOlpQueue } from './execute.queue';
import initializeContracts from '../../contract';
import { CONTRACT_ADDRESSES } from '../../constants/constants.addresses';
import { VaultType } from './config';

/**
 * Process OLP queue in parallel - check epoch stage first, then continuously feed OLPPV and execute queue
 * This runs every minute and only proceeds if in PROCESS phase
 *
 * @param event - Event configuration
 * @param event.vaultType - Vault type to process ('s', 'm', or 'l')
 * @param maxRunningTime - Maximum running time in seconds
 */
export const executeOlpQueueParallel = async (event: any, maxRunningTime: string) => {
  if (!event.vaultType) {
    throw new Error('Vault type is required');
  }

  const chainId = Number(process.env.CHAIN_ID);
  const vaultType: VaultType = event.vaultType as VaultType;
  const feedOlppvInterval = 5 * 1000; // 5 seconds
  const executeQueueInterval = 1 * 1000; // 1 second

  // Early check: verify we're in PROCESS stage
  try {
    const { getRewardRouterV2ContractByVaultAddress } = await initializeContracts();
    const vaultAddress = CONTRACT_ADDRESSES[chainId][`${vaultType.toUpperCase()}_VAULT`];
    const rewardRouter = getRewardRouterV2ContractByVaultAddress(vaultAddress);
    
    const epochStage = await rewardRouter.epochStage();
    
    console.log('====== PROCESS OLP QUEUE PARALLEL ======');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Vault type: ${vaultType.toUpperCase()}`);
    console.log(`Epoch stage: ${epochStage} (0: SUBMISSION, 1: PROCESS)`);
    
    // Early return if not in PROCESS stage
    if (epochStage !== 1n) {
      console.log('❌ Not in PROCESS stage, skipping execution');
      return {
        vaultType,
        epochStage: Number(epochStage),
        executed: false,
        reason: 'Not in PROCESS stage',
      };
    }
    
    console.log('✓ In PROCESS stage, starting parallel execution...');
  } catch (error: any) {
    console.error('Error checking epoch stage:', error);
    return {
      vaultType,
      executed: false,
      error: error.message,
    };
  }

  const startTime = Date.now();
  const destroy$ = new Subject();

  const running = {
    feedOlppv: {
      isRunning: false,
    },
    executeQueue: {
      isRunning: false,
    },
  };

  console.log(`Max running time: ${maxRunningTime}s`);
  console.log(`Feed OLPPV interval: ${feedOlppvInterval}ms`);
  console.log(`Execute queue interval: ${executeQueueInterval}ms`);

  return new Promise((resolve) => {
    // Running time checker
    interval(1000)
      .pipe(takeUntil(destroy$))
      .subscribe(() => {
        const runningTime = Date.now() - startTime;
        const remainingTime = Number(maxRunningTime) * 1000 - runningTime;

        if (remainingTime <= 0) {
          console.log('\n====== PROCESS COMPLETE ======');
          console.log(`Total running time: ${(runningTime / 1000).toFixed(2)}s`);
          destroy$.next(true);
          return resolve(true);
        }

        // Log progress every 10 seconds
        if (Math.floor(runningTime / 1000) % 10 === 0) {
          console.log(
            `[Progress] Running for ${(runningTime / 1000).toFixed(0)}s, ${(remainingTime / 1000).toFixed(0)}s remaining`,
          );
        }
      });

    // Feed OLPPV periodically
    runIntervally$(
      running.feedOlppv,
      () => feedOlppv(),
      feedOlppvInterval,
      destroy$,
      'feedOlppv',
    ).subscribe();

    // Execute queue periodically
    runIntervally$(
      running.executeQueue,
      () => executeOlpQueue(vaultType),
      executeQueueInterval,
      destroy$,
      'executeQueue',
    ).subscribe();
  });
};

/**
 * Run a function at intervals, ensuring only one instance runs at a time
 */
const runIntervally$ = (
  _runningState: any,
  _func: () => Promise<any>,
  _interval: number,
  _destroy$: Subject<any>,
  taskName: string,
) => {
  return interval(_interval).pipe(
    startWith(0),
    switchMap(async () => {
      if (_runningState.isRunning) {
        console.log(`[${taskName}] Already running, skipping this interval`);
        return of(false);
      }

      _runningState.isRunning = true;
      const taskStartTime = Date.now();
      console.log(`\n[${taskName}] Starting at ${new Date(taskStartTime).toISOString()}`);

      try {
        await _func();
        const duration = Date.now() - taskStartTime;
        console.log(`[${taskName}] Completed in ${duration}ms`);
      } catch (e: any) {
        console.error(`[${taskName}] Error:`, e?.message || e);
      }

      _runningState.isRunning = false;
    }),
    takeUntil(_destroy$),
  );
};
