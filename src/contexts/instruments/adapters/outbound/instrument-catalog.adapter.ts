import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InstrumentCatalog,
  InstrumentSearchCriteria,
  InstrumentSearchPage,
} from '../../application/ports/instrument-catalog.port';
import { InstrumentRecord } from '../../../shared-kernel/domain/investment-records';
import { InstrumentEntity } from './instrument.entity';

@Injectable()
export class InstrumentCatalogAdapter implements InstrumentCatalog {
  constructor(
    @InjectRepository(InstrumentEntity)
    private readonly instruments: Repository<InstrumentEntity>,
  ) {}

  async findById(id: number): Promise<InstrumentRecord | undefined> {
    const instrument = await this.instruments.findOneBy({ id });
    return instrument ? this.toRecord(instrument) : undefined;
  }

  async search(query?: string): Promise<InstrumentRecord[]> {
    const queryBuilder = this.instruments
      .createQueryBuilder('instrument')
      .orderBy('instrument.id', 'ASC');
    if (query) {
      queryBuilder
        .where('instrument.ticker = :query', { query })
        .orWhere('instrument.name = :query', { query });
    }
    const instruments = await queryBuilder.getMany();
    return instruments.map((instrument) => this.toRecord(instrument));
  }

  async searchPage(
    criteria: InstrumentSearchCriteria,
  ): Promise<InstrumentSearchPage> {
    const queryBuilder = this.instruments
      .createQueryBuilder('instrument')
      .orderBy('instrument.id', 'ASC');

    if (criteria.ticker) {
      queryBuilder.andWhere('instrument.ticker = :ticker', {
        ticker: criteria.ticker,
      });
    }
    if (criteria.name) {
      queryBuilder.andWhere('instrument.name = :name', {
        name: criteria.name,
      });
    }

    const [instruments, total] = await queryBuilder
      .skip((criteria.page - 1) * criteria.limit)
      .take(criteria.limit)
      .getManyAndCount();

    return {
      items: instruments.map((instrument) => this.toRecord(instrument)),
      page: criteria.page,
      limit: criteria.limit,
      total,
      totalPages: Math.ceil(total / criteria.limit),
      hasNext: criteria.page < Math.ceil(total / criteria.limit),
    };
  }

  private toRecord(instrument: InstrumentEntity): InstrumentRecord {
    return {
      id: instrument.id,
      ticker: instrument.ticker,
      name: instrument.name,
      type: instrument.type,
    };
  }
}
