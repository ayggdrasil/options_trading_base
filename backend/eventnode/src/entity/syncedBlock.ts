import { Column, Entity, PrimaryColumn } from "typeorm"
import { Base } from "./base"

@Entity()
export class SyncedBlock extends Base<SyncedBlock> {
  @PrimaryColumn()
  id: number

  @Column({ default: process.env.START_BLOCK })
  blockNumber: number
}