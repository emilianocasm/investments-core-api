import { AccountLedger } from '../../domain/account-ledger';

export interface AccountStateRepository {
  lockUser(userId: number): Promise<void>;
  findByUser(
    userId: number,
    instrumentId?: number | null,
  ): Promise<AccountLedger>;
  save(
    userId: number,
    ledger: AccountLedger,
    instrumentId: number | null,
  ): Promise<void>;
}

export const ACCOUNT_STATE_REPOSITORY = Symbol('ACCOUNT_STATE_REPOSITORY');
