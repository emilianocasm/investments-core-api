import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../shared-kernel/application/application-error';
import { calculateAccountLedger } from '../../shared-kernel/domain/account-ledger';
import { toCents } from '../../shared-kernel/domain/money';
import { InstrumentCatalog } from '../../instruments/application/ports/instrument-catalog.port';
import { UserReader } from '../../users/application/ports/user-reader.port';
import { OrderRecord, OrderSide, OrderStatus, OrderType } from '../domain/order';
import { OrdersRepository } from './ports/orders-repository.port';

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
  ) {}

  async execute(
    command: CreateCashMovementCommand,
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
    const ledger = calculateAccountLedger(
      command.userId,
      await this.orders.findByUser(command.userId),
      instruments,
    );
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

    return rejectionReason ? { order, rejectionReason } : { order };
  }
}
