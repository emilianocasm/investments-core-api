import { createTestApiApp, TestApiApp } from './support/api-test-app';

describe('Health endpoint', () => {
  let api: TestApiApp;

  beforeAll(async () => {
    api = await createTestApiApp();
  });

  afterAll(async () => {
    await api.close();
  });

  it('reports the API status and runtime information', async () => {
    const response = await api.request('/health');
    const result = (await response.json()) as {
      status: string;
      uptime: number;
      timestamp: string;
    };

    expect(response.status).toBe(200);
    expect(result.status).toBe('ok');
    expect(result.uptime).toEqual(expect.any(Number));
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('requires a valid API key', async () => {
    const url = `${api.baseUrl}/health`;
    const missingKeyResponse = await fetch(url);
    expect(missingKeyResponse.status).toBe(401);

    const invalidKeyResponse = await fetch(url, {
      headers: { 'x-api-key': 'invalid-key' },
    });
    expect(invalidKeyResponse.status).toBe(401);

    expect((await api.request('/health')).status).toBe(200);
  });
});
