import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersRepository } from '../../application/ports/orders-repository.port';
import { OrderRecord, OrderStatus } from '../../domain/order';
import { OrderEntity } from './order.entity';

@Injectable()
export class OrdersAdapter implements OrdersRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
  ) {}

  async findById(id: number): Promise<OrderRecord | undefined> {
    const order = await this.orders.findOneBy({ id });
    return order ? this.toRecord(order) : undefined;
  }

  async findByUser(userId: number): Promise<OrderRecord[]> {
    const orders = await this.orders.find({
      where: { userId },
      order: { datetime: 'ASC', id: 'ASC' },
    });
    return orders.map((order) => this.toRecord(order));
  }

  async save(order: Omit<OrderRecord, 'id'>): Promise<OrderRecord> {
    const savedOrder = await this.orders.save(
      this.orders.create({
        ...order,
        datetime: new Date(order.datetime),
      }),
    );
    return this.toRecord(savedOrder);
  }

  async updateStatus(
    id: number,
    status: OrderStatus,
  ): Promise<OrderRecord | undefined> {
    const result = await this.orders.update({ id }, { status });
    return result.affected ? this.findById(id) : undefined;
  }

  private toRecord(order: OrderEntity): OrderRecord {
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
}
