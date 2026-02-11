import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { IvCurve } from './iv-curve.entity';

@Entity('iv_curve_source')
export class IvCurveSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => IvCurve, (ivCurve) => ivCurve.source)
  ivCurve: IvCurve[];

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt: Date;
}
