import { Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class CollectPositionFee extends Base<CollectPositionFee> {
  @PrimaryColumn()
  id: string

  @Column()
  account: string

  @Column()
  token: string

  @Column("numeric")
  feeUsd: string

  @Column("numeric")
  feeAmount: string

  @Column()
  isSettle: boolean
}