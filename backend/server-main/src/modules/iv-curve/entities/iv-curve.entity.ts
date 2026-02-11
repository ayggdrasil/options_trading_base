import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { IvCurveSource } from './iv-curve-source.entity';

@Entity('iv_curve')
@Index(['underlyingAsset', 'createdAt'])
export class IvCurve {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['BTC', 'ETH'],
  })
  underlyingAsset: 'BTC' | 'ETH';

  @Column('jsonb')
  curve: string;

  @ManyToOne(() => IvCurveSource, (source) => source.ivCurve)
  source: IvCurveSource;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt: Date;
}
