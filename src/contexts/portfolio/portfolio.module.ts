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
import { PortfolioStateModule } from './portfolio-state.module';
import {
  ACCOUNT_STATE_REPOSITORY,
  AccountStateRepository,
} from '../shared-kernel/application/ports/account-state-repository.port';
import { UsersModule } from '../users/users.module';
import { USER_READER, UserReader } from '../users/application/ports/user-reader.port';
import { GetPortfolioUseCase } from './application/get-portfolio.use-case';
import { PortfolioController } from './adapters/inbound/http/portfolio.controller';

@Module({
  imports: [UsersModule, InstrumentsModule, MarketDataModule, PortfolioStateModule],
  controllers: [PortfolioController],
  providers: [
    {
      provide: GetPortfolioUseCase,
      useFactory: (
        users: UserReader,
        instruments: InstrumentCatalog,
        marketData: MarketDataReader,
        accountState: AccountStateRepository,
      ) =>
        new GetPortfolioUseCase(users, instruments, marketData, accountState),
      inject: [
        USER_READER,
        INSTRUMENT_CATALOG,
        MARKET_DATA_READER,
        ACCOUNT_STATE_REPOSITORY,
      ],
    },
  ],
})
export class PortfolioModule {}
