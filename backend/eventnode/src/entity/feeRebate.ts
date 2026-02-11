import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class FeeRebate extends Base<FeeRebate> {
  @PrimaryColumn()
  id: string

  @Column()
  from: string

  @Column()
  to: string

  @Column()
  token: string

  @Column("numeric")
  feeRebateAmount: string

  @Column("numeric")
  feeAmount: string

  @Column("numeric")
  afterFeePaidAmount: string

  @Column("numeric")
  tokenSpotPrice: string

  @Column()
  underlyingAsset: string

  @Column("numeric")
  size: string

  @Column("numeric")
  price: string

  @Column()
  isSettle: boolean

  @Column()
  isCopyTrade: boolean
}