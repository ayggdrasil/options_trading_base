import { Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class CopyTradePositionHistory extends Base<CopyTradePositionHistory> {
  @PrimaryColumn()
  id: string

  @Column()
  account: string

  @Column("numeric")
  requestIndex: string
  
  @Column("numeric")
  underlyingAssetIndex: string
  
  @Column("numeric")
  expiry: string
  
  @Column("numeric")
  optionTokenId: string
  
  @Column("numeric")
  size: string
  
  @Column()
  quoteToken: string
  
  @Column("numeric")
  quoteAmount: string

  @Column("numeric")
  executionPrice: string
  
  @Column("numeric")
  spotPrice: string

  @Column("numeric")
  processBlockTime: string
}