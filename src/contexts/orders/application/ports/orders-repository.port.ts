import { OrderRecord, OrderStatus } from '../../domain/order';

export interface OrdersRepository {
  findById(id: number): Promise<OrderRecord | undefined>;
  findByUser(userId: number): Promise<OrderRecord[]>;
  save(order: Omit<OrderRecord, 'id'>): Promise<OrderRecord>;
  updateStatus(id: number, status: OrderStatus): Promise<OrderRecord | undefined>;
}

export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');
