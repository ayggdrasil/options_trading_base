import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { RiskFreeRateSource } from './rf-rate-source.entity';

@Entity('risk_free_rate')
@Index(['underlyingAsset', 'createdAt'])
export class RiskFreeRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['BTC', 'ETH'],
  })
  underlyingAsset: 'BTC' | 'ETH';

  @Column('jsonb')
  rate: string;

  @ManyToOne(() => RiskFreeRateSource, (source) => source.riskFreeRates)
  source: RiskFreeRateSource;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt: Date;
}
