import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../shared-kernel/application/application-error';
import { OrderStatus } from '../domain/order';
import { OrdersRepository } from './ports/orders-repository.port';
import { IdempotencyRepository } from './ports/idempotency-repository.port';
import { createIdempotencyRequest } from './idempotency-request';

export class CancelOrderUseCase {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly idempotency: IdempotencyRepository,
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

      return this.orders.updateStatus(orderId, OrderStatus.CANCELLED);
    });
  }
}
