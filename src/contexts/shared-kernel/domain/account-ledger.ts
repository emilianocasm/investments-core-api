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

export function applyOrderToAccountLedger(
  ledger: AccountLedger,
  order: OrderRecord,
  instruments: InstrumentRecord[],
): void {
  const size = BigInt(order.size);
  const priceCents = order.price === null ? 0n : toCents(order.price);

  if (order.status === OrderStatus.NEW) {
    if (order.side === OrderSide.BUY) {
      ledger.reservedCashCents += size * priceCents;
    } else if (order.side === OrderSide.SELL) {
      ledger.reservedShares.set(
        order.instrumentId,
        (ledger.reservedShares.get(order.instrumentId) ?? 0) + order.size,
      );
    }
    return;
  }

  if (order.status === OrderStatus.CANCELLED) {
    if (order.side === OrderSide.BUY) {
      const reservedCash = size * priceCents;
      if (ledger.reservedCashCents < reservedCash) {
        throw new Error(`Insufficient reserved cash to cancel order ${order.id}`);
      }
      ledger.reservedCashCents -= reservedCash;
    } else if (order.side === OrderSide.SELL) {
      const reservedShares = ledger.reservedShares.get(order.instrumentId) ?? 0;
      if (reservedShares < order.size) {
        throw new Error(`Insufficient reserved shares to cancel order ${order.id}`);
      }
      ledger.reservedShares.set(
        order.instrumentId,
        reservedShares - order.size,
      );
    }
    return;
  }

  if (order.status !== OrderStatus.FILLED) {
    return;
  }
  if (order.side === OrderSide.CASH_IN) {
    ledger.cashBalanceCents += size * 100n;
    return;
  }
  if (order.side === OrderSide.CASH_OUT) {
    ledger.cashBalanceCents -= size * 100n;
    return;
  }

  const cashInstrumentId = instruments.find(
    (instrument) => instrument.type === 'MONEDA',
  )?.id;
  if (order.instrumentId === cashInstrumentId) {
    return;
  }
  if (order.side === OrderSide.BUY) {
    ledger.cashBalanceCents -= size * priceCents;
  } else if (order.side === OrderSide.SELL) {
    ledger.cashBalanceCents += size * priceCents;
  } else {
    return;
  }

  const position = ledger.positions.get(order.instrumentId) ?? {
    instrumentId: order.instrumentId,
    quantity: 0,
    costBasisCents: 0n,
  };
  if (order.side === OrderSide.BUY) {
    position.quantity += order.size;
    position.costBasisCents += size * priceCents;
  } else {
    const soldQuantity = Math.min(order.size, position.quantity);
    if (soldQuantity === 0) {
      return;
    }
    const allocatedCost = divideRounded(
      position.costBasisCents * BigInt(soldQuantity),
      BigInt(position.quantity),
    );
    position.quantity -= soldQuantity;
    position.costBasisCents -= allocatedCost;
  }
  ledger.positions.set(order.instrumentId, position);
}
