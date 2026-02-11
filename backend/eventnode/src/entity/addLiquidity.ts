import { Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class AddLiquidity extends Base<AddLiquidity> {
  @PrimaryColumn()
  id: string

  @Column()
  account: string

  @Column()
  olp: string;

  @Column()
  token: string // token address that trader paid
  
  @Column("numeric")
  amount: string // token amount that trader paid

  @Column("numeric")
  aumInUsdg: string // aum before add liquidity

  @Column("numeric")
  olpSupply: string // olp supply before add liquidity
  
  @Column("numeric")
  usdgAmount: string // token value in usdg that trader paid

  @Column("numeric")
  mintAmount: string // olp token amount that trader received

  @Column("numeric")
  processBlockTime: string
}