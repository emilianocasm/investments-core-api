import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  INSTRUMENT_CATALOG,
  InstrumentCatalog,
} from './application/ports/instrument-catalog.port';
import { SearchInstrumentsUseCase } from './application/search-instruments.use-case';
import { InstrumentsController } from './adapters/inbound/http/instruments.controller';
import { InstrumentCatalogAdapter } from './adapters/outbound/instrument-catalog.adapter';
import { InstrumentEntity } from './adapters/outbound/instrument.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InstrumentEntity])],
  controllers: [InstrumentsController],
  providers: [
    InstrumentCatalogAdapter,
    {
      provide: INSTRUMENT_CATALOG,
      useExisting: InstrumentCatalogAdapter,
    },
    {
      provide: SearchInstrumentsUseCase,
      useFactory: (catalog: InstrumentCatalog) =>
        new SearchInstrumentsUseCase(catalog),
      inject: [INSTRUMENT_CATALOG],
    },
  ],
  exports: [INSTRUMENT_CATALOG],
})
export class InstrumentsModule {}
