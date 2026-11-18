import { AddressInfo } from 'node:net';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { ApplicationErrorFilter } from '../../src/infrastructure/http/application-error.filter';
import * as seed from '../fixtures/investment-data.json';
import { InstrumentEntity } from '../../src/contexts/instruments/adapters/outbound/instrument.entity';
import { MarketDataEntity } from '../../src/contexts/market-data/adapters/outbound/market-data.entity';
import { OrderEntity } from '../../src/contexts/orders/adapters/outbound/order.entity';
import { IdempotencyRequestEntity } from '../../src/contexts/orders/adapters/outbound/idempotency-request.entity';
import {
  OrderSide,
  OrderStatus,
  OrderType,
} from '../../src/contexts/orders/domain/order';
import { UserEntity } from '../../src/contexts/users/adapters/outbound/user.entity';

const TEST_API_KEY = 'test-api-key-for-functional-tests';
const TEST_KSUID_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
let testKsuidSequence = 0;

export interface TestApiApp {
  baseUrl: string;
  dataSource: DataSource;
  close: () => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  resetOrders: () => Promise<void>;
  resetMarketData: () => Promise<void>;
}

export async function createTestApiApp(): Promise<TestApiApp> {
  process.env.API_KEY = TEST_API_KEY;

  const datetimeColumn = getMetadataArgsStorage().columns.find(
    (column) =>
      column.target === OrderEntity && column.propertyName === 'datetime',
  );
  if (!datetimeColumn) {
    throw new Error('Order datetime column metadata was not registered');
  }
  datetimeColumn.options.type = 'datetime';
  const idempotencyCreatedAt = getMetadataArgsStorage().columns.find(
    (column) =>
      column.target === IdempotencyRequestEntity &&
      column.propertyName === 'createdAt',
  );
  if (!idempotencyCreatedAt) {
    throw new Error('Idempotency createdAt column metadata was not registered');
  }
  idempotencyCreatedAt.options.type = 'datetime';

  const app = await NestFactory.create(AppModule, { logger: false });
  const dataSource = app.get(DataSource);
  await dataSource.getRepository(UserEntity).save(seed.users);
  await dataSource.getRepository(InstrumentEntity).save(seed.instruments);

  const resetMarketData = async (): Promise<void> => {
    const marketData = dataSource.getRepository(MarketDataEntity);
    await marketData.clear();
    await marketData.save(seed.marketData);
  };
  const resetOrders = async (): Promise<void> => {
    await dataSource.getRepository(IdempotencyRequestEntity).clear();
    const orders = dataSource.getRepository(OrderEntity);
    await orders.clear();
    await orders.save(
      seed.orders.map((order) => ({
        ...order,
        side: order.side as OrderSide,
        status: order.status as OrderStatus,
        type: order.type as OrderType,
        datetime: new Date(order.datetime),
      })),
    );
  };

  await resetMarketData();
  await resetOrders();

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApplicationErrorFilter());
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}/api/v1`,
    dataSource,
    close: () => app.close(),
    request: (path, init) => {
      const headers = new Headers(init?.headers);
      headers.set('x-api-key', TEST_API_KEY);
      if (init?.method?.toUpperCase() === 'POST' && !headers.has('idempotency-key')) {
        const suffix =
          TEST_KSUID_ALPHABET[testKsuidSequence % TEST_KSUID_ALPHABET.length];
        testKsuidSequence += 1;
        headers.set('idempotency-key', `${'0'.repeat(26)}${suffix}`);
      }
      return fetch(`http://127.0.0.1:${address.port}/api/v1${path}`, {
        ...init,
        headers,
      });
    },
    resetOrders,
    resetMarketData,
  };
}
