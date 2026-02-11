import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class SettlePrice extends Base<SettlePrice> {
  @PrimaryColumn()
  id: string

  @Column()
  underlyingAsset: string
  
  @Column("numeric")
  expiry: string

  @Column("numeric")
  settlePrice: string
}