import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../shared-kernel/application/application-error';
import { OrderSide, OrderStatus } from '../domain/order';
import { AccountStateRepository } from '../../shared-kernel/application/ports/account-state-repository.port';
import { applyOrderToAccountLedger } from '../../shared-kernel/domain/account-ledger';
import { OrdersRepository } from './ports/orders-repository.port';
import { IdempotencyRepository } from './ports/idempotency-repository.port';
import { createIdempotencyRequest } from './idempotency-request';

export class CancelOrderUseCase {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly idempotency: IdempotencyRepository,
    private readonly accountState: AccountStateRepository,
  ) {}

  execute(orderId: number, userId: number, idempotencyKey?: string) {
    const idempotencyRequest = createIdempotencyRequest(
      idempotencyKey,
      `POST /orders/${orderId}/cancel`,
      { orderId, userId },
    );
    return this.cancel(orderId, userId, idempotencyRequest);
  }

  private cancel(
    orderId: number,
    userId: number,
    idempotencyRequest: ReturnType<typeof createIdempotencyRequest>,
  ) {
    return this.idempotency.saveTransactional(idempotencyRequest, async () => {
      await this.accountState.lockUser(userId);
      const order = await this.orders.findById(orderId);
      if (!order || order.userId !== userId) {
        throw new ApplicationError(
          ApplicationErrorCode.NOT_FOUND,
          `Order ${orderId} was not found`,
        );
      }
      if (order.status !== OrderStatus.NEW) {
        throw new ApplicationError(
          ApplicationErrorCode.CONFLICT,
          'Only NEW orders can be cancelled',
        );
      }

      const cancelled = await this.orders.updateStatus(orderId, OrderStatus.CANCELLED);
      if (!cancelled) {
        throw new Error(`Order ${orderId} disappeared while being cancelled`);
      }
      const positionInstrumentId =
        cancelled.side === OrderSide.SELL ? cancelled.instrumentId : null;
      const ledger = await this.accountState.findByUser(
        userId,
        positionInstrumentId,
      );
      applyOrderToAccountLedger(ledger, cancelled, []);
      await this.accountState.save(userId, ledger, positionInstrumentId);
      return cancelled;
    });
  }
}
