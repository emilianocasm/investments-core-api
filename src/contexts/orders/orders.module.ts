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
import { OrderEntity } from './adapters/outbound/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    UsersModule,
    InstrumentsModule,
    MarketDataModule,
  ],
  controllers: [OrdersController, CashMovementsController],
  providers: [
    OrdersAdapter,
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
      ) =>
        new CreateOrderUseCase(orders, users, instruments, marketData),
      inject: [ORDERS_REPOSITORY, USER_READER, INSTRUMENT_CATALOG, MARKET_DATA_READER],
    },
    {
      provide: CancelOrderUseCase,
      useFactory: (orders: OrdersRepository) => new CancelOrderUseCase(orders),
      inject: [ORDERS_REPOSITORY],
    },
    {
      provide: CreateCashMovementUseCase,
      useFactory: (
        orders: OrdersRepository,
        users: UserReader,
        instruments: InstrumentCatalog,
      ) => new CreateCashMovementUseCase(orders, users, instruments),
      inject: [ORDERS_REPOSITORY, USER_READER, INSTRUMENT_CATALOG],
    },
  ],
  exports: [ORDERS_REPOSITORY],
})
export class OrdersModule {}
