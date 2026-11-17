import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MARKET_DATA_READER } from './application/ports/market-data-reader.port';
import { MarketDataAdapter } from './adapters/outbound/market-data.adapter';
import { MarketDataEntity } from './adapters/outbound/market-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MarketDataEntity])],
  providers: [
    MarketDataAdapter,
    {
      provide: MARKET_DATA_READER,
      useExisting: MarketDataAdapter,
    },
  ],
  exports: [MARKET_DATA_READER],
})
export class MarketDataModule {}
