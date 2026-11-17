import {
  InstrumentRecord,
} from './investment-records';
import { OrderRecord, OrderSide, OrderStatus } from '../../orders/domain/order';
import { divideRounded, toCents } from './money';

export interface PositionBalance {
  instrumentId: number;
  quantity: number;
  costBasisCents: bigint;
}

export interface AccountLedger {
  cashBalanceCents: bigint;
  reservedCashCents: bigint;
  positions: Map<number, PositionBalance>;
  reservedShares: Map<number, number>;
}

export function calculateAccountLedger(
  userId: number,
  orders: OrderRecord[],
  instruments: InstrumentRecord[],
): AccountLedger {
  const cashInstrumentId = instruments.find((instrument) => instrument.type === 'MONEDA')?.id;
  const userOrders = orders
    .filter((order) => order.userId === userId)
    .sort((left, right) => left.datetime.localeCompare(right.datetime) || left.id - right.id);
  const positions = new Map<number, PositionBalance>();
  const reservedShares = new Map<number, number>();
  let cashBalanceCents = 0n;
  let reservedCashCents = 0n;

  for (const order of userOrders) {
    const size = BigInt(order.size);
    const priceCents = order.price === null ? 0n : toCents(order.price);

    if (order.status === OrderStatus.NEW) {
      if (order.side === OrderSide.BUY) {
        reservedCashCents += size * priceCents;
      } else if (order.side === OrderSide.SELL) {
        reservedShares.set(
          order.instrumentId,
          (reservedShares.get(order.instrumentId) ?? 0) + order.size,
        );
      }
      continue;
    }

    if (order.status !== OrderStatus.FILLED) {
      continue;
    }

    if (order.side === OrderSide.CASH_IN) {
      cashBalanceCents += size * 100n;
      continue;
    }
    if (order.side === OrderSide.CASH_OUT) {
      cashBalanceCents -= size * 100n;
      continue;
    }
    if (order.instrumentId === cashInstrumentId) {
      continue;
    }

    if (order.side === OrderSide.BUY) {
      cashBalanceCents -= size * priceCents;
    } else if (order.side === OrderSide.SELL) {
      cashBalanceCents += size * priceCents;
    } else {
      continue;
    }

    const position = positions.get(order.instrumentId) ?? {
      instrumentId: order.instrumentId,
      quantity: 0,
      costBasisCents: 0n,
    };

    if (order.side === OrderSide.BUY) {
      position.quantity += order.size;
      position.costBasisCents += size * priceCents;
    } else {
      const soldQuantity = Math.min(order.size, position.quantity);
      const allocatedCost = divideRounded(
        position.costBasisCents * BigInt(soldQuantity),
        BigInt(position.quantity),
      );
      position.quantity -= soldQuantity;
      position.costBasisCents -= allocatedCost;
    }

    positions.set(order.instrumentId, position);
  }

  return { cashBalanceCents, reservedCashCents, positions, reservedShares };
}
