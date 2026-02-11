import { Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class BuySellUsdg extends Base<BuySellUsdg> {
  @PrimaryColumn()
  id: string

  @Column()
  isBuy: boolean

  @Column()
  account: string

  @Column() // For Buy tokenIn, for Sell tokenOut
  token: string
  
  @Column("numeric") // For Buy tokenAmountIn, for Sell tokenAmountOut
  tokenAmount: string
  
  @Column("numeric")
  usdgAmount: string
  
  @Column("numeric")
  feeBasisPoints: string

  @Column("numeric")
  processBlockTime: string
}