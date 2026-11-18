import 'dotenv/config';
import { DataSource } from 'typeorm';
import { IdempotencyRequestEntity } from '../../contexts/orders/adapters/outbound/idempotency-request.entity';
import { OrderEntity } from '../../contexts/orders/adapters/outbound/order.entity';
import { InstrumentEntity } from '../../contexts/instruments/adapters/outbound/instrument.entity';
import { MarketDataEntity } from '../../contexts/market-data/adapters/outbound/market-data.entity';
import { PortfolioAccountEntity } from '../../contexts/portfolio/adapters/outbound/portfolio-account.entity';
import { PortfolioPositionEntity } from '../../contexts/portfolio/adapters/outbound/portfolio-position.entity';
import { UserEntity } from '../../contexts/users/adapters/outbound/user.entity';
import {
  benchmarkPortfolioState,
  maintainPortfolioState,
} from './portfolio-state-maintenance';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL must be configured');
  }
  const dataSource = new DataSource({
    type: 'postgres',
    url,
    ssl: { rejectUnauthorized: true },
    entities: [
      UserEntity,
      InstrumentEntity,
      OrderEntity,
      MarketDataEntity,
      IdempotencyRequestEntity,
      PortfolioAccountEntity,
      PortfolioPositionEntity,
    ],
  });
  await dataSource.initialize();
  try {
    const verifyOnly = process.argv.includes('--verify');
    if (process.argv.includes('--benchmark')) {
      console.log(JSON.stringify(await benchmarkPortfolioState(dataSource), null, 2));
    } else {
      await maintainPortfolioState(dataSource, verifyOnly);
      console.log(
        verifyOnly
          ? 'Materialized portfolio state matches order history.'
          : 'Materialized portfolio state rebuilt from order history.',
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
