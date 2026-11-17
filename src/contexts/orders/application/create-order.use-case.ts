import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../shared-kernel/application/application-error';
import { InstrumentCatalog } from '../../instruments/application/ports/instrument-catalog.port';
import { MarketDataReader } from '../../market-data/application/ports/market-data-reader.port';
import { UserReader } from '../../users/application/ports/user-reader.port';
import {
  OrderRecord,
  OrderSide,
  OrderStatus,
  OrderType,
} from '../domain/order';
import { calculateAccountLedger } from '../../shared-kernel/domain/account-ledger';
import { formatCents, toCents } from '../../shared-kernel/domain/money';
import { OrdersRepository } from './ports/orders-repository.port';

export interface CreateOrderCommand {
  userId: number;
  instrumentId: number;
  type: OrderType;
  side: OrderSide.BUY | OrderSide.SELL;
  size?: number;
  amount?: number;
  price?: number;
}

export interface CreateOrderResult {
  order: OrderRecord;
  rejectionReason?: string;
}

export class CreateOrderUseCase {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly users: UserReader,
    private readonly instruments: InstrumentCatalog,
    private readonly marketData: MarketDataReader,
  ) {}

  async execute(command: CreateOrderCommand): Promise<CreateOrderResult> {
    if ((command.size === undefined) === (command.amount === undefined)) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_INPUT,
        'Provide exactly one of size or amount',
      );
    }
    if (command.type === OrderType.MARKET && command.price !== undefined) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_INPUT,
        'Market orders must not include a price',
      );
    }
    if (command.type === OrderType.LIMIT && command.price === undefined) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_INPUT,
        'Limit orders require a price',
      );
    }

    if (!(await this.users.findById(command.userId))) {
      throw new ApplicationError(
        ApplicationErrorCode.NOT_FOUND,
        `User ${command.userId} was not found`,
      );
    }

    const instrument = await this.instruments.findById(command.instrumentId);
    if (!instrument) {
      throw new ApplicationError(
        ApplicationErrorCode.NOT_FOUND,
        `Tradable instrument ${command.instrumentId} was not found`,
      );
    }
    if (instrument.type === 'MONEDA') {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_INPUT,
        'Currency instruments cannot be traded as shares',
      );
    }

    const quote = await this.marketData.getLatest(command.instrumentId);
    if (!quote?.close) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_INPUT,
        'The instrument has no current market price',
      );
    }

    let priceCents: bigint;
    if (command.type === OrderType.MARKET) {
      priceCents = toCents(quote.close);
    } else {
      if (command.price === undefined || command.price <= 0) {
        throw new ApplicationError(
          ApplicationErrorCode.INVALID_INPUT,
          'Limit orders require a positive price',
        );
      }
      priceCents = toCents(command.price);
    }
    if (priceCents <= 0n) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_INPUT,
        'The order price must be at least one cent',
      );
    }
    const requestedAmountCents =
      command.amount === undefined ? undefined : toCents(command.amount);
    const calculatedSize =
      requestedAmountCents === undefined
        ? undefined
        : requestedAmountCents / priceCents;
    if (calculatedSize !== undefined && calculatedSize > 2_147_483_647n) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_INPUT,
        'Calculated size exceeds the supported maximum',
      );
    }
    const size =
      command.size ??
      (calculatedSize === undefined
        ? 0
        : Number(calculatedSize));
    const orderPrice = formatCents(priceCents);
    const [userOrders, instruments] = await Promise.all([
      this.orders.findByUser(command.userId),
      this.instruments.search(),
    ]);
    const ledger = calculateAccountLedger(command.userId, userOrders, instruments);
    const currentShares = ledger.positions.get(command.instrumentId)?.quantity ?? 0;
    const reservedShares = ledger.reservedShares.get(command.instrumentId) ?? 0;
    const rejectionReason = this.getRejectionReason(
      command,
      size,
      priceCents,
      ledger.cashBalanceCents - ledger.reservedCashCents,
      currentShares - reservedShares,
      requestedAmountCents,
    );
    const savedOrder = await this.orders.save({
      instrumentId: command.instrumentId,
      userId: command.userId,
      size,
      price: orderPrice,
      side: command.side,
      status: rejectionReason
        ? OrderStatus.REJECTED
        : command.type === OrderType.MARKET
          ? OrderStatus.FILLED
          : OrderStatus.NEW,
      type: command.type,
      datetime: new Date().toISOString(),
    });

    return rejectionReason
      ? { order: savedOrder, rejectionReason }
      : { order: savedOrder };
  }

  private getRejectionReason(
    command: CreateOrderCommand,
    size: number,
    priceCents: bigint,
    availableCashCents: bigint,
    availableShares: number,
    requestedAmountCents?: bigint,
  ): string | undefined {
    if (size < 1) {
      return 'The requested amount is not enough to buy one share';
    }
    if (command.side === OrderSide.BUY) {
      if (
        requestedAmountCents !== undefined &&
        requestedAmountCents > availableCashCents
      ) {
        return 'Insufficient available cash';
      }
      if (BigInt(size) * priceCents > availableCashCents) {
        return 'Insufficient available cash';
      }
    }
    if (
      command.side === OrderSide.SELL &&
      size > Math.max(0, availableShares)
    ) {
      return 'Insufficient available shares';
    }

    return undefined;
  }
}
