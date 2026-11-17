import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MarketDataEntity } from '../../contexts/market-data/adapters/outbound/market-data.entity';
import { OrderEntity } from '../../contexts/orders/adapters/outbound/order.entity';
import { InstrumentEntity } from '../../contexts/instruments/adapters/outbound/instrument.entity';
import { UserEntity } from '../../contexts/users/adapters/outbound/user.entity';

const entities = [UserEntity, InstrumentEntity, OrderEntity, MarketDataEntity];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => {
        if (process.env.NODE_ENV === 'test') {
          return {
            type: 'sqljs',
            entities,
            synchronize: true,
            autoSave: false,
          };
        }

        const url = process.env.DATABASE_URL;
        if (!url) {
          throw new Error('DATABASE_URL must be configured');
        }

        return {
          type: 'postgres',
          url,
          ssl: { rejectUnauthorized: true },
          entities,
          synchronize: false,
          retryAttempts: 3,
          retryDelay: 1000,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
