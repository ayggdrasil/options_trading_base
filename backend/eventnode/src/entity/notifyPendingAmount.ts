import { Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class NotifyPendingAmount extends Base<NotifyPendingAmount> {
  @PrimaryColumn()
  id: string

  @Column("numeric")
  priceType: string

  @Column()
  token: string

  @Column("numeric")
  pendingUsd: string

  @Column("numeric")
  pendingAmount: string
}