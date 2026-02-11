import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { RiskFreeRate } from './rf-rate.entity';

@Entity('rate_free_rate_source')
export class RiskFreeRateSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => RiskFreeRate, (riskFreeRate) => riskFreeRate.source)
  riskFreeRates: RiskFreeRate[];

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt: Date;
}
