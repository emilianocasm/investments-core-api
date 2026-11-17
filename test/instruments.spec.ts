import { createTestApiApp, TestApiApp } from './support/api-test-app';

describe('Instruments endpoint', () => {
  let api: TestApiApp;

  beforeAll(async () => {
    api = await createTestApiApp();
  });

  afterAll(async () => {
    await api.close();
  });

  it('searches by exact ticker and name, applying both criteria together', async () => {
    const response = await api.request(
      '/instruments?ticker=TECO2&name=Telecom',
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [expect.objectContaining({ ticker: 'TECO2', name: 'Telecom' })],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNext: false,
    });

    const nonMatchingResponse = await api.request(
      '/instruments?ticker=TECO2&name=Capex',
    );
    await expect(nonMatchingResponse.json()).resolves.toEqual(
      expect.objectContaining({ items: [], total: 0, hasNext: false }),
    );
  });

  it('supports either filter independently and returns an empty result when unmatched', async () => {
    const tickerResponse = await api.request('/instruments?ticker=TECO2');
    const tickerResult = (await tickerResponse.json()) as {
      items: Array<{ ticker: string }>;
      total: number;
    };
    expect(tickerResponse.status).toBe(200);
    expect(tickerResult).toEqual(
      expect.objectContaining({
      items: [expect.objectContaining({ ticker: 'TECO2' })],
      total: 1,
      }),
    );

    const nameResponse = await api.request('/instruments?name=Telecom');
    const nameResult = (await nameResponse.json()) as {
      items: Array<{ name: string }>;
      total: number;
    };
    expect(nameResponse.status).toBe(200);
    expect(nameResult.items[0].name).toBe('Telecom');
    expect(nameResult.total).toBe(1);

    const partialResponse = await api.request('/instruments?ticker=TECO');
    await expect(partialResponse.json()).resolves.toEqual(
      expect.objectContaining({ items: [], total: 0 }),
    );

    const unmatchedResponse = await api.request(
      '/instruments?name=does-not-exist',
    );
    await expect(unmatchedResponse.json()).resolves.toEqual({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
    });
  });

  it('paginates deterministically and reports whether another page exists', async () => {
    const response = await api.request('/instruments?page=2&limit=1');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [{ id: 2, ticker: 'CAPX', name: 'Capex S.A.', type: 'ACCIONES' }],
      page: 2,
      limit: 1,
      total: 66,
      totalPages: 66,
      hasNext: true,
    });

    const lastPageResponse = await api.request('/instruments?page=66&limit=1');
    await expect(lastPageResponse.json()).resolves.toEqual(
      expect.objectContaining({ page: 66, hasNext: false }),
    );
  });

  it.each([
    'page=0',
    'page=1.5',
    'limit=0',
    'limit=101',
    'limit=abc',
    'query=unsupported',
  ])('rejects invalid search parameters (%s)', async (query) => {
    const response = await api.request(`/instruments?${query}`);
    expect(response.status).toBe(400);
  });
});
