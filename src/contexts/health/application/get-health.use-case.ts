import { HealthSnapshot } from '../domain/health-snapshot';
import { HealthSnapshotReader } from './ports/health-snapshot-reader.port';

export class GetHealthUseCase {
  constructor(private readonly healthSnapshotReader: HealthSnapshotReader) {}

  execute(): HealthSnapshot {
    return this.healthSnapshotReader.read();
  }
}
