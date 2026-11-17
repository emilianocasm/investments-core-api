import { Module } from '@nestjs/common';
import { InstrumentsModule } from '../instruments/instruments.module';
import {
  INSTRUMENT_CATALOG,
  InstrumentCatalog,
} from '../instruments/application/ports/instrument-catalog.port';
import { MarketDataModule } from '../market-data/market-data.module';
import {
  MARKET_DATA_READER,
  MarketDataReader,
} from '../market-data/application/ports/market-data-reader.port';
import { OrdersModule } from '../orders/orders.module';
import {
  ORDERS_REPOSITORY,
  OrdersRepository,
} from '../orders/application/ports/orders-repository.port';
import { UsersModule } from '../users/users.module';
import { USER_READER, UserReader } from '../users/application/ports/user-reader.port';
import { GetPortfolioUseCase } from './application/get-portfolio.use-case';
import { PortfolioController } from './adapters/inbound/http/portfolio.controller';

@Module({
  imports: [UsersModule, InstrumentsModule, MarketDataModule, OrdersModule],
  controllers: [PortfolioController],
  providers: [
    {
      provide: GetPortfolioUseCase,
      useFactory: (
        users: UserReader,
        instruments: InstrumentCatalog,
        marketData: MarketDataReader,
        orders: OrdersRepository,
      ) =>
        new GetPortfolioUseCase(users, instruments, marketData, orders),
      inject: [USER_READER, INSTRUMENT_CATALOG, MARKET_DATA_READER, ORDERS_REPOSITORY],
    },
  ],
})
export class PortfolioModule {}
