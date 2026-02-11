import { Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class RemoveLiquidity extends Base<RemoveLiquidity> {
  @PrimaryColumn()
  id: string

  @Column()
  account: string

  @Column()
  olp: string

  @Column()
  token: string // token address that trader receive
  
  @Column("numeric")
  olpAmount: string // olp token amount that trader paid

  @Column("numeric")
  aumInUsdg: string // aum before remove liquidity

  @Column("numeric")
  olpSupply: string // olp supply before remove liquidity
  
  @Column("numeric")
  usdgAmount: string // token value in usdg that trader received

  @Column("numeric") 
  amountOut: string // token amount that trader received

  @Column("numeric")
  processBlockTime: string
}