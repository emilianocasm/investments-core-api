import { DataSource, EntityManager } from 'typeorm';
import {
  AccountLedger,
  PositionBalance,
  calculateAccountLedger,
} from '../../contexts/shared-kernel/domain/account-ledger';
import { InstrumentRecord } from '../../contexts/shared-kernel/domain/investment-records';
import { OrderRecord } from '../../contexts/orders/domain/order';
import { InstrumentEntity } from '../../contexts/instruments/adapters/outbound/instrument.entity';
import { OrderEntity } from '../../contexts/orders/adapters/outbound/order.entity';
import { UserEntity } from '../../contexts/users/adapters/outbound/user.entity';
import { PortfolioAccountEntity } from '../../contexts/portfolio/adapters/outbound/portfolio-account.entity';
import { PortfolioPositionEntity } from '../../contexts/portfolio/adapters/outbound/portfolio-position.entity';

export async function maintainPortfolioState(
  dataSource: DataSource,
  verifyOnly = false,
): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const users = await manager.getRepository(UserEntity).find({
      select: { id: true },
      order: { id: 'ASC' },
    });
    const instruments = (await manager
      .getRepository(InstrumentEntity)
      .find()).map(toInstrumentRecord);

    for (const user of users) {
      if (dataSource.options.type === 'postgres') {
        await manager
          .getRepository(UserEntity)
          .createQueryBuilder('user')
          .select('user.id')
          .where('user.id = :userId', { userId: user.id })
          .setLock('pessimistic_write')
          .getOne();
      }

      const orders = (await manager.getRepository(OrderEntity).find({
        where: { userId: user.id },
        order: { datetime: 'ASC', id: 'ASC' },
      })).map(toOrderRecord);
      const ledger = calculateAccountLedger(user.id, orders, instruments);

      if (verifyOnly) {
        await verifyUserState(manager, user.id, ledger);
      } else {
        await replaceUserState(manager, user.id, ledger);
      }
    }
  });
}

export async function benchmarkPortfolioState(
  dataSource: DataSource,
): Promise<{
  users: number;
  orders: number;
  maxOrdersPerUser: number;
  historyReadAndCalculationMs: number;
  materializedReadMs: number;
}> {
  const run = async (manager: EntityManager) => {
    const users = await manager.getRepository(UserEntity).find({
      select: { id: true },
      order: { id: 'ASC' },
    });
    const instruments = (await manager
      .getRepository(InstrumentEntity)
      .find()).map(toInstrumentRecord);
    let orderCount = 0;
    let maxOrdersPerUser = 0;
    let historyReadAndCalculationMs = 0;
    let materializedReadMs = 0;

    for (const user of users) {
      const historyStart = performance.now();
      const orders = (await manager.getRepository(OrderEntity).find({
        where: { userId: user.id },
        order: { datetime: 'ASC', id: 'ASC' },
      })).map(toOrderRecord);
      const ledger = calculateAccountLedger(user.id, orders, instruments);
      historyReadAndCalculationMs += performance.now() - historyStart;
      orderCount += orders.length;
      maxOrdersPerUser = Math.max(maxOrdersPerUser, orders.length);

      const stateStart = performance.now();
      const [account, positions] = await Promise.all([
        manager
          .getRepository(PortfolioAccountEntity)
          .findOneBy({ userId: user.id }),
        manager.getRepository(PortfolioPositionEntity).findBy({
          userId: user.id,
        }),
      ]);
      materializedReadMs += performance.now() - stateStart;
      if (
        !account ||
        BigInt(account.cashBalanceCents) !== ledger.cashBalanceCents ||
        BigInt(account.reservedCashCents) !== ledger.reservedCashCents
      ) {
        throw new Error(
          `Materialized cash state does not match order history for user ${user.id}`,
        );
      }
      await verifyPositions(user.id, positions, ledger);
    }

    return {
      users: users.length,
      orders: orderCount,
      maxOrdersPerUser,
      historyReadAndCalculationMs: Number(historyReadAndCalculationMs.toFixed(3)),
      materializedReadMs: Number(materializedReadMs.toFixed(3)),
    };
  };

  if (dataSource.options.type === 'postgres') {
    return dataSource.transaction('REPEATABLE READ', run);
  }
  return dataSource.transaction(run);
}

