import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('portfolio_accounts')
export class PortfolioAccountEntity {
  @PrimaryColumn({ name: 'userid', type: 'integer' })
  userId!: number;

  @Column({ name: 'cash_balance_cents', type: 'numeric', precision: 30, scale: 0 })
  cashBalanceCents!: string;

  @Column({ name: 'reserved_cash_cents', type: 'numeric', precision: 30, scale: 0 })
  reservedCashCents!: string;
}
