import { InstrumentRecord } from '../../../shared-kernel/domain/investment-records';

export interface InstrumentCatalog {
  findById(id: number): Promise<InstrumentRecord | undefined>;
  search(query?: string): Promise<InstrumentRecord[]>;
  searchPage(
    criteria: InstrumentSearchCriteria,
  ): Promise<InstrumentSearchPage>;
}

export interface InstrumentSearchCriteria {
  ticker?: string;
  name?: string;
  page: number;
  limit: number;
}

export interface InstrumentSearchPage {
  items: InstrumentRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export const INSTRUMENT_CATALOG = Symbol('INSTRUMENT_CATALOG');
