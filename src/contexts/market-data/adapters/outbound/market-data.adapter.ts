import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketDataReader } from '../../application/ports/market-data-reader.port';
import { MarketDataRecord } from '../../../shared-kernel/domain/investment-records';
import { MarketDataEntity } from './market-data.entity';

@Injectable()
export class MarketDataAdapter implements MarketDataReader {
  constructor(
    @InjectRepository(MarketDataEntity)
    private readonly marketData: Repository<MarketDataEntity>,
  ) {}

  async getLatest(instrumentId: number): Promise<MarketDataRecord | undefined> {
    const quote = await this.marketData.findOne({
      where: { instrumentId },
      order: { date: 'DESC', id: 'DESC' },
    });
    return quote
      ? {
          id: quote.id,
          instrumentId: quote.instrumentId!,
          date: quote.date!,
          open: quote.open,
          high: quote.high,
          low: quote.low,
          close: quote.close,
          previousClose: quote.previousClose,
        }
      : undefined;
  }
}
