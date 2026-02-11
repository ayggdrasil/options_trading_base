import { redis } from "../redis";
import { getWeekStartDay } from "./points";

export const updateRebates = async (
  type: 'RECEIVED' | 'COPY_TRADE_RECEIVED' | 'PAID' | 'COPY_TRADE_PAID',
  timestamp: number,
  feeRebateUsd: number,
  totalTransactionVolume: number,
  primary: string,
  secondary: string
) => {
  // get YYYY-MM-DD, and weekMonday
  const date = new Date(timestamp);
  const parsedDate = date.toISOString().split('T')[0]
  const weekMonday = getWeekStartDay(timestamp);

  const pipeline = redis.pipeline()

  const baseKey = `FEE-REBATES-${type}`;
  const volumeKey = `FEE-REBATES-${type}-VOLUME`;

  pipeline.zincrby(baseKey, feeRebateUsd, primary);
  pipeline.zincrby(`${baseKey}-WEEKLY:${weekMonday}`, feeRebateUsd, primary);
  pipeline.zincrby(`${baseKey}-DAILY:${parsedDate}`, feeRebateUsd, primary);
  pipeline.incrbyfloat(`${baseKey}:${primary}:${secondary}:ACC`, feeRebateUsd);
  pipeline.incrbyfloat(`${baseKey}:${primary}:${secondary}:${parsedDate}`, feeRebateUsd);

  pipeline.zincrby(volumeKey, totalTransactionVolume, primary);
  pipeline.zincrby(`${volumeKey}-WEEKLY:${weekMonday}`, totalTransactionVolume, primary);
  pipeline.zincrby(`${volumeKey}-DAILY:${parsedDate}`, totalTransactionVolume, primary);
  pipeline.incrbyfloat(`${volumeKey}:${primary}:${secondary}:ACC`, totalTransactionVolume);
  pipeline.incrbyfloat(`${volumeKey}:${primary}:${secondary}:${parsedDate}`, totalTransactionVolume);

  if (type === 'RECEIVED') {
    pipeline.sadd(`${baseKey}-CHILDREN:${primary}`, secondary);
  } else if (type === 'COPY_TRADE_RECEIVED') {
    pipeline.sadd(`${baseKey}-FOLLOWERS:${primary}`, secondary);
  }

  await pipeline.exec();
}
