import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class Position extends Base<Position> {
  @PrimaryColumn()
  id: string

  @Column()
  account: string

  @Column("numeric")
  underlyingAssetIndex: string

  @Column("numeric")
  expiry: string

  @Column("numeric")
  optionTokenId: string

  @Column("numeric")
  length: string

  @Column()
  isBuys: string
  
  @Column()
  strikePrices: string

  @Column()
  isCalls: string

  @Column()
  optionNames: string

  @Column("numeric")
  size: string

  @Column("numeric")
  sizeOpened: string

  @Column("numeric")
  sizeClosing: string

  @Column("numeric")
  sizeClosed: string

  @Column("numeric")
  sizeSettled: string

  @Column("numeric")
  sizeTransferredIn: string

  @Column("numeric")
  sizeTransferredOut: string

  @Column()
  isBuy: boolean

  @Column("numeric")
  executionPrice: string

  @Column()
  openedToken: string

  @Column("numeric")
  openedAmount: string

  @Column()
  openedCollateralToken: string

  @Column("numeric")
  openedCollateralAmount: string

  @Column("numeric")
  openedAvgExecutionPrice: string

  @Column("numeric")
  openedAvgSpotPrice: string

  @Column()
  closedToken: string

  @Column("numeric")
  closedAmount: string

  @Column()
  closedCollateralToken: string

  @Column("numeric")
  closedCollateralAmount: string

  @Column("numeric")
  closedAvgExecutionPrice: string

  @Column("numeric")
  closedAvgSpotPrice: string

  @Column()
  settledToken: string

  @Column("numeric")
  settledAmount: string

  @Column()
  settledCollateralToken: string

  @Column("numeric")
  settledCollateralAmount: string

  @Column("numeric")
  settledPrice: string

  @Column()
  isSettled: boolean

  @Column("numeric")
  lastProcessBlockTime: string
}