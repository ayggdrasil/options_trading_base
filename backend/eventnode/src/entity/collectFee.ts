import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class CollectFee extends Base<CollectFee> {
  @PrimaryColumn()
  id: string

  @Column()
  token: string

  @Column("numeric")
  feeUsd: string

  @Column("numeric")
  feeAmount: string
}