import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

export enum ProcessStatus {
  ENQUEUED,
  PROCESSED,
  CANCELLED,
  PUSHED_BACK
}

@Entity()
export class SpvActionItem extends Base<SpvActionItem> {
  @PrimaryColumn()
  id: string

  @Column("numeric")
  actionType: number

  @Column()
  amount: string
  
  @Column()
  user: string

  @Column()
  vaultAddress: string
  
  @Column()
  vaultQueueAddress: string

  @Column("numeric")
  status: ProcessStatus
}
