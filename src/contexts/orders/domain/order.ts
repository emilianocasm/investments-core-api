export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
}

export enum OrderStatus {
  NEW = 'NEW',
  FILLED = 'FILLED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface OrderRecord {
  id: number;
  instrumentId: number;
  userId: number;
  size: number;
  price: string | null;
  side: OrderSide;
  status: OrderStatus;
  type: OrderType;
  datetime: string;
}
