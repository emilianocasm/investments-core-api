import {
  InstrumentCatalog,
  InstrumentSearchCriteria,
} from './ports/instrument-catalog.port';

export class SearchInstrumentsUseCase {
  constructor(private readonly instrumentCatalog: InstrumentCatalog) {}

  execute(criteria: InstrumentSearchCriteria) {
    return this.instrumentCatalog.searchPage({
      ...criteria,
      ticker: criteria.ticker?.trim() || undefined,
      name: criteria.name?.trim() || undefined,
    });
  }
}
