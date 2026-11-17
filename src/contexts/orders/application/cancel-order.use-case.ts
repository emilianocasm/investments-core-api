import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../shared-kernel/application/application-error';
import { OrderStatus } from '../domain/order';
import { OrdersRepository } from './ports/orders-repository.port';

export class CancelOrderUseCase {
  constructor(private readonly orders: OrdersRepository) {}

  async execute(orderId: number, userId: number) {
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
  }
}
