import { createTestApiApp, TestApiApp } from './support/api-test-app';

describe('Portfolio endpoint', () => {
  let api: TestApiApp;

  beforeAll(async () => {
    api = await createTestApiApp();
  });

  afterAll(async () => {
    await api.close();
  });

  it('calculates cash, pending reservations, positions, market value and returns', async () => {
    const response = await api.request('/portfolio/1');
    const portfolio = (await response.json()) as {
      userId: number;
      totalAccountValue: string;
      cashBalance: string;
      availableCash: string;
      reservedCash: string;
      dailyReturnPercent: number | null;
      positions: Array<{
        instrumentId: number;
        quantity: number;
        averagePrice: string;
        marketPrice: string;
        marketValue: string;
        totalReturnPercent: number | null;
        dailyReturnPercent: number | null;
      }>;
    };

    expect(response.status).toBe(200);
    expect(portfolio).toEqual(
      expect.objectContaining({
        userId: 1,
        cashBalance: '753000.00',
        availableCash: '627500.00',
        reservedCash: '125500.00',
        totalAccountValue: expect.any(String),
        dailyReturnPercent: expect.any(Number),
      }),
    );

    const pamp = portfolio.positions.find(
      (position) => position.instrumentId === 47,
    );
    expect(pamp).toEqual(
      expect.objectContaining({
        quantity: 40,
        averagePrice: '930.00',
        marketPrice: expect.any(String),
        marketValue: expect.any(String),
        totalReturnPercent: expect.any(Number),
        dailyReturnPercent: expect.any(Number),
      }),
    );
    expect(Number(pamp!.marketValue)).toBeCloseTo(
      pamp!.quantity * Number(pamp!.marketPrice),
      2,
    );
  });

  it('returns an empty portfolio for a user with no movements', async () => {
    const response = await api.request('/portfolio/2');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        cashBalance: '0.00',
        availableCash: '0.00',
        reservedCash: '0.00',
        positions: [],
        dailyReturnPercent: null,
      }),
    );
  });

  it('returns not found for an unknown user and bad request for an invalid ID', async () => {
    expect((await api.request('/portfolio/999')).status).toBe(404);
    expect((await api.request('/portfolio/not-an-id')).status).toBe(400);
  });
});