function toInstrumentRecord(instrument: InstrumentEntity): InstrumentRecord {
  if (
    instrument.ticker === null ||
    instrument.name === null ||
    instrument.type === null
  ) {
    throw new Error(`Instrument ${instrument.id} is missing required values`);
  }
  return {
    id: instrument.id,
    ticker: instrument.ticker,
    name: instrument.name,
    type: instrument.type,
  };
}

function toOrderRecord(order: OrderEntity): OrderRecord {
  if (
    order.instrumentId === null ||
    order.userId === null ||
    order.size === null ||
    order.type === null ||
    order.side === null ||
    order.status === null ||
    order.datetime === null
  ) {
    throw new Error(`Order ${order.id} is missing required values`);
  }
  return {
    id: order.id,
    instrumentId: order.instrumentId,
    userId: order.userId,
    size: order.size,
    price: order.price,
    type: order.type,
    side: order.side,
    status: order.status,
    datetime: order.datetime.toISOString(),
  };
}

async function replaceUserState(
  manager: EntityManager,
  userId: number,
  ledger: ReturnType<typeof calculateAccountLedger>,
): Promise<void> {
  await manager.getRepository(PortfolioAccountEntity).save({
    userId,
    cashBalanceCents: ledger.cashBalanceCents.toString(),
    reservedCashCents: ledger.reservedCashCents.toString(),
  });
  const positions = materializedPositions(ledger);
  const positionRepository = manager.getRepository(PortfolioPositionEntity);
  await positionRepository.delete({ userId });
  if (positions.length > 0) {
    await positionRepository.save(
      positions.map((position) => ({
        userId,
        instrumentId: position.instrumentId,
        quantity: position.quantity,
        costBasisCents: position.costBasisCents.toString(),
        reservedQuantity: ledger.reservedShares.get(position.instrumentId) ?? 0,
      })),
    );
  }
}

async function verifyUserState(
  manager: EntityManager,
  userId: number,
  expected: ReturnType<typeof calculateAccountLedger>,
): Promise<void> {
  const account = await manager
    .getRepository(PortfolioAccountEntity)
    .findOneBy({ userId });
  if (
    !account ||
    BigInt(account.cashBalanceCents) !== expected.cashBalanceCents ||
    BigInt(account.reservedCashCents) !== expected.reservedCashCents
  ) {
    throw new Error(
      `Materialized cash state does not match order history for user ${userId}`,
    );
  }

  const actualPositions = await manager
    .getRepository(PortfolioPositionEntity)
    .findBy({ userId });
  await verifyPositions(userId, actualPositions, expected);
}

async function verifyPositions(
  userId: number,
  actualPositions: PortfolioPositionEntity[],
  expected: ReturnType<typeof calculateAccountLedger>,
): Promise<void> {
  const expectedPositions = new Map(
    materializedPositions(expected).map((position) => [
      position.instrumentId,
      position,
    ]),
  );
  if (actualPositions.length !== expectedPositions.size) {
    throw new Error(
      `Materialized positions do not match order history for user ${userId}`,
    );
  }
  for (const actual of actualPositions) {
    const position = expectedPositions.get(actual.instrumentId);
    if (
      !position ||
      actual.quantity !== position.quantity ||
      BigInt(actual.costBasisCents) !== position.costBasisCents ||
      actual.reservedQuantity !==
        (expected.reservedShares.get(actual.instrumentId) ?? 0)
    ) {
      throw new Error(
        `Materialized position ${actual.instrumentId} does not match order history for user ${userId}`,
      );
    }
  }
}

function materializedPositions(ledger: AccountLedger): PositionBalance[] {
  const positions = new Map(ledger.positions);
  for (const [instrumentId, reservedQuantity] of ledger.reservedShares) {
    if (reservedQuantity !== 0 && !positions.has(instrumentId)) {
      positions.set(instrumentId, {
        instrumentId,
        quantity: 0,
        costBasisCents: 0n,
      });
    }
  }
  return [...positions.values()].filter(
    (position) =>
      position.quantity !== 0 ||
      position.costBasisCents !== 0n ||
      (ledger.reservedShares.get(position.instrumentId) ?? 0) !== 0,
  );
}
