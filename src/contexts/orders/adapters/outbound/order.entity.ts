import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InstrumentEntity } from '../../../instruments/adapters/outbound/instrument.entity';
import { UserEntity } from '../../../users/adapters/outbound/user.entity';
import { OrderSide, OrderStatus, OrderType } from '../../domain/order';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'instrumentid', type: 'integer', nullable: true })
  instrumentId!: number | null;

  @ManyToOne(() => InstrumentEntity, { nullable: true })
  @JoinColumn({ name: 'instrumentid' })
  instrument!: InstrumentEntity | null;

  @Column({ name: 'userid', type: 'integer', nullable: true })
  userId!: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'userid' })
  user!: UserEntity | null;

  @Column({ type: 'integer', nullable: true })
  size!: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  price!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  type!: OrderType | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  side!: OrderSide | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  status!: OrderStatus | null;

  @Column({ type: 'timestamp', nullable: true })
  datetime!: Date | null;
}
