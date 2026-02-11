import BigNumber from 'bignumber.js';
import { ProcessStatus, SpvActionItem } from "../entity/spvActionItem";
import { queryRunner } from "../sync";

export async function handleActionEnqueued(log: any): Promise<void> {
  console.log(`New handleActionEnqueued log at block ${log.blockNumber}`);

  const index = log.args.index
  const user = log.args.user
  const vaultAddress = log.args.vaultAddress
  const vaultQueueAddress = log.args.vaultQueueAddress

  const _id = `${vaultAddress}-${index}`

  const record = new SpvActionItem({
    id: _id,
    user: user,
    actionType: log.args.actionType,
    amount: log.args.amount,
    vaultAddress: vaultAddress,
    vaultQueueAddress: vaultQueueAddress,
    status: ProcessStatus.ENQUEUED,
  });
  
  await queryRunner.manager.save(record);
}

export async function handleActionProcessed(log: any): Promise<void> {
  console.log(`New handleActionProcessed log at block ${log.blockNumber}`);

  const index = log.args.index
  const vaultAddress = log.args.vaultAddress

  const _id = `${vaultAddress}-${index}`

  const existingItem: SpvActionItem = await queryRunner.manager.findOne(SpvActionItem, { where: { id: _id } });

  if (existingItem) {
    existingItem.status = ProcessStatus.PROCESSED;
    await queryRunner.manager.save(existingItem);
  }
}

export async function handleActionCancelled(log: any): Promise<void> {
  console.log(`New handleActionCancelled log at block ${log.blockNumber}`);

  const index = log.args.index
  const vaultAddress = log.args.vaultAddress

  const _id = `${vaultAddress}-${index}`

  const existingItem: SpvActionItem = await queryRunner.manager.findOne(SpvActionItem, { where: { id: _id } });

  if (existingItem) {
    existingItem.status = ProcessStatus.CANCELLED;
    await queryRunner.manager.save(existingItem);
  }
}

export async function handleActionPushedback(log: any): Promise<void> {
  console.log(`New handleActionPushedback log at block ${log.blockNumber}`);

  const index = log.args.index
  const vaultAddress = log.args.vaultAddress

  const _id = `${vaultAddress}-${index}`

  const existingItem: SpvActionItem = await queryRunner.manager.findOne(SpvActionItem, { where: { id: _id } });

  if (existingItem) {
    existingItem.status = ProcessStatus.PUSHED_BACK;
    await queryRunner.manager.save(existingItem);
  }
}