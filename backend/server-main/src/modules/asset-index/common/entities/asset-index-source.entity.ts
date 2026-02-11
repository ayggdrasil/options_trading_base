import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, Index } from 'typeorm';
import { AssetIndex } from './asset-index.entity';
import { NormalizedAssetType } from '@callput/shared';

@Entity('asset_index_source')
@Index(['name', 'type'], { unique: true })
export class AssetIndexSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: NormalizedAssetType,
  })
  type: NormalizedAssetType;

  @OneToMany(() => AssetIndex, (assetIndex) => assetIndex.source)
  indices: AssetIndex[];

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt: Date;
}
