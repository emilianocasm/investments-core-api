import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('portfolio_positions')
export class PortfolioPositionEntity {
  @PrimaryColumn({ name: 'userid', type: 'integer' })
  userId!: number;

  @PrimaryColumn({ name: 'instrumentid', type: 'integer' })
  instrumentId!: number;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'cost_basis_cents', type: 'numeric', precision: 30, scale: 0 })
  costBasisCents!: string;

  @Column({ name: 'reserved_quantity', type: 'integer' })
  reservedQuantity!: number;
}
