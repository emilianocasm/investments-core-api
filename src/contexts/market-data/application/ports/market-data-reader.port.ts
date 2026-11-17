import { MarketDataRecord } from '../../../shared-kernel/domain/investment-records';

export interface MarketDataReader {
  getLatest(instrumentId: number): Promise<MarketDataRecord | undefined>;
}

export const MARKET_DATA_READER = Symbol('MARKET_DATA_READER');
