export interface IdempotencyRecord {
  id: string;
  requestHash: string;
  responseBody: string | null;
}

export interface IdempotencyRepository {
  saveTransactional<T>(
    record: Pick<IdempotencyRecord, 'id' | 'requestHash'>,
    operation: () => Promise<T>,
  ): Promise<T>;
}

export const IDEMPOTENCY_REPOSITORY = Symbol('IDEMPOTENCY_REPOSITORY');
