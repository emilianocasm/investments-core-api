import {
  createTestApiApp,
  TestApiApp,
} from './support/api-test-app';
import { MarketDataEntity } from '../src/contexts/market-data/adapters/outbound/market-data.entity';
import { OrderEntity } from '../src/contexts/orders/adapters/outbound/order.entity';

describe('Orders and cash movement endpoints', () => {
  let api: TestApiApp;

  beforeAll(async () => {
    api = await createTestApiApp();
  });

  beforeEach(async () => {
    await api.resetOrders();
    await api.resetMarketData();
  });

  afterAll(async () => {
    await api.close();
  });

  it('creates a LIMIT order from amount, rounds down to whole shares, and reserves cash', async () => {
    const response = await api.request('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        instrumentId: 2,
        type: 'LIMIT',
        side: 'BUY',
        amount: 910.34,
        price: 910,
      }),
    });
    const result = (await response.json()) as {
      order: { id: number; size: number; price: string; status: string };
    };

    expect(response.status).toBe(201);
    expect(result.order).toEqual(
      expect.objectContaining({
        size: 1,
        price: '910.00',
        status: 'NEW',
      }),
    );

    const portfolioResponse = await api.request('/portfolio/1');
    await expect(portfolioResponse.json()).resolves.toEqual(
      expect.objectContaining({
        availableCash: '626590.00',
        reservedCash: '126410.00',
      }),
    );
  });

  it('fills MARKET buys at the latest close and updates the portfolio position', async () => {
    const response = await api.request('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        instrumentId: 33,
        type: 'MARKET',
        side: 'BUY',
        amount: 1000,
      }),
    });
    const result = (await response.json()) as {
      order: { size: number; price: string; status: string };
    };

    expect(response.status).toBe(201);
    expect(result.order).toEqual(
      expect.objectContaining({ size: 2, price: '414.70', status: 'FILLED' }),
    );

    const portfolioResponse = await api.request('/portfolio/1');
    const portfolio = (await portfolioResponse.json()) as {
      positions: Array<{ instrumentId: number; quantity: number }>;
    };
    expect(portfolio.positions).toContainEqual(
      expect.objectContaining({ instrumentId: 33, quantity: 2 }),
    );
  });

  it('persists rejected orders for insufficient cash and insufficient shares', async () => {
    const insufficientCash = await api.request('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        instrumentId: 33,
        type: 'MARKET',
        side: 'BUY',
        amount: 627501,
      }),
    });
    const rejectedBuy = (await insufficientCash.json()) as {
      order: { id: number; status: string };
      rejectionReason: string;
    };
    expect(rejectedBuy.order.status).toBe('REJECTED');
    expect(rejectedBuy.rejectionReason).toBe('Insufficient available cash');
    await expect(
      api.dataSource
        .getRepository(OrderEntity)
        .findOneBy({ id: rejectedBuy.order.id }),
    ).resolves.toEqual(expect.objectContaining({ status: 'REJECTED' }));

    const insufficientShares = await api.request('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 2,
        instrumentId: 1,
        type: 'MARKET',
        side: 'SELL',
        size: 1,
      }),
    });
    const rejectedSell = (await insufficientShares.json()) as {
      order: { id: number; status: string };
      rejectionReason: string;
    };
    expect(rejectedSell.order.status).toBe('REJECTED');
    expect(rejectedSell.rejectionReason).toBe('Insufficient available shares');
    await expect(
      api.dataSource
        .getRepository(OrderEntity)
        .findOneBy({ id: rejectedSell.order.id }),
    ).resolves.toEqual(expect.objectContaining({ status: 'REJECTED' }));
  });

  it('rejects an amount that cannot buy one whole share', async () => {
    const response = await api.request('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        instrumentId: 33,
        type: 'MARKET',
        side: 'BUY',
        amount: 100,
      }),
    });
    const result = (await response.json()) as {
      order: { size: number; status: string };
      rejectionReason: string;
    };

    expect(result.order).toEqual(
      expect.objectContaining({ size: 0, status: 'REJECTED' }),
    );
    expect(result.rejectionReason).toBe(
      'The requested amount is not enough to buy one share',
    );
  });

  it.each([
    {
      userId: 1,
      instrumentId: 1,
      type: 'MARKET',
      side: 'BUY',
    },
    {
      userId: 1,
      instrumentId: 1,
      type: 'MARKET',
      side: 'BUY',
      size: 1,
      amount: 100,
    },
    {
      userId: 1,
      instrumentId: 1,
      type: 'LIMIT',
      side: 'BUY',
      size: 1,
    },
    {
      userId: 1,
      instrumentId: 1,
      type: 'MARKET',
      side: 'BUY',
      size: 1,
      price: 10,
    },
    {
      userId: 1,
      instrumentId: 1,
      type: 'MARKET',
      side: 'CASH_IN',
      size: 1,
    },
    {
      userId: 1,
      instrumentId: 1,
      type: 'MARKET',
      side: 'BUY',
      size: 0,
    },
  ])('rejects invalid order payload %#', async (body) => {
    const response = await api.request('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(400);
  });

  it('rejects unknown users/instruments, currency trading, and instruments without a quote', async () => {
    const createOrder = (body: object) =>
      api.request('/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    const common = {
      type: 'MARKET',
      side: 'BUY',
      size: 1,
    };

    expect(
      (
        await createOrder({
          ...common,
          userId: 999,
          instrumentId: 1,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await createOrder({
          ...common,
          userId: 1,
          instrumentId: 999,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await createOrder({
          ...common,
          userId: 1,
          instrumentId: 66,
        })
      ).status,
    ).toBe(400);

    await api.dataSource
      .getRepository(MarketDataEntity)
      .delete({ instrumentId: 1 });
    expect(
      (
        await createOrder({
          ...common,
          userId: 1,
          instrumentId: 1,
        })
      ).status,
    ).toBe(400);
  });

  it('cancels only NEW orders owned by the given user and releases their reservation', async () => {
    const createResponse = await api.request('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        instrumentId: 1,
        type: 'LIMIT',
        side: 'BUY',
        size: 1,
        price: 10,
      }),
    });
    const created = (await createResponse.json()) as {
      order: { id: number; status: string };
    };
    expect(created.order.status).toBe('NEW');

    const wrongOwner = await api.request(
      `/orders/${created.order.id}/cancel`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 2 }),
      },
    );
    expect(wrongOwner.status).toBe(404);

    const cancelled = await api.request(
      `/orders/${created.order.id}/cancel`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 1 }),
      },
    );
    expect(cancelled.status).toBe(201);
    await expect(cancelled.json()).resolves.toEqual(
      expect.objectContaining({ status: 'CANCELLED' }),
    );

    const portfolio = await api.request('/portfolio/1');
    await expect(portfolio.json()).resolves.toEqual(
      expect.objectContaining({
        availableCash: '627500.00',
        reservedCash: '125500.00',
      }),
    );

    const cancelAgain = await api.request(
      `/orders/${created.order.id}/cancel`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 1 }),
      },
    );
    expect(cancelAgain.status).toBe(409);
  });

  it('returns appropriate cancellation errors for unknown, filled and malformed requests', async () => {
    const unknownOrder = await api.request('/orders/999/cancel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 1 }),
    });
    expect(unknownOrder.status).toBe(404);

    const filledOrder = await api.request('/orders/2/cancel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 1 }),
    });
    expect(filledOrder.status).toBe(409);

    const malformedId = await api.request('/orders/not-an-id/cancel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 1 }),
    });
    expect(malformedId.status).toBe(400);

    const malformedBody = await api.request('/orders/5/cancel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 0 }),
    });
    expect(malformedBody.status).toBe(400);
  });

  it('reserves shares in pending sell orders and releases them on cancellation', async () => {
    const pending = await api.request('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        instrumentId: 47,
        type: 'LIMIT',
        side: 'SELL',
        size: 39,
        price: 930,
      }),
    });
    const pendingOrder = (await pending.json()) as {
      order: { id: number; status: string };
    };
    expect(pendingOrder.order.status).toBe('NEW');

    const unavailableShares = await api.request('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        instrumentId: 47,
        type: 'MARKET',
        side: 'SELL',
        size: 2,
      }),
    });
    const rejected = (await unavailableShares.json()) as {
      order: { status: string };
    };
    expect(rejected.order.status).toBe('REJECTED');

    await api.request(`/orders/${pendingOrder.order.id}/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 1 }),
    });

    const saleAfterCancel = await api.request('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        instrumentId: 47,
        type: 'MARKET',
        side: 'SELL',
        size: 2,
      }),
    });
    const filled = (await saleAfterCancel.json()) as {
      order: { status: string };
    };
    expect(filled.order.status).toBe('FILLED');
  });

  it('records cash deposits and withdrawals and includes them in the portfolio balance', async () => {
    const deposit = await api.request('/cash-movements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 4, side: 'CASH_IN', amount: 2500 }),
    });
    const deposited = (await deposit.json()) as {
      order: { instrumentId: number; size: number; side: string; status: string };
    };
    expect(deposited.order).toEqual(
      expect.objectContaining({
        instrumentId: 66,
        size: 2500,
        side: 'CASH_IN',
        status: 'FILLED',
      }),
    );

    const withdrawal = await api.request('/cash-movements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 4, side: 'CASH_OUT', amount: 1000 }),
    });
    await expect(withdrawal.json()).resolves.toEqual(
      expect.objectContaining({
        order: expect.objectContaining({ side: 'CASH_OUT', status: 'FILLED' }),
      }),
    );

    const portfolio = await api.request('/portfolio/4');
    await expect(portfolio.json()).resolves.toEqual(
      expect.objectContaining({
        cashBalance: '1500.00',
        availableCash: '1500.00',
        totalAccountValue: '1500.00',
      }),
    );
  });

  it('rejects cash movements with invalid input or an unknown user', async () => {
    for (const body of [
      { userId: 4, side: 'BUY', amount: 100 },
      { userId: 4, side: 'CASH_IN', amount: 0 },
      { userId: 4, side: 'CASH_IN', amount: 1.25 },
      { userId: 4, side: 'CASH_OUT', amount: 2_147_483_648 },
    ]) {
      const response = await api.request('/cash-movements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }

    const missingUser = await api.request('/cash-movements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 999, side: 'CASH_IN', amount: 100 }),
    });
    expect(missingUser.status).toBe(404);
  });

  it('does not let cash withdrawals use funds reserved by pending orders', async () => {
    const rejected = await api.request('/cash-movements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        side: 'CASH_OUT',
        amount: 627501,
      }),
    });
    await expect(rejected.json()).resolves.toEqual(
      expect.objectContaining({
        order: expect.objectContaining({ status: 'REJECTED' }),
        rejectionReason: 'Insufficient available cash',
      }),
    );

    const withdrawal = await api.request('/cash-movements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        side: 'CASH_OUT',
        amount: 627500,
      }),
    });
    await expect(withdrawal.json()).resolves.toEqual(
      expect.objectContaining({
        order: expect.objectContaining({ status: 'FILLED' }),
      }),
    );

    const portfolio = await api.request('/portfolio/1');
    await expect(portfolio.json()).resolves.toEqual(
      expect.objectContaining({
        cashBalance: '125500.00',
        availableCash: '0.00',
        reservedCash: '125500.00',
      }),
    );
  });

  it('protects order and cash movement endpoints with the API key', async () => {
    for (const [path, body] of [
      [
        '/orders',
        {
          userId: 1,
          instrumentId: 1,
          type: 'MARKET',
          side: 'BUY',
          size: 1,
        },
      ],
      ['/cash-movements', { userId: 1, side: 'CASH_IN', amount: 100 }],
    ] as const) {
      const response = await fetch(`${api.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(401);
    }
  });
});
