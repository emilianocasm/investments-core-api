import { HealthSnapshot } from '../../domain/health-snapshot';

export interface HealthSnapshotReader {
  read(): HealthSnapshot;
}

export const HEALTH_SNAPSHOT_READER = Symbol('HEALTH_SNAPSHOT_READER');
