import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstrumentsModule } from '../instruments/instruments.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { UsersModule } from '../users/users.module';
import {
  INSTRUMENT_CATALOG,
  InstrumentCatalog,
} from '../instruments/application/ports/instrument-catalog.port';
import {
  MARKET_DATA_READER,
  MarketDataReader,
} from '../market-data/application/ports/market-data-reader.port';
import { UserReader, USER_READER } from '../users/application/ports/user-reader.port';
import { CancelOrderUseCase } from './application/cancel-order.use-case';
import { CreateCashMovementUseCase } from './application/create-cash-movement.use-case';
import { CreateOrderUseCase } from './application/create-order.use-case';
import {
  ORDERS_REPOSITORY,
  OrdersRepository,
} from './application/ports/orders-repository.port';
import { OrdersController } from './adapters/inbound/http/orders.controller';
import { CashMovementsController } from './adapters/inbound/http/cash-movements.controller';
import { OrdersAdapter } from './adapters/outbound/orders.adapter';
import { IdempotencyRepositoryAdapter } from './adapters/outbound/idempotency-repository.adapter';
import { OrderEntity } from './adapters/outbound/order.entity';
import { IdempotencyRequestEntity } from './adapters/outbound/idempotency-request.entity';
import { PortfolioStateModule } from '../portfolio/portfolio-state.module';
import { ACCOUNT_STATE_REPOSITORY, AccountStateRepository } from '../shared-kernel/application/ports/account-state-repository.port';
import {
  IDEMPOTENCY_REPOSITORY,
  IdempotencyRepository,
} from './application/ports/idempotency-repository.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, IdempotencyRequestEntity]),
    UsersModule,
    InstrumentsModule,
    MarketDataModule,
    PortfolioStateModule,
  ],
  controllers: [OrdersController, CashMovementsController],
  providers: [
    OrdersAdapter,
    IdempotencyRepositoryAdapter,
    {
      provide: IDEMPOTENCY_REPOSITORY,
      useExisting: IdempotencyRepositoryAdapter,
    },
    {
      provide: ORDERS_REPOSITORY,
      useExisting: OrdersAdapter,
    },
    {
      provide: CreateOrderUseCase,
      useFactory: (
        orders: OrdersRepository,
        users: UserReader,
        instruments: InstrumentCatalog,
        marketData: MarketDataReader,
        idempotency: IdempotencyRepository,
        accountState: AccountStateRepository,
      ) =>
        new CreateOrderUseCase(orders, users, instruments, marketData, idempotency, accountState),
      inject: [
        ORDERS_REPOSITORY,
        USER_READER,
        INSTRUMENT_CATALOG,
        MARKET_DATA_READER,
        IDEMPOTENCY_REPOSITORY,
        ACCOUNT_STATE_REPOSITORY,
      ],
    },
    {
      provide: CancelOrderUseCase,
      useFactory: (
        orders: OrdersRepository,
        idempotency: IdempotencyRepository,
        accountState: AccountStateRepository,
      ) => new CancelOrderUseCase(orders, idempotency, accountState),
      inject: [ORDERS_REPOSITORY, IDEMPOTENCY_REPOSITORY, ACCOUNT_STATE_REPOSITORY],
    },
    {
      provide: CreateCashMovementUseCase,
      useFactory: (
        orders: OrdersRepository,
        users: UserReader,
        instruments: InstrumentCatalog,
        idempotency: IdempotencyRepository,
        accountState: AccountStateRepository,
      ) => new CreateCashMovementUseCase(orders, users, instruments, idempotency, accountState),
      inject: [
        ORDERS_REPOSITORY,
        USER_READER,
        INSTRUMENT_CATALOG,
        IDEMPOTENCY_REPOSITORY,
        ACCOUNT_STATE_REPOSITORY,
      ],
    },
  ],
  exports: [ORDERS_REPOSITORY],
})
export class OrdersModule {}
