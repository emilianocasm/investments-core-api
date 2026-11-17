import { Injectable } from '@nestjs/common';
import { HealthSnapshotReader } from '../../application/ports/health-snapshot-reader.port';
import { HealthSnapshot } from '../../domain/health-snapshot';

@Injectable()
export class SystemHealthSnapshotAdapter implements HealthSnapshotReader {
  read(): HealthSnapshot {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
