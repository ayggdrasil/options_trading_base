import { Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class DailyNotionalVolumeAndExecutionPrice extends Base<DailyNotionalVolumeAndExecutionPrice> {
  @PrimaryColumn()
  id: string

  @Column("numeric")
  underlyingAssetIndex: string

  @Column("numeric")
  accumulatedNotionalVolume: string

  @Column("numeric")
  accumulatedExecutionPrice: string
}