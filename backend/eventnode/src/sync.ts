import { AppDataSource } from './data-source'
import { SyncedBlock } from './entity/syncedBlock'
import { getLogsByAddress } from './utils/logs'
import { schedulesByAddress } from './sync.schedule'
import { provider } from './provider'
export const queryRunner = AppDataSource.createQueryRunner()

export const sync = async (fromBlock: number) => {
  const blockNumber = await provider.getBlockNumber()
  
  const toBlock = Math.min(
    fromBlock + Number(process.env.BLOCK_BATCH_SIZE),
    blockNumber,
  ) 

  if (toBlock < fromBlock) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return sync(fromBlock)
  }

  console.log(`scanning from: ${fromBlock} to: ${toBlock}`)

  await queryRunner.connect()
  await queryRunner.startTransaction()

  try {
    // address별로 그룹화된 schedules를 순회 (44번 → ~15번으로 감소)
    for (const [address, schedules] of Object.entries(schedulesByAddress)) {
      await getLogsByAddress(fromBlock, toBlock, address, schedules);
    }

    // ** Block syncing
    const syncedBlock: SyncedBlock = await SyncedBlock.get(0) || new SyncedBlock({ id: 0 });
    syncedBlock.blockNumber = toBlock;
    
    await syncedBlock.save();
    await queryRunner.commitTransaction();

    return await sync(toBlock + 1);
  } catch (e) {
    console.log(e, 'e')

    await queryRunner.rollbackTransaction()

    await sync(fromBlock)
  }
}