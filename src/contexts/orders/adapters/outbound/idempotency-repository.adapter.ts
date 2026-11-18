import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IdempotencyRecord,
  IdempotencyRepository,
} from '../../application/ports/idempotency-repository.port';
import { IdempotencyRequestEntity } from './idempotency-request.entity';
import { TransactionContext } from '../../../../infrastructure/database/transaction-context';
import { DataSource } from 'typeorm';
import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../../shared-kernel/application/application-error';

@Injectable()
export class IdempotencyRepositoryAdapter implements IdempotencyRepository {
  constructor(
    @InjectRepository(IdempotencyRequestEntity)
    private readonly requests: Repository<IdempotencyRequestEntity>,
    private readonly dataSource: DataSource,
    private readonly transactions: TransactionContext,
  ) {}

  saveTransactional<T>(
    request: Pick<IdempotencyRecord, 'id' | 'requestHash'>,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction((manager) =>
      this.transactions.run(manager, async () => {
        const repository = this.repository();
        await repository
          .createQueryBuilder()
          .insert()
          .values({ ...request, responseBody: null })
          .orIgnore()
          .execute();

        const existing = await repository.findOneBy({ id: request.id });
        if (!existing) {
          throw new Error('Idempotency request could not be loaded after insert');
        }
        if (existing.requestHash !== request.requestHash) {
          throw new ApplicationError(
            ApplicationErrorCode.CONFLICT,
            'The Idempotency-Key was already used with a different request',
          );
        }
        if (existing.responseBody !== null) {
          return JSON.parse(existing.responseBody) as T;
        }

        const response = await operation();
        const result = await repository.update(
          { id: request.id },
          { responseBody: JSON.stringify(response) },
        );
        if (result.affected !== 1) {
          throw new Error('Idempotency response could not be persisted');
        }
        return response;
      }),
    );
  }

  private repository(): Repository<IdempotencyRequestEntity> {
    return (
      this.transactions.getManager()?.getRepository(IdempotencyRequestEntity) ??
      this.requests
    );
  }
}
