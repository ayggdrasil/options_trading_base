import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class OlpQueueItem extends Base<OlpQueueItem> {
  @PrimaryColumn()
  id: string

  @Column()
  user: string

  @Column("numeric")
  queueIndex: string

  @Column()
  olpQueueAddress: string

  @Column("numeric")
  actionType: string // 0: MINT_AND_STAKE, 1: UNSTAKE_AND_REDEEM

  @Column()
  token: string // MINT_AND_STAKE: pay token, UNSTAKE_AND_REDEEM: olp token

  @Column("numeric")
  amount: string // MINT_AND_STAKE: pay amount, UNSTAKE_AND_REDEEM: olp amount

  @Column("numeric")
  minOut: string // MINT_AND_STAKE: min olp amount, UNSTAKE_AND_REDEEM: min token amount

  @Column()
  receiver: string

  @Column()
  isNative: boolean

  @Column()
  status: string // ENQUEUED, PROCESSED, CANCELLED

  @Column("numeric")
  amountOut: string

  @Column({ type: "numeric", default: '0' })
  olpPrice: string

  @Column("numeric")
  blockTime: string

  @Column("numeric")
  processBlockTime: string
}

