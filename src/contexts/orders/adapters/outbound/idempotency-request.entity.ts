import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('idempotency_requests')
export class IdempotencyRequestEntity {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 27 })
  id!: string;

  @Column({ name: 'request_hash', type: 'varchar', length: 64 })
  requestHash!: string;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
