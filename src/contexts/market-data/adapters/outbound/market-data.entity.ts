import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InstrumentEntity } from '../../../instruments/adapters/outbound/instrument.entity';

@Entity('marketdata')
export class MarketDataEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'instrumentid', type: 'integer', nullable: true })
  instrumentId!: number | null;

  @ManyToOne(() => InstrumentEntity, { nullable: true })
  @JoinColumn({ name: 'instrumentid' })
  instrument!: InstrumentEntity | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  high!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  low!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  open!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  close!: string | null;

  @Column({
    name: 'previousclose',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  previousClose!: string | null;

  @Column({ type: 'date', nullable: true })
  date!: string | null;
}
