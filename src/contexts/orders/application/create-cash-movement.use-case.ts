import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../shared-kernel/application/application-error';
import { applyOrderToAccountLedger } from '../../shared-kernel/domain/account-ledger';
import { AccountStateRepository } from '../../shared-kernel/application/ports/account-state-repository.port';
import { toCents } from '../../shared-kernel/domain/money';
import { InstrumentCatalog } from '../../instruments/application/ports/instrument-catalog.port';
import { UserReader } from '../../users/application/ports/user-reader.port';
import { OrderRecord, OrderSide, OrderStatus, OrderType } from '../domain/order';
import { OrdersRepository } from './ports/orders-repository.port';
import { IdempotencyRepository } from './ports/idempotency-repository.port';
import { createIdempotencyRequest } from './idempotency-request';

export interface CreateCashMovementCommand {
  userId: number;
  side: OrderSide.CASH_IN | OrderSide.CASH_OUT;
  amount: number;
}

export interface CreateCashMovementResult {
  order: OrderRecord;
  rejectionReason?: string;
}

export class CreateCashMovementUseCase {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly users: UserReader,
    private readonly instruments: InstrumentCatalog,
    private readonly idempotency: IdempotencyRepository,
    private readonly accountState: AccountStateRepository,
  ) {}

  execute(
    command: CreateCashMovementCommand,
    idempotencyKey?: string,
  ): Promise<CreateCashMovementResult> {
    const idempotencyRequest = createIdempotencyRequest(
      idempotencyKey,
      'POST /cash-movements',
      command,
    );
    return this.create(command, idempotencyRequest);
  }

  private async create(
    command: CreateCashMovementCommand,
    idempotencyRequest: ReturnType<typeof createIdempotencyRequest>,
  ): Promise<CreateCashMovementResult> {
    if (
      !Number.isInteger(command.amount) ||
      command.amount < 1 ||
      command.amount > 2_147_483_647
    ) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_INPUT,
        'Cash movement amount must be a positive integer in pesos',
      );
    }

    if (
      command.side !== OrderSide.CASH_IN &&
      command.side !== OrderSide.CASH_OUT
    ) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_INPUT,
        'Unsupported cash movement side',
      );
    }

    if (!(await this.users.findById(command.userId))) {
      throw new ApplicationError(
        ApplicationErrorCode.NOT_FOUND,
        `User ${command.userId} was not found`,
      );
    }

    const instruments = await this.instruments.search();
    const cashInstrument = instruments.find(
      (instrument) => instrument.type === 'MONEDA',
    );
    if (!cashInstrument) {
      throw new ApplicationError(
        ApplicationErrorCode.INVARIANT_VIOLATION,
        'Cash instrument was not found',
      );
    }

    const amountCents = toCents(command.amount);
    return this.idempotency.saveTransactional(idempotencyRequest, async () => {
      await this.accountState.lockUser(command.userId);
      const ledger = await this.accountState.findByUser(command.userId, null);
      const availableCashCents = ledger.cashBalanceCents - ledger.reservedCashCents;
      const rejectionReason =
        command.side === OrderSide.CASH_OUT && amountCents > availableCashCents
          ? 'Insufficient available cash'
          : undefined;
      const order = await this.orders.save({
        instrumentId: cashInstrument.id,
        userId: command.userId,
        size: command.amount,
        price: '1.00',
        side: command.side,
        status: rejectionReason ? OrderStatus.REJECTED : OrderStatus.FILLED,
        type: OrderType.MARKET,
        datetime: new Date().toISOString(),
      });

      if (!rejectionReason) {
        applyOrderToAccountLedger(ledger, order, instruments);
        await this.accountState.save(command.userId, ledger, null);
      }

      return rejectionReason ? { order, rejectionReason } : { order };
    });
  }
}
