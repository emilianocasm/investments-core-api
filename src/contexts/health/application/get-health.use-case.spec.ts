import { HealthSnapshotReader } from './ports/health-snapshot-reader.port';
import { GetHealthUseCase } from './get-health.use-case';

describe('GetHealthUseCase', () => {
  it('returns the snapshot provided by its output port', () => {
    const snapshot = {
      status: 'ok' as const,
      uptime: 12,
      timestamp: '2026-11-16T00:00:00.000Z',
    };
    const reader: HealthSnapshotReader = {
      read: jest.fn().mockReturnValue(snapshot),
    };
    const useCase = new GetHealthUseCase(reader);

    expect(useCase.execute()).toEqual(snapshot);
    expect(reader.read).toHaveBeenCalledTimes(1);
  });
});
