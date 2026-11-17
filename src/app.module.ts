import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { HealthModule } from './contexts/health/health.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { ApiKeyGuard } from './infrastructure/http/api-key.guard';
import { InstrumentsModule } from './contexts/instruments/instruments.module';
import { MarketDataModule } from './contexts/market-data/market-data.module';
import { OrdersModule } from './contexts/orders/orders.module';
import { PortfolioModule } from './contexts/portfolio/portfolio.module';
import { UsersModule } from './contexts/users/users.module';

@Module({
  imports: [
    HealthModule,
    DatabaseModule,
    UsersModule,
    InstrumentsModule,
    MarketDataModule,
    OrdersModule,
    PortfolioModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AppModule {}
