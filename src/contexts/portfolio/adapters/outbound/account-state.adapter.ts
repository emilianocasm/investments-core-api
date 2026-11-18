import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../../shared-kernel/application/application-error';
import { AccountStateRepository } from '../../../shared-kernel/application/ports/account-state-repository.port';
import {
  AccountLedger,
  PositionBalance,
} from '../../../shared-kernel/domain/account-ledger';
import { TransactionContext } from '../../../../infrastructure/database/transaction-context';
import { UserEntity } from '../../../users/adapters/outbound/user.entity';
import { PortfolioAccountEntity } from './portfolio-account.entity';
import { PortfolioPositionEntity } from './portfolio-position.entity';

@Injectable()
export class AccountStateAdapter implements AccountStateRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PortfolioAccountEntity)
    private readonly accounts: Repository<PortfolioAccountEntity>,
    @InjectRepository(PortfolioPositionEntity)
    private readonly positions: Repository<PortfolioPositionEntity>,
    private readonly transactions: TransactionContext,
  ) {}

  async lockUser(userId: number): Promise<void> {
    const manager = this.transactions.getManager();
    if (!manager) {
      throw new Error('Account state can only be locked inside a transaction');
    }
    if (manager.connection.options.type === 'postgres') {
      await manager
        .getRepository(UserEntity)
        .createQueryBuilder('user')
        .select('user.id')
        .where('user.id = :userId', { userId })
        .setLock('pessimistic_write')
        .getOne();
    }
  }

  async findByUser(
    userId: number,
    instrumentId?: number | null,
  ): Promise<AccountLedger> {
    const manager = this.transactions.getManager();
    if (manager) {
      return this.loadState(manager, userId, instrumentId);
    }
    if (this.dataSource.options.type === 'postgres') {
      return this.dataSource.transaction('REPEATABLE READ', (transactionManager) =>
        this.loadState(transactionManager, userId, instrumentId),
      );
    }
    return this.dataSource.transaction((transactionManager) =>
      this.loadState(transactionManager, userId, instrumentId),
    );
  }

  private async loadState(
    manager: EntityManager,
    userId: number,
    instrumentId?: number | null,
  ): Promise<AccountLedger> {
    const positionRepository = manager.getRepository(PortfolioPositionEntity);
    const [account, positionRows] = await Promise.all([
      manager.getRepository(PortfolioAccountEntity).findOneBy({ userId }),
      instrumentId === null
        ? Promise.resolve([])
        : positionRepository.findBy(
            instrumentId === undefined ? { userId } : { userId, instrumentId },
          ),
    ]);
    if (!account) {
      throw new ApplicationError(
        ApplicationErrorCode.INVARIANT_VIOLATION,
        `Materialized portfolio state for user ${userId} is missing; run the portfolio state rebuild`,
      );
    }

    return {
      cashBalanceCents: BigInt(account.cashBalanceCents),
      reservedCashCents: BigInt(account.reservedCashCents),
      positions: new Map<number, PositionBalance>(
        positionRows.map((position) => [
          position.instrumentId,
          {
            instrumentId: position.instrumentId,
            quantity: position.quantity,
            costBasisCents: BigInt(position.costBasisCents),
          },
        ]),
      ),
      reservedShares: new Map<number, number>(
        positionRows
          .filter((position) => position.reservedQuantity !== 0)
          .map((position) => [position.instrumentId, position.reservedQuantity]),
      ),
    };
  }

  async save(
    userId: number,
    ledger: AccountLedger,
    instrumentId: number | null,
  ): Promise<void> {
    const accountRepository = this.repository(this.accounts);
    await accountRepository.upsert(
      {
        userId,
        cashBalanceCents: ledger.cashBalanceCents.toString(),
        reservedCashCents: ledger.reservedCashCents.toString(),
      },
      ['userId'],
    );

    if (instrumentId === null) {
      return;
    }

    const position = ledger.positions.get(instrumentId);
    const reservedQuantity = ledger.reservedShares.get(instrumentId) ?? 0;
    const positionRepository = this.repository(this.positions);
    if (
      (!position ||
        (position.quantity === 0 && position.costBasisCents === 0n)) &&
      reservedQuantity === 0
    ) {
      await positionRepository.delete({ userId, instrumentId });
      return;
    }
    await positionRepository.upsert(
      {
        userId,
        instrumentId,
        quantity: position?.quantity ?? 0,
        costBasisCents: (position?.costBasisCents ?? 0n).toString(),
        reservedQuantity,
      },
      ['userId', 'instrumentId'],
    );
  }

  private repository<Entity extends PortfolioAccountEntity | PortfolioPositionEntity>(
    repository: Repository<Entity>,
  ): Repository<Entity> {
    const manager = this.transactions.getManager();
    return manager ? manager.getRepository(repository.target) : repository;
  }
}
