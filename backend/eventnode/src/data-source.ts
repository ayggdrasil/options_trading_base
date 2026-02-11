

import "reflect-metadata"
import { DataSource } from "typeorm"

import { Position } from "./entity/position"
import { PositionHistory } from "./entity/positionHistory"
import { CollectFee } from "./entity/collectFee"
import { SettlePrice } from "./entity/settlePrice"
import { SyncedBlock } from "./entity/syncedBlock"
import { DailyNotionalVolumeAndExecutionPrice } from "./entity/dailyNotionalVolumeAndExecutionPrice"
import { BuySellUsdg } from "./entity/buySellUsdg"
import { AddLiquidity } from "./entity/addLiquidity"
import { RemoveLiquidity } from "./entity/removeLiquidity"
import { CollectPositionFee } from "./entity/collectPositionFee"
import { SyncedRequestIndex } from "./entity/syncedRequestIndex"
import { NotifyPendingAmount } from "./entity/notifyPendingAmount"
import { FeeRebate } from "./entity/feeRebate"
import {CopyTradePositionHistory} from "./entity/copyTradePositionHistory";
import { SpvActionItem } from "./entity/spvActionItem"
import { OlpQueueItem } from "./entity/olpQueueItem"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.AWS_RDS_DB_HOST,
    port: Number(process.env.AWS_RDS_DB_PORT),
    username: process.env.AWS_RDS_DB_USER,
    password: process.env.AWS_RDS_DB_PASSWORD,
    database: process.env.AWS_RDS_DB_NAME,
    synchronize: true,
    logging: false,
    ssl: { rejectUnauthorized: false },
    entities: [
      Position,
      PositionHistory,
      FeeRebate,
      CollectFee,
      CollectPositionFee,
      BuySellUsdg,
      AddLiquidity,
      RemoveLiquidity,
      SettlePrice,
      DailyNotionalVolumeAndExecutionPrice,
      SyncedRequestIndex,
      SyncedBlock,
      NotifyPendingAmount,
      CopyTradePositionHistory,
      SpvActionItem,
      OlpQueueItem,
    ],
    migrations: [],
    subscribers: [],
})