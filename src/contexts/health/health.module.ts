import { Module } from '@nestjs/common';
import { GetHealthUseCase } from './application/get-health.use-case';
import {
  HEALTH_SNAPSHOT_READER,
  HealthSnapshotReader,
} from './application/ports/health-snapshot-reader.port';
import { HealthController } from './adapters/inbound/http/health.controller';
import { SystemHealthSnapshotAdapter } from './adapters/outbound/system-health-snapshot.adapter';

@Module({
  controllers: [HealthController],
  providers: [
    SystemHealthSnapshotAdapter,
    {
      provide: HEALTH_SNAPSHOT_READER,
      useExisting: SystemHealthSnapshotAdapter,
    },
    {
      provide: GetHealthUseCase,
      useFactory: (healthSnapshotReader: HealthSnapshotReader) =>
        new GetHealthUseCase(healthSnapshotReader),
      inject: [HEALTH_SNAPSHOT_READER],
    },
  ],
})
export class HealthModule {}
