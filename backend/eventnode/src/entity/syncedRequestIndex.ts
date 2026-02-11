import { Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class SyncedRequestIndex extends Base<SyncedRequestIndex> {
  @PrimaryColumn()
  id: number

  @Column("numeric")
  requestIndex: string

  @Column("numeric")
  processBlockTime: string
}