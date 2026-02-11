import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { AssetIndexSource } from './asset-index-source.entity';

@Entity('asset_index')
@Index(['asset', 'source', 'createdAt'])
export class AssetIndex {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  asset: string;

  @Column('jsonb')
  index: string;

  @ManyToOne(() => AssetIndexSource, (source) => source.indices)
  source: AssetIndexSource;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt: Date;
}
