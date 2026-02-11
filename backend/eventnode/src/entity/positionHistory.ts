import { Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class PositionHistory extends Base<PositionHistory> {
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
  
  @Column()
  type: string
  
  @Column("numeric")
  optionTokenId: string
  
  @Column("numeric")
  size: string
  
  @Column()
  quoteToken: string
  
  @Column("numeric")
  quoteAmount: string
  
  @Column()
  collateralToken: string

  @Column("numeric")
  collateralAmount: string

  @Column("numeric")
  executionPrice: string

  @Column("numeric")
  avgExecutionPrice: string
  
  @Column("numeric")
  settlePrice: string
  
  @Column("numeric")
  settlePayoff: string
  
  @Column("numeric")
  spotPrice: string

  @Column("numeric")
  cashFlow: string

  @Column("numeric")
  pnl: string

  @Column("numeric")
  roi: string

  @Column("numeric")
  processBlockTime: string
}